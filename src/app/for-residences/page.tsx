import { redirect } from "next/navigation";

/** Old public path, residence tools live behind a separate staff login. */
export default function ForResidencesRedirect() {
  redirect("/residence-login");
}
