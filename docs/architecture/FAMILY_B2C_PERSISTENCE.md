# B2C family persistence (phase)

## Commands

```bash
# Apply SQL (Supabase CLI or SQL editor)
# Migrations: supabase/migrations/0001_*.sql … 0008_family_b2c_persistence.sql

npm test                 # vitest (family store, authz helpers, completeness)
npm run test:family      # family suite only
npm run build
npm run lint
```

## Local backend

With `NEXT_PUBLIC_DATA_BACKEND` unset or `local`:

- Family data persists under `.data/family/` (gitignored)
- Document bytes under `.data/family-docs/`
- Session cookie `haven-family-session` signed with `HAVEN_SESSION_SECRET`

## Supabase backend

Set `NEXT_PUBLIC_DATA_BACKEND=supabase` plus Supabase URL/keys, apply migrations including `0008`.
