"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCommunityPortal } from "@/lib/community-portal-store";
import type { CommunityProfile } from "@/lib/community-portal";
import { cn } from "@/lib/utils";
import { useLocale, useT, type Locale } from "@/lib/i18n/locale";
import "./etablissement-profile.css";

// Stored as-is in CommunityProfile.careTypes (French values are already
// persisted across seed data and matching logic in community-match.ts).
// Only the on-screen label is translated; `value` stays stable.
const CARE_OPTIONS = [
  { value: "Vie autonome", label: "Independent living" },
  { value: "Assistance à la vie quotidienne", label: "Assisted daily living" },
  { value: "Soins de mémoire", label: "Memory care support" },
  { value: "Soins infirmiers", label: "Nursing care" },
  { value: "Hébergement temporaire / répite", label: "Respite / short-term stay" },
  { value: "Réadaptation", label: "Rehabilitation" },
] as const;

function normalizeCare(s: string) {
  return s.trim().toLowerCase();
}

function formatCad(
  amount: number | null | undefined,
  locale: Locale,
  onRequestLabel: string,
) {
  if (amount == null || Number.isNaN(amount)) return onRequestLabel;
  return new Intl.NumberFormat(locale === "en" ? "en-CA" : "fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Switch({ on }: { on: boolean }) {
  return (
    <span className="ep-switch" data-on={on ? "true" : "false"} aria-hidden>
      <span />
    </span>
  );
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
    <section className="ep-section">
      <div className="ep-section-head">
        <h2>{title}</h2>
        {hint ? <p>{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function CommunityProfileEditor() {
  const t = useT();
  const { locale } = useLocale();
  const { ready, workspace, can, updateProfile } = useCommunityPortal();
  const [draft, setDraft] = useState<CommunityProfile | null>(null);
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  const workspaceKey = workspace
    ? `${workspace.residenceId}:${workspace.updatedAt}`
    : null;

  if (workspace && workspaceKey !== syncedKey) {
    const profile = { ...workspace.profile };
    profile.acceptingApplications = profile.acceptingApplications !== false;
    profile.admissionFlags = profile.admissionFlags || {
      medicaid: false,
      privatePay: true,
      pets: false,
      smoking: "Non-smoking",
      minAge: 65,
      notes: "",
    };
    profile.photos = profile.photos?.length ? [...profile.photos] : [];
    profile.roomTypes = (profile.roomTypes || []).map((r) => ({
      ...r,
      availableUnits: r.availableUnits ?? 0,
    }));
    setSyncedKey(workspaceKey);
    setDraft(profile);
  }

  if (!ready || !workspace || !draft) {
    return (
      <div className="ep">
        <div className="ep-loading">{t("Loading profile…")}</div>
      </div>
    );
  }

  const editable = can("editProfile") || can("editAdmissions") || can("editPricing");
  const canToggleIntake =
    can("editAdmissions") || can("editProfile") || can("acceptDecline");
  const flags = draft.admissionFlags!;
  const cover = draft.photos[0];

  const patch = (partial: Partial<CommunityProfile>) =>
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));

  const toggleCare = (value: string) => {
    const exists = draft.careTypes.some((c) => normalizeCare(c) === normalizeCare(value));
    patch({
      careTypes: exists
        ? draft.careTypes.filter((c) => normalizeCare(c) !== normalizeCare(value))
        : [...draft.careTypes, value],
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
    <div className="ep">
      <header className="ep-top">
        <div className="ep-top-inner">
          <Link href="/community/dashboard" className="ep-back">
            ← {t("Back to console")}
          </Link>
          {editable ? (
            <div className="ep-top-actions">
              <button type="button" className="ep-save" onClick={save}>
                {saved ? t("Changes saved") : t("Save")}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="ep-main">
        <header className="ep-intro">
          <p className="ep-eyebrow">{t("Establishment page")}</p>
          <h1>{draft.name || t("Your residence")}</h1>
          <p>
            {t(
              "This information appears on your public listing. Families see it before submitting a request.",
            )}
          </p>
        </header>

        <Section
          title={t("New applications")}
          hint={t("Open or close intake. Files already received stay active.")}
        >
          <div className="ep-card">
            <button
              type="button"
              role="switch"
              aria-checked={draft.acceptingApplications}
              disabled={!canToggleIntake}
              className="ep-row-switch"
              onClick={() => {
                const next = !draft.acceptingApplications;
                patch({ acceptingApplications: next });
                updateProfile({ ...draft, acceptingApplications: next });
              }}
            >
              <span className="ep-row-copy">
                <strong>
                  {draft.acceptingApplications
                    ? t("Applications open")
                    : t("Applications closed")}
                </strong>
                <span>
                  {draft.acceptingApplications
                    ? t("Families can submit new files.")
                    : t("Families see that intake is currently closed.")}
                </span>
              </span>
              <Switch on={draft.acceptingApplications} />
            </button>
          </div>
        </Section>

        <Section
          title={t("Photos")}
          hint={t("Show the facade, common areas, and rooms. The first photo is the cover.")}
        >
          <div className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ep-cover">
              {cover ? (
                <Image
                  src={cover}
                  alt={t("Cover · {name}", { name: draft.name })}
                  fill
                  className="object-cover"
                  sizes="(max-width: 880px) 100vw, 880px"
                  unoptimized={!cover.startsWith("http")}
                />
              ) : (
                <div className="ep-cover-empty">{t("No cover photo")}</div>
              )}
            </div>

            {draft.photos.length > 0 ? (
              <div className="ep-thumbs">
                {draft.photos.map((src, index) => (
                  <div key={`${src}-${index}`} className="ep-thumb">
                    <Image
                      src={src}
                      alt={t("Photo {number}", { number: index + 1 })}
                      fill
                      className="object-cover"
                      sizes="160px"
                      unoptimized={!src.startsWith("http")}
                    />
                    {index === 0 ? (
                      <span className="ep-thumb-badge">{t("Cover")}</span>
                    ) : null}
                    {can("editProfile") ? (
                      <div className="ep-thumb-actions">
                        {index !== 0 ? (
                          <button type="button" onClick={() => setCover(index)}>
                            {t("Cover")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="danger"
                          onClick={() => removePhoto(index)}
                          aria-label={t("Remove photo")}
                        >
                          {t("Remove")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {can("editProfile") ? (
              <div className="ep-photo-add">
                <input
                  className="ep-input"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={t("Paste an image URL…")}
                />
                <button
                  type="button"
                  className="ep-add-btn"
                  onClick={addPhoto}
                  disabled={!photoUrl.trim()}
                  style={{ marginTop: 0, opacity: photoUrl.trim() ? 1 : 0.55 }}
                >
                  {t("Add photo")}
                </button>
              </div>
            ) : null}
          </div>
        </Section>

        <Section title={t("Presentation")} hint={t("Short text families read first.")}>
          <div className="ep-card ep-stack">
            <label>
              <span className="ep-label">{t("Description")}</span>
              <textarea
                className="ep-textarea"
                rows={4}
                value={draft.description}
                disabled={!can("editProfile")}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder={t(
                  "Describe the atmosphere, care, and type of residents you welcome…",
                )}
              />
            </label>
          </div>
        </Section>

        <Section title={t("Contact and location")}>
          <div className="ep-card ep-stack">
            <label>
              <span className="ep-label">{t("Establishment name")}</span>
              <input
                className="ep-input"
                value={draft.name}
                disabled={!can("editProfile")}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <div className="ep-grid-2">
              <label className="ep-span-2">
                <span className="ep-label">{t("Address")}</span>
                <input
                  className="ep-input"
                  value={draft.address}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ address: e.target.value })}
                />
              </label>
              <label>
                <span className="ep-label">{t("City")}</span>
                <input
                  className="ep-input"
                  value={draft.city}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              </label>
              <div className="ep-grid-2" style={{ gap: 10 }}>
                <label>
                  <span className="ep-label">{t("Province")}</span>
                  <input
                    className="ep-input"
                    value={draft.state}
                    disabled={!can("editProfile")}
                    onChange={(e) => patch({ state: e.target.value })}
                  />
                </label>
                <label>
                  <span className="ep-label">{t("Postal code")}</span>
                  <input
                    className="ep-input"
                    value={draft.zip}
                    disabled={!can("editProfile")}
                    onChange={(e) => patch({ zip: e.target.value })}
                  />
                </label>
              </div>
              <label>
                <span className="ep-label">{t("Phone")}</span>
                <input
                  className="ep-input"
                  value={draft.phone}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </label>
              <label>
                <span className="ep-label">{t("Admissions email")}</span>
                <input
                  className="ep-input"
                  value={draft.email}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </label>
            </div>
          </div>
        </Section>

        <Section
          title={t("Rooms and pricing")}
          hint={t("Indicative monthly rates visible on your listing.")}
        >
          <div>
            {draft.roomTypes.length === 0 ? (
              <div className="ep-card" style={{ textAlign: "center", color: "var(--ep-ink-faint)" }}>
                {t("No room types yet. Add your first rate card.")}
              </div>
            ) : null}

            {draft.roomTypes.map((room, index) => (
              <div key={`${room.name}-${index}`} className="ep-room">
                <div
                  className="ep-grid-2"
                  style={{ alignItems: "start", marginBottom: 12 }}
                >
                  <label>
                    <span className="ep-label">{t("Room type")}</span>
                    <input
                      className={cn("ep-input")}
                      value={room.name}
                      disabled={!can("editPricing")}
                      onChange={(e) => {
                        const roomTypes = [...draft.roomTypes];
                        roomTypes[index] = { ...room, name: e.target.value };
                        patch({ roomTypes });
                      }}
                      placeholder={t("Studio, 1½, memory suite…")}
                    />
                  </label>
                  <div className="ep-room-price">
                    <p className="label">{t("Starting at")}</p>
                    <p className="value">
                      {formatCad(room.price, locale, t("On request"))}
                      <span> {t("/ month")}</span>
                    </p>
                  </div>
                </div>
                <div className="ep-grid-2">
                  <label>
                    <span className="ep-label">{t("Monthly price (CAD)")}</span>
                    <input
                      type="number"
                      className="ep-input"
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
                  <label>
                    <span className="ep-label">{t("Available units")}</span>
                    <input
                      type="number"
                      className="ep-input"
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
                <label style={{ display: "block", marginTop: 12 }}>
                  <span className="ep-label">{t("Notes")}</span>
                  <input
                    className="ep-input"
                    value={room.notes}
                    disabled={!can("editPricing")}
                    onChange={(e) => {
                      const roomTypes = [...draft.roomTypes];
                      roomTypes[index] = { ...room, notes: e.target.value };
                      patch({ roomTypes });
                    }}
                    placeholder={t("Meals included, 2nd person fee, etc.")}
                  />
                </label>
                {can("editPricing") ? (
                  <button
                    type="button"
                    className="ep-link-btn"
                    onClick={() =>
                      patch({
                        roomTypes: draft.roomTypes.filter((_, i) => i !== index),
                      })
                    }
                  >
                    {t("Remove this type")}
                  </button>
                ) : null}
              </div>
            ))}

            {can("editPricing") ? (
              <button
                type="button"
                className="ep-add-btn"
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
              </button>
            ) : null}
          </div>
        </Section>

        <Section title={t("Care levels")} hint={t("What you offer to families.")}>
          <div className="ep-card">
            <div className="ep-care-list">
              {CARE_OPTIONS.map((opt) => {
                const checked = draft.careTypes.some(
                  (c) => normalizeCare(c) === normalizeCare(opt.value),
                );
                return (
                  <label key={opt.value} className="ep-care-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!can("editProfile")}
                      onChange={() => toggleCare(opt.value)}
                    />
                    {t(opt.label)}
                  </label>
                );
              })}
            </div>
          </div>
        </Section>

        <Section
          title={t("Amenities and services")}
          hint={t("One line per item, shown on your listing.")}
        >
          <div className="ep-card">
            <textarea
              className="ep-textarea"
              rows={5}
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
              placeholder={t("Indoor garden\nPets welcome\nDining room\nTransportation")}
            />
          </div>
        </Section>

        <Section
          title={t("Admission criteria")}
          hint={t("Basic rules used when reviewing files.")}
        >
          <div className="ep-card">
            {(
              [
                ["medicaid", t("Government assistance / RAMQ")],
                ["privatePay", t("Private pay")],
                ["pets", t("Pets allowed")],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="switch"
                aria-checked={flags[key]}
                disabled={!can("editAdmissions")}
                className="ep-row-switch"
                onClick={() =>
                  patch({
                    admissionFlags: { ...flags, [key]: !flags[key] },
                  })
                }
              >
                <span className="ep-row-copy">
                  <strong>{label}</strong>
                </span>
                <Switch on={flags[key]} />
              </button>
            ))}

            <div className="ep-grid-2" style={{ marginTop: 8 }}>
              <label>
                <span className="ep-label">{t("Tobacco policy")}</span>
                <input
                  className="ep-input"
                  value={flags.smoking}
                  disabled={!can("editAdmissions")}
                  onChange={(e) =>
                    patch({ admissionFlags: { ...flags, smoking: e.target.value } })
                  }
                />
              </label>
              <label>
                <span className="ep-label">{t("Minimum age")}</span>
                <input
                  type="number"
                  className="ep-input"
                  value={flags.minAge}
                  disabled={!can("editAdmissions")}
                  onChange={(e) =>
                    patch({
                      admissionFlags: {
                        ...flags,
                        minAge: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </label>
            </div>
            <label style={{ display: "block", marginTop: 14 }}>
              <span className="ep-label">{t("Notes")}</span>
              <textarea
                className="ep-textarea"
                rows={3}
                value={flags.notes}
                disabled={!can("editAdmissions")}
                onChange={(e) =>
                  patch({ admissionFlags: { ...flags, notes: e.target.value } })
                }
              />
            </label>
          </div>
        </Section>

        {editable ? (
          <div className="ep-sticky-save">
            <button type="button" className="ep-save" onClick={save}>
              {saved ? t("Changes saved") : t("Save changes")}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
