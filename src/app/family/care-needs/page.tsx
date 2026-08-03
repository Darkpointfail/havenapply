import { redirect } from "next/navigation";

/** Care needs folded into the resident dossier. */
export default function CareNeedsRedirect() {
  redirect("/family/dossier");
}
