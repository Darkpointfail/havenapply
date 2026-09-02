import { redirect } from "next/navigation";

/** Legacy path — B2C family space lives at /family/dashboard. */
export default function FamilyEspaceRedirectPage() {
  redirect("/family/dashboard");
}
