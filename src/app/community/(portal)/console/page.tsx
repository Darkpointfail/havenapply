"use client";

import { Source_Serif_4, Public_Sans } from "next/font/google";
import { ResidenceConsole } from "@/components/residence-console/ResidenceConsole";

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

export default function ResidenceConsolePage() {
  return (
    <div className={`${sourceSerif.variable} ${publicSans.variable}`}>
      <ResidenceConsole />
    </div>
  );
}
