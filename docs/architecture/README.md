# HavenApply Architecture

Canonical backend / data architecture for HavenApply (US senior-living common application).

| Doc | Contents |
| --- | --- |
| [DATA_MODEL.md](./DATA_MODEL.md) | Domains, ERD, enums, conventions, `organizations → communities` |
| [BACKEND.md](./BACKEND.md) | Edge Functions, outbox, Realtime, jobs |
| [RLS_MATRIX.md](./RLS_MATRIX.md) | Who can read/write what |
| [MIGRATION_FROM_PROTOTYPE.md](./MIGRATION_FROM_PROTOTYPE.md) | localStorage → Supabase cutover |

SQL migrations: [`../../supabase/migrations/`](../../supabase/migrations/)  
Storage buckets: [`../../supabase/storage/buckets.sql`](../../supabase/storage/buckets.sql)  
Edge contracts: [`../../supabase/functions/_index.md`](../../supabase/functions/_index.md)
