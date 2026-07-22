import { redirect } from "next/navigation";

/** Admissions inbox lives on the dashboard */
export default function CommunityApplicationsPage() {
  redirect("/community/dashboard");
}
