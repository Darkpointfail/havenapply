import { redirect } from "next/navigation";

/** Analytics de-emphasized, admissions inbox is the home */
export default function AnalyticsRedirect() {
  redirect("/community/dashboard");
}
