import Link from "next/link";
import { deleteDocumentAction } from "@/app/actions/documents";
import { CSRF_FIELD } from "@/lib/csrf-constants";

export function DocumentList({
  documents,
  labels,
  canDownload,
  canDelete,
  csrfToken,
  locale,
  applicationId,
}: {
  documents: Array<{
    id: string;
    originalFileName: string;
    contentType: string;
    sizeBytes: number;
    status: string;
    scanAdapter: string | null;
    scanResult: string | null;
  }>;
  labels: {
    empty: string;
    preview: string;
    download: string;
    delete: string;
    notRealScan: string;
  };
  canDownload: boolean;
  canDelete: boolean;
  csrfToken?: string;
  locale?: string;
  applicationId?: string;
}) {
  if (documents.length === 0) {
    return <p className="mt-3 text-sm opacity-70">{labels.empty}</p>;
  }

  return (
    <ul className="mt-3 divide-y divide-[var(--line)]">
      {documents.map((doc) => (
        <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <div>
            <p className="font-medium">{doc.originalFileName}</p>
            <p className="opacity-60">
              {doc.contentType} · {Math.round(doc.sizeBytes / 1024)} KB · {doc.status}
              {doc.scanAdapter === "dev-passthrough" ? ` · ${labels.notRealScan}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canDownload && doc.status === "AVAILABLE" ? (
              <>
                <a
                  href={`/api/documents/${doc.id}/preview`}
                  className="underline opacity-80"
                  target="_blank"
                  rel="noreferrer"
                >
                  {labels.preview}
                </a>
                <a href={`/api/documents/${doc.id}/download`} className="underline opacity-80">
                  {labels.download}
                </a>
              </>
            ) : null}
            {canDelete && csrfToken && locale && applicationId && doc.status !== "DELETED" ? (
              <form
                action={deleteDocumentAction.bind(null, locale, applicationId, doc.id)}
              >
                <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                <button type="submit" className="text-red-700 underline opacity-80">
                  {labels.delete}
                </button>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

// silence unused Link if tree-shaken
void Link;
