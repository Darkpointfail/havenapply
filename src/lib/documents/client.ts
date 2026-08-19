/**
 * Browser helpers for the secure document API.
 */

export type DocumentTenantSession = {
  tenantId: string;
  userId: string;
  proof: string;
};

export async function fetchDocumentTenantSession(
  userId: string,
): Promise<DocumentTenantSession> {
  const res = await fetch("/api/documents/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: DocumentTenantSession;
    error?: string;
  };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || "Could not establish document session");
  }
  return json.data;
}

function tenantHeaders(session: DocumentTenantSession): HeadersInit {
  return {
    "X-Haven-Tenant-Id": session.tenantId,
    "X-Haven-User-Id": session.userId,
    "X-Haven-Tenant-Proof": session.proof,
  };
}

export async function secureUploadDocument(opts: {
  session: DocumentTenantSession;
  file: File;
  category: string;
  title: string;
  demoFixture?: boolean;
}): Promise<{
  id: string;
  storageFileName: string;
  mime: string;
  byteSize: number;
  checksumSha256: string;
}> {
  const form = new FormData();
  // Ensure non-prod fixture naming when required
  const file =
    opts.demoFixture && !/^(demo|fixture|sample|test)[-_]/i.test(opts.file.name)
      ? new File([opts.file], `demo-${opts.file.name}`, { type: opts.file.type })
      : opts.file;
  form.set("file", file);
  form.set("category", opts.category);
  form.set("title", opts.title);
  if (opts.demoFixture) form.set("demoFixture", "1");

  const res = await fetch("/api/documents/upload", {
    method: "POST",
    headers: tenantHeaders(opts.session),
    body: form,
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: {
      id: string;
      storageFileName: string;
      mime: string;
      byteSize: number;
      checksumSha256: string;
    };
    error?: string;
  };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || "Upload rejected");
  }
  return json.data;
}

export async function secureDownloadDocument(opts: {
  session: DocumentTenantSession;
  documentId: string;
}): Promise<Blob> {
  const grantRes = await fetch("/api/documents/signed-download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...tenantHeaders(opts.session),
    },
    body: JSON.stringify({ documentId: opts.documentId }),
  });
  const grantJson = (await grantRes.json()) as {
    ok?: boolean;
    data?: { downloadPath?: string };
    error?: string;
  };
  if (!grantRes.ok || !grantJson.ok || !grantJson.data?.downloadPath) {
    throw new Error(grantJson.error || "Could not create download link");
  }

  const dl = await fetch(grantJson.data.downloadPath, {
    headers: tenantHeaders(opts.session),
  });
  if (!dl.ok) {
    throw new Error("Download denied");
  }
  return dl.blob();
}

export async function secureSoftDeleteDocument(opts: {
  session: DocumentTenantSession;
  documentId: string;
}): Promise<void> {
  const res = await fetch(`/api/documents/${encodeURIComponent(opts.documentId)}/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...tenantHeaders(opts.session),
    },
    body: JSON.stringify({ mode: "soft" }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error || "Delete failed");
  }
}
