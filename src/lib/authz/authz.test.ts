/**
 * Automated authorization / tenant-isolation tests.
 * Run: npm run test:authz
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  authorize,
  createSupportGrant,
  isInvitationAcceptable,
  revokeSupportGrant,
  type AuthzActor,
} from "@/lib/authz";
import { resolveCommunityResidenceId } from "@/lib/community-portal";
import { residencesForCommunityOrg } from "@/lib/messaging";
import { isInviteExpired, inviteExpiresAt } from "@/lib/family-collaboration";

function actor(partial: Partial<AuthzActor> & Pick<AuthzActor, "role">): AuthzActor {
  return {
    userId: partial.userId ?? "user-1",
    email: partial.email ?? "user@example.com",
    role: partial.role,
    accountStatus: partial.accountStatus ?? "active",
    familyId: partial.familyId ?? null,
    communityId: partial.communityId ?? null,
    organizationId: partial.organizationId ?? null,
    orgWide: partial.orgWide ?? false,
    supportGrant: partial.supportGrant ?? null,
  };
}

describe("multi-tenant isolation — RPA A vs RPA B", () => {
  it("RPA A cannot read RPA B applications", () => {
    const rpaA = actor({
      role: "community_employee",
      communityId: "community-a",
      organizationId: "org-a",
    });
    const decision = authorize({
      actor: rpaA,
      action: "read",
      resource: {
        type: "application",
        id: "app-b",
        communityId: "community-b",
        organizationId: "org-b",
      },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.httpStatus, 404);
  });

  it("RPA A cannot accept/decline RPA B applications", () => {
    const rpaA = actor({
      role: "community_admin",
      communityId: "community-a",
      organizationId: "org-a",
    });
    for (const action of ["accept_application", "decline_application", "update"] as const) {
      const decision = authorize({
        actor: rpaA,
        action,
        resource: {
          type: "application",
          id: "app-b",
          communityId: "community-b",
          organizationId: "org-b",
        },
      });
      assert.equal(decision.allowed, false, action);
      assert.equal(decision.httpStatus, 404, action);
    }
  });

  it("unknown community org never resolves to another tenant (IDOR fix)", () => {
    assert.deepEqual(residencesForCommunityOrg("Unknown Care LLC", "staff@unknown.example"), []);
    assert.equal(resolveCommunityResidenceId("Unknown Care LLC", "staff@unknown.example"), null);
    assert.equal(resolveCommunityResidenceId("Maple Grove Residence", "community@demo.haven"), "maple-grove");
    assert.equal(resolveCommunityResidenceId("Lakeside Haven", "nurse@lakeside.example"), "lakeside-haven");
  });
});

describe("family isolation", () => {
  it("user cannot access another family's dossier", () => {
    const familyA = actor({
      role: "family_owner",
      familyId: "family-a",
    });
    const decision = authorize({
      actor: familyA,
      action: "read",
      resource: {
        type: "senior_dossier",
        id: "senior-b",
        familyId: "family-b",
      },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.httpStatus, 404);
  });

  it("family viewer cannot submit applications", () => {
    const viewer = actor({ role: "family_viewer", familyId: "family-a" });
    const decision = authorize({
      actor: viewer,
      action: "submit_application",
      resource: { type: "application", id: "app-1", familyId: "family-a" },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.httpStatus, 403);
  });
});

describe("IDOR — manually modified identifiers", () => {
  it("returns 404 when resource is marked missing", () => {
    const familyA = actor({ role: "family_owner", familyId: "family-a" });
    const decision = authorize({
      actor: familyA,
      action: "read",
      resource: {
        type: "document",
        id: "doc-forged",
        familyId: "family-a",
        exists: false,
      },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.httpStatus, 404);
    assert.equal(decision.code, "deny_not_found");
  });

  it("returns 404 when community id is swapped in the request", () => {
    const staff = actor({
      role: "community_admin",
      communityId: "maple-grove",
      organizationId: "org-maple",
    });
    const decision = authorize({
      actor: staff,
      action: "read",
      resource: {
        type: "community_workspace",
        id: "ws-cedar",
        communityId: "cedar-memory",
        organizationId: "org-cedar",
      },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.httpStatus, 404);
  });
});

describe("disabled accounts lose access immediately", () => {
  it("disabled actor is denied even for own tenant", () => {
    const disabled = actor({
      role: "family_owner",
      familyId: "family-a",
      accountStatus: "disabled",
    });
    const decision = authorize({
      actor: disabled,
      action: "read",
      resource: { type: "family", id: "family-a", familyId: "family-a" },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "deny_disabled");
    assert.equal(decision.httpStatus, 403);
  });

  it("suspended community admin cannot accept applications", () => {
    const suspended = actor({
      role: "community_admin",
      communityId: "community-a",
      accountStatus: "suspended",
    });
    const decision = authorize({
      actor: suspended,
      action: "accept_application",
      resource: {
        type: "application",
        id: "app-1",
        communityId: "community-a",
        organizationId: "org-a",
      },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "deny_disabled");
  });
});

describe("role least privilege", () => {
  it("community employee cannot accept applications", () => {
    const employee = actor({
      role: "community_employee",
      communityId: "community-a",
      organizationId: "org-a",
    });
    const decision = authorize({
      actor: employee,
      action: "accept_application",
      resource: {
        type: "application",
        id: "app-1",
        communityId: "community-a",
        organizationId: "org-a",
      },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.httpStatus, 403);
  });

  it("community admin can accept on own tenant only", () => {
    const admin = actor({
      role: "community_admin",
      communityId: "community-a",
      organizationId: "org-a",
    });
    const ok = authorize({
      actor: admin,
      action: "accept_application",
      resource: {
        type: "application",
        id: "app-1",
        communityId: "community-a",
        organizationId: "org-a",
      },
    });
    assert.equal(ok.allowed, true);

    const cross = authorize({
      actor: admin,
      action: "accept_application",
      resource: {
        type: "application",
        id: "app-2",
        communityId: "community-b",
        organizationId: "org-b",
      },
    });
    assert.equal(cross.allowed, false);
    assert.equal(cross.httpStatus, 404);
  });

  it("professional / community cannot change their own role", () => {
    for (const role of ["community_employee", "community_admin", "family_caregiver"] as const) {
      const decision = authorize({
        actor: actor({
          role,
          familyId: role.startsWith("family") ? "family-a" : null,
          communityId: role.startsWith("community") ? "community-a" : null,
          organizationId: role.startsWith("community") ? "org-a" : null,
        }),
        action: "change_own_role",
        resource: { type: "platform_user", id: "user-1" },
      });
      assert.equal(decision.allowed, false, role);
      assert.equal(decision.code, "deny_self_role_change", role);
    }
  });

  it("resident is read-only", () => {
    const resident = actor({ role: "resident", familyId: "family-a" });
    const read = authorize({
      actor: resident,
      action: "read",
      resource: { type: "senior_dossier", id: "s1", familyId: "family-a" },
    });
    const write = authorize({
      actor: resident,
      action: "update",
      resource: { type: "senior_dossier", id: "s1", familyId: "family-a" },
    });
    assert.equal(read.allowed, true);
    assert.equal(write.allowed, false);
  });
});

describe("support break-glass", () => {
  it("support without grant is denied", () => {
    const support = actor({ role: "haven_support" });
    const decision = authorize({
      actor: support,
      action: "read",
      resource: { type: "family", id: "family-a", familyId: "family-a" },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "deny_support_no_grant");
  });

  it("support with justified TTL grant can read target tenant only", () => {
    const now = new Date("2026-08-18T12:00:00.000Z");
    const created = createSupportGrant({
      id: "grant-1",
      targetType: "family",
      targetTenantId: "family-a",
      justification: "Ticket INC-4421 family cannot export data",
      grantedByUserId: "super-1",
      expiresAt: "2026-08-18T16:00:00.000Z",
      now,
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const support = actor({
      role: "haven_support",
      supportGrant: created.grant,
    });

    const allowed = authorize({
      actor: support,
      action: "read",
      resource: { type: "family", id: "family-a", familyId: "family-a" },
      now,
    });
    assert.equal(allowed.allowed, true);

    const other = authorize({
      actor: support,
      action: "read",
      resource: { type: "family", id: "family-b", familyId: "family-b" },
      now,
    });
    assert.equal(other.allowed, false);
    assert.equal(other.httpStatus, 404);

    const revoked = actor({
      role: "haven_support",
      supportGrant: revokeSupportGrant(created.grant, now),
    });
    const afterRevoke = authorize({
      actor: revoked,
      action: "read",
      resource: { type: "family", id: "family-a", familyId: "family-a" },
      now,
    });
    assert.equal(afterRevoke.allowed, false);
  });

  it("rejects short justification", () => {
    const created = createSupportGrant({
      id: "grant-2",
      targetType: "family",
      targetTenantId: "family-a",
      justification: "need access",
      grantedByUserId: "super-1",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    assert.equal(created.ok, false);
  });
});

describe("invitations expire", () => {
  it("marks past-due invites as unacceptable", () => {
    const expiredAt = new Date("2020-01-01T00:00:00.000Z").toISOString();
    assert.equal(
      isInvitationAcceptable({ id: "i1", status: "pending", expiresAt: expiredAt }),
      false,
    );
    const future = inviteExpiresAt(new Date("2026-08-18T00:00:00.000Z"));
    assert.equal(
      isInviteExpired(
        {
          id: "i2",
          email: "a@b.c",
          name: "A",
          role: "viewer",
          status: "pending",
          token: "t",
          invitedBy: "owner",
          invitedByName: "Owner",
          createdAt: "2026-08-18T00:00:00.000Z",
          expiresAt: future,
          acceptedAt: null,
        },
        new Date("2026-08-18T01:00:00.000Z"),
      ),
      false,
    );
  });
});
