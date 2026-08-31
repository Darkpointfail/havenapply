"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { CollectionNotice } from "@/components/legal/CollectionNotice";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import {
  apiExecuteDeletion,
  apiFetchRightsLog,
  familyExportUrl,
} from "@/lib/family/client-api";
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

const COPY = {
  fr: {
    eyebrow: "Espace famille",
    title: "Vos droits (Loi 25)",
    back: "Retour à l'accueil",
    loading: "Chargement de vos droits…",
    accessTitle: "1. Accéder à vos données",
    accessBody:
      "Téléchargez une copie JSON de votre compte, des profils, consentements, documents (métadonnées) et historique des droits. Les fichiers eux-mêmes se téléchargent depuis le dossier.",
    connected: "Connecté·e",
    completeness: "Complétude actuelle",
    exportBtn: "Exporter mes données",
    rectifyTitle: "2. Rectifier vos informations",
    rectifyBody:
      "Corrigez le profil contact et le dossier de la personne aînée directement dans l'espace famille. Les modifications sont enregistrées en base.",
    editFile: "Modifier le dossier",
    openProfile: "Ouvrir le profil",
    revokeTitle: "3. Retirer le consentement de conservation",
    revokeBody:
      "Ce retrait vaut pour l'avenir. Il n'autorise jamais la transmission à une résidence (consentement distinct, non actif dans cette phase).",
    revokeBtn: "Retirer mon consentement au profil",
    saving: "Enregistrement…",
    revokeOk: "Consentement de conservation du profil retiré pour l'avenir.",
    revokeErr: "Impossible de retirer le consentement.",
    deleteTitle: "4. Supprimer le dossier ou le compte",
    deleteBodyPrefix: "La suppression est ",
    deleteBodyStrong: "effective",
    deleteBodySuffix:
      " : fichiers effacés, renseignements du dossier anonymisés ou retirés. Cette action est irréversible.",
    scope: "Portée",
    scopeProfile: "Supprimer le dossier de la personne aînée (garder le compte)",
    scopeAccount: "Supprimer toutes les données familiales de cet espace",
    reason: "Motif (optionnel)",
    typeConfirm: "Tapez",
    toConfirm: "pour confirmer",
    phraseProfile: "SUPPRIMER LE DOSSIER",
    phraseAccount: "SUPPRIMER MON COMPTE",
    deleting: "Suppression…",
    deleteBtn: "Exécuter la suppression",
    historyTitle: "Historique de vos opérations sensibles",
    historyEmpty: "Aucune opération enregistrée pour le moment.",
    seePrivacy: "Voir la",
    privacy: "politique de confidentialité",
    and: "et l'",
    collection: "avis de collecte",
    ops: {
      access_view: "Consultation",
      export: "Export",
      rectify: "Rectification",
      consent_revoke: "Retrait de consentement",
      deletion_request: "Demande de suppression",
      deletion_executed: "Suppression effectuée",
    } as Record<string, string>,
  },
  en: {
    eyebrow: "Family space",
    title: "Your rights (Québec Law 25)",
    back: "Back to home",
    loading: "Loading your rights…",
    accessTitle: "1. Access your data",
    accessBody:
      "Download a JSON copy of your account, profiles, consents, documents (metadata), and rights history. Binary files themselves are downloaded from the file.",
    connected: "Signed in",
    completeness: "Current completeness",
    exportBtn: "Export my data",
    rectifyTitle: "2. Correct your information",
    rectifyBody:
      "Update the contact profile and the senior's file directly in the family space. Changes are saved to the database.",
    editFile: "Edit the file",
    openProfile: "Open profile",
    revokeTitle: "3. Withdraw retention consent",
    revokeBody:
      "This withdrawal applies going forward. It never authorizes transmission to a residence (separate consent, inactive in this phase).",
    revokeBtn: "Withdraw my profile consent",
    saving: "Saving…",
    revokeOk: "Profile retention consent withdrawn for the future.",
    revokeErr: "Unable to withdraw consent.",
    deleteTitle: "4. Delete the file or account data",
    deleteBodyPrefix: "Deletion is ",
    deleteBodyStrong: "effective",
    deleteBodySuffix:
      ": files removed, file information anonymized or deleted. This action cannot be undone.",
    scope: "Scope",
    scopeProfile: "Delete the senior's file (keep the account)",
    scopeAccount: "Delete all family data in this space",
    reason: "Reason (optional)",
    typeConfirm: "Type",
    toConfirm: "to confirm",
    phraseProfile: "DELETE THE FILE",
    phraseAccount: "DELETE MY ACCOUNT",
    deleting: "Deleting…",
    deleteBtn: "Execute deletion",
    historyTitle: "History of your sensitive operations",
    historyEmpty: "No operations recorded yet.",
    seePrivacy: "See the",
    privacy: "privacy policy",
    and: "and the",
    collection: "collection notice",
    ops: {
      access_view: "Access",
      export: "Export",
      rectify: "Correction",
      consent_revoke: "Consent withdrawal",
      deletion_request: "Deletion request",
      deletion_executed: "Deletion completed",
    } as Record<string, string>,
  },
} as const;

