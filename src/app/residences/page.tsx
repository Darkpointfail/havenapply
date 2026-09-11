import { redirect } from "next/navigation";

/** Retired public search — the real browse experience lives in the authenticated family space (/family/dashboard?view=residences). */
export default function Page() {
  redirect("/");
}
