import { redirect } from "next/navigation";

/** Notifications center deferred — status lives on applications & messages. */
export default function NotificationsRedirect() {
  redirect("/family/applications");
}
