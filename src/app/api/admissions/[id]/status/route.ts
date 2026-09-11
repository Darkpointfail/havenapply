import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireStaffActor, resolveStaffSiteScope } from "@/lib/admissions/authz";
import { requireDecidingRole } from "@/lib/security/guards";
import { changeStatus } from "@/lib/admissions/repository";
import { decisionKindForStatus } from "@/lib/admissions/mapping";
import { isAdmissionStatus } from "@/lib/admissions/types";
import { readJson } from "@/lib/admissions/validation";
import { requireCsrf } from "@/lib/security/guards";
import {
  applicationAcceptedEmail,
  applicationDeclinedEmail,
  applicationStatusChangedEmail,
  sendEmail,
} from "@/lib/email/mailer";

/** Staff transition. Writes one status event and one audit entry. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrfCheck = await requireCsrf(request);
  if (!csrfCheck.ok) return jsonError(csrfCheck.error, csrfCheck.status);

  const { id } = await ctx.params;

  const auth = await requireStaffActor();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await readJson(request)) as {
    status?: unknown;
    note?: unknown;
    siteId?: unknown;
    waitlistPosition?: unknown;
  } | null;

  if (!isAdmissionStatus(body?.status) || body.status === "draft") {
    return jsonError("Unsupported status.", 400);
  }

  const scope = resolveStaffSiteScope(
    auth.actor,
    typeof body?.siteId === "string" ? body.siteId : null,
  );
  if (!scope.ok) return jsonError(scope.error, scope.status);

  const decision = requireDecidingRole(
    {
      ...auth.actor,
      role: "facility",
      sessionId: null,
    },
    scope.siteIds[0],
  );
  if (!decision.ok) return jsonError(decision.error, decision.status);

  const result = await changeStatus({
    applicationId: id,
    siteIds: scope.siteIds,
    toStatus: body.status,
    note: typeof body.note === "string" ? body.note.slice(0, 2000) : null,
    actorId: auth.actor.userId,
    actorLabel: auth.actor.displayName,
    decisionKind: decisionKindForStatus(body.status),
    waitlistPosition:
      typeof body.waitlistPosition === "number" ? body.waitlistPosition : undefined,
  });
  if (!result.ok) return jsonError(result.error, result.status);

  // Best-effort: a family must find out their application status changed,
  // but a mail provider hiccup must never fail the transition itself —
  // sendEmail() never throws (see mailer.ts), so no try/catch is needed.
  const app = result.data;
  if (app.familyEmail) {
    const emailArgs = {
      familyName: app.familyContact.name || app.senior.name,
      seniorName: app.senior.name,
      residenceName: app.siteName,
    };
    if (body.status === "approved") {
      await sendEmail(applicationAcceptedEmail(app.familyEmail, emailArgs));
    } else if (body.status === "declined") {
      await sendEmail(applicationDeclinedEmail(app.familyEmail, emailArgs));
    } else {
      await sendEmail(
        applicationStatusChangedEmail(app.familyEmail, {
          ...emailArgs,
          newStatus: body.status,
          note: app.decision?.note,
        }),
      );
    }
  }

  return jsonOk({ application: app });
}
