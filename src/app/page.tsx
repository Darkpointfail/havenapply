import type { Metadata } from "next";
import { FamilySpace } from "@/components/family-space/FamilySpace";

export const metadata: Metadata = {
  title: "HavenApply : Espace famille",
  description:
    "Constituez le dossier d'admission de votre proche, cherchez des résidences et suivez vos demandes au même endroit.",
};

export default function HomePage() {
  return <FamilySpace />;
}
