"use client";

import Link from "next/link";
import { LegalShell } from "@/components/legal/LegalShell";
import { getTermsOfUse, privacyPath } from "@/content/legal";
import { useLocale } from "@/lib/i18n/locale";

export default function ConditionsPage() {
  const { locale } = useLocale();
  const terms = getTermsOfUse(locale);

  return (
    <LegalShell
      rightHref={privacyPath(locale)}
      rightLabel={locale === "en" ? "Privacy" : "Confidentialité"}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          fontSize: "clamp(1.6rem, 3.5vw, 2.1rem)",
          fontWeight: 600,
        }}
      >
        {terms.title}
      </h1>
      <p
        role="status"
        style={{
          marginTop: 20,
          padding: "14px 16px",
          borderRadius: 12,
          background: "#fff8e8",
          border: "1px solid rgba(180, 130, 40, 0.35)",
          fontSize: 14,
          lineHeight: 1.5,
          color: "#5c4818",
        }}
      >
        {terms.draftBanner}
      </p>
      <div style={{ marginTop: 28, display: "grid", gap: 16, fontSize: 15, lineHeight: 1.65, color: "#24332d" }}>
        {terms.paragraphs.map((p, i) => (
          <p key={i} style={{ margin: 0 }}>
            {i === 3 ? (
              locale === "en" ? (
                <>
                  How personal information is handled is described in the{" "}
                  <Link href={privacyPath("en")} style={{ color: "#0A6F63" }}>
                    privacy policy
                  </Link>
                  .
                </>
              ) : (
                <>
                  Le traitement des renseignements personnels est décrit dans la{" "}
                  <Link href={privacyPath("fr")} style={{ color: "#0A6F63" }}>
                    politique de confidentialité
                  </Link>
                  .
                </>
              )
            ) : (
              p
            )}
          </p>
        ))}
      </div>
    </LegalShell>
  );
}
