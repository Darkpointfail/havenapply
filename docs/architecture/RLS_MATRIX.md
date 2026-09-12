# HavenApply — RLS Matrix

All tables enable **Row Level Security**. Access goes through SQL helpers (SECURITY DEFINER, `search_path` fixed) defined in migrations.

## Helpers

| Function | Meaning |
| --- | --- |
| `auth.uid()` | Current user |
| `is_platform_admin()` | Has any `platform_roles` row |
| `is_family_member(family_id, min_role?)` | Active member; optional minimum role rank |
| `is_family_editor(family_id)` | owner / editor / medical / financial (write-capable) |
| `is_org_member(organization_id)` | Any org-wide or site role under org. **Org-wide membership is unreachable in practice** — see note below. |
| `is_org_admin(organization_id)` | `organization_roles` owner/billing or team `org_admin`. **Unreachable in practice** — see note below. |
| `is_community_staff(community_id)` | Site member **or** org-wide member of that community’s org. The org-wide half is unreachable in practice (see note below); the site-member half is also dead (reads `community_team_members`, which nothing in the app writes to — real site staff access goes through `staff_memberships`/`is_site_staff()`, migration 0011). Some policies (e.g. `documents_select`, fixed in 0026) needed an explicit `is_site_staff()` addition because of this. |
| `has_community_permission(community_id, permission)` | Role→permission map |
| `can_read_application(application_id)` | Family member **or** community/org staff |
| `can_write_application_family(application_id)` | **NOT IMPLEMENTED** — no such function in any migration (confirmed 2026-09, RLS_MATRIX validation pass). Documented intent only. |
| `can_act_on_application_staff(application_id, permission)` | **NOT IMPLEMENTED** — no such function in any migration (confirmed 2026-09, RLS_MATRIX validation pass). Documented intent only. |

> **Org-wide staff roles — theory vs. practice (confirmed 2026-09, RLS_MATRIX validation pass).**
> `is_org_member()`, `is_org_admin()` and half of `is_community_staff()` grant access through a `community_team_members` row with `community_id IS NULL` (org-wide), or through `organization_roles`. The RLS mechanism itself works — verified directly against Postgres with a manually-inserted row — but **no signup, invitation, claim, or bootstrap flow anywhere in the application ever writes to either table** (confirmed by exhaustive grep of `src/`). A real staff account can only ever get a **site-scoped** `staff_memberships` row (migration 0011). Until something in the app writes an org-wide row, "org-wide staff" is a schema capability with no way to reach it, not a feature anyone can use.

### Role ranks (family)

`viewer` < `financial` ≈ `medical` < `editor` < `owner`

### Community permissions (examples)

| Permission | Roles |
| --- | --- |
| `view_applications` | all staff except suspended |
| `add_internal_notes` | admissions_staff+, admissions_manager, org_admin |
| `request_documents` | admissions_staff+, … |
| `propose_tour` | admissions_staff+, … |
| `change_status` | admissions_manager, org_admin |
| `accept_decline` | admissions_manager, org_admin |
| `edit_profile` | admissions_manager, org_admin |
| `edit_availability` | admissions_manager, org_admin |
| `manage_team` | org_admin |

---

## Matrix by table

Legend: **R** read · **W** insert/update · **D** delete/soft-delete · **—** denied · **A** platform admin (audited)

| Table | Family member | Community staff | Org admin | Platform admin | Anon |
| --- | --- | --- | --- | --- | --- |
| `profiles` | R self; W self | R self | R self | R/W A | — |
| `platform_roles` | — | — | — | R/W A | — |
| `families` | R member; W owner | — | — | R A | — |
| `family_members` | R member; W owner | — | — | R A | — |
| `family_invitations` | R/W owner/editor | — | — | R A | — |
| `seniors` | R member; W editor+ | —* | — | R A | — |
| `senior_care_assessments` | R member; W editor/medical | —* | — | R A | — |
| `medications` / `allergies` / conditions | same as seniors | —* | — | R A | — |
| `documents` | R member; W editor+ | R if `document_access` | R if access | R A | — |
| `document_access` | R/W family editor | R staff on app | R | R A | — |
| `document_access_logs` | R family owner | R staff on doc | R | R A | — |
| `organizations` | — | R own org | R/W | R/W A | — |
| `organization_settings` | — | R limited | R/W | R A | — |
| `organization_roles` | — | — | R/W | R/W A | — |
| `communities` | R verified public fields | R own | R/W | R/W A | R public verified |
| `community_*` catalog | R public/verified | R/W by permission | R/W | R A | R public |
| `community_team_members` | — | R own site/org | R/W | R A | — |
| `favorites` / `comparisons` | R/W own family | — | — | R A | — |
| `applications` | R/W own family | R own community; W actions via Edge | R org apps | R A | — |
| `application_timeline` | R | R | R | R A | — |
| `application_timeline` write | via trigger/Edge only | via Edge | via Edge | A | — |
| `conversations` / `messages` | R/W if party | R/W if party | R | R A | — |
| `tours` | R family; W limited | R/W propose | R | R A | — |
| `tasks` | R/W family | — | — | R A | — |
| `notifications` | R/W self | R/W self | R/W self | R A | — |
| `audit_logs` | — | — | — | R A | — |
| `compatibility_analyses` | R own senior | R own community | R | R A | — |
| `outbox_events` | — | — | — | R A / service role | — |
| `organization_integrations` | — | — | R/W | R A | — |
| `webhook_events` / `integration_logs` | — | — | R | R A | — |
| marketplace stubs | future | future | future | R/W A | — |

