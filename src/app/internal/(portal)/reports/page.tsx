import { redirect } from "next/navigation";

export default function InternalReportsRedirect() {
  redirect("/internal/overview");
}
