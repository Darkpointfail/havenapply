# HavenApply — RLS Matrix

All tables enable **Row Level Security**. Access goes through SQL helpers (SECURITY DEFINER, `search_path` fixed) defined in migrations.

## Helpers

| Function | Meaning |
| --- | --- |
| `auth.uid()` | Current user |
| `is_platform_admin()` | Has any `platform_roles` row |
| `is_family_member(family_id, min_role?)` | Active member; optional minimum role rank |
| `is_family_editor(family_id)` | owner / editor / medical / financial (write-capable) |
| `is_org_member(organization_id)` | Any org-wide or site role under org |
| `is_org_admin(organization_id)` | `organization_roles` owner/billing or team `org_admin` |
| `is_community_staff(community_id)` | Site member **or** org-wide member of that community’s org |
| `has_community_permission(community_id, permission)` | Role→permission map |
| `can_read_application(application_id)` | Family member **or** community/org staff |
| `can_write_application_family(application_id)` | Family editor on app’s family |
| `can_act_on_application_staff(application_id, permission)` | Staff with permission |

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

---

## Documents

1. Family always reads own `documents`.
2. Staff SELECT requires active `document_access` row joining to an application for their `community_id` (and `revoked_at IS NULL`).
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

1. Family A cannot read Family B seniors/docs/apps.  
2. Dallas #1 staff cannot read Austin applications (same org, different site) unless org-wide role.  
3. Org-wide `org_admin` can read all sites under org.  
4. Staff without `document_access` cannot download files.  
5. Viewer family member cannot submit applications.  
6. Platform admin reads are written to `audit_logs`.  
7. Anon cannot list `applications` or `documents`.
