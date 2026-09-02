/**
 * Contenu textuel de l'espace presse public `/media`.
 * Aucune chaîne éditoriale ne doit être codée dans le JSX.
 * Structure bilingue : press.fr / press.en (mêmes clés).
 */

export type PressLocale = "fr" | "en";

/**
 * Bandeau interne « À compléter ».
 * Passer à `false` avant la mise en ligne publique.
 */
export const showTodo = true;

export const pressAssets = {
  logo: "/media/havenapply-logo.png",
  /** Capture pleine hauteur de `/` (générée au build / Playwright). */
  homepageCapture: "/media/homepage-capture.png",
  ogImage: "/home/hero.jpg",
  email: "hello@havenapply.com",
  mailto: "mailto:hello@havenapply.com",
  siteUrl: "https://havenapply.com",
  siteHost: "havenapply.com",
} as const;

export type PressCopy = {
  meta: {
    title: string;
    description: string;
    ogAlt: string;
  };
  header: {
    brand: string;
    label: string;
    email: string;
    langFr: string;
    langEn: string;
    langAria: string;
  };
  todo: {
    label: string;
    body: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    ctaRead: string;
    ctaNumbers: string;
    ctaKit: string;
    ctaInterview: string;
    captureAlt: string;
    captureCaption: string;
  };
  release: {
    sectionLabel: string;
    forImmediate: string;
    title: string;
    dek: string;
    dateline: string;
    paragraphs: [string, string, string, string, string];
    quote: {
      text: string;
      attribution: string;
    };
    about: {
      label: string;
      body: string;
      contact: string;
    };
    endMark: string;
  };
  numbers: {
    sectionLabel: string;
    items: Array<{
      value: string;
      description: string;
      source: string;
      accent?: boolean;
    }>;
    footnote: string;
  };
  kit: {
    sectionLabel: string;
    title: string;
    logoLightAlt: string;
    logoDarkPlaceholder: string;
    usage: string;
    download: string;
    colorsLabel: string;
    colors: Array<{ name: string; hex: string }>;
    typeLabel: string;
    serifName: string;
    serifCaption: string;
    sansName: string;
    sansCaption: string;
    brandLabel: string;
    brandRule: string;
  };
  contact: {
    sectionLabel: string;
    title: string;
    body: string;
    cta: string;
    defs: Array<{ label: string; value: string }>;
  };
  footer: {
    updated: string;
    siteLink: string;
  };
  anchors: {
    release: string;
    numbers: string;
    brand: string;
  };
};

