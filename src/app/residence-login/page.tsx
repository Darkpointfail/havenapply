import { redirect } from "next/navigation";

/** Obsolete route — redirected to the current product surface. */
export default function ObsoleteRedirect() {
  redirect("/community/sign-in");
}
