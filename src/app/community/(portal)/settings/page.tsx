import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Settings removed from nav, edit community profile and team instead. */
export default function CommunitySettingsRedirect() {
  redirect("/community/profile");
}
