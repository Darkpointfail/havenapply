import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

export default function SeniorProfileRedirect() {
  redirect("/family/profile?tab=details");
}
