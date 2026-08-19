/** Response headers that forbid search-engine indexing of document bytes. */

export const DOCUMENT_NOINDEX_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Referrer-Policy": "no-referrer",
};

export function applyDocumentNoIndexHeaders(headers: Headers): void {
  for (const [k, v] of Object.entries(DOCUMENT_NOINDEX_HEADERS)) {
    headers.set(k, v);
  }
}
