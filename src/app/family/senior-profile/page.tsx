import { redirect } from "next/navigation";

export default function SeniorProfileRedirect() {
  redirect("/family/profile?tab=details");
}
