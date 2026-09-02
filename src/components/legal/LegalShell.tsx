"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/locale";
import { privacyPath, termsPath } from "@/content/legal";

export function LegalShell({
  children,
  rightHref,
  rightLabel,
}: {
  children: ReactNode;
  rightHref?: string;
  rightLabel?: string;
}) {
  const { locale } = useLocale();
  const homeLabel = locale === "en" ? "Create an account" : "Créer un compte";
  const resolvedRight =
    rightHref && rightLabel
      ? { href: rightHref, label: rightLabel }
      : locale === "en"
        ? { href: termsPath("en"), label: "Terms" }
        : { href: privacyPath("fr"), label: "Confidentialité" };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f3f7f5 0%, #eef3f0 40%, #f7f5f1 100%)",
        color: "#14201c",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(20, 32, 28, 0.08)",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 600,
              fontSize: 20,
              color: "#0A6F63",
              textDecoration: "none",
            }}
          >
            HavenApply
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageSwitcher compact />
            <Link href={resolvedRight.href} style={{ fontSize: 14, color: "#3d5249", textDecoration: "none" }}>
              {resolvedRight.label}
            </Link>
            <Link href="/get-started" style={{ fontSize: 14, color: "#3d5249", textDecoration: "none" }}>
              {homeLabel}
            </Link>
          </div>
        </div>
      </header>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>{children}</div>
    </main>
  );
}
