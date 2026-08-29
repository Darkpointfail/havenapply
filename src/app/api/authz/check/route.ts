import { NextResponse } from "next/server";
import { authorize, toAuthzResponse, type AuthzAction, type AuthzActor, type AuthzResource } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseBackend } from "@/lib/supabase/config";

/**
 * Server-side authorization check.
 *
 * Security rules:
 * - Actor is derived from the verified Supabase session (and optional membership headers
 *   that must be validated against the DB in production Edge paths).
 * - Request body may supply resource coordinates to check; it must NEVER supply role,
 *   accountStatus, orgWide, or supportGrant.
 * - When Supabase is not configured, returns 503 (fail closed for this endpoint).
 */

type Body = {
  action?: string;
  resource?: {
    type?: string;
    id?: string;
    familyId?: string | null;
    communityId?: string | null;
    organizationId?: string | null;
    exists?: boolean;
  };
};

const ACTIONS = new Set<AuthzAction>([
  "read",
  "create",
  "update",
  "delete",
  "share",
  "submit_application",
  "withdraw_application",
  "accept_application",
  "decline_application",
  "request_documents",
  "add_internal_notes",
  "manage_team",
  "invite_member",
  "revoke_access",
  "change_member_role",
  "change_own_role",
  "export_data",
  "support_break_glass",
  "disable_account",
]);

function isAction(value: unknown): value is AuthzAction {
  return typeof value === "string" && ACTIONS.has(value as AuthzAction);
}

export async function POST(request: Request) {
  if (!isSupabaseBackend()) {
    return NextResponse.json(
      {
        ok: false,
        code: "backend_unavailable",
        error: "Authorization API requires the Supabase backend.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  if (!isAction(body.action) || !body.resource?.type || !body.resource?.id) {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const supabase = await createClient().catch(() => null);
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
  }

  // Membership / role must come from DB — never from the client body.
  // Until Edge membership RPCs are wired, map only safe session metadata with least privilege.
  const meta = user.user_metadata ?? {};
  const portalRole = typeof meta.role === "string" ? meta.role : "family";
  const accountStatus =
    meta.account_status === "disabled" || meta.account_status === "suspended"
      ? meta.account_status
      : "active";

  const actor: AuthzActor = {
    userId: user.id,
    email: user.email || "",
    role:
      portalRole === "facility" || portalRole === "community"
        ? "community_employee"
        : portalRole === "internal"
          ? "haven_support"
          : portalRole === "professional"
            ? "family_caregiver"
            : "family_owner",
    accountStatus,
    familyId: typeof meta.family_id === "string" ? meta.family_id : null,
    communityId: typeof meta.community_id === "string" ? meta.community_id : null,
    organizationId: typeof meta.organization_id === "string" ? meta.organization_id : null,
    orgWide: false,
    supportGrant: null,
  };

  const resource: AuthzResource = {
    type: body.resource.type as AuthzResource["type"],
    id: body.resource.id,
    familyId: body.resource.familyId,
    communityId: body.resource.communityId,
    organizationId: body.resource.organizationId,
    exists: body.resource.exists,
  };

  const decision = authorize({ actor, action: body.action, resource });
  const payload = toAuthzResponse(decision);
  return NextResponse.json(payload, { status: payload.status === 200 ? 200 : payload.status });
}
