import { redirect } from "next/navigation";

export default function Page() {
  redirect("/family/dashboard?view=residences");
}
