"use client";

import { Source_Serif_4, Public_Sans } from "next/font/google";
import { ResidentApplicationProfile } from "@/components/community/ResidentApplicationProfile";

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

export default function ResidentApplicationProfilePage() {
  return (
    <div className={`${sourceSerif.variable} ${publicSans.variable}`}>
      <ResidentApplicationProfile />
    </div>
  );
}
