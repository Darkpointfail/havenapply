import { redirect } from "next/navigation";

/** Pricing lives on the public listing */
export default function PricingRedirect() {
  redirect("/community/profile?tab=pricing");
}
