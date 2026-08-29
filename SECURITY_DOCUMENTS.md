# Document upload & access security

**Scope:** validation, malware heuristics, private storage, signed downloads, AuthZ, retention, noindex.  
**Does not claim:** full AV coverage without ClamAV, forensic metadata erasure for PDF/DOCX, or HIPAA certification.

## Controls implemented

| Requirement | Implementation |
|---|---|
| Format allowlist | `src/lib/documents/policy.ts` — PDF, JPEG, PNG, WEBP, DOC, DOCX |
| MIME + magic signature | `magic.ts` + mismatch rejection in `validate.ts` |
| Max size | `DOCUMENT_MAX_BYTES` (10 MB server); UI demo hint 4 MB |
| Server-generated names | `generateStorageFileName()` → `{32hex}.{ext}` |
| Private storage default | `data/private-documents/` + Supabase private buckets |
| Antivirus / malware | Heuristics (`malware.ts`) + optional `DOCUMENT_CLAMAV=1` → `clamscan` |
| Block executables / active content | MZ/ELF/Mach-O, PDF JS/Launch, SVG/HTML, macro OOXML/OLE |
| Double extensions | `hasBlockedDoubleExtension()` rejects `a.pdf.exe`, `a.jpg.js`, multi-ext |
| Path traversal | `assertSafeRelativeStoragePath()` |
| Metadata stripping | JPEG EXIF APP1 drop; PNG tEXt/iTXt/zTXt/eXIf |
| Signed short-lived links | HMAC grants 30–60s; single-use when elevated/prod |
| AuthZ at download | Tenant proof headers + re-check ownership on GET |
| Access logs | JSONL under `_logs/access-YYYY-MM-DD.jsonl` |
| Soft then hard delete | `softDeleteDocument` → trash; `purge-expired` / hard mode |
| Backup expiration | `backupExpireAt` + purge worker markers |
| No search indexing | `X-Robots-Tag` + `public/robots.txt` |
| No real docs in dev/test | `env-policy.ts` requires `demoFixture` + `demo-` name prefix |

## API surface

- `POST /api/documents/session` — tenant proof
- `POST /api/documents/upload` — validate → scan → store
- `POST /api/documents/signed-download` — AuthZ then mint grant
- `GET /api/documents/download?token=` — AuthZ + consume grant + stream
- `POST /api/documents/[id]/delete` — soft (default) or hard after soft
- `POST /api/documents/purge-expired` — Bearer `DOCUMENT_PURGE_CRON_SECRET`

## Headers required (browser)

- `X-Haven-Tenant-Id`
- `X-Haven-User-Id`
- `X-Haven-Tenant-Proof`

## Ops

Set secrets (different per env): `DOWNLOAD_SIGNING_SECRET`, `DOCUMENT_TENANT_PROOF_SECRET`, `DOCUMENT_PURGE_CRON_SECRET`.  
Optional: `DOCUMENT_CLAMAV=1`, `DOCUMENT_STORAGE_ROOT`, `ALLOW_REAL_DOCUMENTS_IN_NONPROD` (never in shared CI).

Apply migration `0011_document_security.sql` on Supabase. Keep Storage buckets private.

## Limits

- Heuristic AV is not a substitute for production ClamAV/ICAP.
- PDF/Office deep metadata scrubbing needs external tools.
- In-memory grant `jti` is per instance; use Redis for multi-region single-use if required.
- Local demo still caches a blob in IndexedDB for preview after server accept.

## Tests

`npm run test:document-security`
