"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import {
  formatCollabTime,
  inviteExpiresAt,
  isInviteExpired,
  makeToken,
  roleHasPermission,
  roleLabel,
  seedHousehold,
  type FamilyComment,
  type FamilyHousehold,
  type FamilyInvitation,
  type FamilyMember,
  type FamilyPermission,
  type FamilyRole,
  type FamilyTask,
} from "@/lib/family-collaboration";

const SHARED_KEY = "haven-households-v1";

type CollaborationContextValue = {
  ready: boolean;
  household: FamilyHousehold | null;
  /** Current user's membership in the active household */
  me: FamilyMember | null;
  can: (permission: FamilyPermission) => boolean;
  pendingInvitesForMe: FamilyInvitation[];
  inviteMember: (input: {
    email: string;
    name: string;
    role: Exclude<FamilyRole, "owner">;
    message?: string;
  }) => { ok: boolean; error?: string; invitation?: FamilyInvitation };
  resendInvitation: (invitationId: string) => { ok: boolean; error?: string };
  revokeInvitation: (invitationId: string) => void;
  acceptInvitation: (token: string) => { ok: boolean; error?: string };
  removeMember: (memberId: string) => { ok: boolean; error?: string };
  changeMemberRole: (
    memberId: string,
    role: Exclude<FamilyRole, "owner">,
  ) => { ok: boolean; error?: string };
  addComment: (body: string) => { ok: boolean; error?: string };
  addTask: (input: {
    title: string;
    assigneeMemberId: string | null;
    due: string;
  }) => { ok: boolean; error?: string };
  toggleTask: (taskId: string) => void;
  notifications: { id: string; title: string; body: string; at: string }[];
};

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

