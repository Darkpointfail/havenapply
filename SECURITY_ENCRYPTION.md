# SECURITY_ENCRYPTION.md — Cryptography & secrets architecture

**Scope:** HavenApply transport security, secrets handling, encryption at rest, signed object access, and key rotation.  
**Does not claim:** full HIPAA/PCI certification, audited KMS deployment, or compliance attestation.

---

## 1. Architecture overview

| Layer | Mechanism | Owner |
|---|---|---|
| Transport (browser ↔ app) | TLS terminated by host (Vercel); app refuses HTTP in production + HSTS | Platform + `middleware` / `next.config` |
| Transport (app ↔ Supabase) | HTTPS Supabase APIs / Storage | Supabase |
| Identity passwords (production) | Supabase Auth / GoTrue (bcrypt) | Supabase |
| Identity passwords (local demo store only) | Web Crypto **PBKDF2-SHA-256** (210k iters) | App (`auth-crypto.ts`) |
| Site gate unlock cookie | HMAC-SHA256 signed opaque token | App (`site-access.ts`) |
| Document download grants | HMAC-SHA256 short-lived tokens (+ optional Supabase signed URLs) | App APIs + Supabase Storage |
| Local IndexedDB document blobs | AES-GCM (Web Crypto) envelope | App (`doc-crypto.ts`) — demo safeguard |
| Database / object / backup at rest | Provider disk encryption (Supabase / Vercel Blob if used) | Cloud provider |
| Integration credentials | Prefer Supabase Vault / secrets manager refs (`credentials_ref`) | Ops |

**Forbidden:** home-grown ciphers, rolling your own RSA/AES modes, inventing MAC constructions, or storing production secrets in Git / frontend bundles / logs.

---

## 2. TLS — all communications & refuse insecure in production

### Implemented
- Middleware redirects cleartext to HTTPS when `NODE_ENV`/`HAVEN_ENV` is production (`ALLOW_INSECURE_HTTP=1` emergency override only).
- Response headers: `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`.
- Site-access cookies set `Secure` in production / when the request is already HTTPS.
- Remote image allowlist is HTTPS-only.

### Responsibilities
- **Ops:** terminate TLS at the edge; enable HTTPS-only custom domains; do not set `ALLOW_INSECURE_HTTP` in real environments.
- **App:** refuse HTTP in production middleware; never emit `http://` site URLs in production redirects (`NEXT_PUBLIC_SITE_URL` must be `https://…`).

### Limits
- App-level HTTPS enforcement depends on `x-forwarded-proto` from the proxy. Misconfigured proxies can break redirects.
- Third-party scripts (e.g. analytics) must also be loaded over HTTPS.

---

## 3. Encryption at rest (databases, objects, backups)

### Production (Supabase backend)
| Asset | Control |
|---|---|
| Postgres | Supabase/AWS volume encryption (provider default) — verify in project settings |
| Storage buckets | Private PHI buckets (`senior-documents`, `message-attachments`, `exports`); no public ACL |
| Backups / PITR | Provider-managed encrypted backups — enable per project plan |
| Extra PHI protection | Short-lived signed URLs only; elevated categories use shorter TTL + single-use grants |

### Local / demo backend
| Asset | Control |
|---|---|
| IndexedDB blobs | AES-GCM with a browser-local KEK (`doc-crypto.ts`) |
| localStorage JSON | **Not** ciphertext — demo only. Production must use `NEXT_PUBLIC_DATA_BACKEND=supabase` |

### Limits
- Provider “encryption at rest” is **not** application-level column encryption / CMEK unless purchased and configured.
- Client-side AES-GCM protects casual IDB inspection; a compromised browser profile can still access the KEK.
- Backups encryption is an **ops checklist item**, not enforced by application code.

---

## 4. Key management (KMS / equivalent) & rotation

| Key / secret | Where stored | Rotation |
|---|---|---|
| `SITE_ACCESS_PASSWORD` | Secrets manager → env (Vercel / Doppler / Infisical / AWS SM) | Rotate value; users re-enter gate password |
| `SITE_ACCESS_SIGNING_SECRET` | Secrets manager | Set new secret; keep old in `SITE_ACCESS_SIGNING_SECRET_PREVIOUS` for grace, then remove |
| `DOWNLOAD_SIGNING_SECRET` | Secrets manager | Same dual-secret grace via `DOWNLOAD_SIGNING_SECRET_PREVIOUS` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secrets manager (server only) | Rotate in Supabase dashboard; update env; revoke old |
| Supabase JWT secret | Supabase project | Rotate in dashboard (forces session invalidation) |
| Storage / DB CMEK | Cloud KMS (if enabled) | Follow cloud rotation policy |
| Local doc KEK | Browser `localStorage` | `clearLocalDocMasterKey()` + re-upload (demo) |

**Application code never embeds production secret values.** Signing uses Web Crypto HMAC-SHA256.

---

## 5. Secrets hygiene

