# HavenApply — Edge Functions contracts

Implementation language: Deno / Supabase Edge Functions.  
Auth: Bearer JWT (`Authorization` header). Service role used only after AuthZ checks.

Base path: `/functions/v1/<name>`

Shared response shape:

```json
{ "ok": true, "data": {} }
{ "ok": false, "error": "message", "code": "UNAUTHORIZED" }
```

---

## `create-signed-upload`

**Purpose:** Create `documents` row (`status=uploading`) + signed upload URL.

**Body**
```json
{
  "senior_id": "uuid",
  "category": "medical",
  "title": "Physician report",
  "mime_type": "application/pdf",
  "byte_size": 123456
}
```

**AuthZ:** `is_family_editor(senior.family_id)`

**Result**
```json
{
  "ok": true,
  "data": {
    "document_id": "uuid",
    "bucket": "senior-documents",
    "storage_path": "{family_id}/{senior_id}/{document_id}/v1",
    "upload_url": "https://…",
    "expires_in": 600
  }
}
```

---

## `create-signed-download`

**Body:** `{ "document_id": "uuid", "application_id": "uuid?" }`

**AuthZ:** family member on doc **or** active `document_access` for staff.

**Side effect:** insert `document_access_logs`.

**Result:** `{ "download_url", "expires_in" }` — TTL ≤ 120s (≤ 60s for elevated clinical/financial categories). Object keys must be opaque UUIDs; never put original filenames or PII in the storage path.

---

## `submit-application`

**Body**
```json
{
  "application_id": "uuid",
  "document_ids": ["uuid"],
  "consent_share": true,
  "consent_accurate": true,
  "signature_name": "Jane Doe",
  "desired_move_in": "2026-09"
}
```

**AuthZ:** `is_family_editor(application.family_id)` · status must be `draft`

**Transaction**
1. Set status `submitted` (+ `submitted_at`)
2. Link `application_documents`
3. Insert `document_access` rows for community
4. Timeline event `submitted`
5. Outbox `application.submitted` (via trigger / explicit)
6. Ensure `conversations` row exists

**Idempotent** if already submitted for same id.

---

## `withdraw-application`

**Body:** `{ "application_id": "uuid", "reason": "string?" }`

**AuthZ:** family owner/editor  
**Effect:** status `withdrawn` · revoke open document_access · outbox `application.withdrawn`

---

## `community-application-action`

**Body**
```json
{
  "application_id": "uuid",
  "action": "accept | decline | request_info | request_document | propose_tour | propose_assessment | change_status",
  "note": "string?",
  "when": "ISO-8601?",
  "status": "application_status?"
}
```

**AuthZ:** `has_community_permission` mapped per action  
**Effect:** status update · timeline · optional `tours` row · notifications via outbox

---

## `invite-family-member`

**Body:** `{ "family_id", "email", "role" }`  
Creates `family_invitations` + outbox email event.

## `accept-invite`

**Body:** `{ "token" }`  
Creates `family_members` · marks invitation accepted.

## `invite-community-member`

**Body:** `{ "organization_id", "community_id?", "email", "role", "job_title?" }`  
AuthZ: `manage_team` / org admin.

---

## `dispatch-outbox`

**Trigger:** Cron (every 5–15s) · service role  
Claims `outbox_events` where `status in ('pending','failed')` and `next_attempt_at <= now()`  
`FOR UPDATE SKIP LOCKED` · deliver · mark `sent` or backoff.

---

## `inbound-webhook`

**Path params / headers:** provider key + signature  
Verify → insert `webhook_events` → enqueue processing.

---

## `generate-compatibility`

**Body:** `{ "senior_id", "community_id", "application_id?" }`  
Writes `compatibility_analyses` with `version`, `weights`, `reasoning`, `expires_at`  
Optionally updates `applications.compatibility_score_cached`.

---

## `search-communities`

Thin HTTP wrapper around SQL RPC `search_communities` (optional; clients may call RPC directly).

---

## Stub layout (next phase)

```text
supabase/functions/
  _shared/cors.ts
  _shared/supabase.ts
  create-signed-upload/index.ts
  create-signed-download/index.ts
  submit-application/index.ts
  withdraw-application/index.ts
  community-application-action/index.ts
  invite-family-member/index.ts
  accept-invite/index.ts
  invite-community-member/index.ts
  dispatch-outbox/index.ts
  inbound-webhook/index.ts
  generate-compatibility/index.ts
```

TypeScript stubs are intentionally deferred until Supabase project + secrets exist; contracts above are the source of truth for implementation.
