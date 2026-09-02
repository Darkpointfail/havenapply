"use client";

import Link from "next/link";
import { LegalShell } from "@/components/legal/LegalShell";
import { collectionPath, getPrivacyPolicy } from "@/content/legal";
import { useLocale } from "@/lib/i18n/locale";

export default function ConfidentialitePage() {
  const { locale } = useLocale();
  const policy = getPrivacyPolicy(locale);

  return (
    <LegalShell
      rightHref={collectionPath(locale)}
      rightLabel={locale === "en" ? "Collection notices" : "Avis de collecte"}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#5c6f66",
          fontWeight: 600,
        }}
      >
        {locale === "en" ? "Personal information · Québec" : "Renseignements personnels · Québec"}
      </p>
      <h1
        style={{
          margin: "10px 0 8px",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(1.75rem, 4vw, 2.35rem)",
          lineHeight: 1.15,
          fontWeight: 600,
        }}
      >
        {policy.title}
      </h1>
      <p style={{ margin: 0, color: "#3d5249", fontSize: 15, lineHeight: 1.5 }}>
        {policy.subtitle}
        <br />
        {locale === "en" ? "Effective" : "Entrée en vigueur"}: {policy.effectiveDate} ·{" "}
        {locale === "en" ? "Version" : "Version"} {policy.version}
      </p>

      <div
        role="status"
        style={{
          marginTop: 24,
          padding: "14px 16px",
          borderRadius: 12,
          background: "#fff8e8",
          border: "1px solid rgba(180, 130, 40, 0.35)",
          fontSize: 14,
          lineHeight: 1.5,
          color: "#5c4818",
        }}
      >
        {policy.legalDraftBanner}
      </div>

      <div style={{ marginTop: 36, display: "grid", gap: 28 }}>
        {policy.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 600, color: "#0f2e26" }}>
              {section.title}
            </h2>
            {section.paragraphs.map((p) => (
              <p
                key={p.slice(0, 48)}
                style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.65, color: "#24332d" }}
              >
                {p}
              </p>
            ))}
            {section.bullets ? (
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: 22,
                  display: "grid",
                  gap: 6,
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "#24332d",
                }}
              >
                {section.bullets.map((b) => (
                  <li key={b.slice(0, 48)}>{b}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p style={{ marginTop: 48, fontSize: 13.5, color: "#5c6f66", lineHeight: 1.5 }}>
        {locale === "en" ? (
          <>
            See also the{" "}
            <Link href={collectionPath("en")} style={{ color: "#0A6F63" }}>
              collection notices
            </Link>{" "}
            shown at signup and when creating a file.
          </>
        ) : (
          <>
            Voir aussi l&apos;
            <Link href={collectionPath("fr")} style={{ color: "#0A6F63" }}>
              avis de collecte
            </Link>{" "}
            affiché lors de l&apos;inscription et de la création du dossier.
          </>
        )}
      </p>
    </LegalShell>
  );
}
