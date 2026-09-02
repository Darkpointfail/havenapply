/**
 * Contenu textuel de la page d'accueil publique `/`.
 * Aucune chaîne marketing ne doit être codée dans le JSX.
 */

/** Désactiver pour masquer la section « Pour les résidences » (#residences). */
export const showResidences = true;

export const homeMeta = {
  title: "HavenApply — Demande d'admission en résidence, en ligne",
  description:
    "Plus de formulaires papier à imprimer, à faxer ou à déposer sur place. Vous remplissez le dossier une seule fois sur HavenApply et vous l'envoyez en ligne à toutes les résidences que vous choisissez, d'un même clic.",
  ogImage: "/home/hero.jpg",
} as const;

export const homeNav = {
  how: "Comment ça marche",
  companion: "L'accompagnement",
  residences: "Pour les résidences",
  faq: "Questions",
  signIn: "Se connecter",
  start: "Commencer",
  menuOpen: "Ouvrir le menu",
  menuClose: "Fermer le menu",
} as const;

export const homeHero = {
  pill: "Tout votre parcours d'admission au même endroit",
  title: "Préparez, envoyez et suivez vos demandes d'admission en ligne",
  lead:
    "Créez votre dossier à votre rythme, ajoutez vos documents et transmettez-le aux résidences de votre choix. Suivez ensuite chaque demande et les prochaines étapes depuis un seul espace.",
  ctaPrimary: "Commencer mon dossier",
  ctaSecondary: "Découvrir le fonctionnement",
  note: "Avancez à votre rythme. Rien n'est envoyé sans votre accord.",
  photoAlt: "Une fille adulte et sa mère âgée, assises ensemble à la maison",
} as const;

/** Allégations commerciales — à valider avant mise en ligne. */
export const homeProof = {
  lead: "Utilisé par les familles et les résidences du Québec",
  items: [
    { value: "180+", label: "résidences partenaires" },
    { value: "1 envoi", label: "en ligne au lieu de dix formulaires papier" },
    { value: "11 jours", label: "de délai moyen jusqu'à une réponse" },
  ],
} as const;

export const homeSteps = {
  title: "Trois étapes, entièrement en ligne",
  lead:
    "Depuis votre salon, votre téléphone ou la chambre d'hôpital. Vous répondez à des questions simples, nous nous occupons de transmettre le dossier.",
  items: [
    {
      n: "1",
      title: "Vous racontez la situation",
      body: "Une conversation avec notre accompagnatrice remplace le formulaire. Elle pose les questions, vous répondez avec vos mots.",
    },
    {
      n: "2",
      title: "Vous envoyez en un clic",
      body: "Vous comparez prix, services et disponibilités réelles, puis vous cochez les résidences retenues. Le dossier part en ligne à toutes en même temps, avec les pièces jointes.",
    },
    {
      n: "3",
      title: "Vous suivez les réponses en ligne",
      body: "Accusé de réception, position sur la liste d'attente, pièces manquantes, décision. Chaque réponse arrive dans votre espace, sans un seul appel.",
    },
  ],
} as const;

export const homeCompanion = {
  pill: "Accompagnement par intelligence artificielle",
  title: "Vous n'êtes pas seul devant le formulaire",
  lead:
    "Claire vous guide par une simple discussion. Elle explique chaque question, remplit les champs à votre place et vous dit ce qui manque.",
  bullets: [
    "Elle traduit le vocabulaire médical et administratif",
    "Elle repère les oublis avant que la résidence les refuse",
    "Elle suggère des résidences adaptées au budget et aux soins requis",
  ],
  chat: {
    name: "Claire",
    role: "Accompagnatrice HavenApply",
    bubbles: [
      {
        from: "claire" as const,
        text: "Bonjour Sophie. Parlons de votre mère. Vit-elle encore à la maison en ce moment ?",
      },
      {
        from: "family" as const,
        text: "Elle est à l'hôpital depuis sa chute, ils veulent la transférer d'ici deux semaines.",
      },
      {
        from: "claire" as const,
        text: "Compris. J'ai noté « hôpital » et j'ai marqué le dossier comme urgent — les résidences le verront en priorité. Est-ce qu'elle a besoin d'aide pour se déplacer ?",
      },
    ],
    suggestions: ["Elle marche avec une canne", "Fauteuil roulant", "Je ne sais pas"],
  },
} as const;

