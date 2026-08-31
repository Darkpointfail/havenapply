import { redirect } from "next/navigation";

/** Obsolete legacy family portal page — canonical UX is FamilySpace. */
export default function Page() {
  redirect("/family/dashboard");
}
