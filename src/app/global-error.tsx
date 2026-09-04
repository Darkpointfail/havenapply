"use client";

/**
 * Root error boundary.
 *
 * It replaces the root layout when it renders, so it must be self-contained:
 * no provider, no context, no shared chrome. Without it Next falls back to an
 * internal page that prerenders against a null React context and fails the
 * build.
 *
 * Intentionally unstyled — this file must not introduce any design.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <main>
          <h1>Une erreur est survenue</h1>
          <p>Réessayez, ou revenez à l’accueil si le problème persiste.</p>
          {error.digest ? <p>Référence : {error.digest}</p> : null}
          <button type="button" onClick={() => reset()}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
