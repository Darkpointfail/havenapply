import { redirect } from "next/navigation";

/** Legacy path — the residence console now lives at /community/dashboard. */
export default function ResidenceConsoleRedirectPage() {
  redirect("/community/dashboard");
}
