import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Analytics de-emphasized, admissions inbox is the home */
export default function AnalyticsRedirect() {
  redirect("/community/dashboard");
}
