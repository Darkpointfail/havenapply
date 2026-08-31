import type { Metadata } from "next";
import { HomePageView } from "@/components/marketing/HomePageView";

export const metadata: Metadata = {
  title: "HavenApply — Submit your admission application online",
  description:
    "Complete the file in a few minutes, then we recommend residences that truly match your loved one's needs, your budget, and your area. Select the ones you want; the application goes to all of them at once.",
};

export default function HomePage() {
  return <HomePageView />;
}
