import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_POLICY } from "@/content/legal/privacy-fr";

export const metadata: Metadata = {
  title: "Politique de confidentialité | HavenApply",
  description:
    "Comment HavenApply collecte, utilise et protège vos renseignements personnels au Québec.",
};

export default function ConfidentialitePage() {
  const policy = PRIVACY_POLICY;

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
          <Link
            href="/get-started"
            style={{ fontSize: 14, color: "#3d5249", textDecoration: "none" }}
          >
            Créer un compte
          </Link>
        </div>
      </header>

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>
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
          Renseignements personnels · Québec
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
          Entrée en vigueur : {policy.effectiveDate} · Version {policy.version}
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
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#0f2e26",
                }}
              >
                {section.title}
              </h2>
              {section.paragraphs.map((p) => (
                <p
                  key={p.slice(0, 40)}
                  style={{
                    margin: "0 0 10px",
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "#24332d",
                  }}
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
          Voir aussi l&apos;
          <Link href="/avis-de-collecte" style={{ color: "#0A6F63" }}>
            avis de collecte
          </Link>{" "}
          affiché lors de l&apos;inscription et de la création du dossier.
        </p>
      </article>
    </main>
  );
}
