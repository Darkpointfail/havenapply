import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions d'utilisation | HavenApply",
  description: "Conditions d'utilisation du service HavenApply.",
};

export default function ConditionsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f3f7f5 0%, #f7f5f1 100%)",
        color: "#14201c",
      }}
    >
      <header style={{ borderBottom: "1px solid rgba(20,32,28,0.08)", background: "rgba(255,255,255,0.72)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "18px 20px", display: "flex", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontFamily: "Georgia, serif", fontWeight: 600, fontSize: 20, color: "#0A6F63", textDecoration: "none" }}>
            HavenApply
          </Link>
          <Link href="/confidentialite" style={{ fontSize: 14, color: "#3d5249", textDecoration: "none" }}>
            Confidentialité
          </Link>
        </div>
      </header>
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 3.5vw, 2.1rem)", fontWeight: 600 }}>
          Conditions d&apos;utilisation
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
          Brouillon produit. Ce texte cadre l&apos;usage du service et doit être validé
          juridiquement avant une version définitive.
        </p>
        <div style={{ marginTop: 28, display: "grid", gap: 16, fontSize: 15, lineHeight: 1.65, color: "#24332d" }}>
          <p>
            HavenApply fournit une plateforme numérique pour aider les familles québécoises
            à préparer un dossier de recherche et d&apos;admission en résidence privée pour aînés.
          </p>
          <p>
            Vous êtes responsable de l&apos;exactitude des renseignements que vous saisissez et
            de la légitimité de votre accès aux renseignements d&apos;une personne aînée que vous
            accompagnez.
          </p>
          <p>
            HavenApply ne remplace pas un avis médical, juridique ou financier. Les résidences
            demeurent responsables de leurs décisions d&apos;admission.
          </p>
          <p>
            Le traitement des renseignements personnels est décrit dans la{" "}
            <Link href="/confidentialite" style={{ color: "#0A6F63" }}>
              politique de confidentialité
            </Link>
            .
          </p>
          <p>
            Nous pouvons suspendre un compte en cas d&apos;usage abusif, frauduleux ou contraire
            à la sécurité des personnes concernées.
          </p>
        </div>
      </article>
    </main>
  );
}
