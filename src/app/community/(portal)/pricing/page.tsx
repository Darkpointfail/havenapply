import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Pricing lives on the public listing */
export default function PricingRedirect() {
  redirect("/community/profile?tab=pricing");
}
