# HavenApply — executable platform foundation

Family ↔ residence admission applications. This branch replaces the previous
demo/prototype with a production-shaped foundation: Next.js App Router,
PostgreSQL/Prisma, Auth.js database sessions, MinIO, and Mailpit.

## Stack

- **Next.js 16** (App Router) + TypeScript strict + Tailwind CSS 4
- **PostgreSQL 16** + **Prisma**
- **Auth.js** (`next-auth` v5) with **sessions stored in Postgres**
- **MinIO** (S3-compatible private object storage; abstraction also supports S3/R2)
- **Mailpit** (local SMTP catcher; abstraction also supports Resend)
- **Vitest** (unit) + **Playwright** (e2e)
- **Docker Compose** for local dependencies

## Quick start (fresh clone)

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/fr`).

### Dev accounts (seed only)

| Role   | Email                         | Password         | Flag            |
|--------|-------------------------------|------------------|-----------------|
| FAMILY | `family.dev@havenapply.local` | `DevOnlyPass123!` | `isDevAccount` |
| STAFF  | `staff.dev@havenapply.local`  | `DevOnlyPass123!` | `isDevAccount` |

These accounts are explicitly marked `isDevAccount=true`. There is **no** open
demo mode and **no** site-wide password gate.

### Local services

| Service  | URL / port                          |
|----------|-------------------------------------|
| App      | http://localhost:3000               |
| Postgres | `localhost:5432` (user/pass `haven`) |
| MinIO API | http://localhost:9000              |
| MinIO Console | http://localhost:9001          |
| Mailpit UI | http://localhost:8025             |
| Mailpit SMTP | `localhost:1025`                |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js development server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (starts `npm run dev` unless skipped) |
| `npm run db:migrate:dev` | Create/apply migrations (dev) |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed DEV accounts only |

## Architecture

```
src/
  app/[locale]/     # FR/EN pages (home, auth, empty dashboards)
  app/api/auth/     # Auth.js route handlers
  components/       # Minimal UI
  lib/
    env.ts          # Zod-validated environment
    prisma.ts       # Prisma client
    auth.ts         # Auth.js (DB sessions)
    auth-actions.ts # Register / login / password reset (creates Session rows)
    guards.ts       # requireSession / requireRole
    storage.ts      # MinIO / S3 / R2 via AWS SDK
    mail.ts         # SMTP (Mailpit) / Resend
    i18n.ts         # Minimal FR/EN dictionaries
prisma/             # Schema, migrations, seed
tests/unit|e2e      # Vitest + Playwright
```

### Auth model

Auth.js (`next-auth` v5) is configured with the **Prisma adapter** and database
session strategy. Password register/login lives in `auth-actions.ts`, which
creates a `Session` row and sets the `authjs.session-token` cookie. Session
reads use Prisma (`auth()` in `auth.ts`) because Auth.js refuses Credentials
providers when `strategy: "database"` is enabled. Models and cookie contract
remain Auth.js-compatible.

### Role guards

- Middleware: unauthenticated users cannot open `/family/*` or `/staff/*`
  (redirect to sign-in).
- Server layouts/pages: `requireRole("FAMILY"|"STAFF")` blocks cross-role
  access (redirect to `/access-denied`).

### Storage & email drivers

| Concern | Local | Production |
|---------|-------|------------|
| Files   | `STORAGE_DRIVER=minio` | `STORAGE_DRIVER=s3` (+ endpoint/keys for R2) |
| Email   | `EMAIL_DRIVER=smtp` → Mailpit | `EMAIL_DRIVER=resend` + `RESEND_API_KEY` |

## Decisions

1. **Greenfield foundation** on branch `cursor/platform-foundation-a002`.
2. **Password auth + DB sessions**: custom session creation (hashed token cookie
   `haven.session`) + Auth.js Prisma adapter models; not Credentials+JWT.
3. **Passwords**: Argon2id. **Auth tokens** (verify/reset): SHA-256 hashes only.
4. **Authorization**: caregiver memberships for families; org/site staff
   memberships + permissions for residences. Cross-tenant access returns 404.

## Remaining limits

- Document upload UI / signed download UI still minimal (services exist).
- Invitation outbox is dispatched fire-and-forget in-request (no dedicated worker/cron); expiry is evaluated on peek/accept (no background expire job).
- Invitation security emails always send (prefs do not apply) — documented below.
- Middleware enforces cookie presence; fine-grained authz is server-side.
- CI runs lint, typecheck, migrate, seed, vitest (Playwright local/optional).

### Invitations (env)

| Variable | Default | Meaning |
|----------|---------|---------|
| `INVITATION_TTL_HOURS` | `168` | One-time invite link lifetime |
| `INVITATION_ATTEMPT_LIMIT` | `20` | Max peek/accept attempts per IP+token window (15 min) |

Accept URLs are token-only (`/[locale]/invite/{caregiver\|staff}?t=…`) — no email in the query string.
Security invite emails go through the transactional outbox with idempotency keys; notification preferences do **not** suppress them.

## CI

GitHub Actions: install → prisma generate → migrate + seed → lint → typecheck → vitest.
