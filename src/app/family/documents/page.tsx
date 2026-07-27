import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

export default function DocumentsRedirect() {
  redirect("/family/profile?tab=documents");
}
