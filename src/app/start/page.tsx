import { redirect } from "next/navigation";

/** Obsolete route — redirected to the family space with Claire chat open. */
export default function ObsoleteRedirect() {
  redirect("/family/dashboard?claire=1");
}
