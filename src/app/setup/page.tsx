import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Setup → choose AI or manual profile creation */
export default function SetupRedirect() {
  redirect("/start");
}
