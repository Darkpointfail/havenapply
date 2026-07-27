import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Old public path, residence tools live behind a separate staff login. */
export default function ForResidencesRedirect() {
  redirect("/residence-login");
}
