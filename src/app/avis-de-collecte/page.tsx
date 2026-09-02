"use client";

import Link from "next/link";
import { LegalShell } from "@/components/legal/LegalShell";
import {
  getCollectionNotice,
  getCollectionPageCopy,
  privacyPath,
} from "@/content/legal";
import { useLocale } from "@/lib/i18n/locale";

export default function AvisDeCollectePage() {
  const { locale } = useLocale();
  const page = getCollectionPageCopy(locale);
  const notices = [
    getCollectionNotice(locale, "account"),
    getCollectionNotice(locale, "profile"),
  ];

  return (
    <LegalShell
      rightHref={privacyPath(locale)}
      rightLabel={locale === "en" ? "Privacy policy" : "Politique complète"}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          fontSize: "clamp(1.6rem, 3.5vw, 2.1rem)",
          fontWeight: 600,
        }}
      >
        {page.title}
      </h1>
      <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: "#3d5249" }}>{page.intro}</p>

      <div style={{ marginTop: 28, display: "grid", gap: 20 }}>
        {notices.map((n) => (
          <section
            key={n.version + n.title}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "20px 22px",
              border: "1px solid rgba(15, 61, 46, 0.1)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{n.title}</h2>
            <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.65, color: "#24332d" }}>
              {n.body}
            </p>
            <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#5c6f66" }}>
              {locale === "en" ? "Version" : "Version"} {n.version}
            </p>
          </section>
        ))}
      </div>

      <p style={{ marginTop: 28, fontSize: 13.5, color: "#5c6f66" }}>
        <Link href={privacyPath(locale)} style={{ color: "#0A6F63" }}>
          {locale === "en" ? "Full privacy policy" : "Politique de confidentialité complète"}
        </Link>
      </p>
    </LegalShell>
  );
}
