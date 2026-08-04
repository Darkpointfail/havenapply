import { redirect } from "next/navigation";

/** Standalone tasks deferred — use dossier + application next actions. */
export default function TasksRedirect() {
  redirect("/family/dashboard");
}
