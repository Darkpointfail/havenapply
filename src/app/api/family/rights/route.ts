import { requireFamilyUser, jsonError, jsonOk } from "@/lib/family/authz";
import { getRightsLog, recordRightsOperation } from "@/lib/family/repository";

export async function GET() {
  const auth = await requireFamilyUser();
  if (!auth.ok) return jsonError(auth.error, auth.status);
  await recordRightsOperation(auth.user.id, "access_view", "Opened the rights page");
  const logs = await getRightsLog(auth.user.id);
  return jsonOk({ logs });
}