const pressFr: PressCopy = {
  meta: {
    title: "Espace presse — HavenApply",
    description:
      "Communiqué, chiffres et kit de marque de HavenApply, plateforme québécoise d'admission en résidence privée pour aînés.",
    ogAlt: "Capture de la page d'accueil HavenApply",
  },
  header: {
    brand: "HavenApply",
    label: "Espace presse",
    email: "hello@havenapply.com",
    langFr: "Français",
    langEn: "English",
    langAria: "Choisir la langue",
  },
  todo: {
    label: "À compléter",
    body: "Avant diffusion : date de lancement, nom du réseau de résidences partenaire et nombre de résidences, nom de famille du cofondateur, source officielle des données du registre des RPA, version renversée (blanche) du logo.",
  },
  hero: {
    eyebrow: "Espace presse · Montréal",
    title: "La demande d'admission en résidence passe en ligne",
    lead: "HavenApply permet aux familles québécoises de constituer un dossier en quelques clics et de le transmettre, simultanément, aux résidences recommandées pour les besoins de leur proche.",
    ctaRead: "Lire le communiqué",
    ctaNumbers: "Le problème en chiffres",
    ctaKit: "Kit de marque",
    ctaInterview: "Demander une entrevue",
    captureAlt: "Capture de la page d'accueil de HavenApply",
    captureCaption:
      "La page d'accueil de HavenApply. Capture disponible en haute résolution sur demande.",
  },
  release: {
    sectionLabel: "Communiqué de presse",
    forImmediate: "Pour diffusion immédiate · [date de lancement à confirmer]",
    title:
      "Une demande d'admission remplie en quelques clics, envoyée en ligne à plusieurs résidences",
    dek: "HavenApply lance sa plateforme au Québec et s'associe à [nom du réseau de résidences partenaire], qui rend ses [nombre] résidences accessibles aux demandes déposées en ligne.",
    dateline: "MONTRÉAL, [date] —",
    paragraphs: [
      "Aujourd'hui, les familles qui cherchent une place en résidence privée pour aînés multiplient les appels, les visites et les dossiers papier — souvent les mêmes informations, recopiées à la main pour chaque établissement. HavenApply réunit ce parcours en un seul dossier numérique : profil de la personne, besoins de soins, préférences, documents, puis envoi simultané aux résidences retenues.",
      "Le Québec compte 1\u00a0328 résidences privées pour aînés actives et 137\u00a0507 résidents accueillis au 31\u00a0décembre\u00a02025 [source des données à préciser avant diffusion]. Derrière ces chiffres, un fardeau administratif réel : selon nos estimations, une famille peut y consacrer de 10 à 20 heures — appels, comparaison des offres, multiplication des dossiers — alors que l'attente pour une place adaptée peut s'étirer de plusieurs mois à plusieurs années.",
      "Concrètement, la famille constitue son dossier en ligne, reçoit des recommandations de résidences adaptées aux besoins de son proche, puis dépose sa demande auprès de plusieurs établissements en un seul envoi. Plus besoin de recommencer le formulaire à chaque fois.",
      "Du côté des résidences, une console d'admission centralise les demandes reçues, le suivi des statuts et les échanges avec les familles. Le secteur, longtemps resté au papier et au fax, dispose enfin d'un canal numérique pensé pour l'admission privée au Québec.",
      "HavenApply est gratuit pour les familles. Les données sont traitées avec confidentialité, et la plateforme est entièrement bilingue français-anglais.",
    ],
    quote: {
      text: "Les familles ne devraient pas avoir à devenir des spécialistes de l'admission pour trouver une place digne pour leur proche. Nous rendons ce parcours clair, numérique et respectueux du temps de chacun.",
      attribution: "Tom [nom de famille], cofondateur de HavenApply",
    },
    about: {
      label: "À propos de HavenApply",
      body: "HavenApply est une plateforme québécoise d'admission en résidence privée pour aînés. Elle permet aux familles de constituer un dossier unique, d'obtenir des recommandations adaptées et de transmettre leur demande à plusieurs résidences en un seul envoi — en français et en anglais.",
      contact: "Contact média : hello@havenapply.com",
    },
    endMark: "— 30 —",
  },
  numbers: {
    sectionLabel: "Le problème en chiffres",
    items: [
      {
        value: "1\u00a0328",
        description: "résidences privées pour aînés actives au Québec",
        source: "Au 31 décembre 2025.",
      },
      {
        value: "137\u00a0507",
        description: "résidents y étaient accueillis à la même date",
        source: "Au 31 décembre 2025.",
      },
      {
        value: "10–20\u00a0h",
        description:
          "mobilisées par une famille pour une recherche : appels, comparaison des offres, multiplication des dossiers",
        source: "Estimation HavenApply.",
        accent: true,
      },
    ],
    footnote:
      "Selon les établissements et les besoins, l'attente peut durer de plusieurs mois à plusieurs années. [source des données à préciser avant diffusion]",
  },
  kit: {
    sectionLabel: "Kit de marque",
    title: "Identité visuelle",
    logoLightAlt: "Logo HavenApply sur fond clair",
    logoDarkPlaceholder: "[version renversée (blanc) à fournir]",
    usage:
      "Zone de dégagement égale à la hauteur du symbole. Pas de déformation, pas de recoloration, pas de forme ajoutée. Version renversée obligatoire sur fond foncé.",
    download: "Télécharger le logo (PNG)",
    colorsLabel: "Couleurs",
    colors: [
      { name: "Vert HavenApply", hex: "#0E9384" },
      { name: "Encre", hex: "#101815" },
      { name: "Fond clair", hex: "#F1F7F5" },
      { name: "Terracotta", hex: "#A6572B" },
    ],
    typeLabel: "Typographie",
    serifName: "Source Serif 4",
    serifCaption: "Titres et texte long",
    sansName: "Public Sans",
    sansCaption: "Interface, étiquettes, chiffres",
    brandLabel: "Nom de la marque",
    brandRule:
      "S'écrit HavenApply, en un mot, H et A majuscules ; jamais « Haven Apply » ni « HAVENAPPLY ».",
  },
  contact: {
    sectionLabel: "Contact média",
    title: "Entrevues et demandes de presse",
    body: "Tom, cofondateur, est disponible en français et en anglais, à Montréal ou à distance. Nous pouvons organiser une démonstration de la plateforme ou, avec leur accord, une mise en relation avec une famille ou une résidence partenaire.",
    cta: "Écrire à hello@havenapply.com",
    defs: [
      { label: "Courriel", value: "hello@havenapply.com" },
      { label: "Siège", value: "Montréal, Québec" },
      { label: "Langues d'entrevue", value: "Français, anglais" },
      { label: "Délai de réponse", value: "Moins de 24 h en semaine" },
    ],
  },
  footer: {
    updated: "Espace presse — dernière mise à jour le [date]",
    siteLink: "havenapply.com",
  },
  anchors: {
    release: "communique",
    numbers: "chiffres",
    brand: "kit",
  },
};

