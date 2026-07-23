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
    default: "HavenApply, Senior living admissions, made clear.",
    template: "%s · HavenApply",
  },
  description:
    "Senior living admissions, made clear. Build one profile, find the right communities, and apply with confidence.",
  icons: {
    // Prefer PNG (Safari) with versioned filenames to bust aggressive favicon caches.
    icon: [
      { url: "/brand/favicon-32-v6.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-48-v6.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/favicon-v6.ico", sizes: "any" },
      { url: "/brand/icon-v6.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-icon-v6.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/brand/favicon-v6.ico"],
  },
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
