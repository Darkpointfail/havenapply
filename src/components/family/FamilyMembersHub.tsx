"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Clock,
  History,
  Lock,
  Mail,
  MessageSquare,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import {
  FAMILY_ROLES,
  formatCollabTime,
  permissionMatrix,
  roleLabel,
  type FamilyRole,
} from "@/lib/family-collaboration";
import { useFamilyCollaboration } from "@/lib/family-collaboration-store";
import { cn } from "@/lib/utils";

type Tab = "members" | "permissions";

const inviteRoles = FAMILY_ROLES.filter((r) => r.id !== "owner");

function roleTone(role: FamilyRole): "brand" | "success" | "neutral" | "warn" | "accent" {
  switch (role) {
    case "owner":
      return "brand";
    case "editor":
      return "accent";
    case "viewer":
      return "neutral";
    case "financial":
      return "warn";
    case "medical":
      return "success";
  }
}

export function FamilyMembersHub() {
  const { user } = useAuth();
  const {
    ready,
    household,
    me,
    can,
    pendingInvitesForMe,
    inviteMember,
    resendInvitation,
    revokeInvitation,
    acceptInvitation,
    removeMember,
    changeMemberRole,
    addComment,
    addTask,
    toggleTask,
    notifications,
  } = useFamilyCollaboration();

  const [tab, setTab] = useState<Tab>("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<FamilyRole, "owner">>("editor");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState("This week");
  const [taskError, setTaskError] = useState<string | null>(null);

  const activeMembers = useMemo(
    () => household?.members.filter((m) => m.status === "active") ?? [],
    [household],
  );

  const openInvites = useMemo(
    () =>
      household?.invitations.filter(
        (i) => i.status === "pending" || i.status === "expired",
      ) ?? [],
    [household],
  );

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading family collaboration…
      </div>
    );
  }

  if (!household || !me) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <Lock className="mx-auto text-ink-faint" size={28} />
        <h1 className="mt-4 text-2xl font-semibold">No household access</h1>
        <p className="mt-2 text-ink-muted">
          Sign in with your own Haven account. If you were invited, accept the invitation with
          the email that received it, never share passwords.
        </p>
      </div>
    );
  }

  function submitInvite() {
    setInviteError(null);
    setInviteSuccess(null);
    const res = inviteMember({
      email: inviteEmail,
      name: inviteName,
      role: inviteRole,
      message: inviteMessage,
    });
    if (!res.ok) {
      setInviteError(res.error || "Could not send invitation.");
      return;
    }
    setInviteSuccess(
      `Invitation sent to ${res.invitation!.email}. They sign in with their own Haven account to accept, no shared password.`,
    );
    setInviteEmail("");
    setInviteName("");
    setInviteMessage("");
    setInviteOpen(false);
  }

  function submitComment() {
    const res = addComment(commentDraft);
    if (res.ok) setCommentDraft("");
  }

  function submitTask() {
    setTaskError(null);
    const res = addTask({
      title: taskTitle,
      assigneeMemberId: taskAssignee || null,
      due: taskDue,
    });
    if (!res.ok) {
      setTaskError(res.error || "Could not create task.");
      return;
    }
    setTaskTitle("");
    setTaskAssignee("");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "members", label: "Members" },
    { id: "permissions", label: "Permissions" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Family Members"
        description={`Collaborate on ${household.seniorLabel} without sharing passwords, each person uses their own Haven login.`}
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Family Members" },
        ]}
        actions={
          can("inviteMembers") ? (
            <Button size="sm" onClick={() => setInviteOpen((v) => !v)}>
              <UserPlus size={14} /> Invite
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-brand-soft/40 px-4 py-3 text-sm text-ink">
        <Shield size={16} className="text-brand shrink-0" />
        <span>
          You’re signed in as <strong>{user?.email}</strong> · role{" "}
          <Badge tone={roleTone(me.role)}>{roleLabel(me.role)}</Badge>
        </span>
      </div>

      {pendingInvitesForMe.length > 0 && (
        <Card className="mb-6 border-warn/30 bg-warn-soft/30 p-4">
          <p className="font-semibold">Invitations for you</p>
          <ul className="mt-3 space-y-3">
            {pendingInvitesForMe.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm">
                    {inv.invitedByName} invited you as{" "}
                    <Badge tone={roleTone(inv.role)}>{roleLabel(inv.role)}</Badge>
                  </p>
                  <p className="text-xs text-ink-muted">
                    {inv.status === "expired"
                      ? "Expired, ask the owner to resend"
                      : `Expires ${formatCollabTime(inv.expiresAt)}`}
                  </p>
                </div>
                {inv.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const res = acceptInvitation(inv.token);
                      if (!res.ok) alert(res.error);
                    }}
                  >
                    Accept
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {inviteSuccess && (
        <Card className="mb-6 border-success/30 bg-success-soft/40 p-4 text-sm text-success">
          {inviteSuccess}
        </Card>
      )}

      {inviteOpen && can("inviteMembers") && (
        <Card className="mb-6 space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Invite by email</h2>
            <p className="mt-1 text-sm text-ink-muted">
              They create or use their own Haven account. Never share your password.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-muted">Email</span>
              <input
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="sibling@email.com"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Name</span>
              <input
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Claire"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-muted">Role</span>
              <select
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Exclude<FamilyRole, "owner">)}
              >
                {inviteRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}, {r.description}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-ink-muted">Message (optional)</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                rows={2}
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </label>
          </div>
          {inviteError && <p className="text-sm text-danger">{inviteError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submitInvite}>
              <Mail size={14} /> Send invitation
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap gap-1 border-b border-line pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === t.id
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-bg-soft hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Active members
            </h2>
            <div className="space-y-3">
              {activeMembers.map((m) => (
                <Card key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{m.name}</p>
                      <Badge tone={roleTone(m.role)}>{roleLabel(m.role)}</Badge>
                      {m.id === me.id && <Badge tone="brand">You</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{m.email}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Joined {m.joinedAt ? formatCollabTime(m.joinedAt) : ","}
                      {m.lastActiveAt ? ` · Last active ${formatCollabTime(m.lastActiveAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {can("changePermissions") && m.role !== "owner" && (
                      <select
                        className="rounded-xl border border-line bg-surface px-2 py-1.5 text-sm"
                        value={m.role}
                        onChange={(e) => {
                          const res = changeMemberRole(
                            m.id,
                            e.target.value as Exclude<FamilyRole, "owner">,
                          );
                          if (!res.ok) alert(res.error);
                        }}
                        aria-label={`Change role for ${m.name}`}
                      >
                        {inviteRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {can("removeMembers") && m.role !== "owner" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Remove access for ${m.name}?`)) {
                            const res = removeMember(m.id);
                            if (!res.ok) alert(res.error);
                          }
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Invitations
            </h2>
            {openInvites.length === 0 ? (
              <Card className="p-4 text-sm text-ink-muted">No pending invitations.</Card>
            ) : (
              <div className="space-y-3">
                {openInvites.map((inv) => (
                  <Card key={inv.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{inv.name}</p>
                          <Badge tone={roleTone(inv.role)}>{roleLabel(inv.role)}</Badge>
                          <Badge tone={inv.status === "expired" ? "danger" : "warn"}>
                            {inv.status === "expired" ? "Expired" : "Pending"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-ink-muted">{inv.email}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">
                          <Clock size={12} />
                          {inv.status === "expired"
                            ? `Expired ${formatCollabTime(inv.expiresAt)}`
                            : `Expires ${formatCollabTime(inv.expiresAt)}`}
                        </p>
                        {inv.message && (
                          <p className="mt-2 text-sm text-ink-muted italic">“{inv.message}”</p>
                        )}
                        {can("inviteMembers") && inv.status === "pending" && (
                          <p className="mt-2 break-all rounded-lg bg-bg-soft px-2 py-1 font-mono text-[11px] text-ink-muted">
                            Accept link token: {inv.token}
                          </p>
                        )}
                      </div>
                      {can("inviteMembers") && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => resendInvitation(inv.id)}>
                            Resend
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => revokeInvitation(inv.id)}>
                            Revoke
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Change alerts
            </h2>
            <div className="space-y-2">
              {notifications.slice(0, 6).map((n) => (
                <Card key={n.id} className="p-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-ink-muted">{n.body}</p>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "permissions" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Exact access by role. Owner can invite, remove, and change permissions.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-bg-soft text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Permission</th>
                  {FAMILY_ROLES.map((r) => (
                    <th key={r.id} className="px-3 py-3 text-center font-medium">
                      {r.label.replace(" contributor", "").replace(" information", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {permissionMatrix().map((row) => (
                  <tr key={row.permission}>
                    <td className="px-4 py-2.5">{row.label}</td>
                    {FAMILY_ROLES.map((r) => (
                      <td key={r.id} className="px-3 py-2.5 text-center">
                        {row.roles[r.id] ? (
                          <Check size={16} className="mx-auto text-success" />
                        ) : (
                          <span className="text-ink-faint">,</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FAMILY_ROLES.map((r) => (
              <Card key={r.id} className="p-4">
                <Badge tone={roleTone(r.id)}>{r.label}</Badge>
                <p className="mt-2 text-sm text-ink-muted">{r.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
