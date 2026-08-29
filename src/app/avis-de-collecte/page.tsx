import type { Metadata } from "next";
import Link from "next/link";
import {
  COLLECTION_NOTICE_ACCOUNT,
  COLLECTION_NOTICE_PROFILE,
} from "@/content/legal/privacy-fr";

export const metadata: Metadata = {
  title: "Avis de collecte | HavenApply",
  description:
    "Finalités de la collecte de renseignements personnels sur HavenApply (Loi 25, Québec).",
};

export default function AvisDeCollectePage() {
  const notices = [COLLECTION_NOTICE_ACCOUNT, COLLECTION_NOTICE_PROFILE];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f3f7f5 0%, #f7f5f1 100%)",
        color: "#14201c",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(20, 32, 28, 0.08)",
          background: "rgba(255,255,255,0.72)",
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "18px 20px",
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link href="/" style={{ fontFamily: "Georgia, serif", fontWeight: 600, fontSize: 20, color: "#0A6F63", textDecoration: "none" }}>
            HavenApply
          </Link>
          <Link href="/confidentialite" style={{ fontSize: 14, color: "#3d5249", textDecoration: "none" }}>
            Politique complète
          </Link>
        </div>
      </header>

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 3.5vw, 2.1rem)", fontWeight: 600 }}>
          Avis de collecte
        </h1>
        <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, color: "#3d5249" }}>
          Ces avis sont présentés au moment où HavenApply vous demande des renseignements.
          Ils précisent la finalité de la collecte. La création d&apos;un compte ou d&apos;un
          dossier n&apos;autorise pas la transmission à une résidence.
        </p>

        <div style={{ marginTop: 28, display: "grid", gap: 20 }}>
          {notices.map((n) => (
            <section
              key={n.version}
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
                Version {n.version}
              </p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
