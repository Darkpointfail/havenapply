"use client";

import { useState } from "react";
import { AlertTriangle, Download, Lock, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth";
import { usePrivacySecurity } from "@/lib/privacy-security-store";
import {
  COMPLIANCE_DISCLAIMER,
  SENSITIVE_WARNING,
  formatPrivacyTime,
  isLinkExpired,
  maskSensitiveText,
} from "@/lib/privacy-security";
import { cn } from "@/lib/utils";

type Tab = "consent" | "privacy" | "security" | "access";

function PrivacyInner() {
  const { user, signOut } = useAuth();
  const {
    ready,
    workspace,
    revokeConsent,
    restoreConsent,
    updatePreferences,
    revokeSession,
    revokeOtherSessions,
    createSensitiveLink,
    revokeSensitiveLink,
    requestDeletion,
    cancelDeletion,
    exportData,
    changePassword,
  } = usePrivacySecurity();

  const [tab, setTab] = useState<Tab>("consent");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [deleteNote, setDeleteNote] = useState("");

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading privacy controls…
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "consent", label: "Consent ledger" },
    { id: "privacy", label: "Preferences" },
    { id: "security", label: "Security" },
    { id: "access", label: "Access history" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Privacy & security"
        description="See who received information, manage consent, and control sensitive actions."
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Privacy" },
        ]}
      />

      <Card className="mb-6 border-warn/30 bg-warn-soft/40 p-4 text-sm text-ink">
        <div className="flex gap-2">
          <Shield size={18} className="mt-0.5 shrink-0 text-warn" />
          <p>{COMPLIANCE_DISCLAIMER}</p>
        </div>
      </Card>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-line pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              tab === t.id
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-bg-soft",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "consent" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Communities that received information from your household, with share date and who
            authorized it. You can revoke future access where applicable.
          </p>
          {workspace.consents.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{c.communityName}</p>
                    <Badge tone={c.active ? "success" : "neutral"}>
                      {c.active ? "Active access" : "Revoked"}
                    </Badge>
                    <Badge tone="brand">{c.kind.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink">{c.resourceLabel}</p>
                  <p className="mt-2 text-xs text-ink-faint">
                    Shared {formatPrivacyTime(c.sharedAt)} · Authorized by {c.authorizedBy} (
                    {maskSensitiveText(c.authorizedByEmail)})
                  </p>
                  {c.revokedAt && (
                    <p className="mt-1 text-xs text-ink-faint">
                      Revoked {formatPrivacyTime(c.revokedAt)}
                      {c.revokedBy ? ` by ${c.revokedBy}` : ""}
                    </p>
                  )}
                  {c.notes && <p className="mt-2 text-sm text-ink-muted">{c.notes}</p>}
                </div>
                <div>
                  {c.active ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (
                          confirm(
                            `Revoke future access for ${c.communityName} to “${c.resourceLabel}”? Already-downloaded copies cannot be recalled.`,
                          )
                        ) {
                          revokeConsent(c.id);
                        }
                      }}
                    >
                      Revoke future access
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => restoreConsent(c.id)}>
                      Restore access
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "privacy" && (
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Email preferences</h2>
            {(
              [
                ["productEmails", "Product updates about your applications"],
                ["securityEmails", "Security alerts (recommended)"],
                ["marketingEmails", "Occasional product news"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={workspace.preferences[key]}
                  onChange={(e) => updatePreferences({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </Card>
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Consent defaults</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={workspace.preferences.applicationShareConsent}
                onChange={(e) =>
                  updatePreferences({ applicationShareConsent: e.target.checked })
                }
              />
              Allow sharing application packets with communities I submit to
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={workspace.preferences.shareAnalytics}
                onChange={(e) => updatePreferences({ shareAnalytics: e.target.checked })}
              />
              Share anonymized product analytics
            </label>
          </Card>
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Family invitations</h2>
            <p className="text-sm text-ink-muted">
              Manage who can access this household from Family Members. Invitations expire after 7
              days.
            </p>
            <Button href="/family/family-members" size="sm" variant="secondary">
              Manage invitations
            </Button>
          </Card>
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Export your data</h2>
            <p className="text-sm text-ink-muted">
              Download a JSON summary of consents, preferences, and recent access events.
            </p>
            <Button
              size="sm"
              onClick={() => {
                if (!confirm(`${SENSITIVE_WARNING}\n\nDownload your data export?`)) return;
                const json = exportData();
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `haven-data-export-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={14} /> Export data
            </Button>
          </Card>
          <Card className="space-y-3 border-danger/20 p-5">
            <h2 className="font-semibold text-danger">Request account deletion</h2>
            <p className="text-sm text-ink-muted">
              Submits a deletion request for review. Active shares are flagged for revocation. This
              demo does not permanently wipe browser storage until you clear it.
            </p>
            {workspace.deletionRequest?.status === "pending" ? (
              <>
                <Badge tone="warn">Deletion pending</Badge>
                <p className="text-sm">
                  Requested {formatPrivacyTime(workspace.deletionRequest.requestedAt)}
                </p>
                <Button size="sm" variant="secondary" onClick={cancelDeletion}>
                  Cancel request
                </Button>
              </>
            ) : (
              <>
                <textarea
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Optional reason"
                  value={deleteNote}
                  onChange={(e) => setDeleteNote(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (
                      !confirm(
                        "Request deletion of your Haven account and associated family data?",
                      )
                    )
                      return;
                    requestDeletion(deleteNote);
                    setDeleteNote("");
                  }}
                >
                  Request deletion
                </Button>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Change password</h2>
            <input
              type="password"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              placeholder="Current password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              placeholder="New password (8+ chars, upper, lower, number)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            {pwMsg && <p className="text-sm text-ink-muted">{pwMsg}</p>}
            <Button
              size="sm"
              onClick={async () => {
                const res = await changePassword(currentPw, newPw);
                if (res.ok) {
                  setPwMsg("Password updated.");
                  setCurrentPw("");
                  setNewPw("");
                } else setPwMsg(res.error || "Could not update password.");
              }}
            >
              <Lock size={14} /> Update password
            </Button>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Active sessions</h2>
              <Button size="sm" variant="ghost" onClick={revokeOtherSessions}>
                Sign out others
              </Button>
            </div>
            {workspace.sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {s.label} {s.current && <Badge tone="brand">Current</Badge>}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {s.userAgentHint} · Last active {formatPrivacyTime(s.lastActiveAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (s.current) {
                      if (!confirm("Sign out of this browser?")) return;
                      signOut();
                      return;
                    }
                    revokeSession(s.id);
                  }}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Sensitive download links</h2>
            <p className="text-sm text-ink-muted">
              Temporary links expire after 24 hours and can be revoked early.
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!confirm(`${SENSITIVE_WARNING}\n\nCreate a 24-hour export link?`)) return;
                createSensitiveLink("Temporary data export link", 24);
              }}
            >
              Create 24h link
            </Button>
            {workspace.sensitiveLinks.map((l) => {
              const expired = isLinkExpired(l);
              return (
                <div
                  key={l.id}
                  className="flex flex-col gap-2 rounded-xl bg-bg-soft p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{l.label}</p>
                    <p className="text-xs text-ink-faint">
                      Expires {formatPrivacyTime(l.expiresAt)}
                      {l.revoked || expired ? " · inactive" : ""}
                    </p>
                  </div>
                  {!l.revoked && !expired && (
                    <Button size="sm" variant="ghost" onClick={() => revokeSensitiveLink(l.id)}>
                      Revoke
                    </Button>
                  )}
                  {(l.revoked || expired) && <Badge tone="neutral">Expired / revoked</Badge>}
                </div>
              );
            })}
          </Card>

          <Card className="space-y-2 p-5">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle size={16} className="mt-0.5 text-warn" />
              <p>
                Sensitive fields (SSN-like values, full emails, phones) are partially masked in this
                console. Attachments in messages should not include unnecessary identifiers.
              </p>
            </div>
            <p className="text-sm text-ink-muted">
              Signed in as {maskSensitiveText(user?.email || "")}
            </p>
          </Card>
        </div>
      )}

      {tab === "access" && (
        <div className="space-y-2">
          <p className="mb-3 text-sm text-ink-muted">
            History of sensitive views, downloads, shares, and security actions.
          </p>
          {workspace.accessLog.map((e) => (
            <Card key={e.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{e.action.replace("_", " ")}</Badge>
                <span className="text-xs text-ink-faint">{formatPrivacyTime(e.at)}</span>
              </div>
              <p className="mt-2">
                <span className="font-medium">{e.actor}</span> — {e.resource}
              </p>
              {e.detail && <p className="mt-1 text-ink-muted">{e.detail}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <RequireAuth role="family">
      <PrivacyInner />
    </RequireAuth>
  );
}
