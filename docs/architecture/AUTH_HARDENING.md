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
`is_site_staff` / `is_site_admin` / `is_site_decider` helpers (security definer,
pinned `search_path`), and re-scopes `applications` select/update to the owning
family or the targeted site.

Sessions, audit rows and rate-limit rows have **no insert policy**: only the
service role writes them.

`rls-policies.test.ts` asserts the migration surface and `tenancy.test.ts`
proves cross-tenant behaviour against the repository. Neither is the proof:
`npm run test:rls` boots an ephemeral Supabase Postgres, applies every
migration from an empty database and executes all 95 policies as `anon` and
`authenticated`. It found five defects this static pass had missed — see
[RLS_TESTING.md](./RLS_TESTING.md).

## Build — root cause

`npm run build` failed with
`TypeError: Cannot read properties of null (reading 'useContext')` on a varying
set of statically prerendered pages. It was **not** a framework bug.

**Cause: `NODE_ENV=development` was exported in the shell running the build.**
Next warns about it in the log (`You are using a non-standard "NODE_ENV" value
in your environment`). With that value, `next build` prerenders against React's
development runtime while the rest of the pipeline expects the production one,
and the React dispatcher is null during static generation.

Reduction that got there:

| Step | Command | Result |
| --- | --- | --- |
| duplicate React? | `npm ls react react-dom next` | single deduped `react@19.2.4` — not it |
| stale cache? | `rm -rf .next && npm run build` | still fails, and **21** pages fail, not 1 |
| providers? | root layout without `AppProviders`/`SiteShell` | still 21 failures — not it |
| layout at all? | bare `html/body` root layout | still 21 failures — not it |
| minimal repro outside the repo | scratch app on the same `node_modules` | surfaced the `NODE_ENV` warning |
| hypothesis test | `NODE_ENV=production npm run build` | **exit 0, zero prerender errors** |

Fix, narrow and testable: the build script pins the value.

```json
"build": "NODE_ENV=production next build"
```

`next build` only defaults `NODE_ENV` when it is unset, so an inherited value
silently won this fight. Pinning it makes the build correct regardless of the
shell.

No workaround was kept: the `global-error.tsx` / `not-found.tsx` pages and the
`staticGenerationRetryCount`, `serverMinification` and `cpus` experiments were
all reverted once the cause was known.

Reproduce the failure on purpose:

```bash
rm -rf .next && NODE_ENV=development npx next build   # fails
rm -rf .next && npm run build                          # exit 0
```

## End-to-end evidence

`npm run test:e2e` — Playwright, system Chrome channel, one isolated browser
context per account, asserting server status codes rather than hidden UI.

| Scenario | Assertions |
| --- | --- |
| family reads only its own file | family B gets `404` on A's application and an empty list |
| staff reads only its own sites | site A staff sees the application; site B staff does not |
| family cannot reach staff data | `GET /api/admissions/residence` → `403`; staff status change → `403` |
| no cross-site read or write | `GET`/`POST` on A from B → `404`; `?siteId=A` from B → `403` |
| tampered cookie | `/api/auth/me` → `null`, protected route → `401` |
| revoked session | already-open context drops to `401` right after sign-out |
| password reset | both devices → `401`, old password `401`, new password `200` |
| rate limiting | eight bad passwords from one client → `401` then `429` |

Operator-only endpoints exist because no mail transport is wired yet:
`/api/staff/bootstrap` (first site admin), plus token retrieval on
`verify-email`, `password-reset` and `staff/invitations`. All require
`HAVEN_BOOTSTRAP_TOKEN`, are unavailable when it is unset, and are audited.
They must be removed once transactional email lands.

## Client heuristics removed

The residence console no longer guesses anything:

- the staff role comes from `siteRoles` returned by `GET /api/auth/me`; there is
  no `admin` fallback and no lookup by demo email — an account with no matching
  membership is `readonly`;
- the residence is `siteIds[0]` from the same response;
  `resolveCommunityResidenceId` (organisation/email substring matching) is gone
  from the store, and an account with no membership simply gets no workspace.

The client may still hide elements for UX; nothing it computes can create or
widen a permission, because every route re-derives the principal and the scope.

## Review findings and fixes

A dedicated security review of the branch produced five actionable findings.
All are fixed in the branch:

| Finding | Severity | Fix |
| --- | --- | --- |
| 15 cookie-authenticated mutations had no CSRF check, contradicting the documented policy | medium | `requireCsrf` added to every family, admissions, seed and sign-up mutation; `route-coverage.test.ts` now fails the build if a new one is missing |
| Any membership, including `readonly`, could change an application status by calling the API directly | medium | `requireDecidingRole` on the status route; `readonly` gets `403`, covered by an E2E case |
| Sign-in could leave an orphan session: the cookie was issued before the client consulted the prototype account store, which could then fail | medium | the signed-in user now comes from `GET /api/auth/me`; if the server cannot confirm it, the session is revoked immediately |
| `/api/admissions/seed` was unauthenticated behind `NODE_ENV` | medium | requires the operator token and CSRF |
| Reset, verification and invitation tokens were returned whenever `NODE_ENV !== "production"` | medium | tokens are returned only to an operator presenting the secret; a non-production flag is not a trust boundary on a shared preview host |

Operator capabilities were also tightened: they now live in one module
(`src/lib/security/operator.ts`) and, in production, additionally require
`HAVEN_OPERATOR_ENDPOINTS=enabled`, so a leaked staging secret cannot be
replayed. Dead code with weak secret fallbacks (`admissions/staff-session.ts`)
is deleted.

## Remaining work

Not blocking the exit criteria, but open before a pilot:

1. **Client role gating.** ~90 components still branch on
   `useAuth().user.role`. That role now comes from the server, and every route
   re-checks it, so these are display decisions — but they are not a security
   boundary and should not be treated as one.
2. **Prototype account store.** `haven-accounts-v1` still holds profile data
   used by the local sign-in path after the server has authenticated. It no
   longer decides identity, role or scope.
3. **Email delivery.** No transactional provider. Verification, reset and
   invitation tokens are hashed, expiring and single-use, but must currently be
   collected through the audited operator endpoints.
4. **Supabase parity.** Done. Sign-in, sign-out and registration go through
   Supabase Auth from the server, and identity is anchored on the verified
   `auth.users` id: the role comes from `app_identities`, the scope from
   `staff_memberships`, neither from `user_metadata` nor from a file. The
   credential lifecycle — password hashing, reset, email verification — stays
   local-only and refuses loudly in Supabase mode, where GoTrue owns it. See
   `IDENTITY_PARITY.md`. One gap remains, documented there: the
   `@supabase/ssr` session cookie is not `HttpOnly`, because the browser client
   still refreshes the same session.
5. **`/api/admissions/seed`** remains unauthenticated behind
   `NODE_ENV !== "production"`.
