import { redirect } from "next/navigation";

/** Standalone calendar deferred — track dates on applications instead. */
export default function CalendarRedirect() {
  redirect("/family/applications");
}
