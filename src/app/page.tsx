import type { Metadata } from "next";
import { HomePageView } from "@/components/marketing/HomePageView";

export const metadata: Metadata = {
  title: "HavenApply — Envoyez votre demande d'admission en ligne",
  description:
    "Le dossier se remplit en quelques minutes, puis nous vous recommandons les résidences qui correspondent vraiment aux besoins de votre proche, à votre budget et à votre secteur. Vous cochez celles que vous retenez, la demande part à toutes en même temps.",
};

export default function HomePage() {
  return <HomePageView />;
}
