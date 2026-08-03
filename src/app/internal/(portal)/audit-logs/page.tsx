import { redirect } from "next/navigation";

export default function InternalAuditRedirect() {
  redirect("/internal/overview");
}
