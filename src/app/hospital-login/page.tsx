import { redirect } from "next/navigation";

export default function HospitalLoginRedirect() {
  redirect("/get-started");
}
