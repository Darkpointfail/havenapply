"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Lock,
  Replace,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getDocBlob, putDocBlob } from "@/lib/doc-blobs";
import {
  DOC_CATEGORIES,
  DOC_STATUSES,
  MAX_DOC_BYTES,
  SHARE_TARGETS,
  categoryLabel,
  documentReadiness,
  effectiveStatus,
  formatFileSize,
  statusMeta,
  type DocCategoryId,
  type DocStatus,
  type VaultDocument,
} from "@/lib/document-vault";
import { useFamilyData } from "@/lib/family-data";
import { SENSITIVE_WARNING } from "@/lib/privacy-security";
import { usePrivacySecurityOptional } from "@/lib/privacy-security-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

type FilterStatus = "all" | DocStatus | "missing_prep";

export default function DocumentsPage() {

  const t = useT();  const {
    ready,
    data,
    addDocument,
    updateDocument,
    replaceDocumentFile,
    removeDocument,
    toggleShare,
    toggleApplicationAttach,
  } = useFamilyData();
  const privacy = usePrivacySecurityOptional();

  const [categoryFilter, setCategoryFilter] = useState<DocCategoryId | "all">("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [dragOver, setDragOver] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [accessId, setAccessId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocCategoryId>("identification");
  const [description, setDescription] = useState("");
  const [expires, setExpires] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const readiness = useMemo(
    () => documentReadiness(data.documents, data.documentRequests || []),
    [data.documents, data.documentRequests],
  );

  const filtered = useMemo(() => {
    return data.documents.filter((d) => {
      if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
      const st = effectiveStatus(d);
      if (statusFilter !== "all" && statusFilter !== "missing_prep" && st !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [data.documents, categoryFilter, statusFilter]);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      if (!previewId) {
        setPreviewUrl(null);
        return;
      }
      const blob = await getDocBlob(previewId);
      if (cancelled) return;
      if (blob) {
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [previewId]);

  const checklistPickRef = useRef(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setExpires("");
    setPendingFile(null);
    setCategory("identification");
    setFormOpen(false);
    setError(null);
    checklistPickRef.current = false;
  };

  const openUploadForChecklist = (row: {
    category: DocCategoryId;
    label: string;
    requestedBy?: string;
  }) => {
    setError(null);
    setCategory(row.category);
    setName(row.label);
    setDescription(row.requestedBy ? `Requested by ${row.requestedBy}` : "");
    setExpires("");
    setPendingFile(null);
    setFormOpen(true);
    checklistPickRef.current = true;
    window.setTimeout(() => {
      fileRef.current?.click();
      document.getElementById("doc-upload-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  };

  const ingestFile = async (file: File, overrides?: Partial<{ category: DocCategoryId; name: string; expires: string; description: string }>) => {
    setError(null);
    if (file.size > MAX_DOC_BYTES) {
      setError("This file is larger than the 4 MB demo limit. Choose a smaller file or photo.");
      return;
    }
    setBusy(true);
    try {
      const id = addDocument({
        name: overrides?.name || file.name,
        category: overrides?.category || category,
        description: overrides?.description ?? description,
        size: formatFileSize(file.size),
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        expires: (overrides?.expires ?? expires) || null,
        hasFile: true,
        status: "uploaded",
      });
      if (id) await putDocBlob(id, file);
      resetForm();
    } catch {
      setError("Could not save this file on this device. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onDropFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    setPendingFile(file);
    if (!checklistPickRef.current) {
      setName(file.name.replace(/\.[^.]+$/, "") || file.name);
    }
    checklistPickRef.current = false;
    setFormOpen(true);
  };

  const onSubmitMeta = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pendingFile) {
      await ingestFile(pendingFile, {
        name: name.trim() || pendingFile.name,
        category,
        description,
        expires,
      });
      return;
    }
    if (!name.trim()) {
      setError("Please name the document or choose a file.");
      return;
    }
    addDocument({
      name: name.trim(),
      category,
      description,
      expires: expires || null,
      hasFile: false,
      status: "uploaded",
    });
    resetForm();
  };

  const downloadDoc = async (doc: VaultDocument) => {
    if (
      !confirm(
        `${SENSITIVE_WARNING}\n\nDownload “${doc.name}”? This action is recorded in your access history.`,
      )
    ) {
      return;
    }
    const blob = await getDocBlob(doc.id);
    if (!blob) {
      setError("No file is stored for this document yet. Upload or replace a file to download.");
      return;
    }

    // Short-lived signed grant (server HMAC) before releasing the file.
    const grantRes = await fetch("/api/documents/signed-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: doc.id,
        category: doc.category,
        mimeType: doc.mimeType,
        originalName: doc.name,
      }),
    });
    const grantJson = (await grantRes.json().catch(() => null)) as {
      ok?: boolean;
      data?: { token?: string; filename?: string; downloadUrl?: string };
      error?: string;
    } | null;
    if (!grantRes.ok || !grantJson?.ok || !grantJson.data?.token) {
      setError(grantJson?.error || "Could not create a secure download link.");
      return;
    }

    const consumeRes = await fetch("/api/documents/consume-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: grantJson.data.token }),
    });
    if (!consumeRes.ok) {
      setError("Download link expired or already used. Try again.");
      return;
    }

    privacy?.logAccess({
      action: "download",
      resource: doc.name,
      detail: `Category: ${doc.category}`,
    });

    if (grantJson.data.downloadUrl) {
      window.location.assign(grantJson.data.downloadUrl);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = grantJson.data.filename || `haven-${doc.id}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onReplace = async (files: FileList | null) => {
    if (!files?.length || !replaceTargetId) return;
    const file = files[0];
    if (file.size > MAX_DOC_BYTES) {
      setError("Replacement file exceeds the 4 MB demo limit.");
      return;
    }
    setBusy(true);
    try {
      await putDocBlob(replaceTargetId, file);
      replaceDocumentFile(replaceTargetId, {
        name: file.name,
        size: formatFileSize(file.size),
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      });
      setReplaceTargetId(null);
    } catch {
      setError("Could not replace this file.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Loading your document center…")}
      </div>
    );
  }

  const previewDoc = previewId ? data.documents.find((d) => d.id === previewId) : null;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Document center")}
        description="Store admissions paperwork privately. Nothing is shared with a community until you attach it to an application."
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Documents" },
        ]}
        actions={
          <Button
            onClick={() => {
              setFormOpen(true);
              setPendingFile(null);
            }}
          >
            <Upload size={16} /> Add document
          </Button>
        }
      />

      <Card className="mb-6 border-brand/20 bg-brand-soft/30 p-4">
        <div className="flex gap-3">
          <Lock className="mt-0.5 shrink-0 text-brand" size={18} />
          <p className="text-sm text-ink-muted">
            Documents stay <strong className="font-medium text-ink">private by default</strong>. Use
            “Share with application” to attach files to a specific candidacy.
          </p>
        </div>
      </Card>

      {/* Readiness board */}
      <div className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand">
                {t("Preparation checklist")}
              </p>
              <h2 className="mt-1 text-xl font-semibold">Admissions readiness</h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold text-brand">{readiness.completeness}%</p>
              <p className="text-xs text-ink-muted">Document completeness</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-soft">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${readiness.completeness}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Added", readiness.uploaded],
              ["Missing", readiness.missing],
              ["Expired", readiness.expired],
              ["Requested", readiness.requestedMissing],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-bg-soft px-3 py-2">
                <p className="text-lg font-semibold">{value as number}</p>
                <p className="text-xs text-ink-muted">{label as string}</p>
              </div>
            ))}
          </div>
          <ul className="mt-5 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {readiness.checklist.map((row) => {
              const needsUpload =
                row.state === "missing" ||
                row.state === "expired" ||
                row.state === "rejected" ||
                row.state === "needs_replacement";
              return (
                <li
                  key={`${row.category}-${row.label}-${row.requestedBy || ""}`}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 transition",
                    needsUpload
                      ? "border-line bg-surface hover:border-brand/35"
                      : "border-line/70 bg-bg-soft/40",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-ink-faint">
                      {row.priority === "requested"
                        ? `Requested by ${row.requestedBy}`
                        : row.priority === "required"
                          ? "Required for most applications"
                          : "Recommended"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    <Badge
                      tone={
                        row.state === "missing"
                          ? "neutral"
                          : row.state === "expired" ||
                              row.state === "rejected" ||
                              row.state === "needs_replacement"
                            ? "danger"
                            : row.state === "verified"
                              ? "success"
                              : "brand"
                      }
                    >
                      {row.state === "missing"
                        ? "Missing"
                        : statusMeta(row.state as DocStatus).label}
                    </Badge>
                    {needsUpload ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="soft"
                        onClick={() => openUploadForChecklist(row)}
                      >
                        <Upload size={14} /> Add
                      </Button>
                    ) : row.documentIds[0] ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReplaceTargetId(row.documentIds[0]);
                          replaceRef.current?.click();
                        }}
                      >
                        Replace
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            Tap <span className="font-medium text-ink-muted">Add</span> on a line to choose the
            document type and upload the matching file.
          </p>
        </Card>

        <Card className="flex flex-col p-5">
          <h2 className="text-lg font-semibold">Facility requests</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t("Documents asked for by communities on active applications.")}
          </p>
          <ul className="mt-4 flex-1 space-y-3">
            {(data.documentRequests || []).map((req) => {
              const have = data.documents.some((d) => d.category === req.category);
              return (
                <li key={req.id} className="rounded-2xl border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{req.label}</p>
                      <p className="text-xs text-ink-muted">
                        {req.communityName}
                        {req.dueLabel ? ` · ${req.dueLabel}` : ""}
                      </p>
                    </div>
                    <Badge tone={have ? "success" : "warn"}>{have ? "On file" : "Needed"}</Badge>
                  </div>
                  {req.notes && <p className="mt-2 text-xs text-ink-faint">{req.notes}</p>}
                  <Button
                    size="sm"
                    variant="soft"
                    className="mt-3"
                    onClick={() =>
                      openUploadForChecklist({
                        category: req.category,
                        label: req.label,
                        requestedBy: req.communityName,
                      })
                    }
                  >
                    <Upload size={14} /> Upload for this request
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "rounded-[1.5rem] border-2 border-dashed px-6 py-10 text-center transition",
          dragOver ? "border-brand bg-brand-soft/40" : "border-line bg-bg-soft/40",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onDropFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto text-brand" size={32} />
        <p className="mt-3 text-lg font-semibold">Drag & drop a file here</p>
        <p className="mt-1 text-sm text-ink-muted">
          {t("PDF, JPG, PNG · up to 4 MB · stored only on this device for the demo")}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
            {t("Browse files")}
          </Button>
          <Button type="button" variant="soft" onClick={() => cameraRef.current?.click()}>
            <Camera size={16} /> Take or import photo
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,image/*"
            onChange={(e) => void onDropFiles(e.target.files)}
          />
          <input
            ref={cameraRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={(e) => void onDropFiles(e.target.files)}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {formOpen && (
        <div id="doc-upload-form" className="scroll-mt-24">
        <Card className="mt-6 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              {pendingFile ? "Finish upload details" : "Add document"}
            </h2>
            <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-bg-soft" onClick={resetForm}>
              <X size={16} />
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Type selected:{" "}
            <span className="font-medium text-ink">{categoryLabel(category)}</span>
            {name ? (
              <>
                {" "}
                · <span className="text-ink">{name}</span>
              </>
            ) : null}
          </p>
          {pendingFile && (
            <p className="mt-2 text-sm text-ink-muted">
              File ready: <span className="font-medium text-ink">{pendingFile.name}</span> (
              {formatFileSize(pendingFile.size)})
            </p>
          )}
          <form onSubmit={onSubmitMeta} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="font-medium">Document name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-soft px-3 py-2.5 outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium">What is this document?</span>
              <select
                value={category}
                onChange={(e) => {
                  const next = e.target.value as DocCategoryId;
                  setCategory(next);
                  const fromChecklist = readiness.checklist.find((r) => r.category === next);
                  if (fromChecklist && (!name.trim() || readiness.checklist.some((r) => r.label === name))) {
                    setName(fromChecklist.label);
                  }
                }}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-soft px-3 py-2.5"
              >
                {DOC_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium">Expiration date</span>
              <input
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-soft px-3 py-2.5 outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="font-medium">Description</span>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("Optional notes for your family")}
                className="mt-1.5 w-full rounded-xl border border-line bg-bg-soft px-3 py-2.5 outline-none focus:border-brand"
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : pendingFile ? "Save document" : "Add to vault"}
              </Button>
              {!pendingFile && (
                <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                  {t("Choose file instead")}
                </Button>
              )}
            </div>
          </form>
        </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium",
            categoryFilter === "all" ? "bg-brand text-white" : "bg-bg-soft text-ink-muted",
          )}
        >
          All ({data.documents.length})
        </button>
        {DOC_CATEGORIES.map((c) => {
          const count = data.documents.filter((d) => d.category === c.id).length;
          if (!count && categoryFilter !== c.id) return null;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium",
                categoryFilter === c.id ? "bg-brand text-white" : "bg-bg-soft text-ink-muted",
              )}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            statusFilter === "all" ? "bg-ink text-white" : "bg-bg-soft text-ink-muted",
          )}
        >
          {t("Any status")}
        </button>
        {DOC_STATUSES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStatusFilter(s.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              statusFilter === s.id ? "bg-ink text-white" : "bg-bg-soft text-ink-muted",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((doc) => {
          const st = effectiveStatus(doc);
          const meta = statusMeta(st);
          return (
            <Card key={doc.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <FileText size={20} />
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <h3 className="mt-4 font-semibold leading-snug">{doc.name}</h3>
              <p className="mt-1 text-sm text-ink-muted">{categoryLabel(doc.category)}</p>
              {doc.description && (
                <p className="mt-2 line-clamp-2 text-sm text-ink-faint">{doc.description}</p>
              )}
              <p className="mt-2 text-xs text-ink-faint">
                Updated {doc.updated} · {doc.size}
                {doc.hasFile ? "" : " · metadata only"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {doc.expires && (
                  <Badge tone={st === "expired" ? "danger" : "warn"}>
                    <Clock3 size={12} /> Expires {doc.expires}
                  </Badge>
                )}
                {doc.sharedWith.length === 0 ? (
                  <Badge tone="neutral">
                    <Lock size={12} /> Private
                  </Badge>
                ) : (
                  <Badge tone="brand">
                    <Share2 size={12} /> Shared ({doc.sharedWith.length})
                  </Badge>
                )}
              </div>

              {accessId === doc.id && (
                <div className="mt-3 space-y-2 rounded-2xl bg-bg-soft p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {t("Who can access")}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {doc.sharedWith.length === 0
                      ? "Only your family account, not attached to any application."
                      : null}
                  </p>
                  {SHARE_TARGETS.map((t) => {
                    const on =
                      doc.attachedToApplications.includes(t.id) || doc.sharedWith.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center justify-between gap-2 text-sm"
                      >
                        <span>{t.label}</span>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => {
                            if (t.kind === "application") {
                              if (
                                !on &&
                                !confirm(
                                  `${SENSITIVE_WARNING}\n\nAttach “${doc.name}” to ${t.label}?`,
                                )
                              ) {
                                return;
                              }
                              toggleApplicationAttach(doc.id, t.id);
                              if (!on) {
                                privacy?.logAccess({
                                  action: "share",
                                  resource: doc.name,
                                  detail: `Attached to ${t.label}`,
                                });
                              }
                            } else {
                              if (
                                !on &&
                                !confirm(
                                  `${SENSITIVE_WARNING}\n\nShare “${doc.name}” with ${t.label}?`,
                                )
                              ) {
                                return;
                              }
                              toggleShare(doc.id, t.id);
                              privacy?.logAccess({
                                action: on ? "revoke_share" : "share",
                                resource: doc.name,
                                detail: t.label,
                              });
                            }
                          }}
                          className="h-4 w-4 accent-[var(--brand)]"
                        />
                      </label>
                    );
                  })}
                  <p className="text-xs text-ink-faint">
                    {t("Checking a box explicitly attaches this document for that application.")}
                  </p>
                </div>
              )}

              {editId === doc.id && (
                <div className="mt-3 space-y-2 rounded-2xl border border-line p-3">
                  <label className="block text-xs font-medium">Status</label>
                  <select
                    value={doc.status}
                    onChange={(e) =>
                      updateDocument(doc.id, { status: e.target.value as DocStatus })
                    }
                    className="w-full rounded-xl border border-line bg-bg-soft px-3 py-2 text-sm"
                  >
                    {DOC_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <label className="block text-xs font-medium">Description</label>
                  <textarea
                    rows={2}
                    defaultValue={doc.description}
                    onBlur={(e) => updateDocument(doc.id, { description: e.target.value })}
                    className="w-full rounded-xl border border-line bg-bg-soft px-3 py-2 text-sm"
                  />
                  <label className="block text-xs font-medium">Expires</label>
                  <input
                    type="date"
                    defaultValue={doc.expires || ""}
                    onChange={(e) => updateDocument(doc.id, { expires: e.target.value || null })}
                    className="w-full rounded-xl border border-line bg-bg-soft px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button size="sm" variant="soft" onClick={() => setPreviewId(doc.id)}>
                  <Eye size={14} /> Preview
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void downloadDoc(doc)}>
                  <Download size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReplaceTargetId(doc.id);
                    replaceRef.current?.click();
                  }}
                >
                  <Replace size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAccessId(accessId === doc.id ? null : doc.id)}
                >
                  <Share2 size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditId(editId === doc.id ? null : doc.id)}
                >
                  {t("Edit")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => {
                    if (
                      confirm(
                        `${SENSITIVE_WARNING}\n\nPermanently delete “${doc.name}” from your vault? This cannot be undone in this browser.`,
                      )
                    ) {
                      privacy?.logAccess({ action: "delete", resource: doc.name });
                      removeDocument(doc.id);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <input
        ref={replaceRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,image/*"
        onChange={(e) => void onReplace(e.target.files)}
      />

      {filtered.length === 0 && (
        <div className="mt-12 text-center">
          <CheckCircle2 className="mx-auto text-ink-faint" size={28} />
          <p className="mt-3 font-semibold">No documents in this filter</p>
          <p className="mt-1 text-sm text-ink-muted">Upload a file or clear filters to see your vault.</p>
        </div>
      )}

      {/* Preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-semibold">{previewDoc.name}</p>
                <p className="text-sm text-ink-muted">{categoryLabel(previewDoc.category)}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-bg-soft"
                onClick={() => setPreviewId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto bg-bg-soft p-4">
              {previewUrl ? (
                previewDoc.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={previewDoc.name} className="mx-auto max-h-[65vh] rounded-xl" />
                ) : previewDoc.mimeType === "application/pdf" ? (
                  <iframe title={previewDoc.name} src={previewUrl} className="h-[65vh] w-full rounded-xl bg-white" />
                ) : (
                  <p className="p-8 text-center text-sm text-ink-muted">
                    {t("Preview not available for this file type. Use Download instead.")}
                  </p>
                )
              ) : (
                <p className="p-8 text-center text-sm text-ink-muted">
                  {t("No file blob stored for preview. Replace/upload a file to enable preview and")}
                  download.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
              <Button size="sm" onClick={() => void downloadDoc(previewDoc)}>
                <Download size={14} /> Download
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreviewId(null)}>
                {t("Close")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
