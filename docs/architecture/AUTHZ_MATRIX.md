# Authorization matrix

Every server entry point, the role it demands, the scope it may reach and the
guard that enforces it. Client-side role checks are display only: each one is
backed by a row below.

Guards live in `src/lib/security/guards.ts`:
`requireFamily`, `requireStaff`, `requireAdmin`, `scopeToSite`, `requireCsrf`.

Where the role and the scope come from depends on the backend, and on nothing
else. In local mode the role is read from the credential record and the scope
from the filesystem membership list. In Supabase mode both come from the
database, keyed on the `auth.users` id that GoTrue verified: the role from
`app_identities`, the scope from `staff_memberships`. Neither is ever read from
`user_metadata`, from a request body, or from a query parameter. See
`IDENTITY_PARITY.md`.

Legend for **Scope**: what the caller can reach *after* the guard runs.
`self` = the authenticated principal only. `own family` = rows owned by the
principal's family. `member sites` = only sites present in
`staff_memberships` for that principal.

## Authentication

| Route | Method | Role | Scope | Guard | CSRF | Rate limit |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/csrf` | GET | anonymous | — | — | n/a | — |
| `/api/auth/me` | GET | any signed in | self | `currentPrincipal` | n/a | — |
| `/api/auth/sign-in` | POST | anonymous | — | local: `verifyCredentials`; Supabase: `signInWithPassword`, then role from `app_identities` | yes | per account + per origin |
| `/api/auth/register` | POST | anonymous | family only | role forced to `family`; in Supabase mode the trigger sets it, not the payload | yes | per origin |
| `/api/auth/verify-email` | POST | anonymous | token holder | single-use hashed token | yes | per origin |
| `/api/auth/password-reset` | POST | anonymous | — | always 200, no enumeration | yes | per origin |
| `/api/auth/password-reset` | PUT | anonymous | token holder | single-use, expiring, revokes sessions | yes | per origin |
| `/api/auth/session` | GET | any | self | `currentPrincipal` | n/a | — |
| `/api/auth/session` | POST | — | — | **removed** — returns 410 | n/a | — |
| `/api/auth/session` | DELETE | any signed in | self | local: revoke the session record; Supabase: `auth.signOut` | yes | — |
| `/api/auth/sign-up` | POST | anonymous | Supabase mode | Supabase admin API | — | — |

## Family data

All routes below call `requireFamilyUser`, which delegates to `requireFamily`.
The owner id always comes from the session; a body or query id can only select
*within* that owner's records.

| Route | Method | Role | Scope | Guard |
| --- | --- | --- | --- | --- |
| `/api/family/me` | GET | FAMILY | own family | `requireFamily` |
| `/api/family/applicant` | PATCH | FAMILY | own family | `requireFamily` |
| `/api/family/senior` | PATCH | FAMILY | own seniors | `requireFamily` + owner-scoped lookup |
| `/api/family/care-needs` | PATCH | FAMILY | own seniors | same |
| `/api/family/dossier` | PATCH | FAMILY | own seniors | same |
| `/api/family/consents` | POST | FAMILY | own family | `requireFamily` |
| `/api/family/applications` | PUT | FAMILY | own applications | `requireFamily` |
| `/api/family/documents` | GET/POST/PUT/DELETE | FAMILY | own documents | `requireFamily` + owner-scoped doc id |
| `/api/family/documents/[id]` | GET | FAMILY | own documents | same |
| `/api/family/export` | GET | FAMILY | own family | `requireFamily` |
| `/api/family/rights` | GET | FAMILY | own family | `requireFamily` |
| `/api/family/deletion` | GET/POST | FAMILY | own family | `requireFamily` |

## Admissions

| Route | Method | Role | Scope | Guard |
| --- | --- | --- | --- | --- |
| `/api/admissions/draft` | POST | FAMILY | own applications | `requireFamilyActor` |
| `/api/admissions/submit` | POST | FAMILY | own applications | `requireFamilyActor`, idempotent per `(owner, clientRequestId)` |
| `/api/admissions/family` | GET | FAMILY | own applications | `requireFamilyActor` |
| `/api/admissions/[id]` | GET | FAMILY or STAFF | own application, or member sites | `requireFamilyActor` then `requireStaffActor`; 404 otherwise |
| `/api/admissions/[id]/withdraw` | POST | FAMILY | own application | `requireFamilyActor` |
| `/api/admissions/residence` | GET | STAFF | member sites | `requireStaffActor` + `scopeToSite` |
| `/api/admissions/[id]/status` | POST | STAFF | member sites | `requireStaffActor` + `scopeToSite` |
| `/api/admissions/seed` | POST | — | dev only | `NODE_ENV !== "production"` — **open, see gaps** |

## Staff administration

| Route | Method | Role | Scope | Guard |
| --- | --- | --- | --- | --- |
| `/api/staff/invitations` | POST | STAFF admin | one member site | `requireStaff` + `scopeToSite` + site-admin check |
| `/api/staff/invitations/accept` | POST | local: anonymous; Supabase: any signed in | invited site only | single-use hashed token. In Supabase mode `accept_staff_invitation()` spends the token and grants the membership in one statement, to the account in the session |
| `/api/staff/bootstrap` | POST | operator secret | one site | `HAVEN_BOOTSTRAP_TOKEN`. Names the account by `userId` in Supabase mode: resolving an address to an account is not something a request does |

## Public

| Route | Method | Role | Scope | Guard |
| --- | --- | --- | --- | --- |
| `/api/communities` | GET | anonymous | public catalog | none needed |
| `/api/communities/[id]` | GET | anonymous | public catalog | none needed |
| `/api/site-access` | POST | anonymous | staging gate | rate limited, audited |
| `/auth/callback` | GET | anonymous | OAuth exchange | Supabase |

## Client-side gating

~90 components gate rendering on `useAuth().user.role` (inventory in the audit
notes). They now receive that role from `GET /api/auth/me`, so the browser can
no longer invent it — but the checks remain **display only**. Nothing in the
table above trusts them: each row re-derives the principal and the scope
server-side.

Two client behaviours are still tenancy-relevant and are listed as gaps:

| Behaviour | File | Why it is not a hole today | Gap |
| --- | --- | --- | --- |
| Community team role defaults to `admin` for any facility account | `src/lib/community-portal-store.tsx` | Workspace mutations are local; server admissions routes check `staff_memberships` | Console permissions must move server-side with the workspace |
| Residence id resolved from organisation/email heuristics | `src/lib/community-portal.ts`, `src/lib/messaging.ts` | Only selects a local workspace key; server ignores it and uses memberships | Remove once the workspace is server-owned |

## Server actions

None. Every mutation goes through a Route Handler in the table above
(verified by search for `"use server"`).
