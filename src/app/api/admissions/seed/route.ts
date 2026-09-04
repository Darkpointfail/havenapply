import { jsonError, jsonOk } from "@/lib/family/authz";
import { admissionsSeedAllowed } from "@/lib/admissions/config";
import { isSupabaseBackend } from "@/lib/supabase/config";
import { seedAdmissionsForDev } from "@/lib/admissions/seed";
import { readJson } from "@/lib/admissions/validation";

/**
 * Explicit development provisioning: registers a site and its staff so the
 * console has a tenant to read. Refused in production.
 */
export async function POST(request: Request) {
  if (!admissionsSeedAllowed()) {
    return jsonError("Seeding is disabled in production.", 403);
  }
  if (isSupabaseBackend()) {
    return jsonError("Seed the Supabase project with SQL fixtures instead.", 400);
  }

  const body = (await readJson(request)) as {
    siteId?: unknown;
    siteName?: unknown;
    staff?: unknown;
    withApplications?: unknown;
    familyUserId?: unknown;
    familyEmail?: unknown;
  } | null;

  const siteId = typeof body?.siteId === "string" ? body.siteId.trim() : "";
  if (!siteId) return jsonError("Missing siteId.", 400);

  const staff = Array.isArray(body?.staff)
    ? (body.staff as Record<string, unknown>[])
        .map((member) => ({
          userId: typeof member.userId === "string" ? member.userId : "",
          email: typeof member.email === "string" ? member.email : "",
        }))
        .filter((member) => member.userId && member.email)
    : [];

  if (staff.length === 0) return jsonError("At least one staff member is required.", 400);

  const result = await seedAdmissionsForDev({
    siteId,
    siteName: typeof body?.siteName === "string" ? body.siteName : undefined,
    staff,
    withApplications: body?.withApplications === true,
    familyUserId: typeof body?.familyUserId === "string" ? body.familyUserId : undefined,
    familyEmail: typeof body?.familyEmail === "string" ? body.familyEmail : undefined,
  });

  return jsonOk({ seed: result });
}