function readAll(): FamilyHousehold[] {
  try {
    const raw = localStorage.getItem(SHARED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FamilyHousehold[];
  } catch {
    return [];
  }
}

function writeAll(list: FamilyHousehold[]) {
  localStorage.setItem(SHARED_KEY, JSON.stringify(list));
}

function refreshExpired(hh: FamilyHousehold): FamilyHousehold {
  let changed = false;
  const invitations = hh.invitations.map((inv) => {
    if (inv.status === "pending" && isInviteExpired(inv)) {
      changed = true;
      return { ...inv, status: "expired" as const };
    }
    return inv;
  });
  if (!changed) return hh;
  return {
    ...hh,
    invitations,
    auditLog: [
      ...hh.auditLog,
      {
        id: `aud-exp-${Date.now()}`,
        at: new Date().toISOString(),
        actor: "System",
        action: "Marked expired invitations",
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function FamilyCollaborationProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [households, setHouseholds] = useState<FamilyHousehold[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.role !== "family") {
      setHouseholds([]);
      setReady(true);
      return;
    }

    let list = readAll().map(refreshExpired);
    const email = user.email.toLowerCase();
    const ownsOrMember = list.some(
      (h) =>
        h.ownerEmail === email ||
        h.members.some((m) => m.email === email && m.status === "active"),
    );

    if (!ownsOrMember) {
      // First family login: create household for this account as owner
      const seeded = seedHousehold(email, user.name || "Family owner");
      list = [...list, seeded];
    }

    writeAll(list);
    setHouseholds(list);
    setReady(true);
  }, [authReady, user]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SHARED_KEY || !e.newValue) return;
      try {
        setHouseholds((JSON.parse(e.newValue) as FamilyHousehold[]).map(refreshExpired));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((updater: (prev: FamilyHousehold[]) => FamilyHousehold[]) => {
    setHouseholds((prev) => {
      const next = updater(prev).map(refreshExpired);
      writeAll(next);
      return next;
    });
  }, []);

  const household = useMemo(() => {
    if (!user) return null;
    const email = user.email.toLowerCase();
    // Prefer household where user is owner, else first where active member
    const owned = households.find((h) => h.ownerEmail === email);
    if (owned) return owned;
    return (
      households.find((h) =>
        h.members.some((m) => m.email === email && m.status === "active"),
      ) ?? null
    );
  }, [households, user]);

  const me = useMemo(() => {
    if (!user || !household) return null;
    const email = user.email.toLowerCase();
    return household.members.find((m) => m.email === email && m.status === "active") ?? null;
  }, [household, user]);

  const can = useCallback(
    (permission: FamilyPermission) => {
      if (!me) return false;
      return roleHasPermission(me.role, permission);
    },
    [me],
  );

  const pendingInvitesForMe = useMemo(() => {
    if (!user) return [];
    const email = user.email.toLowerCase();
    return households.flatMap((h) =>
      h.invitations.filter(
        (inv) =>
          inv.email.toLowerCase() === email &&
          (inv.status === "pending" || inv.status === "expired"),
      ),
    );
  }, [households, user]);

  const inviteMember = useCallback(
    (input: {
      email: string;
      name: string;
      role: Exclude<FamilyRole, "owner">;
      message?: string;
    }) => {
      if (!user || !household || !can("inviteMembers")) {
        return { ok: false, error: "You don’t have permission to invite members." };
      }
      const email = input.email.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return { ok: false, error: "Enter a valid email address." };
      }
      if (household.members.some((m) => m.email === email && m.status === "active")) {
        return { ok: false, error: "This person already has access." };
      }
      if (household.invitations.some((i) => i.email === email && i.status === "pending")) {
        return { ok: false, error: "An invitation is already pending for this email." };
      }

      const now = new Date();
      const invitation: FamilyInvitation = {
        id: `inv-${now.getTime()}`,
        token: makeToken(),
        email,
        name: input.name.trim() || email.split("@")[0],
        role: input.role,
        status: "pending",
        invitedBy: user.email.toLowerCase(),
        invitedByName: user.name || "Owner",
        createdAt: now.toISOString(),
        expiresAt: inviteExpiresAt(now),
        acceptedAt: null,
        message: input.message?.trim() || undefined,
      };

      persist((prev) =>
        prev.map((h) => {
          if (h.id !== household.id) return h;
          return {
            ...h,
            invitations: [invitation, ...h.invitations],
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-${now.getTime()}`,
                at: now.toISOString(),
                actor: user.name || "Owner",
                action: `Invited ${invitation.name} (${email}) as ${roleLabel(input.role)}`,
              },
            ],
            updatedAt: now.toISOString(),
          };
        }),
      );

      return { ok: true, invitation };
    },
    [can, household, persist, user],
  );

  const resendInvitation = useCallback(
    (invitationId: string) => {
      if (!user || !household || !can("inviteMembers")) {
        return { ok: false, error: "You don’t have permission to resend invitations." };
      }
      const inv = household.invitations.find((i) => i.id === invitationId);
      if (!inv || (inv.status !== "pending" && inv.status !== "expired")) {
        return { ok: false, error: "Invitation cannot be resent." };
      }
      const now = new Date();
      persist((prev) =>
        prev.map((h) => {
          if (h.id !== household.id) return h;
          return {
            ...h,
            invitations: h.invitations.map((i) =>
              i.id === invitationId
                ? {
                    ...i,
                    status: "pending" as const,
                    token: makeToken(),
                    createdAt: now.toISOString(),
                    expiresAt: inviteExpiresAt(now),
                  }
                : i,
            ),
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-resend-${now.getTime()}`,
                at: now.toISOString(),
                actor: user.name || "Owner",
                action: `Resent invitation to ${inv.email}`,
              },
            ],
            updatedAt: now.toISOString(),
          };
        }),
      );
      return { ok: true };
    },
    [can, household, persist, user],
  );

  const revokeInvitation = useCallback(
    (invitationId: string) => {
      if (!user || !household || !can("inviteMembers")) return;
      const inv = household.invitations.find((i) => i.id === invitationId);
      if (!inv) return;
      const now = new Date().toISOString();
      persist((prev) =>
        prev.map((h) => {
          if (h.id !== household.id) return h;
          return {
            ...h,
            invitations: h.invitations.map((i) =>
              i.id === invitationId ? { ...i, status: "revoked" as const } : i,
            ),
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-rev-${Date.now()}`,
                at: now,
                actor: user.name || "Owner",
                action: `Revoked invitation to ${inv.email}`,
              },
            ],
            updatedAt: now,
          };
        }),
      );
    },
    [can, household, persist, user],
  );

  const acceptInvitation = useCallback(
    (token: string) => {
      if (!user || user.role !== "family") {
        return { ok: false, error: "Sign in with your own Haven family account to accept." };
      }
      const email = user.email.toLowerCase();
      let target: FamilyHousehold | null = null;
      let invitation: FamilyInvitation | null = null;

      for (const h of households) {
        const inv = h.invitations.find((i) => i.token === token);
        if (inv) {
          target = h;
          invitation = inv;
          break;
        }
      }

      if (!target || !invitation) {
        return { ok: false, error: "Invitation not found." };
      }
      if (invitation.email.toLowerCase() !== email) {
        return {
          ok: false,
          error: `This invite was sent to ${invitation.email}. Sign in with that email (your own password).`,
        };
      }
      if (invitation.status === "accepted") {
        return { ok: false, error: "This invitation was already accepted." };
      }
      if (invitation.status === "revoked") {
        return { ok: false, error: "This invitation was revoked." };
      }
      if (isInviteExpired(invitation) || invitation.status === "expired") {
        return { ok: false, error: "This invitation has expired. Ask the owner to resend it." };
      }

      const now = new Date().toISOString();
      const member: FamilyMember = {
        id: `mem-${Date.now()}`,
        email,
        name: user.name || invitation.name,
        role: invitation.role,
        status: "active",
        joinedAt: now,
        invitedAt: invitation.createdAt,
        lastActiveAt: now,
      };

      persist((prev) =>
        prev.map((h) => {
          if (h.id !== target!.id) return h;
          const withoutDup = h.members.filter((m) => m.email !== email);
          return {
            ...h,
            members: [...withoutDup, member],
            invitations: h.invitations.map((i) =>
              i.token === token
                ? { ...i, status: "accepted" as const, acceptedAt: now }
                : i,
            ),
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-acc-${Date.now()}`,
                at: now,
                actor: member.name,
                action: `Accepted invitation as ${roleLabel(invitation!.role)}`,
              },
            ],
            updatedAt: now,
          };
        }),
      );

      return { ok: true };
    },
    [households, persist, user],
  );

  const removeMember = useCallback(
    (memberId: string) => {
      if (!user || !household || !can("removeMembers")) {
        return { ok: false, error: "You don’t have permission to remove members." };
      }
      const member = household.members.find((m) => m.id === memberId);
      if (!member) return { ok: false, error: "Member not found." };
      if (member.role === "owner") {
        return { ok: false, error: "The owner cannot be removed." };
      }
      const now = new Date().toISOString();
      persist((prev) =>
        prev.map((h) => {
          if (h.id !== household.id) return h;
          return {
            ...h,
            members: h.members.map((m) =>
              m.id === memberId ? { ...m, status: "revoked" as const } : m,
            ),
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-rm-${Date.now()}`,
                at: now,
                actor: user.name || "Owner",
                action: `Removed access for ${member.name} (${member.email})`,
              },
            ],
            updatedAt: now,
          };
        }),
      );
      return { ok: true };
    },
    [can, household, persist, user],
  );

  const changeMemberRole = useCallback(
    (memberId: string, role: Exclude<FamilyRole, "owner">) => {
      if (!user || !household || !can("changePermissions")) {
        return { ok: false, error: "You don’t have permission to change roles." };
      }
      const member = household.members.find((m) => m.id === memberId);
      if (!member || member.status !== "active") {
        return { ok: false, error: "Member not found." };
      }
      if (member.role === "owner") {
        return { ok: false, error: "Owner role cannot be changed." };
      }
      const now = new Date().toISOString();
      persist((prev) =>
        prev.map((h) => {
          if (h.id !== household.id) return h;
          return {
            ...h,
            members: h.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-role-${Date.now()}`,
                at: now,
                actor: user.name || "Owner",
                action: `Changed ${member.name}’s role to ${roleLabel(role)}`,
              },
            ],
            updatedAt: now,
          };
        }),
      );
      return { ok: true };
    },
    [can, household, persist, user],
  );

  const addComment = useCallback(
    (body: string) => {
      if (!user || !household || !can("postComments")) {
        return { ok: false, error: "You don’t have permission to comment." };
      }
      const trimmed = body.trim();
      if (!trimmed) return { ok: false, error: "Write a comment first." };
      const now = new Date().toISOString();
      const comment: FamilyComment = {
        id: `fc-${Date.now()}`,
        authorName: user.name || "Family",
        authorEmail: user.email.toLowerCase(),
        body: trimmed,
        createdAt: now,
      };
      persist((prev) =>
        prev.map((h) => {
          if (h.id !== household.id) return h;
          return {
            ...h,
            comments: [comment, ...h.comments],
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-cmt-${Date.now()}`,
                at: now,
                actor: comment.authorName,
                action: "Posted an internal comment",
              },
            ],
            updatedAt: now,
          };
        }),
      );
      return { ok: true };
    },
    [can, household, persist, user],
  );

  const addTask = useCallback(
    (input: { title: string; assigneeMemberId: string | null; due: string }) => {
      if (!user || !household || !can("assignTasks")) {
        return { ok: false, error: "You don’t have permission to assign tasks." };
      }
      const title = input.title.trim();
      if (!title) return { ok: false, error: "Enter a task title." };
      const assignee = household.members.find(
        (m) => m.id === input.assigneeMemberId && m.status === "active",
      );
      const now = new Date().toISOString();
      const task: FamilyTask = {
        id: `ft-${Date.now()}`,
        title,
        assigneeMemberId: assignee?.id ?? null,
        assigneeName: assignee?.name ?? "Unassigned",
        due: input.due.trim() || "This week",
        done: false,
        createdBy: user.name || "Family",
        createdAt: now,
      };
      persist((prev) =>
        prev.map((h) => {
          if (h.id !== household.id) return h;
          return {
            ...h,
            tasks: [task, ...h.tasks],
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-task-${Date.now()}`,
                at: now,
                actor: user.name || "Family",
                action: `Assigned task “${title}” to ${task.assigneeName}`,
              },
            ],
            updatedAt: now,
          };
        }),
      );
      return { ok: true };
    },
    [can, household, persist, user],
  );

  const toggleTask = useCallback(
    (taskId: string) => {
      if (!user || !household) return;
      const task = household.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const now = new Date().toISOString();
      persist((prev) =>
        prev.map((h) => {
          if (h.id !== household.id) return h;
          return {
            ...h,
            tasks: h.tasks.map((t) =>
              t.id === taskId ? { ...t, done: !t.done } : t,
            ),
            auditLog: [
              ...h.auditLog,
              {
                id: `aud-td-${Date.now()}`,
                at: now,
                actor: user.name || "Family",
                action: `${task.done ? "Reopened" : "Completed"} task “${task.title}”`,
              },
            ],
            updatedAt: now,
          };
        }),
      );
    },
    [household, persist, user],
  );

  const notifications = useMemo(() => {
    if (!household) return [];
    const items: { id: string; title: string; body: string; at: string }[] = [];

    for (const inv of household.invitations.filter((i) => i.status === "pending")) {
      items.push({
        id: `n-inv-${inv.id}`,
        title: "Invitation pending",
        body: `${inv.name} (${inv.email}) — ${roleLabel(inv.role)} · expires ${formatCollabTime(inv.expiresAt)}`,
        at: inv.createdAt,
      });
    }
    for (const inv of household.invitations.filter((i) => i.status === "expired")) {
      items.push({
        id: `n-exp-${inv.id}`,
        title: "Invitation expired",
        body: `${inv.name} — resend to restore access offer`,
        at: inv.expiresAt,
      });
    }
    for (const t of household.tasks.filter((x) => !x.done)) {
      items.push({
        id: `n-task-${t.id}`,
        title: "Open family task",
        body: `${t.title} · ${t.assigneeName} · due ${t.due}`,
        at: t.createdAt,
      });
    }
    // Recent audit (last 5)
    for (const a of [...household.auditLog].reverse().slice(0, 5)) {
      items.push({
        id: `n-aud-${a.id}`,
        title: "Household update",
        body: `${a.actor}: ${a.action}`,
        at: a.at,
      });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  }, [household]);

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return (
    <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>
  );
}

export function useFamilyCollaboration() {
  const ctx = useContext(CollaborationContext);
  if (!ctx) {
    throw new Error("useFamilyCollaboration must be used within FamilyCollaborationProvider");
  }
  return ctx;
}
