import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Settings removed from nav, personal/org edits live on My Organization. */
export default function ProfessionalSettingsRedirect() {
  redirect("/professional/organization");
}
