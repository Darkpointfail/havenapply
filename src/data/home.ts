/**
 * Métadonnées et liens de la page d'accueil publique `/`.
 * Le contenu textuel (bilingue) vit dans src/lib/i18n/messages (clés `hp.*`).
 */

/** Désactiver pour masquer la section « Pour les résidences » (#residences). */
export const showResidences = true;

export const homeMeta = {
  title: "HavenApply — Demande d'admission en résidence, en ligne",
  description:
    "Plus de formulaires papier à imprimer, à faxer ou à déposer sur place. Vous remplissez le dossier une seule fois sur HavenApply et vous l'envoyez en ligne à toutes les résidences que vous choisissez, d'un même clic.",
  ogImage: "/home/hero.jpg",
} as const;

export const homeLinks = {
  getStarted: "/get-started",
  signIn: "/sign-in",
  privacy: "/confidentialite",
  comment: "#comment",
  assistante: "#assistante",
  residences: "#residences",
  questions: "#questions",
} as const;
