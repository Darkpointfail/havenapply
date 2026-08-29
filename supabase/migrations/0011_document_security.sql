-- Document security enhancements (scan, quarantine, retention, access logs hardening)
-- Apply after 0002 / 0004 document tables exist.

alter table public.documents
  add column if not exists scan_status text not null default 'pending'
    check (scan_status in ('pending', 'clean', 'quarantined', 'error')),
  add column if not exists scan_engine text,
  add column if not exists scan_detail text,
  add column if not exists original_filename_hash text,
  add column if not exists purge_after timestamptz,
  add column if not exists backup_expire_at timestamptz;

comment on column public.documents.original_filename_hash is
  'SHA-256 of original client filename for support correlation — never store raw PII filenames';
comment on column public.documents.purge_after is
  'Physical delete eligible after soft-delete retention window';
comment on column public.documents.backup_expire_at is
  'Marker for backup jobs to drop document payloads from long-term backups';

-- Ensure PHI buckets stay private (idempotent with buckets.sql)
-- Direct client Storage access remains denied for senior-documents.

create index if not exists documents_purge_after_idx
  on public.documents (purge_after)
  where deleted_at is not null and purge_after is not null;

create index if not exists documents_scan_status_idx
  on public.documents (scan_status)
  where deleted_at is null;
