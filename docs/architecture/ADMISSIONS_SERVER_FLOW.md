# Admissions server flow

Server-side source of truth for admission applications, replacing the
`haven-shared-admissions-v2` localStorage bridge.

Status: **milestone 1 (vertical slice)**. The transport is real (server store,
server-resolved tenancy, RLS-ready schema). Identity minting in local mode is
still weak and is gated behind a server flag — see [Trust boundaries](#trust-boundaries).

---

## Why

Before this change, a family submission was written to `localStorage`
(`haven-shared-admissions-v2`) and the residence console read the same key from
the same browser. A residence opening its console on another computer never saw
the application; it saw six auto-injected demo dossiers instead.

The business requirement is the inverse: an application submitted by a family
must be readable, from another machine, **only** by staff of the targeted site.

---

## Business contract

### Actors

| Actor | Identity source | May do |
| --- | --- | --- |
| Family | family session (cookie or Supabase auth) | create draft, submit, list/read **own** applications, withdraw |
| Residence staff | staff session + membership row | list/read applications **targeting their site**, change status |
| System | server only | write status history and audit entries |

### Invariants

1. An application belongs to exactly one family (`familyUserId`) and targets
   exactly one site (`siteId`). Both are resolved server-side; the client never
   supplies the owner and never chooses which residence it is allowed to read.
2. Submission is idempotent on `(familyUserId, clientRequestId)`. Replaying the
   same submit returns the same application, does not duplicate it, and does not
   append a second status event.
3. A submission targeting an unknown or inactive site is refused (`409`).
4. Every status transition writes one `status_event` row and one `audit_entry`
   row, in the same operation as the status change.
5. Reads are tenant-scoped at the repository level, not at the UI level.
   Family A cannot read family B. Staff of site A cannot read site B.
6. An empty database contains zero applications. Demo dossiers exist only via an
   explicit seed, refused when `NODE_ENV === "production"`, and every seeded
   record carries `isSeed: true` and a `[DÉMO]` name prefix.

### State machine

```
draft ──submit──> submitted ──staff──> received / under_review / more_info
                                   ├──> tour_requested / assessment_requested
                                   ├──> waitlisted
                                   ├──> approved ──> closed
                                   └──> declined
   family may withdraw from any non-terminal state ──> withdrawn
```

`draft` is family-private: it is never returned by the residence listing.

### API surface

| Route | Method | Actor | Contract |
| --- | --- | --- | --- |
| `/api/admissions/draft` | POST | family | upsert a draft by `clientRequestId`; returns the record |
| `/api/admissions/submit` | POST | family | idempotent submit; `201` on create, `200` on replay |
| `/api/admissions/family` | GET | family | own applications, newest first |
| `/api/admissions/residence` | GET | staff | applications targeting a site the caller is a member of; `?siteId=` is validated against membership |
| `/api/admissions/[id]` | GET | family owner or staff of the target site | detail + status history + audit |
| `/api/admissions/[id]/status` | POST | staff of the target site | transition + note; writes history and audit |
| `/api/admissions/[id]/withdraw` | POST | family owner | withdraw |
| `/api/admissions/staff/session` | POST/DELETE | — | mints the local staff cookie; **gated**, see below |
| `/api/admissions/seed` | POST | — | explicit dev seed; refused in production |

All routes answer with the repo-wide envelope: `{ ok: true, ... }` or
`{ ok: false, error }`, using `jsonOk` / `jsonError`.

---

## Data model

Two interchangeable backends behind one repository facade, mirroring
`src/lib/family/` (`repository.ts` → `local-store.ts` | `supabase-store.ts`),
selected by `NEXT_PUBLIC_DATA_BACKEND`.

### Records

| Record | Key fields |
| --- | --- |
| `AdmissionApplicationRecord` | `id`, `familyUserId`, `familyEmail`, `siteId`, `siteName`, `clientRequestId`, `publicRef`, `status`, `senior`, `careNeeds`, `medicalHighlights`, `documents[]` (metadata only), `familyContact`, `decision`, `isSeed`, timestamps |
| `AdmissionStatusEvent` | `applicationId`, `fromStatus`, `toStatus`, `actorType`, `actorId`, `note`, `at` |
| `AdmissionAuditEntry` | `applicationId`, `actorType`, `actorId`, `actorLabel`, `action`, `metadata`, `at` |
| `ResidenceSite` | `id`, `name`, `isActive` |
| `StaffMembership` | `userId`, `email`, `siteId`, `role`, `status` |

### Local backend

`.data/admissions/state.json` (gitignored, atomic write). Server-side file, so it
already satisfies the cross-machine requirement for a single deployment: two
different browsers hitting the same server see the same truth.

### Supabase backend

Migration `0010_admissions_server_flow.sql` builds on the existing schema rather
than duplicating it:

- reuses `applications` (`family_id`, `community_id`, `status`) and
  `application_status_history` from `0004`;
- adds `applications.client_request_id` with a unique index per family for
  idempotency, and `applications.is_seed`;
- adds `admissions_audit_log` (per-application staff audit, absent from `0005`
  which only has platform-wide `audit_logs`);
- adds `site_admissions_settings.is_active` so an inactive residence can refuse
  intake;
- tightens RLS: staff read through `is_site_staff` or the legacy
  `is_community_staff`, staff write only through `is_site_decider` (a
  `readonly` membership may look and nothing else), family read/write through
  `is_family_member`, audit and history readable through
  `can_read_application`;
- appends the audit through `record_admissions_event`, a security-definer
  function that re-checks `can_read_application` and takes the actor from the
  session. The table itself has no insert policy.

`npm run test:rls` executes these policies, and
`tests/rls/supabase-parity.test.ts` replays each adapter query as SQL under the
principal that issues it. See [RLS_TESTING.md](./RLS_TESTING.md), including the
one documented gap: the identity store is still filesystem-backed, so staff
memberships do not resolve in Supabase mode.

Documents are shared as **metadata only** in this milestone. Staff download
requires signed URLs and access logs, which are out of scope here.

---

## Trust boundaries

```
browser (family)                browser (staff)
  │  cookie: haven-family-session   │  cookie: haven-staff-session
  ▼                                 ▼
────────────────────── server boundary ──────────────────────
requireFamilyActor()            requireStaffActor()
  → familyUserId from session     → userId from session
                                  → siteIds from membership store
  ▼                                 ▼
repository (tenant filter applied here, never in the client)
  ▼
local file store  |  Supabase (+ RLS as defence in depth)
```

What the client may send: payload content (senior name, care needs, document
metadata, note text) and a `clientRequestId`.
What the client may **never** decide: `familyUserId`, `siteIds` it can read,
staff role, `isSeed`, status history authorship.

### Known weakness, gated

`POST /api/auth/session` (family) and `POST /api/admissions/staff/session`
(staff) mint a signed cookie from a client-supplied user object, without
password verification. This predates this milestone for the family route.

Both are now behind `clientSessionMintEnabled()`:

| Environment | Default | Override |
| --- | --- | --- |
| production | **OFF** | `HAVEN_ALLOW_CLIENT_SESSION_MINT=true` |
| development | ON | `HAVEN_ALLOW_CLIENT_SESSION_MINT=false` |
| test | OFF | env var |

With the flag off, the routes answer `503` and no session can be forged.
Until real credential verification lands (milestone 2), **this flow is not
production-ready**, and the tenancy guarantees above hold only as far as the
session cookie is trustworthy.

---

## Removed from the production path

| Removed | Replacement |
| --- | --- |
| `haven-shared-admissions-v2` reads/writes | server store via `/api/admissions/*` |
| `notifyCommunityPortalOfApplication` local notification | server listing; notification rows remain workspace-local until milestone 2 |
| `COMMUNITY_ADMISSIONS_EVENT` cross-tab refresh | server refetch on mount and window focus |
| auto-injected `seedCommunityWorkspace` applications and `ensureDemoApplications` | empty list; explicit `POST /api/admissions/seed` in non-production |
| `"Transmission to a residence is not enabled in this phase"` | `dossier_transmission` consent accepted and recorded |

`src/lib/admissions-bridge.ts` is deleted. The workspace shell (profile, team,
availability, messaging) still uses `haven-community-portal-v10`; only the
applications list is server-owned in this milestone.

---

## Rollback plan

The change is additive at the data layer and switchable at the client layer.

1. **Fast rollback (no deploy):** set `HAVEN_ADMISSIONS_BACKEND=off`. The family
   submit path stops calling `/api/admissions/submit` and the console falls back
   to its local workspace applications. No data is lost: server records stay.
2. **Code rollback:** revert the commit range for this milestone. The deleted
   bridge module is restored with it; the localStorage key was never migrated
   away destructively, so any browser that still holds
   `haven-shared-admissions-v2` resumes working as before.
3. **Schema rollback:** `0010` only adds columns, tables and policies. Drop
   `admissions_audit_log`, `site_admissions_settings`, the two `applications`
   columns and the `0010` policies; `0004`/`0006` behaviour returns unchanged.
4. **Data retained on rollback** is server-side only and contains personal
   information, so a rollback that abandons the server store must be followed by
   the Loi 25 deletion routine (`/api/family/deletion`) for affected records.

---

## Test matrix

| Case | Expectation |
| --- | --- |
| submit twice with same `clientRequestId` | one record, `201` then `200`, one submit status event |
| new session, same family | application still listed (server persistence) |
| family B reads family A's application | `404` (existence not disclosed) |
| staff of site A lists | sees the application |
| staff of site B lists / reads by id | does not see it / `404` |
| submit to inactive site | `409` |
| status change by staff | status event + audit entry written |
| empty store | zero applications, zero demo dossiers |
| E2E, two isolated browser contexts | family submits in context 1, staff sees it in context 2 |
