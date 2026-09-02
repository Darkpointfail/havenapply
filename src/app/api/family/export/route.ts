import { requireFamilyUser, jsonError } from "@/lib/family/authz";
import { exportFamilyData, recordRightsOperation } from "@/lib/family/repository";

/** Portable JSON export of the authenticated family's personal data (Loi 25 access right). */
export async function GET() {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const payload = await exportFamilyData(auth.user.id);
  if (!payload) return jsonError("No data to export.", 404);

  await recordRightsOperation(auth.user.id, "access_view", "Consultation via export");

  const body = JSON.stringify(payload, null, 2);
  const filename = `havenapply-export-${auth.user.id.slice(0, 8)}.json`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
