import { redirect } from "next/navigation";

/** Legacy community admin — use /community portal. */
export default function LegacyAdminRedirect() {
  redirect("/community/dashboard");
}