\*Staff never read full senior PHI by default. They receive an **application packet** (RPC `get_application_packet`) containing only fields/documents explicitly shared for that application.

`audit_logs`'s own read policy is correctly platform-admin-only (verified). But nothing writes to it: no signup/staff/admin flow in either backend inserts a row here, in any code path (confirmed by exhaustive grep, 2026-09). In particular it is **not** what `recordAuditEvent()` (used throughout `src/lib/security/`) writes to — that function writes to a local filesystem trail (`.data/identity/state.json`) in both `local` and `supabase` backend modes. "Platform admin reads are written to `audit_logs`" (test case 6 below) describes a capability that does not exist today, not a verified guarantee — see that test case's note.

---

## Documents

1. Family always reads own `documents`.
2. Staff SELECT requires active `document_access` row joining to an application for their `community_id` (and `revoked_at IS NULL`). As of migration 0006 this checked `is_community_staff()` only — dead in practice (see the org-wide note above), so a real staff account with a genuinely active grant could never read the document. Migration 0026 adds `or is_site_staff(...)` alongside it (written 2026-09, pending application — check `supabase/migrations/0026_documents_staff_access_fix.sql`'s status before relying on this).
3. Signed download Edge Function re-checks the same rules and inserts `document_access_logs`.

---

## Applications

| Action | Who | How |
| --- | --- | --- |
| Create draft | Family editor | Client insert RLS |
| Submit | Family editor | `submit-application` Edge |
| Withdraw | Family owner/editor | `withdraw-application` Edge |
| Request docs / tour | Staff permission | `community-application-action` |
| Accept / decline | Staff `accept_decline` | same Edge |
| Timeline insert | System | Trigger / Edge (no direct client INSERT for staff spoofing events) |

---

## Public catalog

Anonymous and authenticated users may **read** limited columns on `communities` where `status = 'verified'` AND `deleted_at IS NULL` (name, location, amenities, starting price, media). No PHI, no applicant lists.

---

## Service role

Edge Functions use the **service role** only after explicit AuthZ checks mirroring this matrix. Prefer SECURITY DEFINER RPCs with fixed `search_path` for DB-side enforcement where possible.

---

## Test cases (must pass before cutover)

All 7 verified 2026-09 directly against Postgres RLS (real JWTs, `@example.invalid` fixtures, routes bypassed entirely) — see the RLS_MATRIX validation pass for the run. Three came with a caveat, noted inline; the rest passed as documented.

1. Family A cannot read Family B seniors/docs/apps. — passed as documented, both directions.
2. Dallas #1 staff cannot read Austin applications (same org, different site) unless org-wide role. — the "cannot" half passed; the "unless org-wide role" half only works if `community_team_members`/`organization_roles` holds a row, which **no real flow in the app can create** (see the org-wide note earlier in this document). Verified only by inserting that row directly via service role.
3. Org-wide `org_admin` can read all sites under org. — passed under the same manually-inserted, currently-unreachable condition as test 2.
4. Staff without `document_access` cannot download files. — the "without a grant" half passed. The unstated positive half (**with** an active grant, staff *should* be able to) failed: `documents_select` relied solely on the dead `is_community_staff()`, so a real grant was silently ineffective. Fixed in migration 0026 (`or is_site_staff(...)`, same pattern as 0022) — confirm that migration's applied status before trusting this case. `document_access_logs_select` has the identical unfixed defect (not yet in a migration).
5. Viewer family member cannot submit applications. — passed as documented; mirrored with an owner successfully submitting.
6. Platform admin reads are written to `audit_logs`. — **not true today**: `audit_logs` has no writer anywhere in the app (see the note on that table above). What did pass: `audit_logs`'s own read policy is correctly platform-admin-only. Treat a real admin-access journal as a future compliance item, not something already in place.
7. Anon cannot list `applications` or `documents`. — passed as documented, with an authenticated-family positive control alongside it.
