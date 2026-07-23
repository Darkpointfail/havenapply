import { redirect } from "next/navigation";

/** Settings removed from nav — edit community profile and team instead. */
export default function CommunitySettingsRedirect() {
  redirect("/community/profile");
}
