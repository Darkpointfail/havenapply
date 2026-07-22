import { redirect } from "next/navigation";

/** Auth bypass: open community portal directly. */
export default function CommunityGetStartedPage() {
  redirect("/community/dashboard");
}
