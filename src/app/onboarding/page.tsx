import { redirect } from "next/navigation";

/** Classic forms superseded by the resident dossier wizard. */
export default function OnboardingRedirect() {
  redirect("/family/dossier");
}
