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
    "Senior living admissions, made clear. One dossier to find the right communities and apply with confidence.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32-v5.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-48-v5.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/icon-v5.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-icon-v5.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
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
