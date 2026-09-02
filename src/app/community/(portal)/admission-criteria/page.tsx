import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Admission requirements live on the public listing */
export default function AdmissionCriteriaRedirect() {
  redirect("/community/profile?tab=admissions");
}
