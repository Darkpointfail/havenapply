import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireStaffActor, resolveStaffSiteScope } from "@/lib/admissions/authz";
import { changeStatus } from "@/lib/admissions/repository";
import { decisionKindForStatus } from "@/lib/admissions/mapping";
import { isAdmissionStatus } from "@/lib/admissions/types";
import { readJson } from "@/lib/admissions/validation";

/** Staff transition. Writes one status event and one audit entry. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
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

  return jsonOk({ application: result.data });
}
