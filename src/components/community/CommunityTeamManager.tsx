"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  COMMUNITY_PERMISSION_LABELS,
  COMMUNITY_ROLES,
  communityRoleHas,
  communityRoleLabel,
  formatPortalTime,
  type CommunityTeamRole,
} from "@/lib/community-portal";
import { useCommunityPortal } from "@/lib/community-portal-store";

export function CommunityTeamManager() {
  const {
    ready,
    workspace,
    can,
    myRole,
    updateTeamMemberRole,
    inviteTeamMember,
  } = useCommunityPortal();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<CommunityTeamRole>("sales_counselor");
  const [showMatrix, setShowMatrix] = useState(false);

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading team…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Team"
        description={`Roles and permissions for ${workspace.residenceName}. You are ${communityRoleLabel(myRole)}.`}
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Team" },
        ]}
        actions={
          <Button size="sm" variant="secondary" onClick={() => setShowMatrix((v) => !v)}>
            {showMatrix ? "Hide permissions" : "View permissions"}
          </Button>
        }
      />

      {showMatrix && (
        <Card className="mb-6 overflow-x-auto p-0">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-bg-soft text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Permission</th>
                {COMMUNITY_ROLES.map((r) => (
                  <th key={r.id} className="px-2 py-3 text-center font-medium">
                    {r.label.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(Object.keys(COMMUNITY_PERMISSION_LABELS) as (keyof typeof COMMUNITY_PERMISSION_LABELS)[]).map(
                (perm) => (
                  <tr key={perm}>
                    <td className="px-4 py-2">{COMMUNITY_PERMISSION_LABELS[perm]}</td>
                    {COMMUNITY_ROLES.map((r) => (
                      <td key={r.id} className="px-2 py-2 text-center">
                        {communityRoleHas(r.id, perm) ? "✓" : "—"}
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </Card>
      )}

      {can("manageTeam") && (
        <Card className="mb-6 space-y-3 p-5">
          <h2 className="font-semibold">Invite teammate</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              placeholder="Job title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
            <select
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as CommunityTeamRole)}
            >
              {COMMUNITY_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const res = inviteTeamMember({ name, email, role, jobTitle });
              if (res.ok) {
                setName("");
                setEmail("");
                setJobTitle("");
              } else alert(res.error);
            }}
          >
            Send invite
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        {workspace.team.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{m.name}</p>
                  <Badge tone={m.status === "active" ? "success" : "warn"}>
                    {m.status === "active" ? "Active" : "Invited"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {m.jobTitle} · {m.email}
                </p>
              </div>
              {can("manageTeam") ? (
                <select
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                  value={m.role}
                  onChange={(e) => {
                    const res = updateTeamMemberRole(
                      m.id,
                      e.target.value as CommunityTeamRole,
                    );
                    if (!res.ok) alert(res.error);
                  }}
                >
                  {COMMUNITY_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge tone="brand">{communityRoleLabel(m.role)}</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {can("viewAudit") && (
        <Card className="mt-8 p-5">
          <h2 className="mb-3 font-semibold">Team audit trail</h2>
          <ul className="space-y-2">
            {[...workspace.auditLog]
              .reverse()
              .filter((a) =>
                /team|role|invited|Assigned|Accepted|Declined|Requested|Proposed|Updated|availability|profile/i.test(
                  a.action,
                ),
              )
              .slice(0, 15)
              .map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium">{a.actor}</span> — {a.action}
                  <span className="ml-2 text-xs text-ink-faint">
                    {formatPortalTime(a.at)}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {COMMUNITY_ROLES.map((r) => (
          <Card key={r.id} className="p-4">
            <p className="font-semibold">{r.label}</p>
            <p className="mt-1 text-sm text-ink-muted">{r.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
