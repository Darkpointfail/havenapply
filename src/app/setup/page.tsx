import { redirect } from "next/navigation";

/** Setup → choose AI or manual profile creation */
export default function SetupRedirect() {
  redirect("/start");
}
