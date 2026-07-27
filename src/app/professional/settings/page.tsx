import { redirect } from "next/navigation";

/** Settings removed from nav, personal/org edits live on My Organization. */
export default function ProfessionalSettingsRedirect() {
  redirect("/professional/organization");
}