const pressEn: PressCopy = {
  meta: {
    title: "Press room — HavenApply",
    description:
      "Press release, key figures and brand kit for HavenApply, Quebec's online admissions platform for private seniors' residences.",
    ogAlt: "Screenshot of the HavenApply homepage",
  },
  header: {
    brand: "HavenApply",
    label: "Press room",
    email: "hello@havenapply.com",
    langFr: "Français",
    langEn: "English",
    langAria: "Choose language",
  },
  todo: {
    label: "To complete",
    body: "Before release: launch date, partner residence network name and residence count, cofounder's last name, official source for RPA registry data, reversed (white) logo version.",
  },
  hero: {
    eyebrow: "Press room · Montreal",
    title: "Seniors' residence applications move online",
    lead: "HavenApply lets Quebec families build an admissions file in a few clicks and send it, at once, to the residences recommended for their loved one's needs.",
    ctaRead: "Read the release",
    ctaNumbers: "The problem in numbers",
    ctaKit: "Brand kit",
    ctaInterview: "Request an interview",
    captureAlt: "Screenshot of the HavenApply homepage",
    captureCaption:
      "The HavenApply homepage. High-resolution capture available on request.",
  },
  release: {
    sectionLabel: "Press release",
    forImmediate: "For immediate release · [launch date to confirm]",
    title:
      "An admissions application completed in a few clicks, sent online to multiple residences",
    dek: "HavenApply is launching its platform in Quebec and partnering with [partner residence network name], which is making its [number] residences available for applications submitted online.",
    dateline: "MONTREAL, [date] —",
    paragraphs: [
      "Today, families looking for a place in a private seniors' residence juggle calls, visits and paper files — often the same information, rewritten by hand for every facility. HavenApply brings that journey into a single digital file: the person's profile, care needs, preferences, documents, then a simultaneous send to the residences they choose.",
      "Quebec has 1,328 active private seniors' residences and 137,507 residents as of December 31, 2025 [data source to confirm before release]. Behind those figures sits a real administrative burden: by our estimate, a family can spend 10 to 20 hours on the search — calls, comparing offers, multiplying applications — while the wait for a suitable place can stretch from several months to several years.",
      "In practice, the family builds their file online, receives residence recommendations matched to their loved one's needs, then submits their application to several facilities in a single send. No more starting the form over each time.",
      "On the residence side, an admissions console centralizes incoming applications, status tracking and conversations with families. A sector long stuck on paper and fax finally gets a digital channel designed for private admissions in Quebec.",
      "HavenApply is free for families. Data is handled confidentially, and the platform is fully bilingual in French and English.",
    ],
    quote: {
      text: "Families should not have to become admissions specialists to find a dignified place for someone they love. We make that path clear, digital and respectful of everyone's time.",
      attribution: "Tom [last name], cofounder of HavenApply",
    },
    about: {
      label: "About HavenApply",
      body: "HavenApply is a Quebec platform for private seniors' residence admissions. It lets families build one file, get matched recommendations and send their application to multiple residences in a single submission — in French and English.",
      contact: "Media contact: hello@havenapply.com",
    },
    endMark: "— 30 —",
  },
  numbers: {
    sectionLabel: "The problem in numbers",
    items: [
      {
        value: "1,328",
        description: "active private seniors' residences in Quebec",
        source: "As of December 31, 2025.",
      },
      {
        value: "137,507",
        description: "residents living there on the same date",
        source: "As of December 31, 2025.",
      },
      {
        value: "10–20 h",
        description:
          "spent by a family on a search: calls, comparing offers, multiplying applications",
        source: "HavenApply estimate.",
        accent: true,
      },
    ],
    footnote:
      "Depending on the facility and the needs, the wait can last from several months to several years. [data source to confirm before release]",
  },
  kit: {
    sectionLabel: "Brand kit",
    title: "Visual identity",
    logoLightAlt: "HavenApply logo on light background",
    logoDarkPlaceholder: "[reversed (white) version to provide]",
    usage:
      "Clear space equal to the height of the symbol. No distortion, no recoloring, no added shapes. Reversed version required on dark backgrounds.",
    download: "Download logo (PNG)",
    colorsLabel: "Colors",
    colors: [
      { name: "HavenApply green", hex: "#0E9384" },
      { name: "Ink", hex: "#101815" },
      { name: "Light ground", hex: "#F1F7F5" },
      { name: "Terracotta", hex: "#A6572B" },
    ],
    typeLabel: "Typography",
    serifName: "Source Serif 4",
    serifCaption: "Headlines and long-form text",
    sansName: "Public Sans",
    sansCaption: "Interface, labels, figures",
    brandLabel: "Brand name",
    brandRule:
      "Written as HavenApply, one word, capital H and A; never “Haven Apply” or “HAVENAPPLY”.",
  },
  contact: {
    sectionLabel: "Media contact",
    title: "Interviews and press requests",
    body: "Tom, cofounder, is available in French and English, in Montreal or remotely. We can arrange a product demonstration or, with their consent, an introduction to a family or partner residence.",
    cta: "Email hello@havenapply.com",
    defs: [
      { label: "Email", value: "hello@havenapply.com" },
      { label: "Headquarters", value: "Montreal, Quebec" },
      { label: "Interview languages", value: "French, English" },
      { label: "Response time", value: "Under 24 h on weekdays" },
    ],
  },
  footer: {
    updated: "Press room — last updated [date]",
    siteLink: "havenapply.com",
  },
  anchors: {
    release: "release",
    numbers: "numbers",
    brand: "brand",
  },
};

export const press = {
  fr: pressFr,
  en: pressEn,
} as const;
