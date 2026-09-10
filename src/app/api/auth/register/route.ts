import { jsonError, jsonOk } from "@/lib/family/authz";
import { parseUserRole } from "@/lib/auth-store";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { registerAccount } from "@/lib/security/auth-service";
import { sendEmail, verificationEmail } from "@/lib/email/mailer";
import { requestFingerprint, requireCsrf } from "@/lib/security/guards";
import { upsertMembership } from "@/lib/security/identity-store";
import { residencesForCommunityOrg } from "@/lib/messaging";

/**
 * Local-mode registration. Staff and admin accounts are never self-served:
 * they come from an invitation, so only `family` may register here.
 */
export async function POST(request: Request) {
  if (isSupabaseBackend()) {
    return jsonError("Use Supabase Auth on this deployment.", 400);
  }

  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const role = typeof body.role === "string" ? parseUserRole(body.role) : "family";
  // DEMO/LOCAL-DEV NOTE: normally only "family" self-registers here; staff
  // accounts come from an invitation. Temporarily allowing "facility" too so
  // local-mode demos can create a residence account without the invitation
  // flow. Revert to family-only before any real pilot/production use.
  if (role !== "family" && role !== "facility") {
    return jsonError("Residence and admin accounts are created by invitation.", 403);
  }

  const result = await registerAccount({
    email: body.email,
    password: body.password,
    role,
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    fingerprint: await requestFingerprint(),
  });
  if (!result.ok) return jsonError(result.error, result.status);

  // A staff account with no site membership can never pass requireStaff().
  // Self-registration only exists for local-mode demos (see comment above),
  // so link the account to whichever residence its organization name maps
  // to (fallback: Maple Grove, the demo/seed community).
  if (role === "facility" && typeof body.email === "string") {
    const organization = typeof body.organization === "string" ? body.organization : "";
    const siteId = residencesForCommunityOrg(organization, body.email)[0] || "maple-grove";
    await upsertMembership({
      userId: result.data.userId,
      email: body.email,
      siteId,
      role: "admin",
    });
  }

  // Verification is currently disabled for every role (see
  // requiresVerifiedEmail in auth-service.ts), so verificationToken is null
  // and no mail goes out. This stays ready for when that gate is switched
  // back on: an operator can still read a token back through
  // /api/auth/verify-email for support cases where the mail can't be delivered.
  if (result.data.verificationToken && typeof body.email === "string") {
    await sendEmail(verificationEmail(body.email, result.data.verificationToken));
  }

  return jsonOk({ userId: result.data.userId }, 201);
}
