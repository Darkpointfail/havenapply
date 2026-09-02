import type { Metadata } from "next";
import { AccueilLanding } from "@/components/marketing/AccueilLanding";
import { homeMeta } from "@/data/home";

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
  openGraph: {
    title: homeMeta.title,
    description: homeMeta.description,
    images: [
      {
        url: homeMeta.ogImage,
        width: 1200,
        height: 630,
        alt: "HavenApply — Demande d'admission en résidence",
      },
    ],
  },
};

export default function HomePage() {
  return <AccueilLanding />;
}
