# Authentication hardening — milestone 2

Makes identity server-verified for the family and residence portals, so the
admissions flow of milestone 1 can be considered for a pilot.

Status: **core landed and tested; not yet complete** — see
[Remaining work](#remaining-work). The admissions pilot flag stays off.

---

## What changed

### Session minting from a client object is gone

`POST /api/auth/session` used to sign a cookie from a `user` object supplied by
the browser. Anyone could become any family account. It now answers `410` and
points to the real endpoint.

A session is created in exactly one place, `POST /api/auth/sign-in`, after the
server has verified the password.

`POST /api/admissions/staff/session` — the equivalent hole on the staff side,
introduced by milestone 1 — is deleted. Staff identity comes from the same
verified session plus a membership row.

### Passwords

`scrypt` (N=2^15, r=8, p=1) from `node:crypto`, on the server, replacing the
single-round SHA-256 that ran in the browser. Hashes are stored server-side
under `.data/identity/` (local backend) and never leave it. Unknown accounts
still pay the cost of a dummy verification so response time does not disclose
whether an email exists.

Policy: 12 characters minimum, at least three character classes.

### Sessions

The cookie carries a session id and a signature, nothing else. Identity, role
and expiry come from a server record, so:

- a tampered signature is refused;
- a well-signed id with no record is refused;
- revocation is immediate (`revokeSession`, `revokeAllSessionsForUser`);
- a password reset revokes every session of that user;
- rotation is available (`rotateSession`) and records the previous id.

Cookie flags: `HttpOnly`, `SameSite=Strict`, `Secure` in production, 8-hour
sliding TTL with a 7-day absolute cap.

### Central guards

`src/lib/security/guards.ts` exposes `requireFamily`, `requireStaff`,
`requireAdmin`, `scopeToSite` and `requireCsrf`. `requireFamilyUser` (family
APIs) and the admissions actors now delegate to them, so every protected route
resolves the caller the same way.

Staff scope comes from the membership table only. The previous milestone
resolved staff by falling back to an email lookup — that fallback is removed.

### CSRF and origin

Every non-GET request must present a matching `Origin`/`Host` **and** a
`x-haven-csrf` header equal to the `haven_csrf` cookie. `GET /api/auth/csrf`
issues the pair.

### Rate limiting

Persistent fixed-window counters in the identity store, keyed by hashed
identifier, applied to sign-in (per account and per origin), registration,
password reset, email verification, invitations and uploads. Sign-in: 5 attempts
per 15 minutes.

### Secrets and environment

No secret has a default value any more:

- `HAVEN_SESSION_SECRET` is required in production and must be ≥ 32 characters;
  in development a per-boot ephemeral value is used instead of a repo literal.
- The session secret no longer falls back to `SUPABASE_SERVICE_ROLE_KEY`.
- The shared site password literal is removed. The gate is inert unless
  `SITE_ACCESS_PASSWORD` is set, and the unlock cookie is derived from the
  secret, so rotating it invalidates every issued cookie.
- `validateSecurityEnv()` reports problems by name, never by value, and
  `assertSecurityEnv()` throws in production.

### Staff invitations

Single use, 72-hour expiry, hashed token, revocable, audited. Only a site
administrator can invite, and only for a site they belong to. Accepting an
invitation creates the account if needed and grants membership on that site
alone.

### Audit

`auth.sign_in` (success and failure with reason), `auth.sign_up`,
`auth.sign_out`, `auth.email_verify`, `auth.reset_request`,
`auth.reset_complete`, `staff.invitation_created`, `staff.invitation_accept`,
`csrf.rejected`, `site_access.attempt`. Emails are stored as a SHA-256 lookup
hash, never in clear text — asserted by a test.

---

## Test coverage

`npm test` — 32 new tests, all passing.

| Required case | Test |
| --- | --- |
| forged user object refused | `POST /api/auth/session` returns 410; sessions only via verified sign-in |
| tampered cookie refused | `sessions > rejects a tampered cookie` |
| wrong password | `credential sign-in > refuses a wrong password` |
| revoked session | `sessions > rejects a revoked session` |
| reset expired / reused | `password reset > refuses a reused token`, `refuses an unknown token` |
| CSRF | 4 cases in `CSRF` |
| rate limit | `credential sign-in > rate limits repeated failures` |
| FAMILY → STAFF forbidden | `credential sign-in > refuses signing into the wrong portal` |
| staff of another residence forbidden | `cross-tenant reads > refuses a status change from another site's staff` |
| family A cannot read family B | `cross-tenant reads > hides one family's application from another family` |
| keys never in the client bundle | `client bundle safety` (4 assertions) |
| audit written | `audit trail > records sign-in success and failure` |

---

## Secrets to provision

Names only; values must be generated out of band and stored in the deployment
secret manager.

| Variable | Scope | Notes |
| --- | --- | --- |
| `HAVEN_SESSION_SECRET` | server | ≥ 32 random characters. Rotating it invalidates all sessions. |
| `SITE_ACCESS_PASSWORD` | server | Optional. Omit to disable the staging gate entirely. |
| `SITE_ACCESS_SECRET` | server | Optional. Defaults to the gate password for cookie derivation. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Already used by sign-up. Never referenced by a client module. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Required when `NEXT_PUBLIC_DATA_BACKEND=supabase`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Same. |

Must be **false or unset** in production: `NEXT_PUBLIC_AUTH_OPEN_ACCESS`,
`HAVEN_ALLOW_CLIENT_SESSION_MINT`.

---

## Identity source

`GET /api/auth/me` is the only identity the browser gets. It returns the role
and, for staff, the site scope, all resolved from the session record and
`staff_memberships`. `AuthProvider` calls it on mount; `readSession()` — which
read `haven-auth` from localStorage — is gone from the auth path.

`NEXT_PUBLIC_AUTH_OPEN_ACCESS` no longer exists as a switch: `AUTH_OPEN_ACCESS`
is a hard `false`. `HAVEN_ALLOW_CLIENT_SESSION_MINT` and the
`clientSessionMintEnabled()` gate are deleted along with the staff session
endpoint, so no environment variable can bring client-minted sessions back.

Static tests enforce all of this (`identity-source.test.ts`).

## Site access gate — scope

`SITE_ACCESS_PASSWORD` is a **staging shutter, not authentication**. Scope:

- it only decides whether the marketing shell is reachable before login;
- it grants no read of personal data: every family and admissions route still
  requires an individual verified session;
- it is inert unless the variable is set, and the unlock cookie is derived from
  the secret, so rotating the secret logs everyone out of the gate;
- `/media` and the gate itself stay public.

It must be removed the day the site goes public. It is not a security control
and must never be presented as one.

## RLS

`0011_identity_rls.sql` adds `auth_sessions`, `staff_memberships`,
`staff_invitations`, `security_audit_log`, `auth_rate_limits`, the
`is_site_staff` / `is_site_admin` helpers (security definer, pinned
`search_path`), and re-scopes `applications` select/update to the owning family
or the targeted site.

Sessions, audit rows and rate-limit rows have **no insert policy**: only the
service role writes them.

CI cannot run SQL — no Supabase instance — so `rls-policies.test.ts` asserts the
migration surface (RLS enabled on all 13 identity/tenancy tables, required
policies present, no client insert path), and cross-tenant behaviour is proven
against the repository in `tenancy.test.ts`.

## Build

`npm run build` still fails, and it is **not** caused by this milestone:

- it fails identically on a clean checkout of `main`;
- the failing page moves between `/_global-error` and `/_not-found` from run to
  run, with `TypeError: Cannot read properties of null (reading 'useContext')`;
- `next build --debug-prerender` succeeds (exit 0), which points at the
  minified server bundle;
- adding explicit `global-error.tsx` and `not-found.tsx` removed two of the
  failures; `serverMinification: false` and `cpus: 1` both made it worse
  (6+ pages failing), so they were reverted.

Open framework issue, tracked here rather than papered over.

## Remaining work

The exit criterion is not met yet. Before enabling the admissions flag in a
pilot:

1. **Client role gating still lives in the browser.** ~90 components gate on
   `useAuth().user.role`, and the community console still derives its team role
   client-side (defaulting to `admin`). Server APIs are safe, but the UI trusts
   local state.
2. **Identity in localStorage.** `haven-accounts-v1`, `haven-auth`,
   `haven-open-*`, `haven-community-portal-v10` (team roles) and
   `haven-households-v1` (invite tokens) still exist. Local sign-in now goes
   through the server first, but the prototype account store is still consulted
   afterwards for profile data.
3. **Email delivery.** Verification and reset tokens are generated, hashed and
   expired correctly, but no transactional provider sends them; outside
   production the token is returned in the response for testing.
4. **Supabase parity.** Sign-in, registration and reset are implemented for the
   local backend. In Supabase mode the guards read `auth.getUser()`, but the
   credential lifecycle still belongs to Supabase Auth and the staff membership
   table must be provisioned there.
5. **RLS.** `0010` tightens admissions policies; the identity tables introduced
   here are file-backed and have no SQL equivalent yet.
6. **E2E with two browser contexts.** Not delivered: Playwright is not in the
   dependency set and adding a browser runtime was out of scope for this pass.
   Cross-tenant isolation is covered at the repository boundary instead.
7. **`/api/admissions/seed`** is still unauthenticated, guarded only by
   `NODE_ENV !== "production"`.
