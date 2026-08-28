import type { Metadata } from "next";
import { HomePageView } from "@/components/marketing/HomePageView";

export const metadata: Metadata = {
  title: "HavenApply — Une demande, toutes les résidences",
  description:
    "Fini les dossiers papier. Remplissez une demande d'admission une seule fois et envoyez-la en ligne à toutes les résidences pour aînés que vous choisissez.",
};

export default function HomePage() {
  return <HomePageView />;
}