### Rules
1. **Git:** `.env*` is gitignored. No passwords, service-role keys, or PEM private keys in the repo.
2. **Frontend:** only `NEXT_PUBLIC_*` non-secrets (anon key, project URL, GA id). Never put service-role or signing secrets in `NEXT_PUBLIC_*`.
3. **Logs:** use `redactForLog` / avoid logging Authorization headers, cookies, passwords, tokens.
4. **Config files:** `.env.example` lists **names only**.

### Secrets manager & environment separation
| Environment | Source |
|---|---|
| development | `.env.local` (developer machine) or unset site gate (gate disabled when password unset) |
| test | CI secrets / `HAVEN_ENV=test` |
| production | Vercel env / linked secrets manager; `HAVEN_ENV=production` |

Use **different values** for every secret across development, test, and production.

---

## 6. Temporary signed downloads

### Flow
1. Client calls `POST /api/documents/signed-download` with opaque `documentId` (+ category).
2. Server mints HMAC grant: **120s** standard, **60s** elevated (clinical/financial categories).
3. Client calls `POST /api/documents/consume-download` (single-use for elevated / production).
4. If Supabase backend + `storagePath`: also returns provider `createSignedUrl` with the same TTL.
5. Download filename is sanitized (`haven-{id}.pdf`) — **never** the original user filename in the Content-Disposition path for storage objects.

### Uploads
- `POST /api/documents/signed-upload` returns opaque path `{familyId}/{seniorId}/{documentId}/v{n}` and optional Supabase signed upload URL.

### Limits
- In-memory single-use `jti` tracking is per-instance (fine for single-region serverless with short TTL; for multi-instance use Redis/DB).
- Local demo still materializes a blob URL in-browser after grant consumption.

---

## 7. No homemade cryptography

| Allowed | Disallowed |
|---|---|
| Web Crypto AES-GCM, HMAC-SHA256, PBKDF2, SHA-256 digests for opaque keys | Custom XOR “encryption”, homemade block modes |
| Supabase Auth password hashing | Shipping SHA-256(password) as a KDF in production |
| Provider TLS / disk encryption | Invented token formats without MAC |

Legacy local SHA-256 password hashes are **rejected in production**; development may verify once to allow migration to PBKDF2 on password change.

---

## 8. No PII in filenames or URLs

| Control | Detail |
|---|---|
| Storage paths | UUID / opaque ids only |
| Message attachments | `{conversation}/{message}/{attachmentId}` — not original filename |
| Family localStorage keys | `haven-family-v5-{sha256…}` (legacy `v4-email` migrated away) |
| Auth redirects | Email kept in `sessionStorage`, not `?email=` |
| Messaging deep links | `?application=` (+ residence) only |

---

## 9. Historical Git findings (values not disclosed)

Scan of repository history (pattern-based; no secret values printed):

| Type | File | Recommended rotation |
|---|---|---|
| Hardcoded site gate password (fallback) | `src/lib/site-access.ts` | Set a **new** `SITE_ACCESS_PASSWORD` in the secrets manager; do not reuse any historically committed value; bump signing secret so old cookies die |
| Hardcoded site gate cookie constant | `src/lib/site-access.ts` | Already replaced by HMAC tokens (`site_access_v5`); rotate `SITE_ACCESS_SIGNING_SECRET` |
| Hardcoded GA measurement id | `src/app/layout.tsx` | Move to `NEXT_PUBLIC_GA_MEASUREMENT_ID`; rotate GA property if the id was considered sensitive for your threat model |
| Test / demo password string assignments | `scripts/test-auth.mjs`, message catalogs | Keep as fixtures only; never reuse as production credentials |

No AWS keys, PEM private keys, Slack webhooks, or database connection strings were detected in history by the automated scan. Re-run secret scanning (gitleaks / trufflehog) in CI on every push.

---

## 10. Ops checklist (production)

1. Secrets manager populated with distinct prod values (table in §4).
2. `NEXT_PUBLIC_DATA_BACKEND=supabase` and `NEXT_PUBLIC_SITE_URL=https://…`.
3. Apply Storage bucket SQL; confirm buckets private; enable PITR/backups.
4. Confirm Supabase dashboard disk encryption / SSL enforcement.
5. Deploy with HTTPS-only domain; verify HSTS and HTTP→HTTPS redirect.
6. Rotate any historically committed gate password / signing material.
7. Optional: enable CMEK / Vault for integration `credentials_ref`.

---

## 11. Code map

| Area | Path |
|---|---|
| TLS / headers | `src/lib/security/tls.ts`, `src/middleware.ts`, `next.config.ts` |
| Env / secrets helpers | `src/lib/security/env.ts` |
| HMAC / signed tokens | `src/lib/security/hmac.ts`, `signed-token.ts` |
| Download grants | `src/lib/security/download-grants.ts`, `src/app/api/documents/*` |
| Local blob AES-GCM | `src/lib/security/doc-crypto.ts`, `src/lib/doc-blobs.ts` |
| Opaque paths / filenames | `src/lib/security/storage-path.ts` |
| Site gate | `src/lib/site-access.ts`, `src/app/api/site-access/route.ts` |
| Demo password KDF | `src/lib/auth-crypto.ts` |
| Env template | `.env.example` |
