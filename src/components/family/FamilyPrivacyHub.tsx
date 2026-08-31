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
import { useLocale, useT } from "@/lib/i18n/locale";

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
  { id: "apercu", label: "Overview" },
  { id: "consentements", label: "Consents" },
  { id: "preferences", label: "Preferences" },
  { id: "securite", label: "Security" },
  { id: "historique", label: "Access history" },
  { id: "droits", label: "My rights (Québec Law 25)" },
];

const OPS_LABEL: Record<string, string> = {
  access_view: "View",
  export: "Export",
  rectify: "Correction",
  consent_revoke: "Consent withdrawal",
  deletion_request: "Deletion request",
  deletion_executed: "Deletion completed",
  view_sensitive: "Sensitive data viewed",
  download: "Download",
  delete: "Deletion",
  share: "Share",
  revoke_share: "Access revoked",
  password_change: "Password change",
  session_revoke: "Session revoked",
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
  const t = useT();
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
        communityName: a.residenceName || t("Residence"),
        resourceLabel: t("Admission file submitted"),
        sharedAt: a.submittedAt,
        authorizedBy: user?.name || t("You"),
        active: a.status !== "withdrawn",
        statusLabel: a.status,
      }));
  }, [data.applications, user?.name, t]);

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
      setError(saveError || t("Unable to withdraw consent."));
      return;
    }
    setRetentionGranted(false);
    setMessage(t("Profile retention consent withdrawn for the future."));
    void refreshLogs();
  };

  const onGrantRetention = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const ok = await recordProfileConsent(true);
    setBusy(false);
    if (!ok) {
      setError(saveError || t("Unable to save consent."));
      return;
    }
    setRetentionGranted(true);
    setMessage(t("Profile retention consent saved."));
    void refreshLogs();
  };

  const expectedPhrase =
    deleteScope === "account" ? t("DELETE MY ACCOUNT") : t("DELETE THE FILE");

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
        {t("Loading privacy settings…")}
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
          <nav aria-label={t("Breadcrumb")}>
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
                  {t("Home")}
                </Link>
              </li>
              <li aria-hidden style={{ opacity: 0.5 }}>
                →
              </li>
              <li>
                <Link href="/family/settings" style={{ color: "#0A6F63", textDecoration: "none" }}>
                  {t("Settings")}
                </Link>
              </li>
              <li aria-hidden style={{ opacity: 0.5 }}>
                →
              </li>
              <li>
                <span aria-current="page" style={{ fontWeight: 600, color: "#14201c" }}>
                  {t("Privacy and data")}
                </span>
              </li>
            </ol>
          </nav>
          <Link
            href="/family/dashboard"
            style={{ fontSize: 14, color: "#0A6F63", textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}
          >
            {t("Back to family space")}
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
            {t("Settings")}
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
            {t("Privacy and data")}
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 15.5, lineHeight: 1.6, color: "#3d5249", maxWidth: 640 }}>
            {t("Understand how your information is used, manage your consents, and exercise your rights.")}
          </p>
        </header>

        <CollectionNotice variant="profile" />

        <nav
          aria-label={t("Privacy sections")}
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
                {t(s.label)}
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

        {/* Overview */}
        <section id="apercu" aria-labelledby="apercu-title" style={{ scrollMarginTop: 120 }}>
          <h2 id="apercu-title" style={h2Style}>
            {t("Overview")}
          </h2>
          <p style={{ ...pStyle, marginBottom: 16 }}>
            {t(
              "Manage residence data sharing separately from exercising your rights under Québec's Law 25 on the protection of personal information.",
            )}
          </p>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <article style={cardStyle}>
              <h3 style={h3Style}>{t("Manage consents")}</h3>
              <p style={pStyle}>
                {t("See which residences have received information and withdraw future access.")}
              </p>
              <button
                type="button"
                style={btnPrimary}
                onClick={() => {
                  setActiveSection("consentements");
                  scrollToSection("consentements");
                }}
              >
                {t("View consents")}
              </button>
            </article>
            <article style={cardStyle}>
              <h3 style={h3Style}>{t("Exercise your rights")}</h3>
              <p style={pStyle}>
                {t("Access your data, request a correction, or submit a deletion request.")}
              </p>
              <button
                type="button"
                style={btnPrimary}
                onClick={() => {
                  setActiveSection("droits");
                  scrollToSection("droits");
                }}
              >
                {t("My rights (Québec Law 25)")}
              </button>
            </article>
          </div>
        </section>

        {/* Consents */}
        <section
          id="consentements"
          aria-labelledby="consentements-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="consentements-title" style={h2Style}>
            {t("Consents")}
          </h2>
          <p style={{ ...pStyle, marginBottom: 14 }}>
            {t(
              "Withdrawing future access cannot recall copies a residence has already legally downloaded.",
            )}
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
                <h3 style={h3Style}>{t("Family profile retention")}</h3>
                <p style={pStyle}>{PROFILE_RETENTION_PURPOSE_TEXT}</p>
                <p style={{ ...metaStyle, marginTop: 10 }}>
                  {t("Status:")}{" "}
                  <strong>{retentionGranted ? t("Active") : t("Withdrawn")}</strong>
                  {user?.name ? ` · ${t("Given by {name}", { name: user.name })}` : null}
                </p>
              </div>
              {retentionGranted ? (
                <button
                  type="button"
                  style={btnDangerOutline}
                  disabled={busy}
                  onClick={() => void onRevokeRetention()}
                >
                  {t("Withdraw for the future")}
                </button>
              ) : (
                <button
                  type="button"
                  style={btnOutline}
                  disabled={busy}
                  onClick={() => void onGrantRetention()}
                >
                  {t("Give my consent")}
                </button>
              )}
            </div>
            {saveStatus === "saving" ? (
              <p style={{ ...metaStyle, marginTop: 10 }}>{t("Saving…")}</p>
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
                    {t("Information authorized: {value}", { value: c.resourceLabel })}
                  </p>
                  <p style={metaStyle}>
                    {t("Consent date: {value}", { value: formatPrivacyTime(c.sharedAt) })}
                  </p>
                  <p style={metaStyle}>
                    {t("Consent given by: {name} ({email})", {
                      name: c.authorizedBy,
                      email: maskSensitiveText(c.authorizedByEmail),
                    })}
                  </p>
                  {c.revokedAt ? (
                    <p style={metaStyle}>
                      {t("Withdrawn on {date}", { date: formatPrivacyTime(c.revokedAt) })}
                      {c.revokedBy ? ` ${t("by {name}", { name: c.revokedBy })}` : ""}
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
                            t(
                              'Withdraw {community}\'s future access to "{resource}"? Copies already downloaded cannot be recalled.',
                              { community: c.communityName, resource: c.resourceLabel },
                            ),
                          )
                        ) {
                          revokeConsent(c.id);
                        }
                      }}
                    >
                      {t("Withdraw future access")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={btnOutline}
                      onClick={() => restoreConsent(c.id)}
                    >
                      {t("Restore access")}
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
                {t("Information authorized: {value}", { value: a.resourceLabel })}
              </p>
              <p style={metaStyle}>
                {t("Consent date: {value}", {
                  value: a.sharedAt
                    ? new Date(a.sharedAt).toLocaleString("fr-CA")
                    : t("Not specified"),
                })}
              </p>
              <p style={metaStyle}>
                {t("Consent given by: {name}", { name: a.authorizedBy })}
              </p>
              <p style={metaStyle}>
                {t("Application status: {value}", { value: a.statusLabel })}
              </p>
              <p style={{ ...metaStyle, marginTop: 8 }}>
                {t(
                  "To withdraw access for a residence, open the relevant file in the family space or use",
                )}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection("droits");
                    scrollToSection("droits");
                  }}
                  style={linkBtn}
                >
                  {t("My rights (Québec Law 25)")}
                </button>
                .
              </p>
            </article>
          ))}

          {workspace.consents.length === 0 && applicationShares.length === 0 ? (
            <p style={pStyle}>
              {t(
                "No residence sharing yet. Once you submit an application, the associated consent will appear here.",
              )}
            </p>
          ) : null}
        </section>

        {/* Preferences */}
        <section
          id="preferences"
          aria-labelledby="preferences-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="preferences-title" style={h2Style}>
            {t("Preferences")}
          </h2>
          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>{t("Email communications")}</h3>
            {(
              [
                ["productEmails", "Updates about your applications"],
                ["securityEmails", "Security alerts (recommended)"],
                ["marketingEmails", "Occasional service news"],
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
                <span>{t(label)}</span>
              </label>
            ))}
          </article>
          <article style={cardStyle}>
            <h3 style={h3Style}>{t("Default consents")}</h3>
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
                {t("Allow sharing my file with residences I apply to")}
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
              <span>{t("Share anonymized usage statistics")}</span>
            </label>
          </article>
        </section>

        {/* Security */}
        <section
          id="securite"
          aria-labelledby="securite-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="securite-title" style={h2Style}>
            {t("Security")}
          </h2>
          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>{t("Password")}</h3>
            <p style={pStyle}>
              {t(
                "Use a unique password of at least 8 characters, with an uppercase letter, a lowercase letter, and a number.",
              )}
            </p>
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={metaStyle}>{t("Current password")}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={metaStyle}>{t("New password")}</span>
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
                  setPwMsg(t("Password updated."));
                  setCurrentPw("");
                  setNewPw("");
                } else {
                  setPwMsg(res.error || t("Unable to update password."));
                }
              }}
            >
              {t("Update password")}
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
              <h3 style={{ ...h3Style, margin: 0 }}>{t("Active sessions")}</h3>
              <button type="button" style={btnOutline} onClick={revokeOtherSessions}>
                {t("Sign out other devices")}
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
                      {s.current ? ` · ${t("Current session")}` : ""}
                    </p>
                    <p style={metaStyle}>
                      {t("{device} · Last active {date}", {
                        device: s.userAgentHint,
                        date: formatPrivacyTime(s.lastActiveAt),
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    style={btnDangerOutline}
                    onClick={() => {
                      if (s.current) {
                        if (!confirm(t("Sign out of this device?"))) return;
                        signOut();
                        return;
                      }
                      revokeSession(s.id);
                    }}
                  >
                    {t("Revoke")}
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* Access history */}
        <section
          id="historique"
          aria-labelledby="historique-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="historique-title" style={h2Style}>
            {t("Access history")}
          </h2>
          <p style={{ ...pStyle, marginBottom: 14 }}>
            {t("Log of views and sensitive operations related to your account.")}
          </p>
          <article style={cardStyle}>
            {logs.length === 0 && workspace.accessLog.length === 0 ? (
              <p style={pStyle}>{t("No operations recorded yet.")}</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                {logs.map((l) => (
                  <li key={l.id} style={logItemStyle}>
                    <strong>{t(OPS_LABEL[l.operation] || l.operation)}</strong>
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
                    <strong>{t(OPS_LABEL[e.action] || e.action)}</strong>
                    <span style={{ color: "#5c6f66" }}>
                      {" · "}
                      {formatPrivacyTime(e.at)} · {e.actor}
                    </span>
                    <div style={{ marginTop: 4, color: "#3d5249" }}>
                      {e.resource}
                      {e.detail ? ` — ${e.detail}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        {/* My rights (Québec Law 25) */}
        <section
          id="droits"
          aria-labelledby="droits-title"
          style={{ ...sectionBlock, scrollMarginTop: 120 }}
        >
          <h2 id="droits-title" style={h2Style}>
            {t("My rights (Québec Law 25)")}
          </h2>
          <p style={{ ...pStyle, marginBottom: 16 }}>
            {t(
              "You can request access to your personal information, its correction, the withdrawal of a consent, and, where the law allows, its deletion. Identity verification may be required before a request is processed.",
            )}
          </p>

          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>{t("Download my data")}</h3>
            <p style={pStyle}>
              {t(
                "Get a JSON copy of your account, profiles, consents, documents (metadata), and rights history.",
              )}
            </p>
            <p style={metaStyle}>
              {t("Signed in as:")} <strong>{user?.email}</strong>
            </p>
            <button type="button" style={btnPrimary} onClick={onExport}>
              {t("Download my data")}
            </button>
          </article>

          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>{t("Request a correction")}</h3>
            <p style={pStyle}>
              {t(
                "Correct the contact profile and the senior's file directly in the family space. Changes are saved.",
              )}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              <Link href="/family/dashboard?view=dossier" style={btnOutlineLink}>
                {t("Edit the file")}
              </Link>
              <Link href="/family/dashboard?view=dossier" style={btnOutlineLink}>
                {t("Open my profile")}
              </Link>
            </div>
          </article>

          <article style={{ ...cardStyle, marginBottom: 12 }}>
            <h3 style={h3Style}>{t("Withdraw a consent")}</h3>
            <p style={pStyle}>
              {t(
                "Withdraw the profile retention consent or future residence access. The withdrawal applies going forward.",
              )}
            </p>
            <button
              type="button"
              style={btnOutline}
              onClick={() => {
                setActiveSection("consentements");
                scrollToSection("consentements");
              }}
            >
              {t("Manage consents")}
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
              {t("Request deletion of my data")}
            </h3>
            <p style={pStyle}>
              {t(
                "The request will be reviewed before deletion. Some data may need to be retained for the period required by law.",
              )}
            </p>
            {!showDeleteConfirm ? (
              <button
                type="button"
                style={{ ...btnDanger, marginTop: 14 }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                {t("Start a deletion request")}
              </button>
            ) : (
              <div
                role="region"
                aria-label={t("Deletion confirmation")}
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid rgba(169, 68, 50, 0.35)",
                  background: "#fff",
                }}
              >
                <p style={{ ...pStyle, marginBottom: 12 }}>
                  {t("Before sending your request, confirm that you understand:")}
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
                    {t(
                      "Data concerned: family profile, senior’s file, uploaded documents, consents, and history linked to this space.",
                    )}
                  </li>
                  <li>
                    {t(
                      "Some data may be retained legally (retention duties, security, disputes).",
                    )}
                  </li>
                  <li>
                    {t(
                      "Deleting the account may interrupt your access to HavenApply and open applications.",
                    )}
                  </li>
                  <li>
                    {t("The request will be processed after your identity is verified.")}
                  </li>
                </ul>

                <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
                  <legend style={{ fontSize: 13, color: "#5c6f66", marginBottom: 8 }}>
                    {t("Scope of the request")}
                  </legend>
                  <label style={radioLabel}>
                    <input
                      type="radio"
                      name="delete-scope"
                      checked={deleteScope === "profile"}
                      onChange={() => setDeleteScope("profile")}
                    />
                    {t("Delete the senior’s file (keep the account)")}
                  </label>
                  <label style={radioLabel}>
                    <input
                      type="radio"
                      name="delete-scope"
                      checked={deleteScope === "account"}
                      onChange={() => setDeleteScope("account")}
                    />
                    {t("Delete all family data in this space")}
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
                    {t("Cancel")}
                  </button>
                </div>
              </div>
            )}
          </article>

          <article style={cardStyle}>
            <h3 style={h3Style}>
              {t("Contact the privacy officer")}
            </h3>
            <p style={pStyle}>
              {t(
                "For any privacy question or to exercise your rights outside this interface, write to the privacy officer.",
              )}
            </p>
            <a
              href="mailto:privacy@havenapply.com"
              style={{ ...btnOutlineLink, marginTop: 14 }}
            >
              {t("Contact privacy@havenapply.com")}
            </a>
            <p style={{ ...metaStyle, marginTop: 12 }}>
              {t("Also see the")}{" "}
              <Link href={privacyPath(locale)} style={{ color: "#0A6F63" }}>
                {t("privacy policy")}
              </Link>{" "}
              {t("and the")}{" "}
              <Link href={collectionPath(locale)} style={{ color: "#0A6F63" }}>
                {t("collection notice")}
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
  const t = useT();
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
      {active ? t("Active") : t("Withdrawn")}
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
