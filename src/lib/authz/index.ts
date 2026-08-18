export type {
  AccountLifecycleStatus,
  AuthzAction,
  AuthzActor,
  AuthzDecision,
  AuthzDecisionCode,
  AuthzResource,
  AuthzResourceType,
  AuthzRole,
  InvitationRecord,
  SupportAccessGrant,
} from "@/lib/authz/types";

export {
  COMMUNITY_ROLES,
  FAMILY_ROLES,
  PLATFORM_ROLES,
  SELF_ROLE_CHANGE_FORBIDDEN,
  mapCommunityTeamRole,
  mapFamilyCollaborationRole,
  mapLegalRepresentative,
  mapPlatformRole,
  mapPortalUserRole,
  mapSqlCommunityRole,
} from "@/lib/authz/roles";

export {
  actorMayAccessCommunityTenant,
  actorMayAccessFamilyTenant,
  allow,
  deny,
  denyNotFound,
  isAccountUsable,
  isInvitationAcceptable,
  isSupportGrantValid,
  supportGrantCoversResource,
} from "@/lib/authz/tenant";

export { authorize, toAuthzResponse } from "@/lib/authz/policy";
export type { AuthorizeInput } from "@/lib/authz/policy";

export {
  SUPPORT_GRANT_MAX_TTL_MS,
  createSupportGrant,
  revokeSupportGrant,
} from "@/lib/authz/support-access";
export type { CreateSupportGrantInput } from "@/lib/authz/support-access";
