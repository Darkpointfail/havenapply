import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "HavenApply — Envoyez votre demande d'admission en ligne",
    template: "%s · HavenApply",
  },
  description:
    "Le dossier se remplit en quelques minutes, puis nous vous recommandons les résidences qui correspondent vraiment aux besoins de votre proche.",
  icons: {
    icon: [
      { url: "/brand/favicon-32-v6.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-48-v6.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/favicon-v6.ico", sizes: "any" },
    ],
    apple: [{ url: "/brand/apple-icon-v6.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${publicSans.variable} ${sourceSerif.variable} font-sans antialiased`}
        style={{ fontFamily: "var(--font-public-sans), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
