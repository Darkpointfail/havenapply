import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Occupancy tooling removed from admissions-focused portal */
export default function AvailabilityRedirect() {
  redirect("/community/dashboard");
}
