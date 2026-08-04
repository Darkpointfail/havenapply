import { redirect } from "next/navigation";

/** Hospital portal deferred — use professional portal. */
export default function HospitalRedirect() {
  redirect("/professional/dashboard");
}
