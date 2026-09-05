# HavenApply Architecture

Canonical backend / data architecture for HavenApply (US senior-living common application).

| Doc | Contents |
| --- | --- |
| [AUDIT_ORGANISATION_IDENTITES.md](./AUDIT_ORGANISATION_IDENTITES.md) | **FR · Notion** — audit + architecture d’organisation (P/D/A/R, refs `HA-*`, écarts prototype) |
| [DATA_MODEL.md](./DATA_MODEL.md) | Domains, ERD, enums, conventions, `organizations → communities` |
| [BACKEND.md](./BACKEND.md) | Edge Functions, outbox, Realtime, jobs |
| [RLS_MATRIX.md](./RLS_MATRIX.md) | Who can read/write what |
| [RLS_TESTING.md](./RLS_TESTING.md) | **FR** — exercer les politiques contre PostgreSQL, et ce que l'exécution a corrigé |
| [IDENTITY_PARITY.md](./IDENTITY_PARITY.md) | **FR** — identité ancrée sur `auth.users`, migration des comptes `usr_<uuid>`, comportement si une correspondance manque |
| [MIGRATION_FROM_PROTOTYPE.md](./MIGRATION_FROM_PROTOTYPE.md) | localStorage → Supabase cutover |

SQL migrations: [`../../supabase/migrations/`](../../supabase/migrations/)  
Storage buckets: [`../../supabase/storage/buckets.sql`](../../supabase/storage/buckets.sql)  
Edge contracts: [`../../supabase/functions/_index.md`](../../supabase/functions/_index.md)
