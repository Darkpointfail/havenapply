import { redirect } from "next/navigation";

/** Legacy family dashboard. */
export default function LegacyDashboardRedirect() {
  redirect("/family/dashboard");
}
