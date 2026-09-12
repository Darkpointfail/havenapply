import { jsonError, jsonOk } from "@/lib/family/authz";
import { requireCsrf, requireStaff, scopeToSite } from "@/lib/security/guards";
import { listAvailability, upsertAvailability } from "@/lib/community-availability/repository";
import type { AvailabilityStatus, AvailabilityUnit } from "@/lib/community-portal";

/** Matches has_community_permission()'s 'edit_availability' branch
 * (migration 0025): admin and manager, not coordinator or readonly. */
function canEditAvailability(role: string): boolean {
  return role === "admin" || role === "manager";
}

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const scope = scopeToSite(auth.principal, searchParams.get("siteId"));
  if (!scope.ok) return jsonError(scope.error, scope.status);
  const siteId = scope.siteIds[0];
  if (!siteId) return jsonError("A residence must be specified.", 400);

  const availability = await listAvailability(siteId);
  return jsonOk({ availability });
}

/** Upsert one unit. Targets public.availability's real key
 * (community_id, care_level) — see community-availability/supabase-store.ts
 * for why two units sharing a care level collapse into one row. */
export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (!csrf.ok) return jsonError(csrf.error, csrf.status);

  const auth = await requireStaff();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let body: { siteId?: unknown; unit?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const scope = scopeToSite(auth.principal, typeof body.siteId === "string" ? body.siteId : null);
  if (!scope.ok) return jsonError(scope.error, scope.status);
  const siteId = scope.siteIds[0];

  const membership = auth.principal.memberships.find(
    (m) => m.siteId === siteId && m.status === "active",
  );
  if (!membership || !canEditAvailability(membership.role)) {
    return jsonError("You don't have permission to edit availability.", 403);
  }

  const raw = (body.unit ?? {}) as Record<string, unknown>;
  const careLevel = typeof raw.careLevel === "string" ? raw.careLevel.trim().slice(0, 200) : "";
  if (!careLevel) return jsonError("Enter a care level.", 400);

  const unit: AvailabilityUnit = {
    id: typeof raw.id === "string" ? raw.id : "",
    roomType: typeof raw.roomType === "string" ? raw.roomType.trim().slice(0, 200) : "",
    count:
      typeof raw.count === "number" && Number.isFinite(raw.count) ? Math.max(0, Math.trunc(raw.count)) : 0,
    availableDate: typeof raw.availableDate === "string" ? raw.availableDate.trim().slice(0, 32) : "",
    price: typeof raw.price === "number" && Number.isFinite(raw.price) ? raw.price : null,
    careLevel,
    status: (raw.status === "confirmed" ? "confirmed" : "estimated") as AvailabilityStatus,
    waitlistCount:
      typeof raw.waitlistCount === "number" && Number.isFinite(raw.waitlistCount)
        ? Math.max(0, Math.trunc(raw.waitlistCount))
        : 0,
  };

  const result = await upsertAvailability(siteId, unit);
  if (!result.ok) return jsonError(result.error, 400);
  return jsonOk({ unit: result.unit });
}
