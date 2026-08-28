import { redirect } from "next/navigation";

/** Legacy path — the family space now lives at the site root. */
export default function FamilyEspaceRedirectPage() {
  redirect("/");
}
