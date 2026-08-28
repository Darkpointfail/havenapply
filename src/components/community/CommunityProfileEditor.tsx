"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCommunityPortal } from "@/lib/community-portal-store";
import type { CommunityProfile } from "@/lib/community-portal";
import { cn, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

const CARE_OPTIONS = [
  "Independent Living",
  "Assisted Living",
  "Memory Care",
  "Skilled Nursing",
  "Respite Care",
  "Rehabilitation",
] as const;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand disabled:opacity-60";

function normalizeCare(s: string) {
  return s.trim().toLowerCase();
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function CommunityProfileEditor() {

  const t = useT();  const { ready, workspace, can, updateProfile } = useCommunityPortal();
  const [draft, setDraft] = useState<CommunityProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    if (workspace) {
      const profile = { ...workspace.profile };
      profile.acceptingApplications = profile.acceptingApplications !== false;
      profile.admissionFlags = profile.admissionFlags || {
        medicaid: false,
        privatePay: true,
        pets: false,
        smoking: "No smoking",
        minAge: 65,
        notes: "",
      };
      profile.photos = profile.photos?.length ? [...profile.photos] : [];
      profile.roomTypes = (profile.roomTypes || []).map((r) => ({
        ...r,
        availableUnits: r.availableUnits ?? 0,
      }));
      setDraft(profile);
    }
  }, [workspace]);

  if (!ready || !workspace || !draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Loading community…")}
      </div>
    );
  }

  const editable = can("editProfile") || can("editAdmissions") || can("editPricing");
  const flags = draft.admissionFlags!;
  const cover = draft.photos[0];

  const patch = (partial: Partial<CommunityProfile>) =>
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));

  const toggleCare = (label: string) => {
    const exists = draft.careTypes.some((c) => normalizeCare(c) === normalizeCare(label));
    patch({
      careTypes: exists
        ? draft.careTypes.filter((c) => normalizeCare(c) !== normalizeCare(label))
        : [...draft.careTypes, label],
    });
  };

  const save = () => {
    const r = updateProfile(draft);
    if (r.ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    }
  };

  const addPhoto = () => {
    const url = photoUrl.trim();
    if (!url) return;
    patch({ photos: [...draft.photos, url] });
    setPhotoUrl("");
  };

  const removePhoto = (index: number) => {
    patch({ photos: draft.photos.filter((_, i) => i !== index) });
  };

  const setCover = (index: number) => {
    if (index === 0) return;
    const next = [...draft.photos];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    patch({ photos: next });
  };

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[800px] space-y-12 px-5 py-8 md:px-8 md:py-12">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-muted">Community</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{draft.name}</h1>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              {t("Photos, room pricing, care services, and admission rules, what families see when")}
              they apply.
            </p>
          </div>
          {editable && (
            <Button type="button" size="sm" onClick={save}>
              {saved ? "Saved" : "Save changes"}
            </Button>
          )}
        </header>

        {/* New applications open/close */}
        <Section
          title={t("New applications")}
          hint={t(
            "Open or close intake for new family applications. Existing dossiers stay active.",
          )}
        >
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-soft/80 px-3 py-3 text-sm">
              <div>
                <p className="font-medium text-ink">
                  {draft.acceptingApplications
                    ? t("Accepting new applications")
                    : t("Not accepting new applications")}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {draft.acceptingApplications
                    ? t("Families can send new dossiers to your community.")
                    : t("Families see that intake is closed and cannot submit.")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.acceptingApplications}
                disabled={!can("editAdmissions") && !can("editProfile")}
                onClick={() =>
                  patch({ acceptingApplications: !draft.acceptingApplications })
                }
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition",
                  draft.acceptingApplications ? "bg-brand" : "bg-line-strong",
                  !can("editAdmissions") && !can("editProfile") && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                    draft.acceptingApplications ? "left-5" : "left-0.5",
                  )}
                />
              </button>
            </label>
          </div>
        </Section>

        {/* 1. Photos */}
        <Section
          title={t("Photos")}
          hint="Show the building, common areas, and rooms. The first photo is your cover image."
        >
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
            <div className="relative aspect-[16/9] bg-bg-soft">
              {cover ? (
                <Image
                  src={cover}
                  alt={`${draft.name} cover`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 800px) 100vw, 800px"
                  unoptimized={cover.startsWith("http") === false}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-faint">
                  <ImagePlus size={28} />
                  <p className="text-sm">No cover photo yet</p>
                </div>
              )}
            </div>

            {draft.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
                {draft.photos.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-bg-soft"
                  >
                    <Image
                      src={src}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="200px"
                      unoptimized={src.startsWith("http") === false}
                    />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white">
                        Cover
                      </span>
                    )}
                    {can("editProfile") && (
                      <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-ink/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => setCover(index)}
                            className="flex-1 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-medium text-ink"
                          >
                            {t("Set cover")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="rounded-lg bg-white/95 p-1.5 text-danger"
                          aria-label={t("Remove photo")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {can("editProfile") && (
              <div className="flex flex-col gap-2 border-t border-line p-3 sm:flex-row">
                <input
                  className={cn(inputClass, "mt-0 flex-1")}
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={t("Paste image URL…")}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={addPhoto}
                  disabled={!photoUrl.trim()}
                >
                  <ImagePlus size={14} />
                  {t("Add photo")}
                </Button>
              </div>
            )}
          </div>
        </Section>

        {/* 2. About */}
        <Section title={t("About")} hint="A short description families read first.">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <label className="block text-sm">
              Description
              <textarea
                rows={4}
                className={inputClass}
                value={draft.description}
                disabled={!can("editProfile")}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder={t("Describe your community, atmosphere, and who you serve…")}
              />
            </label>
          </div>
        </Section>

        {/* 3. Contact & location */}
        <Section title={t("Contact & location")}>
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <label className="block text-sm">
              {t("Community name")}
              <input
                className={inputClass}
                value={draft.name}
                disabled={!can("editProfile")}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                {t("Street address")}
                <input
                  className={inputClass}
                  value={draft.address}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ address: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                {t("City")}
                <input
                  className={inputClass}
                  value={draft.city}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  State
                  <input
                    className={inputClass}
                    value={draft.state}
                    disabled={!can("editProfile")}
                    onChange={(e) => patch({ state: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  ZIP
                  <input
                    className={inputClass}
                    value={draft.zip}
                    disabled={!can("editProfile")}
                    onChange={(e) => patch({ zip: e.target.value })}
                  />
                </label>
              </div>
              <label className="block text-sm">
                {t("Phone")}
                <input
                  className={inputClass}
                  value={draft.phone}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                {t("Admissions email")}
                <input
                  className={inputClass}
                  value={draft.email}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </label>
            </div>
          </div>
        </Section>

        {/* 4. Rooms & pricing */}
        <Section
          title={t("Rooms & pricing")}
          hint="Monthly rates families see on your listing. Keep units simple, not a bed board."
        >
          <div className="space-y-3">
            {draft.roomTypes.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
                {t("No room types yet. Add your first rate card below.")}
              </p>
            )}
            {draft.roomTypes.map((room, index) => (
              <div
                key={`${room.name}-${index}`}
                className="rounded-2xl border border-line bg-surface p-5 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="block text-sm">
                      {t("Room type")}
                      <input
                        className={cn(inputClass, "font-medium")}
                        value={room.name}
                        disabled={!can("editPricing")}
                        onChange={(e) => {
                          const roomTypes = [...draft.roomTypes];
                          roomTypes[index] = { ...room, name: e.target.value };
                          patch({ roomTypes });
                        }}
                        placeholder={t("Studio, One bedroom, Memory care suite…")}
                      />
                    </label>
                  </div>
                  <div className="rounded-xl bg-brand-soft/50 px-3 py-2 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-strong">
                      From
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-ink">
                      {room.price != null ? formatCurrency(room.price) : ","}
                      <span className="text-sm font-normal text-ink-muted"> / mo</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-ink-muted">
                    Monthly price (USD)
                    <input
                      type="number"
                      className={inputClass}
                      value={room.price ?? ""}
                      disabled={!can("editPricing")}
                      onChange={(e) => {
                        const roomTypes = [...draft.roomTypes];
                        roomTypes[index] = {
                          ...room,
                          price: e.target.value ? Number(e.target.value) : null,
                        };
                        patch({ roomTypes });
                      }}
                    />
                  </label>
                  <label className="block text-sm text-ink-muted">
                    {t("Available units")}
                    <input
                      type="number"
                      className={inputClass}
                      value={room.availableUnits ?? 0}
                      disabled={!can("editPricing")}
                      onChange={(e) => {
                        const roomTypes = [...draft.roomTypes];
                        roomTypes[index] = {
                          ...room,
                          availableUnits: Number(e.target.value) || 0,
                        };
                        patch({ roomTypes });
                      }}
                    />
                  </label>
                </div>
                <label className="mt-3 block text-sm text-ink-muted">
                  {t("Notes")}
                  <input
                    className={inputClass}
                    value={room.notes}
                    disabled={!can("editPricing")}
                    onChange={(e) => {
                      const roomTypes = [...draft.roomTypes];
                      roomTypes[index] = { ...room, notes: e.target.value };
                      patch({ roomTypes });
                    }}
                    placeholder={t("Includes meals, second person fee, etc.")}
                  />
                </label>
                {can("editPricing") && (
                  <button
                    type="button"
                    className="mt-3 text-xs font-medium text-danger hover:underline"
                    onClick={() =>
                      patch({
                        roomTypes: draft.roomTypes.filter((_, i) => i !== index),
                      })
                    }
                  >
                    {t("Remove room type")}
                  </button>
                )}
              </div>
            ))}
            {can("editPricing") && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  patch({
                    roomTypes: [
                      ...draft.roomTypes,
                      {
                        name: "Studio",
                        price: null,
                        notes: "",
                        availableUnits: 1,
                      },
                    ],
                  })
                }
              >
                {t("Add room type")}
              </Button>
            )}
          </div>
        </Section>

        {/* 5. Care services */}
        <Section title={t("Care services")} hint="What levels of care you offer.">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="grid gap-1 sm:grid-cols-2">
              {CARE_OPTIONS.map((opt) => {
                const checked = draft.careTypes.some(
                  (c) => normalizeCare(c) === normalizeCare(opt),
                );
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm hover:bg-bg-soft"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!can("editProfile")}
                      onChange={() => toggleCare(opt)}
                      className="h-4 w-4 rounded border-line text-brand"
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        </Section>

        {/* 6. Amenities */}
        <Section title={t("Amenities")} hint="One amenity per line, shown on your public listing.">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <textarea
              rows={5}
              className={inputClass}
              value={draft.amenities.join("\n")}
              disabled={!can("editProfile")}
              onChange={(e) =>
                patch({
                  amenities: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder={"Garden courtyard\nPet friendly\nOn-site dining\nTransportation"}
            />
          </div>
        </Section>

        {/* 7. Admission criteria */}
        <Section
          title={t("Admission criteria")}
          hint="Basic rules your team uses when reviewing applications."
        >
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
            {(
              [
                ["medicaid", "Accept Medicaid"],
                ["privatePay", "Accept private pay"],
                ["pets", "Pets allowed"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl bg-bg-soft/80 px-3 py-3 text-sm"
              >
                <span>{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={flags[key]}
                  disabled={!can("editAdmissions")}
                  onClick={() =>
                    patch({
                      admissionFlags: { ...flags, [key]: !flags[key] },
                    })
                  }
                  className={cn(
                    "relative h-7 w-12 rounded-full transition",
                    flags[key] ? "bg-brand" : "bg-line-strong",
                    !can("editAdmissions") && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                      flags[key] ? "left-5" : "left-0.5",
                    )}
                  />
                </button>
              </label>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                {t("Smoking policy")}
                <input
                  className={inputClass}
                  value={flags.smoking}
                  disabled={!can("editAdmissions")}
                  onChange={(e) =>
                    patch({ admissionFlags: { ...flags, smoking: e.target.value } })
                  }
                />
              </label>
              <label className="block text-sm">
                {t("Minimum age")}
                <input
                  type="number"
                  className={inputClass}
                  value={flags.minAge}
                  disabled={!can("editAdmissions")}
                  onChange={(e) =>
                    patch({
                      admissionFlags: { ...flags, minAge: Number(e.target.value) || 0 },
                    })
                  }
                />
              </label>
            </div>
            <label className="block text-sm">
              {t("Notes")}
              <textarea
                rows={3}
                className={inputClass}
                value={flags.notes}
                disabled={!can("editAdmissions")}
                onChange={(e) =>
                  patch({ admissionFlags: { ...flags, notes: e.target.value } })
                }
              />
            </label>
          </div>
        </Section>

        {editable && (
          <div className="sticky bottom-4 flex justify-end">
            <Button type="button" onClick={save} className="shadow-md">
              {saved ? "Saved" : "Save all changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
