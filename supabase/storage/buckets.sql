-- HavenApply Storage buckets
-- Apply via Supabase SQL editor or storage admin API after project creation.
-- Paths are enforced in Edge Functions; buckets themselves are private except community-media.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'senior-documents',
    'senior-documents',
    false,
    52428800, -- 50 MB
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'message-attachments',
    'message-attachments',
    false,
    26214400, -- 25 MB
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain'
    ]
  ),
  (
    'community-media',
    'community-media',
    true,
    10485760, -- 10 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'exports',
    'exports',
    false,
    104857600, -- 100 MB
    array['application/zip', 'application/json', 'text/csv', 'application/pdf']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Deny direct client Storage access for PHI buckets.
-- Uploads/downloads must go through Edge Functions (signed URLs after AuthZ).

drop policy if exists senior_documents_no_direct on storage.objects;
create policy senior_documents_no_direct on storage.objects
  for all to authenticated
  using (bucket_id <> 'senior-documents')
  with check (bucket_id <> 'senior-documents');

-- community-media: public read
drop policy if exists community_media_public_read on storage.objects;
create policy community_media_public_read on storage.objects
  for select
  using (bucket_id = 'community-media');

-- Path conventions (enforced in Edge Functions, not SQL):
-- senior-documents:     {family_id}/{senior_id}/{document_id}/v{version}
-- message-attachments:  {conversation_id}/{message_id}/{attachment_id}  (never original filename)
-- community-media:      {organization_id}/{community_id}/{asset_id}
-- exports:              {user_id}/{export_id}
-- Do not put emails, names, or other PII in object keys or signed URL paths.
