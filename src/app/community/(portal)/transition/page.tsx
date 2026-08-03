import { redirect } from "next/navigation";

/** Post-accept transition deferred past admissions MVP. */
export default function TransitionRedirect() {
  redirect("/community/dashboard");
}
