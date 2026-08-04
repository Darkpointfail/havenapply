import { redirect } from "next/navigation";

/** Favorites deferred — not required for shared-dossier admissions MVP. */
export default function SavedRedirect() {
  redirect("/family/communities");
}
