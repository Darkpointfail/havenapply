import { redirect } from "next/navigation";

export default function DocumentsRedirect() {
  redirect("/family/profile?tab=documents");
}
