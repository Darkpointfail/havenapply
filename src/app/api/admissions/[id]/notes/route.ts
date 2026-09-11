import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireStaffActor } from "@/lib/admissions/authz";
import { requireCsrf } from "@/lib/security/guards";
import { addInternalNote, listInternalNotes } from "@/lib/admissions/repository";
import { readJson } from "@/lib/admissions/validation";

const MAX_NOTE_LENGTH = 4000;

/**
 * Staff-only, deliberately separate from GET /api/admissions/[id]: that route
 * shares one response shape between the family and staff branches, and
 * admissions_audit_log — returned there as `audit` — is readable by both
 * (can_read_application has no staff/family split). A note folded into that
 * response would leak the moment a future edit touched the shared branch.
 * This route has no family branch at all, so there is nothing to leak from.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const staff = await requireStaffActor();
  if (!staff.ok) return jsonError(staff.error, staff.status);

  const result = await listInternalNotes({ applicationId: id, siteIds: staff.actor.siteIds });
  if (!result.ok) return jsonError(result.error, result.status);
  return jsonOk({ notes: result.data });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const { id } = await ctx.params;

  const staff = await requireStaffActor();
  if (!staff.ok) return jsonError(staff.error, staff.status);

  const body = (await readJson(request)) as { body?: unknown } | null;
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, MAX_NOTE_LENGTH) : "";
  if (!text) return jsonError("Write a note first.", 400);

  const result = await addInternalNote({
    applicationId: id,
    siteIds: staff.actor.siteIds,
    authorId: staff.actor.userId,
    authorName: staff.actor.displayName,
    body: text,
  });
  if (!result.ok) return jsonError(result.error, result.status);
  return jsonOk({ note: result.data }, 201);
}
