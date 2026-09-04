import Link from "next/link";

/**
 * Root not-found page.
 *
 * Next prerenders `/_not-found` at build time; without an explicit page it
 * falls back to an internal one that renders against a null React context and
 * fails the build.
 *
 * Intentionally unstyled — this file must not introduce any design.
 */
export default function NotFound() {
  return (
    <main>
      <h1>Page introuvable</h1>
      <p>Cette page n’existe pas ou a été déplacée.</p>
      <Link href="/">Retour à l’accueil</Link>
    </main>
  );
}
