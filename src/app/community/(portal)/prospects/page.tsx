import { redirect } from "next/navigation";

/** Prospects folded into Applications */
export default function ProspectsRedirect() {
  redirect("/community/applications?filter=new");
}