export const homeSaves = {
  title: "Ce que l'envoi en ligne vous épargne",
  photoAlt: "Une personne consulte le suivi de ses demandes d'admission sur un ordinateur portable",
  items: [
    {
      bold: "Imprimer, faxer, déposer sur place.",
      rest: "Le dossier est rempli une fois et transmis en ligne à chaque résidence.",
    },
    {
      bold: "Appeler pour savoir où ça en est.",
      rest: "Chaque changement de statut vous est notifié.",
    },
    {
      bold: "Perdre des documents.",
      rest: "Évaluations, procurations, preuves de revenus : tout est conservé au même endroit.",
    },
    {
      bold: "Deviner les prix.",
      rest: "Les coûts affichés sont ceux transmis par les résidences elles-mêmes.",
    },
  ],
} as const;

/** Témoignage à remplacer par un vrai avant mise en ligne, ou à retirer. */
export const homeQuote = {
  body: "On nous a donné deux semaines pour trouver une place. J'ai rempli le dossier un soir depuis la chambre d'hôpital, je l'ai envoyé en ligne à six résidences le lendemain. Trois ont répondu dans la semaine.",
  initials: "SL",
  name: "Sophie Lévesque",
  meta: "Fille de Marguerite, 84 ans — Québec",
} as const;

export const homeResidences = {
  eyebrow: "Vous gérez une résidence",
  title: "Recevez des dossiers complets, pas des appels",
  body: "La console résidence rassemble les demandes, les documents et la liste d'attente. Chaque dossier arrive vérifié et classé par niveau d'urgence.",
  cta: "Voir la console résidence",
  ctaHref: "/community",
  tiles: [
    {
      title: "Dossiers unifiés",
      body: "Même structure pour toutes les demandes reçues.",
    },
    {
      title: "Liste d'attente",
      body: "Positions ajustables selon l'urgence clinique.",
    },
    {
      title: "Documents",
      body: "Pièces requises signalées automatiquement.",
    },
    {
      title: "Disponibilités",
      body: "Vos unités libres, visibles par les familles.",
    },
  ],
} as const;

export const homeFaq = {
  title: "Questions fréquentes",
  items: [
    {
      id: "faq-gratuit",
      q: "Est-ce que le service est payant pour les familles ?",
      a: "Non. La création du dossier, l'accompagnement et l'envoi des demandes sont gratuits. Ce sont les résidences qui financent la plateforme.",
    },
    {
      id: "faq-medical",
      q: "Qui voit les renseignements médicaux de mon proche ?",
      a: "Uniquement les résidences auxquelles vous choisissez d'envoyer le dossier, et seulement à partir du moment où vous appuyez sur « envoyer ». Vous pouvez retirer une demande en tout temps.",
    },
    {
      id: "faq-soins",
      q: "Faut-il connaître le niveau de soins requis ?",
      a: "Non. L'accompagnatrice pose des questions concrètes sur le quotidien : déplacements, repas, médicaments, mémoire. Elle en déduit le profil de soins à inscrire au dossier.",
    },
    {
      id: "faq-clsc",
      q: "Et si nous avons déjà une évaluation du CLSC ?",
      a: "Vous la déposez telle quelle. Les renseignements qu'elle contient sont repris dans le dossier et transmis aux résidences avec le reste.",
    },
    {
      id: "faq-multi",
      q: "Peut-on faire une demande pour plusieurs résidences en même temps ?",
      a: "Oui, c'est l'usage habituel. Vous sélectionnez autant de résidences que vous le souhaitez et suivez chaque réponse séparément.",
    },
  ],
} as const;

export const homeCta = {
  title: "Remplissez ce soir, envoyez en ligne demain matin",
  lead: "Créer un compte prend deux minutes. Vous pouvez tout arrêter et reprendre plus tard, et rien n'est transmis aux résidences sans votre accord.",
  button: "Déposer ma demande en ligne",
} as const;

export const homeFooter = {
  brand: "HavenApply",
  tagline: "Plateforme d'admissions en résidence",
  how: "Comment ça marche",
  residences: "Pour les résidences",
  faq: "Questions",
  privacy: "Confidentialité",
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
