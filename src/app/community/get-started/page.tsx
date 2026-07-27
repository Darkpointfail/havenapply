import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Auth bypass: open community portal directly. */
export default function CommunityGetStartedPage() {
  redirect("/community/dashboard");
}
