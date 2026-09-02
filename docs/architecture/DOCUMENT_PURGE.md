/**
 * Deferred object purge for soft-deleted documents
 * ================================================
 *
 * Soft-delete (`document.deleted`) immediately sets:
 * - status = DELETED
 * - deletedAt = now
 * - purgeAfter = now + DOCUMENT_PURGE_DELAY_DAYS (default 30)
 *
 * The object remains in private MinIO/S3 until an ops job calls
 * `purgeDeletedDocuments()` from `src/lib/documents.ts`, which:
 * 1. selects DELETED rows with purgeAfter <= now
 * 2. hard-deletes the object via `storage.deleteObject`
 * 3. removes the DB row
 *
 * Do not purge on the request path. Schedule via cron / worker.
 */
export {};
