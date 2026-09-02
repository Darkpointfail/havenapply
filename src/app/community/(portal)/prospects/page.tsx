import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Prospects folded into Applications */
export default function ProspectsRedirect() {
  redirect("/community/applications?filter=new");
}
