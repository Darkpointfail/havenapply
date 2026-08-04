import { redirect } from "next/navigation";

export default function InternalContentRedirect() {
  redirect("/internal/communities");
}
