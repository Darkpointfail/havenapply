import { redirect } from "next/navigation";

/** Occupancy tooling removed from admissions-focused portal */
export default function AvailabilityRedirect() {
  redirect("/community/dashboard");
}
