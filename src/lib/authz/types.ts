/**
 * Canonical authorization types for HavenApply multi-tenant access control.
 * Server and client policy engines must share these definitions.
 */

/** Product-facing roles (least privilege). */
export type AuthzRole =
  | "family_owner"
  | "family_caregiver"
  | "family_legal_representative"
  | "family_viewer"
  | "resident"
  | "community_employee"
  | "community_admin"
  | "haven_support"
  | "haven_super_admin";

export type AccountLifecycleStatus = "active" | "disabled" | "suspended" | "invited";

export type AuthzAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "share"
  | "submit_application"
  | "withdraw_application"
  | "accept_application"
  | "decline_application"
  | "request_documents"
  | "add_internal_notes"
  | "manage_team"
  | "invite_member"
  | "revoke_access"
  | "change_member_role"
  | "change_own_role"
  | "export_data"
  | "support_break_glass"
  | "disable_account";

export type AuthzResourceType =
  | "family"
  | "senior_dossier"
  | "document"
  | "application"
  | "message"
  | "community_workspace"
  | "platform_user"
  | "support_grant";

export type AuthzDecisionCode =
  | "allow"
  | "deny_unauthenticated"
  | "deny_disabled"
  | "deny_wrong_tenant"
  | "deny_role"
  | "deny_self_role_change"
  | "deny_support_no_grant"
  | "deny_invite_expired"
  | "deny_not_found"
  | "deny_generic";

export type AuthzActor = {
  userId: string;
  email: string;
  /** Effective product role after mapping portal + household/team role. */
  role: AuthzRole;
  accountStatus: AccountLifecycleStatus;
  /** Family tenant this actor belongs to (null for RPA/support-only actors). */
  familyId: string | null;
  /** Community (RPA site) tenant — never trust browser-supplied values without verifying membership. */
  communityId: string | null;
  /** Organization owning one or more communities. */
  organizationId: string | null;
  /** Org-wide staff may access all sites under organizationId when true. */
  orgWide: boolean;
  /** Active break-glass grant for haven_support (server-issued only). */
  supportGrant?: SupportAccessGrant | null;
};

export type SupportAccessGrant = {
  id: string;
  targetType: AuthzResourceType;
  targetTenantId: string;
  justification: string;
  grantedByUserId: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type AuthzResource = {
  type: AuthzResourceType;
  id: string;
  familyId?: string | null;
  communityId?: string | null;
  organizationId?: string | null;
  /** When true, resource is treated as missing (IDOR → 404). */
  exists?: boolean;
};

export type AuthzDecision = {
  allowed: boolean;
  code: AuthzDecisionCode;
  /** HTTP status for API responses: 403 forbidden, 404 not found (IDOR-safe). */
  httpStatus: 200 | 401 | 403 | 404;
  reason: string;
};

export type InvitationRecord = {
  id: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
};
