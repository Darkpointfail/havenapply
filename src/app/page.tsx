import type { Metadata } from "next";
import { HomePageView } from "@/components/marketing/HomePageView";

export const metadata: Metadata = {
  title: "HavenApply — Une seule demande, les bonnes résidences",
  description:
    "Créez une demande claire pour un proche, envoyez-la aux résidences privées pour aînés qui conviennent vraiment, et suivez les réponses au même endroit.",
};

export default function HomePage() {
  return <HomePageView />;
}
