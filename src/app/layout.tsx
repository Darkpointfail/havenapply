import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { SiteShell } from "@/components/layout/SiteShell";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Haven — The Common App for senior living",
    template: "%s · Haven",
  },
  description:
    "One intelligent profile. Apply to assisted living, memory care, and nursing homes with clarity — AI-first admissions OS for families, hospitals, and communities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <AppProviders>
          <SiteShell>{children}</SiteShell>
        </AppProviders>
      </body>
    </html>
  );
}
