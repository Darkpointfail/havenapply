"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileUp,
  Sparkles,
  Trash2,
} from "lucide-react";
import { SectionCard, StepIntro } from "@/components/dossier/DossierFields";
import {
  DOSSIER_DOC_CATEGORIES,
  detectDocumentCategory,
  documentsByDossierCategory,
} from "@/lib/resident-dossier";
import { useFamilyData } from "@/lib/family-data";
import { putDocBlob } from "@/lib/doc-blobs";
import { formatFileSize } from "@/lib/document-vault";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function StepDocuments() {
  const t = useT();
  const { data, addDocument, removeDocument } = useFamilyData();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [lastDetect, setLastDetect] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const grouped = documentsByDossierCategory(data.documents);
  const missing = DOSSIER_DOC_CATEGORIES.filter(
    (c) => c.recommended && !data.documents.some((d) => d.category === c.vault),
  );

  const ingestFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    startTransition(async () => {
      for (const file of list) {
        const detected = detectDocumentCategory(file.name, file.type);
        const id = addDocument({
          name: file.name,
          category: detected.vault,
          description:
            detected.confidence === "low"
              ? "Auto-sorted to Other — you can change this later"
              : `Auto-detected: ${detected.label}`,
          size: formatFileSize(file.size),
          sizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
          hasFile: true,
          status: "uploaded",
        });
        if (id) await putDocBlob(id, file);
        setLastDetect(
          detected.confidence === "low"
            ? t("Added as Other — review the category if needed")
            : t("Sorted into {category}", { category: t(detected.label) }),
        );
      }
    });
  };

  return (
    <div className="animate-rise">
      <StepIntro
        eyebrow="Step 6 of 9"
        title="Documents"
        subtitle="Drop files here once. Haven sorts them for every application."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) ingestFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 py-12 text-center transition",
          dragging
            ? "border-brand bg-brand-soft/50"
            : "border-line bg-bg-soft/50 hover:border-brand/40",
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white">
          <FileUp size={22} />
        </span>
        <p className="mt-4 text-lg font-semibold text-ink">{t("Drag & drop files")}</p>
        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          {t("PDF, photos, or scans. AI places each file in the right category.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90"
          >
            {t("Browse files")}
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:border-brand/40"
          >
            <Camera size={16} />
            {t("Scan from phone")}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => {
            if (e.target.files?.length) ingestFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) ingestFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {lastDetect ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-brand">
          <Sparkles size={14} />
          {lastDetect}
        </p>
      ) : null}

      {missing.length ? (
        <SectionCard className="mt-6 border-amber-200/80 bg-amber-soft/40">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber" size={18} />
            <div>
              <p className="font-semibold text-ink">{t("Still helpful to add")}</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                {missing.map((m) => (
                  <li key={m.id}>⚠ {t(`Missing ${m.label}`)}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard className="mt-6 border-teal/20 bg-teal-soft/40">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2 size={18} className="text-teal-deep" />
            {t("Recommended documents are ready")}
          </p>
        </SectionCard>
      )}

      <div className="mt-8 space-y-4">
        {grouped.map((cat) => (
          <SectionCard key={cat.id} className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{t(cat.label)}</p>
                <p className="text-xs text-ink-muted">
                  {cat.docs.length
                    ? t("{count} file(s)", { count: String(cat.docs.length) })
                    : cat.recommended
                      ? t("Recommended")
                      : t("Optional")}
                </p>
              </div>
              {cat.docs.length ? (
                <CheckCircle2 size={18} className="text-teal-deep" />
              ) : cat.recommended ? (
                <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-medium text-amber">
                  {t("Missing")}
                </span>
              ) : null}
            </div>
            {cat.docs.length ? (
              <ul className="mt-3 space-y-2">
                {cat.docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-bg-soft/80 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-ink">{doc.name}</span>
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-danger"
                      aria-label={t("Remove")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
