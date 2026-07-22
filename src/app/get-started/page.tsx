import { redirect } from "next/navigation";

/** Auth bypass: open family portal directly. */
export default function GetStartedPage() {
  redirect("/family/dashboard");
}
