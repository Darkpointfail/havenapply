import { redirect } from "next/navigation";

/** Marketplace browse removed from MVP — use the thin apply picker. */
export default function FindSeniorLivingRedirect() {
  redirect("/family/communities");
}
