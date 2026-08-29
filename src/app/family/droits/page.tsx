"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import {
  apiExecuteDeletion,
  apiFetchRightsLog,
  familyExportUrl,
} from "@/lib/family/client-api";
import { CollectionNotice } from "@/components/legal/CollectionNotice";

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

const OP_LABEL: Record<string, string> = {
  access_view: "Consultation",
  export: "Export",
  rectify: "Rectification",
  consent_revoke: "Retrait de consentement",
  deletion_request: "Demande de suppression",
  deletion_executed: "Suppression effectuée",
};

export default function FamilyRightsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    ready,
    data,
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

  const hasConsent = Boolean(
    // consent lives on server bundle; infer from completeness section if present via save cycle
    data.senior.firstName || data.onboarding.lastSavedAt,
  );
  void hasConsent;

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
      setError(saveError || "Impossible de retirer le consentement.");
      return;
    }
    setMessage("Consentement de conservation du profil retiré pour l'avenir.");
    void refreshLogs();
  };

  const onExecuteDelete = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await apiExecuteDeletion({
      scope: deleteScope,
      reason,
      confirmPhrase,
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

  const expectedPhrase =
    deleteScope === "account" ? "SUPPRIMER MON COMPTE" : "SUPPRIMER LE DOSSIER";

  if (!ready) {
    return (
      <div className={`${publicSans.variable} ${sourceSerif.variable} p-8 text-sm text-[#5c6f66]`}>
        Chargement de vos droits…
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
          background: "rgba(255,255,255,0.8)",
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "#5c6f66", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
              Espace famille
            </p>
            <h1
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--font-source-serif), Georgia, serif",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              Vos droits (Loi 25)
            </h1>
          </div>
          <Link href="/family/dashboard" style={{ fontSize: 14, color: "#0A6F63", textDecoration: "none" }}>
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 64px", display: "grid", gap: 20 }}>
        <CollectionNotice variant="profile" />

        <section style={cardStyle}>
          <h2 style={h2Style}>1. Accéder à vos données</h2>
          <p style={pStyle}>
            Téléchargez une copie JSON de votre compte, des profils, consentements, documents
            (métadonnées) et historique des droits. Les fichiers eux-mêmes se téléchargent
            depuis le dossier.
          </p>
          <p style={{ ...pStyle, marginTop: 8 }}>
            Connecté·e : <strong>{user?.email}</strong> · Complétude actuelle : {completeness} %
          </p>
          <button type="button" style={btnPrimary} onClick={onExport}>
            Exporter mes données
          </button>
        </section>

        <section style={cardStyle}>
          <h2 style={h2Style}>2. Rectifier vos informations</h2>
          <p style={pStyle}>
            Corrigez le profil contact et le dossier de la personne aînée directement dans
            l&apos;espace famille. Les modifications sont enregistrées en base.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/family/dashboard?view=dossier" style={btnOutlineLink}>
              Modifier le dossier
            </Link>
            <Link href="/family/profile" style={btnOutlineLink}>
              Ouvrir le profil
            </Link>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={h2Style}>3. Retirer le consentement de conservation</h2>
          <p style={pStyle}>
            Ce retrait vaut pour l&apos;avenir. Il n&apos;autorise jamais la transmission à une
            résidence (consentement distinct, non actif dans cette phase).
          </p>
          <button type="button" style={btnOutline} disabled={busy} onClick={() => void onRevokeConsent()}>
            Retirer mon consentement au profil
          </button>
          {saveStatus === "saving" ? (
            <p style={{ ...pStyle, marginTop: 10 }}>Enregistrement…</p>
          ) : null}
        </section>

        <section style={cardStyle}>
          <h2 style={h2Style}>4. Supprimer le dossier ou le compte</h2>
          <p style={pStyle}>
            La suppression est <strong>effective</strong> : fichiers effacés, renseignements
            du dossier anonymisés ou retirés. Cette action est irréversible.
          </p>
          <fieldset style={{ border: "none", margin: "12px 0 0", padding: 0 }}>
            <legend style={{ fontSize: 13, color: "#5c6f66", marginBottom: 8 }}>Portée</legend>
            <label style={radioLabel}>
              <input
                type="radio"
                name="scope"
                checked={deleteScope === "profile"}
                onChange={() => setDeleteScope("profile")}
              />
              Supprimer le dossier de la personne aînée (garder le compte)
            </label>
            <label style={radioLabel}>
              <input
                type="radio"
                name="scope"
                checked={deleteScope === "account"}
                onChange={() => setDeleteScope("account")}
              />
              Supprimer toutes les données familiales de cet espace
            </label>
          </fieldset>
          <label style={{ display: "block", marginTop: 12 }}>
            <span style={{ fontSize: 13, color: "#5c6f66" }}>Motif (optionnel)</span>
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
              Tapez <strong>{expectedPhrase}</strong> pour confirmer
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
            {busy ? "Suppression…" : "Exécuter la suppression"}
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
          <h2 style={h2Style}>Historique de vos opérations sensibles</h2>
          {logs.length === 0 ? (
            <p style={pStyle}>Aucune opération enregistrée pour le moment.</p>
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
                  <strong>{OP_LABEL[l.operation] || l.operation}</strong>
                  <span style={{ color: "#5c6f66" }}>
                    {" · "}
                    {new Date(l.recordedAt).toLocaleString("fr-CA")}
                  </span>
                  {l.detail ? <div style={{ marginTop: 4, color: "#3d5249" }}>{l.detail}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p style={{ fontSize: 13, color: "#5c6f66", lineHeight: 1.5 }}>
          Voir la{" "}
          <Link href="/confidentialite" style={{ color: "#0A6F63" }}>
            politique de confidentialité
          </Link>{" "}
          et l&apos;
          <Link href="/avis-de-collecte" style={{ color: "#0A6F63" }}>
            avis de collecte
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
