"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fileToProfilePhotoDataUrl } from "@/lib/profile-photo";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function ProfilePhotoPicker({
  value,
  onChange,
  initials,
  size = "lg",
  className,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  initials?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dim = size === "lg" ? "h-[88px] w-[88px] text-2xl" : "h-14 w-14 text-base";

  async function onFile(file: File | null) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToProfilePhotoDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not use this photo."));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-brand-soft font-semibold text-brand-strong",
          dim,
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <UserRound size={size === "lg" ? 32 : 22} className="text-brand-strong/80" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{t("Profile photo")}</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          {t("A face makes the dossier warmer for admissions teams.")}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Camera size={14} />
            {value ? t("Change photo") : t("Add photo")}
          </Button>
          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onChange("")}
            >
              <Trash2 size={14} />
              {t("Remove")}
            </Button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] || null)}
        />
      </div>
    </div>
  );
}

/** Read-only circular photo or initials fallback. */
export function ProfileAvatar({
  photoUrl,
  initials,
  size = 48,
  className,
}: {
  photoUrl?: string | null;
  initials: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft font-semibold text-brand-strong",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.28) }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
