"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { CollectionNotice } from "@/components/legal/CollectionNotice";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import {
  apiExecuteDeletion,
  apiFetchRightsLog,
  familyExportUrl,
} from "@/lib/family/client-api";
import { PROFILE_RETENTION_PURPOSE_TEXT } from "@/lib/family/types";
import { usePrivacySecurity } from "@/lib/privacy-security-store";
import {
  formatPrivacyTime,
  maskSensitiveText,
} from "@/lib/privacy-security";
import { collectionPath, privacyPath } from "@/content/legal";
import { useLocale } from "@/lib/i18n/locale";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-source-serif",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});

type LogRow = { id: string; operation: string; detail: string; recordedAt: string };

type SectionId =
  | "apercu"
  | "consentements"
  | "preferences"
  | "securite"
  | "historique"
  | "droits";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "apercu", label: "Vue d'ensemble" },
  { id: "consentements", label: "Consentements" },
  { id: "preferences", label: "Préférences" },
  { id: "securite", label: "Sécurité" },
  { id: "historique", label: "Historique des accès" },
  { id: "droits", label: "Mes droits (Loi 25)" },
];

const OPS_FR: Record<string, string> = {
  access_view: "Consultation",
  export: "Export",
  rectify: "Rectification",
  consent_revoke: "Retrait de consentement",
  deletion_request: "Demande de suppression",
  deletion_executed: "Suppression effectuée",
  view_sensitive: "Consultation sensible",
  download: "Téléchargement",
  delete: "Suppression",
  share: "Partage",
  revoke_share: "Retrait d'accès",
  password_change: "Changement de mot de passe",
  session_revoke: "Révocation de session",
};

function scrollToSection(id: SectionId) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", `#${id}`);
  }
}