export default function FamilyRightsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = COPY[locale === "en" ? "en" : "fr"];
  const { user, signOut } = useAuth();
  const {
    ready,
    completeness,
    saveStatus,
    saveError,
    recordProfileConsent,
  } = useFamilyData();

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<"profile" | "account">("profile");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [reason, setReason] = useState("");

  const refreshLogs = useCallback(async () => {
    const result = await apiFetchRightsLog();
    if (result.ok) setLogs(result.logs);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshLogs();
  }, [ready, refreshLogs]);

  const onExport = () => {
    window.location.href = familyExportUrl();
    window.setTimeout(() => void refreshLogs(), 800);
  };

  const onRevokeConsent = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const ok = await recordProfileConsent(false);
    setBusy(false);
    if (!ok) {
      setError(saveError || t.revokeErr);
      return;
    }
    setMessage(t.revokeOk);
    void refreshLogs();
  };

  const expectedPhrase = deleteScope === "account" ? t.phraseAccount : t.phraseProfile;

  const onExecuteDelete = async () => {
    if (confirmPhrase !== expectedPhrase) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const apiPhrase =
      deleteScope === "account" ? "SUPPRIMER MON COMPTE" : "SUPPRIMER LE DOSSIER";
    const result = await apiExecuteDeletion({
      scope: deleteScope,
      reason,
      confirmPhrase: apiPhrase,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message);
    setConfirmPhrase("");
    if (deleteScope === "account") {
      signOut();
      router.replace("/sign-in?deleted=1");
      return;
    }
    void refreshLogs();
    router.refresh();
  };

  if (!ready) {
    return (
      <div className={`${publicSans.variable} ${sourceSerif.variable} p-8 text-sm text-[#5c6f66]`}>
        {t.loading}
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
      <header style={{ borderBottom: "1px solid rgba(20,32,28,0.08)", background: "rgba(255,255,255,0.8)" }}>
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
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
              {t.eyebrow}
            </p>
            <h1
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--font-source-serif), Georgia, serif",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {t.title}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageSwitcher compact />
            <Link href="/family/dashboard" style={{ fontSize: 14, color: "#0A6F63", textDecoration: "none" }}>
              {t.back}
            </Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 64px", display: "grid", gap: 20 }}>
        <CollectionNotice variant="profile" />

        <section style={cardStyle}>
          <h2 style={h2Style}>{t.accessTitle}</h2>
          <p style={pStyle}>{t.accessBody}</p>
          <p style={{ ...pStyle, marginTop: 8 }}>
            {t.connected}: <strong>{user?.email}</strong> · {t.completeness}: {completeness} %
          </p>
          <button type="button" style={btnPrimary} onClick={onExport}>
            {t.exportBtn}
          </button>
        </section>

        <section style={cardStyle}>
          <h2 style={h2Style}>{t.rectifyTitle}</h2>
          <p style={pStyle}>{t.rectifyBody}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/family/dashboard?view=dossier" style={btnOutlineLink}>
              {t.editFile}
            </Link>
            <Link href="/family/profile" style={btnOutlineLink}>
              {t.openProfile}
            </Link>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={h2Style}>{t.revokeTitle}</h2>
          <p style={pStyle}>{t.revokeBody}</p>
          <button type="button" style={btnOutline} disabled={busy} onClick={() => void onRevokeConsent()}>
            {t.revokeBtn}
          </button>
          {saveStatus === "saving" ? <p style={{ ...pStyle, marginTop: 10 }}>{t.saving}</p> : null}
        </section>

        <section style={cardStyle}>
          <h2 style={h2Style}>{t.deleteTitle}</h2>
          <p style={pStyle}>
            {t.deleteBodyPrefix}
            <strong>{t.deleteBodyStrong}</strong>
            {t.deleteBodySuffix}
          </p>
          <fieldset style={{ border: "none", margin: "12px 0 0", padding: 0 }}>
            <legend style={{ fontSize: 13, color: "#5c6f66", marginBottom: 8 }}>{t.scope}</legend>
            <label style={radioLabel}>
              <input
                type="radio"
                name="scope"
                checked={deleteScope === "profile"}
                onChange={() => setDeleteScope("profile")}
              />
              {t.scopeProfile}
            </label>
            <label style={radioLabel}>
              <input
                type="radio"
                name="scope"
                checked={deleteScope === "account"}
                onChange={() => setDeleteScope("account")}
              />
              {t.scopeAccount}
            </label>
          </fieldset>
          <label style={{ display: "block", marginTop: 12 }}>
            <span style={{ fontSize: 13, color: "#5c6f66" }}>{t.reason}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              style={inputStyle}
              maxLength={500}
            />
          </label>
          <label style={{ display: "block", marginTop: 12 }}>
            <span style={{ fontSize: 13, color: "#5c6f66" }}>
              {t.typeConfirm} <strong>{expectedPhrase}</strong> {t.toConfirm}
            </span>
            <input
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              style={inputStyle}
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            style={{ ...btnDanger, marginTop: 14 }}
            disabled={busy || confirmPhrase !== expectedPhrase}
            onClick={() => void onExecuteDelete()}
          >
            {busy ? t.deleting : t.deleteBtn}
          </button>
        </section>

        {(message || error) && (
          <div
            role={error ? "alert" : "status"}
            style={{
              ...cardStyle,
              background: error ? "#fdf2ef" : "#eef8f4",
              borderColor: error ? "rgba(180,70,40,0.25)" : "rgba(10,111,99,0.2)",
            }}
          >
            <p style={{ margin: 0, fontSize: 14.5, color: error ? "#8a3b28" : "#0A6F63" }}>
              {error || message}
            </p>
          </div>
        )}

        <section style={cardStyle}>
          <h2 style={h2Style}>{t.historyTitle}</h2>
          {logs.length === 0 ? (
            <p style={pStyle}>{t.historyEmpty}</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
              {logs.map((l) => (
                <li
                  key={l.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#f7faf8",
                    fontSize: 13.5,
                  }}
                >
                  <strong>{t.ops[l.operation] || l.operation}</strong>
                  <span style={{ color: "#5c6f66" }}>
                    {" · "}
                    {new Date(l.recordedAt).toLocaleString(locale === "en" ? "en-CA" : "fr-CA")}
                  </span>
                  {l.detail ? <div style={{ marginTop: 4, color: "#3d5249" }}>{l.detail}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p style={{ fontSize: 13, color: "#5c6f66", lineHeight: 1.5 }}>
          {t.seePrivacy}{" "}
          <Link href={privacyPath(locale)} style={{ color: "#0A6F63" }}>
            {t.privacy}
          </Link>{" "}
          {t.and}{" "}
          <Link href={collectionPath(locale)} style={{ color: "#0A6F63" }}>
            {t.collection}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: "20px 22px",
  border: "1px solid rgba(15, 61, 46, 0.1)",
};

const h2Style: CSSProperties = {
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

const btnPrimary: CSSProperties = {
  marginTop: 14,
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  background: "#0A6F63",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const btnOutline: CSSProperties = {
  marginTop: 14,
  borderRadius: 10,
  padding: "10px 16px",
  background: "transparent",
  border: "1px solid rgba(10,111,99,0.35)",
  color: "#0A6F63",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const btnOutlineLink: CSSProperties = {
  ...btnOutline,
  display: "inline-block",
  textDecoration: "none",
  marginTop: 14,
};

const btnDanger: CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  background: "#a94432",
  color: "#fff",
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
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const radioLabel: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  fontSize: 14,
  marginBottom: 8,
  color: "#24332d",
};
