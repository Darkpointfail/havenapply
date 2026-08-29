"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCommunityPortal } from "@/lib/community-portal-store";
import type { CommunityProfile } from "@/lib/community-portal";
import { cn } from "@/lib/utils";
import "./etablissement-profile.css";

const CARE_OPTIONS = [
  "Vie autonome",
  "Assistance à la vie quotidienne",
  "Soins de mémoire",
  "Soins infirmiers",
  "Hébergement temporaire / répite",
  "Réadaptation",
] as const;

function normalizeCare(s: string) {
  return s.trim().toLowerCase();
}

function formatCad(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return "Sur demande";
  return new Intl.NumberFormat("fr-CA", {
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
      smoking: "Non-fumeur",
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
        <div className="ep-loading">Chargement du profil…</div>
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
    <div className="ep">
      <header className="ep-top">
        <div className="ep-top-inner">
          <Link href="/community/dashboard" className="ep-back">
            ← Retour à la console
          </Link>
          {editable ? (
            <div className="ep-top-actions">
              <button type="button" className="ep-save" onClick={save}>
                {saved ? "Enregistré" : "Enregistrer"}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="ep-main">
        <header className="ep-intro">
          <p className="ep-eyebrow">Page de l&apos;établissement</p>
          <h1>{draft.name || "Votre résidence"}</h1>
          <p>
            Ces renseignements apparaissent sur votre fiche publique. Les familles les voient
            avant de déposer une demande.
          </p>
        </header>

        <Section
          title="Nouvelles demandes"
          hint="Ouvrez ou fermez l'intake. Les dossiers déjà reçus restent actifs."
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
                    ? "Demandes ouvertes"
                    : "Demandes fermées"}
                </strong>
                <span>
                  {draft.acceptingApplications
                    ? "Les familles peuvent envoyer de nouveaux dossiers."
                    : "Les familles voient que l'intake est fermé."}
                </span>
              </span>
              <Switch on={draft.acceptingApplications} />
            </button>
          </div>
        </Section>

        <Section
          title="Photos"
          hint="Montrez la façade, les espaces communs et les chambres. La première photo est la couverture."
        >
          <div className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="ep-cover">
              {cover ? (
                <Image
                  src={cover}
                  alt={`Couverture · ${draft.name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 880px) 100vw, 880px"
                  unoptimized={!cover.startsWith("http")}
                />
              ) : (
                <div className="ep-cover-empty">Aucune photo de couverture</div>
              )}
            </div>

            {draft.photos.length > 0 ? (
              <div className="ep-thumbs">
                {draft.photos.map((src, index) => (
                  <div key={`${src}-${index}`} className="ep-thumb">
                    <Image
                      src={src}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="160px"
                      unoptimized={!src.startsWith("http")}
                    />
                    {index === 0 ? (
                      <span className="ep-thumb-badge">Couverture</span>
                    ) : null}
                    {can("editProfile") ? (
                      <div className="ep-thumb-actions">
                        {index !== 0 ? (
                          <button type="button" onClick={() => setCover(index)}>
                            Couverture
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="danger"
                          onClick={() => removePhoto(index)}
                          aria-label="Retirer la photo"
                        >
                          Retirer
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
                  placeholder="Coller l'URL d'une image…"
                />
                <button
                  type="button"
                  className="ep-add-btn"
                  onClick={addPhoto}
                  disabled={!photoUrl.trim()}
                  style={{ marginTop: 0, opacity: photoUrl.trim() ? 1 : 0.55 }}
                >
                  Ajouter une photo
                </button>
              </div>
            ) : null}
          </div>
        </Section>

        <Section title="Présentation" hint="Court texte lu en premier par les familles.">
          <div className="ep-card ep-stack">
            <label>
              <span className="ep-label">Description</span>
              <textarea
                className="ep-textarea"
                rows={4}
                value={draft.description}
                disabled={!can("editProfile")}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Décrivez l'ambiance, les soins et le type de résidents accueillis…"
              />
            </label>
          </div>
        </Section>

        <Section title="Coordonnées et emplacement">
          <div className="ep-card ep-stack">
            <label>
              <span className="ep-label">Nom de l&apos;établissement</span>
              <input
                className="ep-input"
                value={draft.name}
                disabled={!can("editProfile")}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <div className="ep-grid-2">
              <label className="ep-span-2">
                <span className="ep-label">Adresse</span>
                <input
                  className="ep-input"
                  value={draft.address}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ address: e.target.value })}
                />
              </label>
              <label>
                <span className="ep-label">Ville</span>
                <input
                  className="ep-input"
                  value={draft.city}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              </label>
              <div className="ep-grid-2" style={{ gap: 10 }}>
                <label>
                  <span className="ep-label">Province</span>
                  <input
                    className="ep-input"
                    value={draft.state}
                    disabled={!can("editProfile")}
                    onChange={(e) => patch({ state: e.target.value })}
                  />
                </label>
                <label>
                  <span className="ep-label">Code postal</span>
                  <input
                    className="ep-input"
                    value={draft.zip}
                    disabled={!can("editProfile")}
                    onChange={(e) => patch({ zip: e.target.value })}
                  />
                </label>
              </div>
              <label>
                <span className="ep-label">Téléphone</span>
                <input
                  className="ep-input"
                  value={draft.phone}
                  disabled={!can("editProfile")}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </label>
              <label>
                <span className="ep-label">Courriel des admissions</span>
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
          title="Chambres et tarifs"
          hint="Tarifs mensuels indicatifs visibles sur votre fiche."
        >
          <div>
            {draft.roomTypes.length === 0 ? (
              <div className="ep-card" style={{ textAlign: "center", color: "var(--ep-ink-faint)" }}>
                Aucun type de chambre. Ajoutez votre première grille tarifaire.
              </div>
            ) : null}

            {draft.roomTypes.map((room, index) => (
              <div key={`${room.name}-${index}`} className="ep-room">
                <div
                  className="ep-grid-2"
                  style={{ alignItems: "start", marginBottom: 12 }}
                >
                  <label>
                    <span className="ep-label">Type de chambre</span>
                    <input
                      className={cn("ep-input")}
                      value={room.name}
                      disabled={!can("editPricing")}
                      onChange={(e) => {
                        const roomTypes = [...draft.roomTypes];
                        roomTypes[index] = { ...room, name: e.target.value };
                        patch({ roomTypes });
                      }}
                      placeholder="Studio, 1½, suite mémoire…"
                    />
                  </label>
                  <div className="ep-room-price">
                    <p className="label">À partir de</p>
                    <p className="value">
                      {formatCad(room.price)}
                      <span> / mois</span>
                    </p>
                  </div>
                </div>
                <div className="ep-grid-2">
                  <label>
                    <span className="ep-label">Prix mensuel (CAD)</span>
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
                    <span className="ep-label">Unités disponibles</span>
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
                  <span className="ep-label">Notes</span>
                  <input
                    className="ep-input"
                    value={room.notes}
                    disabled={!can("editPricing")}
                    onChange={(e) => {
                      const roomTypes = [...draft.roomTypes];
                      roomTypes[index] = { ...room, notes: e.target.value };
                      patch({ roomTypes });
                    }}
                    placeholder="Repas inclus, frais 2e personne, etc."
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
                    Retirer ce type
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
                Ajouter un type de chambre
              </button>
            ) : null}
          </div>
        </Section>

        <Section title="Niveaux de soins" hint="Ce que vous offrez aux familles.">
          <div className="ep-card">
            <div className="ep-care-list">
              {CARE_OPTIONS.map((opt) => {
                const checked = draft.careTypes.some(
                  (c) => normalizeCare(c) === normalizeCare(opt),
                );
                return (
                  <label key={opt} className="ep-care-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!can("editProfile")}
                      onChange={() => toggleCare(opt)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        </Section>

        <Section
          title="Services et commodités"
          hint="Une ligne par élément, affiché sur votre fiche."
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
              placeholder={"Jardin intérieur\nAnimaux acceptés\nSalle à manger\nTransport"}
            />
          </div>
        </Section>

        <Section
          title="Critères d'admission"
          hint="Règles de base utilisées lors de l'évaluation des dossiers."
        >
          <div className="ep-card">
            {(
              [
                ["medicaid", "Aide gouvernementale / RAMQ"],
                ["privatePay", "Paiement privé"],
                ["pets", "Animaux acceptés"],
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
                <span className="ep-label">Politique sur le tabac</span>
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
                <span className="ep-label">Âge minimum</span>
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
              <span className="ep-label">Notes</span>
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
              {saved ? "Enregistré" : "Enregistrer les modifications"}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
