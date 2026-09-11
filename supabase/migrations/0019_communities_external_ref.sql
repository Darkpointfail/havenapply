-- HavenApply 0019: external reference on communities
--
-- A community can now exist before it is a HavenApply client: imported from
-- an outside registry (e.g. the Québec RPA public registry) so families can
-- send it a dossier before it ever signs up (see the existing site-claim
-- flow in security/identity-store.ts#consumeSiteClaim). `external_ref`
-- carries that source system's own id (e.g. "rpa-1428") so the row can be
-- found again from it. A plain (non-partial) unique constraint is used
-- deliberately: Postgres allows any number of NULL rows under a standard
-- UNIQUE constraint, and a partial index (`where external_ref is not null`)
-- cannot be targeted by a simple `onConflict: "external_ref"` upsert.
--
-- Rollback: `alter table public.communities drop column external_ref;`

alter table public.communities
  add column if not exists external_ref text unique;

comment on column public.communities.external_ref is
  'Id from an external source registry (e.g. Québec RPA "rpa-1428"). Null for communities created directly in HavenApply.';