export default function FamilyPrivacyHub() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user, signOut } = useAuth();
  const {
    ready: familyReady,
    data,
    saveStatus,
    saveError,
    recordProfileConsent,
  } = useFamilyData();
  const {
    ready: privacyReady,
    workspace,
    revokeConsent,
    restoreConsent,
    updatePreferences,
    revokeSession,
    revokeOtherSessions,
    changePassword,
  } = usePrivacySecurity();

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<"profile" | "account">("profile");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [reason, setReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    if (typeof window === "undefined") return "apercu";
    const hash = window.location.hash.replace("#", "") as SectionId;
    return SECTIONS.some((s) => s.id === hash) ? hash : "apercu";
  });

  const refreshLogs = useCallback(async () => {
    const result = await apiFetchRightsLog();
    if (result.ok) setLogs(result.logs);
  }, []);

  useEffect(() => {
    if (!familyReady) return;
    let cancelled = false;
    void (async () => {
      const result = await apiFetchRightsLog();
      if (!cancelled && result.ok) setLogs(result.logs);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyReady]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as SectionId;
    if (hash && SECTIONS.some((s) => s.id === hash)) {
      window.setTimeout(() => scrollToSection(hash), 80);
    }
    const onHash = () => {
      const h = window.location.hash.replace("#", "") as SectionId;
      if (h && SECTIONS.some((s) => s.id === h)) setActiveSection(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const applicationShares = useMemo(() => {
    return (data.applications || [])
      .filter((a) => a.status !== "withdrawn")
      .map((a) => ({
        id: `app-${a.id}`,
        communityName: a.residenceName || "Résidence",
        resourceLabel: "Dossier d'admission transmis",
        sharedAt: a.submittedAt,
        authorizedBy: user?.name || "Vous",
        active: a.status !== "withdrawn",
        statusLabel: a.status,
      }));
  }, [data.applications, user?.name]);

  const [retentionGranted, setRetentionGranted] = useState(true);

  const onExport = () => {
    window.location.href = familyExportUrl();
    window.setTimeout(() => void refreshLogs(), 800);
  };

  const onRevokeRetention = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const ok = await recordProfileConsent(false);
    setBusy(false);
    if (!ok) {
      setError(saveError || "Impossible de retirer le consentement.");
      return;
    }
    setRetentionGranted(false);
    setMessage("Consentement de conservation du profil retiré pour l'avenir.");
    void refreshLogs();
  };

  const onGrantRetention = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const ok = await recordProfileConsent(true);
    setBusy(false);
    if (!ok) {
      setError(saveError || "Impossible d'enregistrer le consentement.");
      return;
    }
    setRetentionGranted(true);
    setMessage("Consentement de conservation du profil enregistré.");
    void refreshLogs();
  };

  const expectedPhrase =
    deleteScope === "account" ? "SUPPRIMER MON COMPTE" : "SUPPRIMER LE DOSSIER";

  const onExecuteDelete = async () => {
    if (confirmPhrase !== expectedPhrase) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await apiExecuteDeletion({
      scope: deleteScope,
      reason,
      confirmPhrase: expectedPhrase,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message);
    setConfirmPhrase("");
    setShowDeleteConfirm(false);
    if (deleteScope === "account") {
      signOut();
      router.replace("/sign-in?deleted=1");
      return;
    }
    void refreshLogs();
    router.refresh();
  };

  const ready = familyReady && privacyReady;
  if (!ready || !workspace) {
    return (
      <div
        className={`${publicSans.variable} ${sourceSerif.variable} flex min-h-[40vh] items-center justify-center text-sm text-[#5c6f66]`}
        style={{ fontFamily: "var(--font-public-sans), system-ui, sans-serif" }}
      >
        Chargement de la confidentialité…
      </div>
    );
  }

  return (
    <main
      className={`${publicSans.variable} ${sourceSerif.variable}`}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f3f7f5 0%, #f7f5f1 100%)",
        color: "#14201c",
        fontFamily: "var(--font-public-sans), system-ui, sans-serif",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(20,32,28,0.08)",
          background: "rgba(255,255,255,0.88)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <nav aria-label="Fil d'Ariane">
            <ol
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
                margin: 0,
                padding: 0,
                listStyle: "none",
                fontSize: 13,
                color: "#5c6f66",
              }}
            >
              <li>
                <Link href="/family/dashboard" style={{ color: "#0A6F63", textDecoration: "none" }}>
                  Accueil
                </Link>
              </li>
              <li aria-hidden style={{ opacity: 0.5 }}>
                →
              </li>
              <li>
                <Link href="/family/settings" style={{ color: "#0A6F63", textDecoration: "none" }}>
                  Paramètres
                </Link>
              </li>
              <li aria-hidden style={{ opacity: 0.5 }}>
                →
              </li>
              <li>
                <span aria-current="page" style={{ fontWeight: 600, color: "#14201c" }}>
                  Confidentialité et données
                </span>
              </li>
            </ol>
          </nav>
          <Link
            href="/family/dashboard"
            style={{ fontSize: 14, color: "#0A6F63", textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}
          >
            Retour à l&apos;espace famille
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px 72px" }}>
        <header style={{ marginBottom: 28 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#5c6f66",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Paramètres
          </p>
          <h1
            style={{
              margin: "6px 0 0",
              fontFamily: "var(--font-source-serif), Georgia, serif",
              fontSize: "clamp(26px, 4vw, 34px)",
              fontWeight: 600,
              lineHeight: 1.15,
            }}
          >
            Confidentialité et données
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 15.5, lineHeight: 1.6, color: "#3d5249", maxWidth: 640 }}>
            Comprenez l&apos;utilisation de vos renseignements, gérez vos consentements et
            exercez vos droits.
          </p>
        </header>

        <CollectionNotice variant="profile" />

        <nav
          aria-label="Sections confidentialité"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            margin: "22px 0 28px",
            position: "sticky",
            top: 64,
            zIndex: 10,
            padding: "10px 0",
            background: "linear-gradient(180deg, #f3f7f5 70%, transparent)",
          }}
        >
          {SECTIONS.map((s) => {
            const selected = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => {
                  setActiveSection(s.id);
                  scrollToSection(s.id);
                }}
                style={{
                  minHeight: 44,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: selected
                    ? "1px solid rgba(10,111,99,0.45)"
                    : "1px solid rgba(20,32,28,0.1)",
                  background: selected ? "#e7f4f1" : "#fff",
                  color: selected ? "#0A6F63" : "#24332d",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </nav>

        {(message || error) && (
          <div
            role={error ? "alert" : "status"}
            style={{
              ...cardStyle,
              marginBottom: 20,
              background: error ? "#fdf2ef" : "#eef8f4",
              borderColor: error ? "rgba(180,70,40,0.25)" : "rgba(10,111,99,0.2)",
            }}
          >
            <p style={{ margin: 0, fontSize: 14.5, color: error ? "#8a3b28" : "#0A6F63" }}>
              {error || message}
            </p>
          </div>
        )}

        {/* Vue d'ensemble */}
        <section id="apercu" aria-labelledby="apercu-title" style={{ scrollMarginTop: 120 }}>
          <h2 id="apercu-title" style={h2Style}>
            Vue d&apos;ensemble
          </h2>
          <p style={{ ...pStyle, marginBottom: 16 }}>
            Gérez séparément le partage avec les résidences et l&apos;exercice de vos droits
            prévus par la Loi 25 sur la protection des renseignements personnels au Québec.
          </p>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <article style={cardStyle}>
              <h3 style={h3Style}>Gérer les consentements</h3>
              <p style={pStyle}>
                Voyez quelles résidences ont reçu des renseignements et retirez les accès
                futurs.
              </p>
              <button
                type="button"
                style={btnPrimary}
                onClick={() => {
                  setActiveSection("consentements");
                  scrollToSection("consentements");
                }}
              >
                Voir les consentements
              </button>
            </article>
            <article style={cardStyle}>
              <h3 style={h3Style}>Exercer vos droits</h3>
              <p style={pStyle}>
                Accédez à vos données, demandez une correction ou présentez une demande de
                suppression.
              </p>
              <button
                type="button"
                style={btnPrimary}
                onClick={() => {
                  setActiveSection("droits");
                  scrollToSection("droits");
                }}
              >
                Mes droits (Loi 25)
              </button>
            </article>
          </div>
        </section>

        {/* Consentements */}
        <section
          id="consentements"
          aria-labelledby="consentements-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="consentements-title" style={h2Style}>
            Consentements
          </h2>
          <p style={{ ...pStyle, marginBottom: 14 }}>
            Le retrait d&apos;un accès futur ne peut pas rappeler les copies déjà
            téléchargées légalement par une résidence.
          </p>

          <article style={{ ...cardStyle, marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <div style={{ flex: "1 1 240px" }}>
                <h3 style={h3Style}>Conservation du profil familial</h3>
                <p style={pStyle}>{PROFILE_RETENTION_PURPOSE_TEXT}</p>
                <p style={{ ...metaStyle, marginTop: 10 }}>
                  Statut :{" "}
                  <strong>{retentionGranted ? "Actif" : "Retiré"}</strong>
                  {user?.name ? ` · Donné par ${user.name}` : null}
                </p>
              </div>
              {retentionGranted ? (
                <button
                  type="button"
                  style={btnDangerOutline}
                  disabled={busy}
                  onClick={() => void onRevokeRetention()}
                >
                  Retirer pour l&apos;avenir
                </button>
              ) : (
                <button
                  type="button"
                  style={btnOutline}
                  disabled={busy}
                  onClick={() => void onGrantRetention()}
                >
                  Donner mon consentement
                </button>
              )}
            </div>
            {saveStatus === "saving" ? (
              <p style={{ ...metaStyle, marginTop: 10 }}>Enregistrement…</p>
            ) : null}
          </article>

          {workspace.consents.map((c) => (
            <article key={c.id} style={{ ...cardStyle, marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  justifyContent: "space-between",
                }}
              >
                <div style={{ flex: "1 1 240px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <h3 style={{ ...h3Style, margin: 0 }}>{c.communityName}</h3>
                    <StatusPill active={c.active} />
                  </div>
                  <p style={{ ...pStyle, marginTop: 8 }}>
                    Renseignements autorisés : {c.resourceLabel}
                  </p>
                  <p style={metaStyle}>
                    Date du consentement : {formatPrivacyTime(c.sharedAt)}
                  </p>
                  <p style={metaStyle}>
                    Personne ayant donné le consentement : {c.authorizedBy} (
                    {maskSensitiveText(c.authorizedByEmail)})
                  </p>
                  {c.revokedAt ? (
                    <p style={metaStyle}>
                      Retiré le {formatPrivacyTime(c.revokedAt)}
                      {c.revokedBy ? ` par ${c.revokedBy}` : ""}
                    </p>
                  ) : null}
                </div>
                <div>
                  {c.active ? (
                    <button
                      type="button"
                      style={btnDangerOutline}
                      onClick={() => {
                        if (
                          confirm(
                            `Retirer les accès futurs de ${c.communityName} à « ${c.resourceLabel} » ? Les copies déjà téléchargées ne peuvent pas être rappelées.`,
                          )
                        ) {
                          revokeConsent(c.id);
                        }
                      }}
                    >
                      Retirer les accès futurs
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={btnOutline}
                      onClick={() => restoreConsent(c.id)}
                    >
                      Rétablir l&apos;accès
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}

          {applicationShares.map((a) => (
            <article key={a.id} style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <h3 style={{ ...h3Style, margin: 0 }}>{a.communityName}</h3>
                <StatusPill active={a.active} />
              </div>
              <p style={{ ...pStyle, marginTop: 8 }}>
                Renseignements autorisés : {a.resourceLabel}
              </p>
              <p style={metaStyle}>
                Date du consentement :{" "}
                {a.sharedAt
                  ? new Date(a.sharedAt).toLocaleString("fr-CA")
                  : "Non précisée"}
              </p>
              <p style={metaStyle}>
                Personne ayant donné le consentement : {a.authorizedBy}
              </p>
              <p style={metaStyle}>Statut de la demande : {a.statusLabel}</p>
              <p style={{ ...metaStyle, marginTop: 8 }}>
                Pour retirer l&apos;accès à une résidence, ouvrez le dossier concerné dans
                l&apos;espace famille ou utilisez{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("droits");
                    scrollToSection("droits");
                  }}
                  style={linkBtn}
                >
                  Mes droits (Loi 25)
                </button>
                .
              </p>
            </article>
          ))}

          {workspace.consents.length === 0 && applicationShares.length === 0 ? (
            <p style={pStyle}>
              Aucun partage avec une résidence pour le moment. Lorsqu&apos;une demande sera
              déposée, le consentement associé apparaîtra ici.
            </p>
          ) : null}
        </section>

        {/* Préférences */}
        <section
          id="preferences"
          aria-labelledby="preferences-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="preferences-title" style={h2Style}>
            Préférences
          </h2>
          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>Communications par courriel</h3>
            {(
              [
                ["productEmails", "Mises à jour sur vos demandes"],
                ["securityEmails", "Alertes de sécurité (recommandé)"],
                ["marketingEmails", "Nouvelles occasionnelles sur le service"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginTop: 12,
                  fontSize: 14.5,
                  minHeight: 44,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={workspace.preferences[key]}
                  onChange={(e) => updatePreferences({ [key]: e.target.checked })}
                  style={{ marginTop: 4, width: 18, height: 18 }}
                />
                <span>{label}</span>
              </label>
            ))}
          </article>
          <article style={cardStyle}>
            <h3 style={h3Style}>Consentements par défaut</h3>
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                marginTop: 12,
                fontSize: 14.5,
                minHeight: 44,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={workspace.preferences.applicationShareConsent}
                onChange={(e) =>
                  updatePreferences({ applicationShareConsent: e.target.checked })
                }
                style={{ marginTop: 4, width: 18, height: 18 }}
              />
              <span>
                Autoriser le partage du dossier avec les résidences auxquelles je dépose une
                demande
              </span>
            </label>
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                marginTop: 12,
                fontSize: 14.5,
                minHeight: 44,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={workspace.preferences.shareAnalytics}
                onChange={(e) => updatePreferences({ shareAnalytics: e.target.checked })}
                style={{ marginTop: 4, width: 18, height: 18 }}
              />
              <span>Partager des statistiques d&apos;usage anonymisées</span>
            </label>
          </article>
        </section>

        {/* Sécurité */}
        <section
          id="securite"
          aria-labelledby="securite-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="securite-title" style={h2Style}>
            Sécurité
          </h2>
          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>Mot de passe</h3>
            <p style={pStyle}>
              Utilisez un mot de passe unique d&apos;au moins 8 caractères, avec majuscule,
              minuscule et chiffre.
            </p>
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={metaStyle}>Mot de passe actuel</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={metaStyle}>Nouveau mot de passe</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                style={inputStyle}
              />
            </label>
            {pwMsg ? <p style={{ ...metaStyle, marginTop: 10 }}>{pwMsg}</p> : null}
            <button
              type="button"
              style={btnPrimary}
              onClick={async () => {
                const res = await changePassword(currentPw, newPw);
                if (res.ok) {
                  setPwMsg("Mot de passe mis à jour.");
                  setCurrentPw("");
                  setNewPw("");
                } else {
                  setPwMsg(res.error || "Impossible de mettre à jour le mot de passe.");
                }
              }}
            >
              Mettre à jour le mot de passe
            </button>
          </article>

          <article style={cardStyle}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ ...h3Style, margin: 0 }}>Sessions actives</h3>
              <button type="button" style={btnOutline} onClick={revokeOtherSessions}>
                Déconnecter les autres appareils
              </button>
            </div>
            <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 10 }}>
              {workspace.sessions.map((s) => (
                <li
                  key={s.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "#f7faf8",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14.5 }}>
                      {s.label}
                      {s.current ? " · Session actuelle" : ""}
                    </p>
                    <p style={metaStyle}>
                      {s.userAgentHint} · Dernière activité {formatPrivacyTime(s.lastActiveAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    style={btnDangerOutline}
                    onClick={() => {
                      if (s.current) {
                        if (!confirm("Vous déconnecter de cet appareil ?")) return;
                        signOut();
                        return;
                      }
                      revokeSession(s.id);
                    }}
                  >
                    Révoquer
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* Historique */}
        <section
          id="historique"
          aria-labelledby="historique-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="historique-title" style={h2Style}>
            Historique des accès
          </h2>
          <p style={{ ...pStyle, marginBottom: 14 }}>
            Journal des consultations et des opérations sensibles liées à votre compte.
          </p>
          <article style={cardStyle}>
            {logs.length === 0 && workspace.accessLog.length === 0 ? (
              <p style={pStyle}>Aucune opération enregistrée pour le moment.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {logs.map((l) => (
                  <li key={l.id} style={logItemStyle}>
                    <strong>{OPS_FR[l.operation] || l.operation}</strong>
                    <span style={{ color: "#5c6f66" }}>
                      {" · "}
                      {new Date(l.recordedAt).toLocaleString("fr-CA")}
                    </span>
                    {l.detail ? (
                      <div style={{ marginTop: 4, color: "#3d5249" }}>{l.detail}</div>
                    ) : null}
                  </li>
                ))}
                {workspace.accessLog.slice(0, 20).map((e) => (
                  <li key={e.id} style={logItemStyle}>
                    <strong>{OPS_FR[e.action] || e.action}</strong>
                    <span style={{ color: "#5c6f66" }}>
                      {" · "}
                      {formatPrivacyTime(e.at)} · {e.actor}
                    </span>
                    <div style={{ marginTop: 4, color: "#3d5249" }}>
                      {e.resource}
                      {e.detail ? ` : ${e.detail}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        {/* Mes droits Loi 25 */}
        <section
          id="droits"
          aria-labelledby="droits-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="droits-title" style={h2Style}>
            Mes droits (Loi 25)
          </h2>
          <p style={{ ...pStyle, marginBottom: 16 }}>
            Vous pouvez demander l&apos;accès à vos renseignements personnels, leur
            rectification, le retrait d&apos;un consentement et, lorsque la loi le permet,
            leur suppression. Une vérification d&apos;identité peut être exigée avant de
            traiter une demande.
          </p>

          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>Télécharger mes données</h3>
            <p style={pStyle}>
              Obtenez une copie JSON de votre compte, des profils, consentements, documents
              (métadonnées) et historique des droits.
            </p>
            <p style={metaStyle}>
              Connecté·e : <strong>{user?.email}</strong>
            </p>
            <button type="button" style={btnPrimary} onClick={onExport}>
              Télécharger mes données
            </button>
          </article>

          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>Demander une correction</h3>
            <p style={pStyle}>
              Corrigez le profil contact et le dossier de la personne aînée directement dans
              l&apos;espace famille. Les modifications sont enregistrées.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              <Link href="/family/dashboard?view=dossier" style={btnOutlineLink}>
                Modifier le dossier
              </Link>
              <Link href="/family/dashboard?view=dossier" style={btnOutlineLink}>
                Ouvrir mon profil
              </Link>
            </div>
          </article>

          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>Retirer un consentement</h3>
            <p style={pStyle}>
              Retirez le consentement de conservation du profil ou les accès futurs aux
              résidences. Le retrait vaut pour l&apos;avenir.
            </p>
            <button
              type="button"
              style={btnOutline}
              onClick={() => {
                setActiveSection("consentements");
                scrollToSection("consentements");
              }}
            >
              Gérer les consentements
            </button>
          </article>

          <article
            style={{
              ...cardStyle,
              marginBottom: 12,
              borderColor: "rgba(169, 68, 50, 0.28)",
              background: "#fdf8f6",
            }}
            aria-labelledby="suppression-title"
          >
            <h3 id="suppression-title" style={{ ...h3Style, color: "#8a3b28" }}>
              Demander la suppression de mes données
            </h3>
            <p style={pStyle}>
              La demande sera examinée avant suppression. Certaines données peuvent devoir
              être conservées pendant la période exigée par la loi.
            </p>
            {!showDeleteConfirm ? (
              <button
                type="button"
                style={{ ...btnDanger, marginTop: 14 }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Commencer une demande de suppression
              </button>
            ) : (
              <div
                role="region"
                aria-label="Confirmation de suppression"
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid rgba(169, 68, 50, 0.35)",
                  background: "#fff",
                }}
              >
                <p style={{ ...pStyle, marginBottom: 12 }}>
                  Avant d&apos;envoyer votre demande, confirmez que vous comprenez :
                </p>
                <ul
                  style={{
                    margin: "0 0 14px",
                    paddingLeft: 20,
                    color: "#3d5249",
                    fontSize: 14.5,
                    lineHeight: 1.55,
                  }}
                >
                  <li>
                    Les données concernées : profil familial, dossier de la personne aînée,
                    documents téléversés, consentements et historique associé à cet espace.
                  </li>
                  <li>
                    Certaines données peuvent être conservées légalement (obligations de
                    conservation, sécurité, litiges).
                  </li>
                  <li>
                    La suppression du compte peut interrompre votre accès à HavenApply et aux
                    demandes en cours.
                  </li>
                  <li>
                    La demande sera traitée après vérification de votre identité.
                  </li>
                </ul>

                <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
                  <legend style={{ fontSize: 13, color: "#5c6f66", marginBottom: 8 }}>
                    Portée de la demande
                  </legend>
                  <label style={radioLabel}>
                    <input
                      type="radio"
                      name="delete-scope"
                      checked={deleteScope === "profile"}
                      onChange={() => setDeleteScope("profile")}
                    />
                    Supprimer le dossier de la personne aînée (garder le compte)
                  </label>
                  <label style={radioLabel}>
                    <input
                      type="radio"
                      name="delete-scope"
                      checked={deleteScope === "account"}
                      onChange={() => setDeleteScope("account")}
                    />
                    Supprimer toutes les données familiales de cet espace
                  </label>
                </fieldset>

                <label style={{ display: "block", marginTop: 12 }}>
                  <span style={metaStyle}>Motif (optionnel)</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    style={inputStyle}
                    maxLength={500}
                  />
                </label>
                <label style={{ display: "block", marginTop: 12 }}>
                  <span style={metaStyle}>
                    Tapez <strong>{expectedPhrase}</strong> pour confirmer
                  </span>
                  <input
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    style={inputStyle}
                    autoComplete="off"
                    aria-required="true"
                  />
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    style={btnDanger}
                    disabled={busy || confirmPhrase !== expectedPhrase}
                    onClick={() => void onExecuteDelete()}
                  >
                    {busy ? "Traitement…" : "Envoyer la demande de suppression"}
                  </button>
                  <button
                    type="button"
                    style={btnOutline}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmPhrase("");
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </article>

          <article style={cardStyle}>
            <h3 style={h3Style}>
              Contacter la personne responsable de la protection des renseignements
              personnels
            </h3>
            <p style={pStyle}>
              Pour toute question relative à la confidentialité ou pour exercer vos droits
              hors de cette interface, écrivez à la personne responsable de la protection des
              renseignements personnels.
            </p>
            <a
              href="mailto:privacy@havenapply.com"
              style={{ ...btnOutlineLink, marginTop: 14 }}
            >
              Contacter privacy@havenapply.com
            </a>
            <p style={{ ...metaStyle, marginTop: 12 }}>
              Consultez aussi la{" "}
              <Link href={privacyPath(locale)} style={{ color: "#0A6F63" }}>
                politique de confidentialité
              </Link>{" "}
              et l&apos;
              <Link href={collectionPath(locale)} style={{ color: "#0A6F63" }}>
                avis de collecte
              </Link>
              .
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: active ? "#e7f4f1" : "#eef1ef",
        color: active ? "#0A6F63" : "#5c6f66",
      }}
    >
      {active ? "Actif" : "Retiré"}
    </span>
  );
}

const sectionBlock: CSSProperties = { marginTop: 36 };

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: "20px 22px",
  border: "1px solid rgba(15, 61, 46, 0.1)",
};

const h2Style: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 22,
  fontWeight: 600,
  fontFamily: "var(--font-source-serif), Georgia, serif",
};

const h3Style: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 17,
  fontWeight: 600,
  fontFamily: "var(--font-source-serif), Georgia, serif",
};

const pStyle: CSSProperties = {
  margin: 0,
  fontSize: 14.5,
  lineHeight: 1.6,
  color: "#3d5249",
};

const metaStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "#5c6f66",
  lineHeight: 1.45,
};

const btnPrimary: CSSProperties = {
  marginTop: 14,
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  minHeight: 44,
  background: "#0A6F63",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const btnOutline: CSSProperties = {
  marginTop: 0,
  borderRadius: 10,
  padding: "12px 16px",
  minHeight: 44,
  background: "transparent",
  border: "1px solid rgba(10,111,99,0.35)",
  color: "#0A6F63",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const btnOutlineLink: CSSProperties = {
  ...btnOutline,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  marginTop: 14,
};

const btnDanger: CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  minHeight: 44,
  background: "#a94432",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const btnDangerOutline: CSSProperties = {
  borderRadius: 10,
  padding: "12px 16px",
  minHeight: 44,
  background: "#fff",
  border: "1px solid rgba(169,68,50,0.4)",
  color: "#8a3b28",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  borderRadius: 10,
  border: "1px solid rgba(20,32,28,0.15)",
  padding: "12px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
  minHeight: 44,
};

const radioLabel: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  fontSize: 14,
  marginBottom: 8,
  color: "#24332d",
  minHeight: 44,
};

const logItemStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "#f7faf8",
  fontSize: 13.5,
};

const linkBtn: CSSProperties = {
  border: "none",
  background: "none",
  padding: 0,
  color: "#0A6F63",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: "inherit",
  fontFamily: "inherit",
};
