import { redirect } from "next/navigation";

export default function ApplyRedirect() {
  redirect("/family/dashboard?view=residences");
}
