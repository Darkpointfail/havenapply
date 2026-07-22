"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  COMMUNITY_INVITE_ROLES,
  communityRoleLabel,
  initialsFromName,
  type CommunityTeamRole,
} from "@/lib/community-portal";
import { useCommunityPortal } from "@/lib/community-portal-store";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand";

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
  const [role, setRole] = useState<CommunityTeamRole>("admissions_manager");
  const [flash, setFlash] = useState<string | null>(null);

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading team…
      </div>
    );
  }

  const invite = () => {
    const r = inviteTeamMember({
      name: name.trim(),
      email: email.trim(),
      role,
      jobTitle: communityRoleLabel(role),
    });
    if (r.ok) {
      setName("");
      setEmail("");
      setFlash("Invite sent");
      window.setTimeout(() => setFlash(null), 2000);
    } else {
      setFlash(r.error || "Could not invite");
    }
  };

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[640px] space-y-10 px-5 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-sm font-medium text-ink-muted">Team</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Invite teammates</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Keep it simple. You are {communityRoleLabel(myRole)}.
          </p>
        </header>

        {flash && (
          <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-strong">{flash}</p>
        )}

        {can("manageTeam") && (
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
              Invite
            </h2>
            <label className="block text-sm">
              Name
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            </label>
            <label className="block text-sm">
              Email
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@community.com"
              />
            </label>
            <label className="block text-sm">
              Role
              <select
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value as CommunityTeamRole)}
              >
                {COMMUNITY_INVITE_ROLES.map((id) => (
                  <option key={id} value={id}>
                    {communityRoleLabel(id)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              disabled={!name.trim() || !email.trim()}
              onClick={invite}
            >
              Send invite
            </Button>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Members
          </h2>
          <ul className="space-y-2">
            {workspace.team.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-xs"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
                    {initialsFromName(member.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{member.name}</p>
                    <p className="truncate text-sm text-ink-muted">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={member.status === "active" ? "success" : "warn"}>
                    {member.status === "active" ? "Active" : "Invited"}
                  </Badge>
                  {can("manageTeam") ? (
                    <select
                      className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm"
                      value={member.role}
                      onChange={(e) =>
                        updateTeamMemberRole(member.id, e.target.value as CommunityTeamRole)
                      }
                    >
                      {COMMUNITY_INVITE_ROLES.map((id) => (
                        <option key={id} value={id}>
                          {communityRoleLabel(id)}
                        </option>
                      ))}
                      {!COMMUNITY_INVITE_ROLES.includes(member.role) && (
                        <option value={member.role}>{communityRoleLabel(member.role)}</option>
                      )}
                    </select>
                  ) : (
                    <span className="text-sm text-ink-muted">
                      {communityRoleLabel(member.role)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
