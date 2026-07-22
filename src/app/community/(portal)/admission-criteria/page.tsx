import { redirect } from "next/navigation";

/** Admission requirements live on the public listing */
export default function AdmissionCriteriaRedirect() {
  redirect("/community/profile?tab=admissions");
}
