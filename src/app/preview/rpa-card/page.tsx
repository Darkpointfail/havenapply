"use client";

import { ResidencesBrowse, ResidenceFiche } from "@/components/family-space/ResidencesPage";
import { RESIDENCES } from "@/data/family-space";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { useMemo, useState } from "react";
import "@/components/family-space/family-space.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-source-serif",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});

/**
 * Design preview: legal map visual for La Résidence la Cathédrale (Amos).
 * Site-access gate still applies via middleware; no family auth required.
 */
export default function RpaCardPreviewPage() {
  const residence = useMemo(
    () => RESIDENCES.find((r) => r.id === "rpa-1428") ?? null,
    [],
  );
  const [mode, setMode] = useState<"card" | "fiche">("card");

  if (!residence) {
    return <p className="p-8">Résidence introuvable.</p>;
  }

  return (
    <div
      className={`${sourceSerif.variable} ${publicSans.variable} family-space min-h-screen bg-[var(--fs-bg)] px-4 py-8 md:px-8`}
      style={{ fontFamily: "var(--font-public-sans), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-[1100px]">
        <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">
          Aperçu visuel légal (carte OpenStreetMap embarquée — pas une photo scrapée)
        </p>
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="fs-btn fs-btn-outline"
            onClick={() => setMode("card")}
            style={
              mode === "card"
                ? { background: "var(--fs-green-tint)", color: "var(--fs-green)" }
                : undefined
            }
          >
            Carte liste
          </button>
          <button
            type="button"
            className="fs-btn fs-btn-outline"
            onClick={() => setMode("fiche")}
            style={
              mode === "fiche"
                ? { background: "var(--fs-green-tint)", color: "var(--fs-green)" }
                : undefined
            }
          >
            Fiche détail
          </button>
        </div>

        {mode === "fiche" ? (
          <ResidenceFiche
            residence={residence}
            onBack={() => setMode("card")}
            onApply={() => undefined}
          />
        ) : (
          <ResidencesBrowse
            onOpen={() => setMode("fiche")}
            onApply={() => undefined}
            initialQuery="Cathédrale"
          />
        )}
      </div>
    </div>
  );
}
