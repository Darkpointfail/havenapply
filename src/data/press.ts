/**
 * Contenu éditorial de l'espace presse public `/media`.
 * Aucune chaîne publiée ne doit être codée dans le JSX.
 * Structure bilingue : press.fr / press.en (mêmes clés).
 *
 * Libellé RQRA : « fournisseur » — conforme au programme
 * des fournisseurs et partenaires du RQRA.
 */

export type PressLocale = "fr" | "en";

/** Base absolue pour canonical / Open Graph. */
export const PRESS_SITE_ORIGIN = "https://havenapply.com";

/**
 * Réponses ou faits encore à valider en interne.
 * Ne jamais afficher ce contenu tel quel sur la page publique.
 */
export const pressEditorialPending = {
  launchDate: "DATE DE LANCEMENT À CONFIRMER",
  residenceWithoutAccountDelivery:
    "Préciser le canal exact (courriel, dossier à récupérer, etc.) lorsqu'une RPA n'a pas encore de console HavenApply.",
  recommendationCriteriaDetail:
    "Valider la formulation publique exacte des pondérations (emplacement, budget, autonomie, services, disponibilité déclarée).",
  paidRankingPolicy:
    "Confirmer juridiquement qu'aucun placement payant n'existe ni n'est prévu ; formulation actuelle basée sur le code de matching familial.",
  mediaPhone: "NUMÉRO MÉDIAS À FOURNIR",
  founderPortrait: "Portrait de Tom Grosse à fournir",
  pressPdf: "Communiqué PDF / Word à fournir",
  familyJourneyCapture: "Capture du parcours familial à fournir",
  aiAssistantCapture: "Capture de l'assistant IA à fournir",
  residenceConsoleCapture: "Capture de la console résidences à fournir",
  whiteLogo: "Version blanche du logo à fournir",
  logoSvg: "Logo SVG à fournir",
  responseSlaHours: null as number | null,
} as const;

/** Dates de publication de l'espace presse (ISO). Mettre à jour à chaque révision éditoriale. */
export const pressPublication = {
  publishedISO: "2026-09-03",
  updatedISO: "2026-09-03",
} as const;

export const pressAssets = {
  logoPng: "/media/havenapply-logo.png",
  /** Capture d'accueil (existe). Autres captures absentes → non listées en production. */
  homepageCapture: "/media/homepage-capture.png",
  ogImage: "/home/hero.jpg",
  email: "hello@havenapply.com",
  mailto: "mailto:hello@havenapply.com",
  mailtoInterview:
    "mailto:hello@havenapply.com?subject=Demande%20d%27entrevue%20%E2%80%94%20HavenApply",
  mailtoDemo:
    "mailto:hello@havenapply.com?subject=Demande%20de%20d%C3%A9monstration%20%E2%80%94%20HavenApply",
  siteUrl: `${PRESS_SITE_ORIGIN}/`,
  mediaUrl: `${PRESS_SITE_ORIGIN}/media`,
  mediaUrlEn: `${PRESS_SITE_ORIGIN}/media?lang=en`,
  siteHost: "havenapply.com",
  privacyFr: "/confidentialite",
  privacyEn: "/privacy",
  rqraHome: "https://www.rqra.qc.ca/",
  rqraProgram: "https://www.rqra.qc.ca/collaborateurs/demande-d-adhesion",
  rpaRegistry: "https://k10.pub.msss.rtss.qc.ca/",
  tvaArticle:
    "https://www.tvanouvelles.ca/2026/08/31/fiasco-informatique--sante-quebec-a-englouti-500-m-pour-maintenir-des-systemes-desuets",
} as const;

/** Ressources téléchargeables réellement présentes dans le dépôt. */
export const pressDownloads = [
  {
    id: "logo-png",
    href: pressAssets.logoPng,
    filename: "havenapply-logo.png",
    available: true,
  },
  {
    id: "homepage-capture",
    href: pressAssets.homepageCapture,
    filename: "havenapply-homepage.png",
    available: true,
  },
] as const;

export type PressBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string; attribution: string }
  | { type: "link"; label: string; href: string }
  | {
      type: "meta";
      rows: Array<{ label: string; value: string; href?: string }>;
    };

export type PressFaqItem = {
  q: string;
  /** Réponse publiable uniquement. */
  a: string;
};

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
    navAria: string;
    nav: {
      front: string;
      article: string;
      release: string;
      facts: string;
      resources: string;
      contact: string;
    };
  };
  hero: {
    category: string;
    title: string;
    lead: string;
    byline: string;
    publishedPrefix: string;
    updatedPrefix: string;
    readingPrefix: string;
    readingUnit: string;
    ctaRelease: string;
    ctaInterview: string;
    captureAlt: string;
    captureCaption: string;
    captureCredit: string;
  };
  disclosure: string;
  summary: {
    sectionLabel: string;
    title: string;
    paragraphs: string[];
  };
  kinds: {
    article: string;
    release: string;
    rqra: string;
    registry: string;
    statement: string;
  };
  share: {
    label: string;
    copyLink: string;
    copyTitle: string;
    print: string;
    openRelease: string;
    email: string;
    copiedLink: string;
    copiedTitle: string;
  };
  sidebar: {
    briefTitle: string;
    contactTitle: string;
    releaseCta: string;
  };
  alsoRead: {
    title: string;
    items: Array<{ label: string; href: string }>;
  };
  release: {
    sectionLabel: string;
    title: string;
    dek: string;
    dateline: string;
    lead: string;
    blocks: PressBlock[];
    endMark: string;
  };
  feature: {
    sectionLabel: string;
    title: string;
    dek: string;
    blocks: PressBlock[];
  };
  facts: {
    sectionLabel: string;
    title: string;
    items: Array<{
      title: string;
      body: string;
      kind?: "rqra" | "registry" | "statement";
      sourceLabel?: string;
      sourceHref?: string;
    }>;
  };
  faq: {
    sectionLabel: string;
    title: string;
    items: PressFaqItem[];
  };
  sources: {
    sectionLabel: string;
    title: string;
    items: Array<{ label: string; href: string; note: string }>;
  };
  kit: {
    sectionLabel: string;
    title: string;
    brandLineLabel: string;
    brandLine: string;
    logoLightAlt: string;
    usage: string;
    downloadsLabel: string;
    downloads: Array<{
      id: string;
      label: string;
      href: string;
      filename: string;
      alt: string;
      caption: string;
      credit: string;
    }>;
  };
  contact: {
    sectionLabel: string;
    title: string;
    name: string;
    role: string;
    city: string;
    languages: string;
    email: string;
    body: string;
    ctaInterview: string;
    ctaDemo: string;
    siteLabel: string;
    defs: Array<{ label: string; value: string }>;
  };
  footer: {
    updated: string;
    siteLink: string;
  };
  anchors: {
    front: string;
    summary: string;
    release: string;
    feature: string;
    facts: string;
    faq: string;
    resources: string;
    contact: string;
  };
};

const founderAttributionFr = "Tom Grosse, cofondateur de HavenApply";
const founderAttributionEn = "Tom Grosse, cofounder of HavenApply";

const pressFr: PressCopy = {
  meta: {
    title: "Espace presse — HavenApply met les demandes d'admission en RPA en ligne",
    description:
      "HavenApply permet aux familles de préparer un dossier unique et de déposer des demandes d'admission en ligne auprès de plusieurs résidences pour aînés au Québec.",
    ogAlt: "Page d'accueil de HavenApply",
  },
  header: {
    brand: "HavenApply",
    label: "Espace presse",
    email: "hello@havenapply.com",
    langFr: "Français",
    langEn: "English",
    langAria: "Choisir la langue",
    navAria: "Rubriques de l'espace presse",
    nav: {
      front: "À la une",
      article: "Article",
      release: "Communiqué",
      facts: "Faits",
      resources: "Ressources",
      contact: "Contact",
    },
  },
  hero: {
    category: "Innovation · Habitation pour aînés",
    title: "HavenApply met les demandes d'admission en résidence pour aînés en ligne",
    lead: "La plateforme québécoise permet aux familles de remplir un seul dossier et de déposer des demandes auprès de plusieurs RPA. Gratuite pour les familles, elle utilise l'intelligence artificielle pour les accompagner pendant leurs démarches.",
    byline: "Par l'équipe HavenApply",
    publishedPrefix: "Publié le",
    updatedPrefix: "Mis à jour le",
    readingPrefix: "Lecture",
    readingUnit: "min",
    ctaRelease: "Lire le communiqué",
    ctaInterview: "Demander une entrevue",
    captureAlt: "Capture de la page d'accueil de HavenApply",
    captureCaption: "Interface de HavenApply : un dossier unique pour déposer des demandes d'admission auprès de plusieurs résidences privées pour aînés.",
    captureCredit: "HavenApply",
  },
  disclosure:
    "Ce contenu présente l'annonce et le fonctionnement de HavenApply à l'intention des médias.",
  summary: {
    sectionLabel: "L'essentiel",
    title: "Ce que change HavenApply",
    paragraphs: [
      "Une famille prépare un seul dossier, puis peut déposer des demandes d'admission en ligne auprès de plusieurs résidences privées pour aînés.",
      "Toutes les RPA actives du registre public québécois sont accessibles dès le lancement. Le service est gratuit pour les familles.",
      "HavenApply a conclu une entente à titre de fournisseur du RQRA. L'intelligence artificielle accompagne les démarches sans poser de diagnostic ni décider à la place des familles ou des résidences.",
    ],
  },
  kinds: {
    article: "Article de présentation publié par HavenApply",
    release: "Communiqué de presse",
    rqra: "Données provenant du RQRA",
    registry: "Données provenant du registre public",
    statement: "Déclaration de HavenApply",
  },
  share: {
    label: "Actions",
    copyLink: "Copier le lien",
    copyTitle: "Copier le titre",
    print: "Imprimer",
    openRelease: "Voir le communiqué",
    email: "Écrire au contact média",
    copiedLink: "Lien copié",
    copiedTitle: "Titre copié",
  },
  sidebar: {
    briefTitle: "En bref",
    contactTitle: "Contact média",
    releaseCta: "Lire le communiqué",
  },
  alsoRead: {
    title: "À lire aussi",
    items: [
      { label: "Communiqué de presse officiel", href: "#communique" },
      { label: "Faits essentiels et sources", href: "#faits" },
      { label: "Questions fréquentes pour les journalistes", href: "#faq" },
    ],
  },
  release: {
    sectionLabel: "Communiqué de presse · Pour diffusion immédiate",
    title:
      "HavenApply conclut une entente avec le RQRA et met les demandes d'admission en RPA en ligne",
    dek: "Gratuite pour les familles, la plateforme québécoise permet de constituer un seul dossier et de déposer des demandes auprès de plusieurs résidences.",
    dateline: "MONTRÉAL —",
    lead: "HavenApply annonce le lancement de sa plateforme québécoise de recherche et de demande d'admission en résidence privée pour aînés, ainsi que la conclusion d'une entente à titre de fournisseur du Regroupement québécois des résidences pour aînés (RQRA).",
    blocks: [
      {
        type: "p",
        text: "HavenApply est une entreprise technologique indépendante, basée à Montréal. Elle n'appartient pas au RQRA. L'entente lui permet d'intervenir dans le cadre du programme de fournisseurs du regroupement, qui indique représenter près de 800 membres, gestionnaires et propriétaires de RPA, comptant environ 108\u00a0000 unités locatives au Québec.",
      },
      {
        type: "link",
        label: "RQRA — portrait du regroupement",
        href: pressAssets.rqraHome,
      },
      {
        type: "link",
        label: "Programme des fournisseurs et partenaires du RQRA",
        href: pressAssets.rqraProgram,
      },
      {
        type: "h3",
        text: "Le problème des demandes répétées",
      },
      {
        type: "p",
        text: "Chercher une résidence adaptée demande souvent de comprendre les niveaux d'assistance, de comparer les services et les coûts, puis de reprendre les mêmes renseignements auprès de plusieurs établissements. Cette démarche survient fréquemment après une hospitalisation, une perte d'autonomie ou l'épuisement d'un proche aidant.",
      },
      {
        type: "p",
        text: "Le Québec dispose d'un registre public des RPA autorisées par Santé Québec. HavenApply s'appuie sur ces données publiques et y ajoute un parcours pour préparer le dossier, clarifier les besoins et entreprendre des démarches.",
      },
      {
        type: "link",
        label: "Registre officiel des RPA",
        href: pressAssets.rpaRegistry,
      },
      {
        type: "h3",
        text: "Un dossier unique, des demandes en ligne auprès de plusieurs RPA",
      },
      {
        type: "p",
        text: "Avec HavenApply, une famille prépare une seule fois le profil de la personne, ses préférences, ses besoins d'assistance, les documents utiles et les renseignements nécessaires aux démarches. Ce dossier peut ensuite servir à déposer des demandes d'admission en ligne auprès de plusieurs résidences.",
      },
      {
        type: "p",
        text: "Dès le lancement, toutes les RPA actives figurant au registre public québécois sont accessibles dans HavenApply. Une résidence qui apparaît dans le parcours n'utilise pas nécessairement déjà la console professionnelle HavenApply. Chaque établissement demeure libre de choisir les outils qu'il emploie.",
      },
      {
        type: "p",
        text: "Le service est gratuit pour les familles, en français et en anglais. HavenApply facilite l'accès à l'information et aux demandes; la plateforme ne crée pas de nouvelles places ni de nouvelles unités.",
      },
      {
        type: "h3",
        text: "Un accompagnement par l'intelligence artificielle, avec des limites claires",
      },
      {
        type: "p",
        text: "HavenApply intègre un assistant qui utilise l'intelligence artificielle pour expliquer les étapes, aider à organiser les renseignements et repérer des éléments manquants. L'IA ne pose aucun diagnostic médical, ne détermine pas l'admissibilité, ne choisit pas une résidence à la place de la famille et ne prend aucune décision d'admission. Cette décision appartient toujours à la résidence.",
      },
      {
        type: "quote",
        text: "On présente souvent l'intelligence artificielle comme une technologie complexe ou impersonnelle. Nous voulons démontrer qu'elle peut faire exactement l'inverse : expliquer, rassurer et accompagner les familles dans une transition profondément humaine.",
        attribution: founderAttributionFr,
      },
      {
        type: "quote",
        text: "La technologie ne doit jamais remplacer la famille, le conseiller ou le personnel de la résidence. Elle doit retirer les obstacles administratifs pour permettre à chacun de consacrer plus de temps à la personne.",
        attribution: founderAttributionFr,
      },
      {
        type: "h3",
        text: "Une console pour les résidences",
      },
      {
        type: "p",
        text: "Les résidences qui utilisent HavenApply disposent d'une console pour recevoir des dossiers structurés, en vérifier le contenu, suivre les demandes et communiquer avec les familles. L'objectif n'est pas d'automatiser la décision d'admission, mais de réduire les renseignements incomplets et les échanges répétitifs au premier contact.",
      },
      {
        type: "h3",
        text: "Mise en contexte : moderniser sans confondre les outils",
      },
      {
        type: "p",
        text: "Le lancement de HavenApply survient alors que le coût des systèmes informatiques vieillissants retient l'attention au Québec. Selon une enquête de TVA Nouvelles publiée le 31 août 2026, près de 500 millions de dollars auraient été consacrés depuis 2023 au maintien d'anciens systèmes de gestion des ressources humaines du réseau de la santé.",
      },
      {
        type: "p",
        text: "Ces systèmes n'ont pas la même fonction que HavenApply, plateforme indépendante destinée aux familles et aux RPA. HavenApply ne les remplace pas et n'est ni financée, ni utilisée, ni recommandée par Santé Québec du seul fait de cette actualité. L'exemple illustre toutefois le coût humain et financier de parcours numériques fragmentés ou vieillissants, tandis que des outils ciblés peuvent s'attaquer à un moment précis du parcours.",
      },
      {
        type: "link",
        label: "Enquête TVA Nouvelles sur les systèmes informatiques du réseau",
        href: pressAssets.tvaArticle,
      },
      { type: "h3", text: "À propos de HavenApply" },
      {
        type: "p",
        text: "HavenApply est une entreprise technologique québécoise qui simplifie la recherche et les démarches d'admission en résidence privée pour aînés. Sa plateforme bilingue permet aux familles de préparer un dossier unique, de trouver des résidences correspondant aux besoins de leur proche et de déposer des demandes en ligne. L'intelligence artificielle y sert d'accompagnement; elle ne remplace pas le jugement humain.",
      },
      {
        type: "p",
        text: "Le service est gratuit pour les familles.",
      },
      {
        type: "meta",
        rows: [
          { label: "Site Web", value: "havenapply.com", href: pressAssets.siteUrl },
          {
            label: "Espace presse",
            value: "havenapply.com/media",
            href: pressAssets.mediaUrl,
          },
          {
            label: "Contact média",
            value: "hello@havenapply.com",
            href: pressAssets.mailto,
          },
          { label: "Siège", value: "Montréal, Québec" },
          { label: "Entrevues", value: "français et anglais" },
        ],
      },
    ],
    endMark: "— 30 —",
  },
  feature: {
    sectionLabel: "Article de fond",
    title:
      "Quand l'intelligence artificielle aide une famille à trouver une résidence pour un parent",
    dek: "Appels, formulaires répétés, urgence familiale : comment un dossier unique et un accompagnement borné par l'IA simplifient les demandes d'admission en RPA.",
    blocks: [
      {
        type: "p",
        text: "Lorsqu'un parent perd son autonomie, la famille n'a pas toujours plusieurs mois pour comprendre le fonctionnement des résidences privées pour aînés. Il faut évaluer le niveau d'assistance, comparer les services, comprendre les coûts, vérifier les disponibilités et reprendre souvent les mêmes renseignements d'un établissement à l'autre.",
      },
      {
        type: "p",
        text: "Pour une famille déjà préoccupée par la santé d'un proche, cette recherche peut vite devenir une charge supplémentaire. C'est le moment précis auquel s'attaque HavenApply.",
      },
      {
        type: "h3",
        text: "Une recherche qui devient un travail à temps partiel",
      },
      {
        type: "p",
        text: "Les appels, les formulaires et les documents s'accumulent. Chaque résidence demande ses propres précisions. Les proches aidants passent d'un interlocuteur à l'autre en répétant le profil, les besoins et les préférences de la personne.",
      },
      {
        type: "p",
        text: "HavenApply ne crée pas de nouvelles places. Elle vise à réduire le travail administratif autour de la recherche et des demandes, pour que le temps restant serve davantage aux échanges humains avec les résidences.",
      },
      {
        type: "h3",
        text: "Préparer le dossier une seule fois",
      },
      {
        type: "p",
        text: "La plateforme permet de rassembler au même endroit le profil de la personne, ses préférences, ses besoins d'assistance, les documents utiles et l'état des démarches. Ce dossier unique peut ensuite servir à déposer des demandes d'admission en ligne auprès de plusieurs RPA.",
      },
      {
        type: "p",
        text: "Toutes les RPA actives du registre public québécois sont accessibles dans HavenApply dès le lancement. Les établissements qui utilisent la console professionnelle peuvent y recevoir et suivre les dossiers. Les autres demeurent visibles dans le parcours; leur adoption de la console dépend de leur inscription individuelle.",
      },
      {
        type: "h3",
        text: "Une IA qui explique plutôt qu'une IA qui décide",
      },
      {
        type: "p",
        text: "L'intelligence artificielle occupe une place utile dans HavenApply, mais volontairement limitée. Elle explique les étapes, aide à organiser les renseignements et peut signaler qu'un élément important semble manquer.",
      },
      {
        type: "p",
        text: "Elle ne recommande pas de traitement médical, n'évalue pas l'admissibilité clinique et ne décide jamais si une personne doit être acceptée dans une résidence. Dans un domaine aussi sensible, l'outil doit soutenir le jugement humain, non s'y substituer.",
      },
      {
        type: "h3",
        text: "Réconcilier la technologie et les générations",
      },
      {
        type: "p",
        text: "HavenApply privilégie un langage simple, des étapes progressives et une navigation claire. Une personne aînée peut utiliser la plateforme elle-même. Un enfant ou un proche aidant peut aussi l'accompagner dans la préparation du dossier.",
      },
      {
        type: "p",
        text: "L'objectif n'est pas de retirer les interactions humaines. Il est de réduire le temps perdu avant ces interactions, pour que les familles arrivent mieux préparées lorsqu'elles parlent avec une résidence.",
      },
      {
        type: "h3",
        text: "Une reconnaissance du secteur des RPA",
      },
      {
        type: "p",
        text: "HavenApply a conclu une entente à titre de fournisseur du RQRA, regroupement qui indique représenter près de 800 membres et environ 108\u00a0000 unités locatives au Québec. Cette reconnaissance ouvre un dialogue avec les gestionnaires de RPA. Elle ne signifie pas que toutes les résidences membres ont adopté, approuvé ou recommandé la plateforme.",
      },
      {
        type: "h3",
        text: "Moderniser un parcours précis, sans construire un autre système lourd",
      },
      {
        type: "p",
        text: "Les débats récents sur les coûts liés à d'anciens systèmes de ressources humaines du réseau public concernent un domaine différent. HavenApply n'est pas un substitut à ces infrastructures. L'exemple rappelle toutefois qu'il existe deux réalités de modernisation : remplacer des systèmes institutionnels complexes, et intervenir sur un problème précis avec un outil plus léger.",
      },
      {
        type: "p",
        text: "HavenApply appartient à cette seconde catégorie. Elle vise le moment où une famille commence à chercher une résidence et ne sait pas par où commencer — pour lui rendre du temps, de la clarté et un dossier prêt à être transmis.",
      },
    ],
  },
  facts: {
    sectionLabel: "Faits essentiels",
    title: "Ce qu'il faut retenir",
    items: [
      {
        title: "Un dossier unique",
        body: "Une famille prépare ses renseignements une seule fois.",
        kind: "statement",
      },
      {
        title: "Plusieurs demandes en ligne",
        body: "Le même dossier peut servir à entreprendre des démarches auprès de plusieurs RPA.",
        kind: "statement",
      },
      {
        title: "Toutes les RPA actives",
        body: "Les établissements figurant au registre public québécois sont accessibles dès le lancement.",
        kind: "registry",
        sourceLabel: "Registre officiel des RPA",
        sourceHref: pressAssets.rpaRegistry,
      },
      {
        title: "Gratuit pour les familles",
        body: "Aucun abonnement familial n'est nécessaire pour utiliser le parcours.",
        kind: "statement",
      },
      {
        title: "Près de 800 membres",
        body: "Le RQRA indique représenter près de 800 membres, gestionnaires et propriétaires de RPA.",
        kind: "rqra",
        sourceLabel: "RQRA",
        sourceHref: pressAssets.rqraHome,
      },
      {
        title: "Environ 108 000 unités",
        body: "Les membres du RQRA comptent environ 108 000 unités locatives au Québec.",
        kind: "rqra",
        sourceLabel: "RQRA",
        sourceHref: pressAssets.rqraHome,
      },
    ],
  },
  faq: {
    sectionLabel: "FAQ presse",
    title: "Questions fréquentes pour les journalistes",
    items: [
      {
        q: "HavenApply appartient-elle au RQRA?",
        a: "Non. HavenApply est une entreprise indépendante ayant conclu une entente à titre de fournisseur du RQRA.",
      },
      {
        q: "Que signifie le statut de fournisseur du RQRA?",
        a: "HavenApply est reconnue dans le cadre du programme de fournisseurs du RQRA. Ce statut ouvre une relation de collaboration et de visibilité auprès des membres. Il ne signifie pas que le RQRA a certifié, approuvé, cautionné ou recommandé HavenApply à l'ensemble de ses résidences.",
      },
      {
        q: "Toutes les résidences utilisent-elles déjà HavenApply?",
        a: "Toutes les RPA actives figurant au registre public sont accessibles dans le parcours de recherche dès le lancement. L'utilisation de la console professionnelle HavenApply dépend de l'inscription individuelle de chaque résidence.",
      },
      {
        q: "Les familles peuvent-elles réellement déposer leurs demandes en ligne?",
        a: "Oui. Les familles préparent un dossier unique et peuvent déposer des demandes d'admission en ligne auprès de plusieurs résidences à partir de HavenApply.",
      },
      {
        q: "Comment une résidence reçoit-elle une demande si elle n'a pas encore de compte?",
        a: "Les résidences qui utilisent la console HavenApply y reçoivent et suivent les dossiers structurés. Pour le détail du traitement lorsqu'une résidence n'a pas encore de compte, écrivez à hello@havenapply.com.",
      },
      {
        q: "Comment les résidences sont-elles recommandées?",
        a: "Les suggestions s'appuient sur les renseignements du dossier, notamment le secteur, le budget et les besoins exprimés. Pour une description détaillée des critères, contactez hello@havenapply.com.",
      },
      {
        q: "Une résidence peut-elle payer pour améliorer son classement?",
        a: "Dans le parcours familial actuel, aucun mécanisme de placement payant n'améliore le rang d'une résidence. Pour toute précision commerciale, contactez hello@havenapply.com.",
      },
      {
        q: "Comment HavenApply utilise-t-elle l'intelligence artificielle?",
        a: "L'IA explique les étapes, aide à organiser les renseignements et repère des éléments manquants. Elle ne pose aucun diagnostic, ne détermine pas l'admissibilité et ne prend aucune décision d'admission.",
      },
      {
        q: "Le service est-il réellement gratuit pour les familles?",
        a: "Oui. HavenApply est gratuit pour les familles. Aucun abonnement familial n'est requis pour préparer le dossier et utiliser le parcours de recherche et de demande.",
      },
      {
        q: "Comment les renseignements personnels sont-ils protégés?",
        a: "HavenApply décrit ses pratiques dans sa politique de confidentialité (authentification, contrôle d'accès, chiffrement en transit HTTPS). Les familles peuvent exercer leurs droits via privacy@havenapply.com. Détails : havenapply.com/confidentialite",
      },
    ],
  },
  sources: {
    sectionLabel: "Sources et documents",
    title: "Documents utiles aux journalistes",
    items: [
      {
        label: "RQRA",
        href: pressAssets.rqraHome,
        note: "Portrait du regroupement et données membres.",
      },
      {
        label: "Programme des fournisseurs et partenaires du RQRA",
        href: pressAssets.rqraProgram,
        note: "Cadre du statut de fournisseur.",
      },
      {
        label: "Registre officiel des RPA",
        href: pressAssets.rpaRegistry,
        note: "Liste publique des résidences autorisées.",
      },
      {
        label: "Enquête TVA Nouvelles (31 août 2026)",
        href: pressAssets.tvaArticle,
        note: "Contexte sur les coûts de systèmes informatiques vieillissants du réseau — domaine distinct de HavenApply.",
      },
      {
        label: "Politique de confidentialité HavenApply",
        href: pressAssets.privacyFr,
        note: "Pratiques décrites par HavenApply.",
      },
    ],
  },
  kit: {
    sectionLabel: "Kit média",
    title: "Identité et fichiers disponibles",
    brandLineLabel: "Formule de marque",
    brandLine: "L'intelligence artificielle au service des familles, jamais à leur place.",
    logoLightAlt: "Logo HavenApply sur fond clair",
    usage:
      "Zone de dégagement égale à la hauteur du symbole. Pas de déformation, pas de recoloration, pas de forme ajoutée.",
    downloadsLabel: "Téléchargements",
    downloads: [
      {
        id: "logo-png",
        label: "Logo HavenApply (PNG)",
        href: pressAssets.logoPng,
        filename: "havenapply-logo.png",
        alt: "Logo HavenApply",
        caption: "Logo couleur sur fond transparent.",
        credit: "HavenApply",
      },
      {
        id: "homepage-capture",
        label: "Capture de la page d'accueil",
        href: pressAssets.homepageCapture,
        filename: "havenapply-homepage.png",
        alt: "Capture de la page d'accueil HavenApply",
        caption: "Page d'accueil havenapply.com.",
        credit: "HavenApply",
      },
    ],
  },
  contact: {
    sectionLabel: "Contact média",
    title: "Entrevues et demandes de presse",
    name: "Tom Grosse",
    role: "Cofondateur, HavenApply",
    city: "Montréal, Québec",
    languages: "Français et anglais",
    email: "hello@havenapply.com",
    body: "Disponible pour entrevues et démonstrations, à Montréal ou à distance. Mise en relation avec une famille ou une résidence uniquement avec leur accord préalable.",
    ctaInterview: "Demander une entrevue",
    ctaDemo: "Demander une démonstration",
    siteLabel: "Visiter havenapply.com",
    defs: [
      { label: "Courriel", value: "hello@havenapply.com" },
      { label: "Siège", value: "Montréal, Québec" },
      { label: "Langues", value: "Français, anglais" },
    ],
  },
  footer: {
    updated: "Espace presse HavenApply",
    siteLink: "havenapply.com",
  },
  anchors: {
    front: "une",
    summary: "essentiel",
    release: "communique",
    feature: "article",
    facts: "faits",
    faq: "faq",
    resources: "ressources",
    contact: "contact",
  },
};

const pressEn: PressCopy = {
  meta: {
    title: "Press room — HavenApply brings seniors' residence applications online",
    description:
      "HavenApply lets families prepare one file and submit admission applications online to multiple private seniors' residences in Quebec.",
    ogAlt: "HavenApply homepage",
  },
  header: {
    brand: "HavenApply",
    label: "Press room",
    email: "hello@havenapply.com",
    langFr: "Français",
    langEn: "English",
    langAria: "Choose language",
    navAria: "Press room sections",
    nav: {
      front: "Top story",
      article: "Feature",
      release: "Release",
      facts: "Facts",
      resources: "Resources",
      contact: "Contact",
    },
  },
  hero: {
    category: "Innovation · Senior housing",
    title: "HavenApply brings seniors' residence admission applications online",
    lead: "The Quebec platform lets families complete one file and submit applications to multiple private seniors' residences (RPAs). Free for families, it uses artificial intelligence to guide them through the process.",
    byline: "By the HavenApply team",
    publishedPrefix: "Published",
    updatedPrefix: "Updated",
    readingPrefix: "Reading time",
    readingUnit: "min",
    ctaRelease: "Read the release",
    ctaInterview: "Request an interview",
    captureAlt: "Screenshot of the HavenApply homepage",
    captureCaption: "HavenApply's interface: one file to submit admission applications to multiple private seniors' residences.",
    captureCredit: "HavenApply",
  },
  disclosure:
    "This content presents HavenApply's announcement and how the product works, for media use.",
  summary: {
    sectionLabel: "The essentials",
    title: "What HavenApply changes",
    paragraphs: [
      "A family prepares one file, then can submit admission applications online to multiple private seniors' residences.",
      "Every active RPA in Quebec's public registry is available from launch. The service is free for families.",
      "HavenApply has entered into an agreement as a supplier of the RQRA. Artificial intelligence supports the process without diagnosing or deciding for families or residences.",
    ],
  },
  kinds: {
    article: "Presentation article published by HavenApply",
    release: "Press release",
    rqra: "Data from the RQRA",
    registry: "Data from the public registry",
    statement: "HavenApply statement",
  },
  share: {
    label: "Actions",
    copyLink: "Copy link",
    copyTitle: "Copy title",
    print: "Print",
    openRelease: "Open the release",
    email: "Email media contact",
    copiedLink: "Link copied",
    copiedTitle: "Title copied",
  },
  sidebar: {
    briefTitle: "In brief",
    contactTitle: "Media contact",
    releaseCta: "Read the release",
  },
  alsoRead: {
    title: "Related",
    items: [
      { label: "Official press release", href: "#release" },
      { label: "Key facts and sources", href: "#facts" },
      { label: "FAQ for journalists", href: "#faq" },
    ],
  },
  release: {
    sectionLabel: "Press release · For immediate release",
    title:
      "HavenApply enters into an agreement with the RQRA and brings seniors' residence applications online",
    dek: "Free for families, the Quebec platform lets users build one file and submit applications to multiple residences.",
    dateline: "MONTREAL —",
    lead: "HavenApply is launching its Quebec platform for searching and applying to private seniors' residences (RPAs), and has entered into an agreement as a supplier of the Regroupement québécois des résidences pour aînés (RQRA).",
    blocks: [
      {
        type: "p",
        text: "HavenApply is an independent technology company based in Montreal. It is not owned by the RQRA. The agreement places HavenApply within the association's supplier program. The RQRA states that it represents nearly 800 members—managers and owners of RPAs—accounting for about 108,000 rental units in Quebec.",
      },
      {
        type: "link",
        label: "RQRA — about the association",
        href: pressAssets.rqraHome,
      },
      {
        type: "link",
        label: "RQRA supplier and partner program",
        href: pressAssets.rqraProgram,
      },
      {
        type: "h3",
        text: "Repeated applications, repeated information",
      },
      {
        type: "p",
        text: "Finding a suitable residence often means understanding care levels, comparing services and costs, then providing the same information to several facilities. The search frequently follows a hospitalization, a loss of autonomy or caregiver burnout.",
      },
      {
        type: "p",
        text: "Quebec maintains a public registry of RPAs authorized by Santé Québec. HavenApply builds on those public data and adds a journey to prepare the file, clarify needs and start applications.",
      },
      {
        type: "link",
        label: "Official RPA registry",
        href: pressAssets.rpaRegistry,
      },
      {
        type: "h3",
        text: "One file, online applications to multiple RPAs",
      },
      {
        type: "p",
        text: "With HavenApply, a family prepares once the person's profile, preferences, assistance needs, useful documents and information required for applications. That file can then support online admission applications to several residences.",
      },
      {
        type: "p",
        text: "From launch, every active RPA listed in Quebec's public registry is available in HavenApply. Appearing in the journey does not mean a residence already uses the HavenApply professional console. Each facility remains free to choose its tools.",
      },
      {
        type: "p",
        text: "The service is free for families, in French and English. HavenApply makes information and applications easier to manage; it does not create new places or new units.",
      },
      {
        type: "h3",
        text: "AI guidance, with explicit limits",
      },
      {
        type: "p",
        text: "HavenApply includes an assistant that uses artificial intelligence to explain steps, help organize information and flag missing details. The AI does not make medical diagnoses, determine eligibility, choose a residence for the family or take any admission decision. That decision always belongs to the residence.",
      },
      {
        type: "quote",
        text: "Artificial intelligence is often presented as complex or impersonal. We want to show it can do the opposite: explain, reassure and accompany families through a deeply human transition.",
        attribution: founderAttributionEn,
      },
      {
        type: "quote",
        text: "Technology should never replace the family, the advisor or residence staff. It should remove administrative barriers so everyone can spend more time with the person.",
        attribution: founderAttributionEn,
      },
      {
        type: "h3",
        text: "A console for residences",
      },
      {
        type: "p",
        text: "Residences that use HavenApply get a console to receive structured files, review their contents, track applications and communicate with families. The goal is not to automate the admission decision, but to reduce incomplete information and repetitive first-contact work.",
      },
      {
        type: "h3",
        text: "Context: modernizing without confusing the tools",
      },
      {
        type: "p",
        text: "HavenApply's launch comes as the cost of aging IT systems draws attention in Quebec. According to a TVA Nouvelles investigation published on August 31, 2026, nearly $500 million has reportedly been spent since 2023 maintaining legacy human-resources systems in the health network.",
      },
      {
        type: "p",
        text: "Those systems do not serve the same purpose as HavenApply, an independent platform for families and RPAs. HavenApply does not replace them and is not funded, used or recommended by Santé Québec merely because of that news. The example still illustrates the human and financial cost of fragmented or aging digital journeys, while focused tools can address a precise moment in the path.",
      },
      {
        type: "link",
        label: "TVA Nouvelles investigation on the network's IT systems",
        href: pressAssets.tvaArticle,
      },
      { type: "h3", text: "About HavenApply" },
      {
        type: "p",
        text: "HavenApply is a Quebec technology company that simplifies searching for and applying to private seniors' residences. Its bilingual platform lets families prepare one file, find residences that match their loved one's needs and submit applications online. Artificial intelligence provides guidance; it does not replace human judgment.",
      },
      {
        type: "p",
        text: "The service is free for families.",
      },
      {
        type: "meta",
        rows: [
          { label: "Website", value: "havenapply.com", href: pressAssets.siteUrl },
          {
            label: "Press room",
            value: "havenapply.com/media",
            href: pressAssets.mediaUrl,
          },
          {
            label: "Media contact",
            value: "hello@havenapply.com",
            href: pressAssets.mailto,
          },
          { label: "Headquarters", value: "Montreal, Quebec" },
          { label: "Interviews", value: "French and English" },
        ],
      },
    ],
    endMark: "— 30 —",
  },
  feature: {
    sectionLabel: "Feature article",
    title:
      "When artificial intelligence helps a family find a residence for a parent",
    dek: "Urgent searches, repeated forms, caregiver load: how one file and carefully bounded AI guidance simplify RPA admission applications.",
    blocks: [
      {
        type: "p",
        text: "When a parent loses autonomy, a family does not always have months to learn how private seniors' residences work. They must assess the level of assistance, compare services, understand costs, check availability and often repeat the same information from one facility to the next.",
      },
      {
        type: "p",
        text: "For a family already worried about a loved one's health, that search can quickly become another burden. That is the moment HavenApply sets out to address.",
      },
      {
        type: "h3",
        text: "A search that turns into a part-time job",
      },
      {
        type: "p",
        text: "Calls, forms and documents pile up. Each residence asks for its own details. Caregivers move from one contact to another, repeating the person's profile, needs and preferences.",
      },
      {
        type: "p",
        text: "HavenApply does not create new places. It aims to reduce the administrative work around the search and applications, so remaining time can go to human conversations with residences.",
      },
      {
        type: "h3",
        text: "Prepare the file once",
      },
      {
        type: "p",
        text: "The platform brings together the person's profile, preferences, assistance needs, useful documents and application status. That single file can then support online admission applications to several RPAs.",
      },
      {
        type: "p",
        text: "Every active RPA in Quebec's public registry is available in HavenApply from launch. Facilities that use the professional console can receive and track files there. Others remain visible in the journey; console adoption depends on each residence's individual signup.",
      },
      {
        type: "h3",
        text: "An AI that explains rather than an AI that decides",
      },
      {
        type: "p",
        text: "Artificial intelligence plays a useful but deliberately limited role in HavenApply. It explains steps, helps organize information and can flag that something important seems missing.",
      },
      {
        type: "p",
        text: "It does not recommend a medical treatment, assess clinical eligibility or ever decide whether someone should be accepted into a residence. In a field this sensitive, the tool must support human judgment—not replace it.",
      },
      {
        type: "h3",
        text: "Reconciling technology and generations",
      },
      {
        type: "p",
        text: "HavenApply favors plain language, progressive steps and clear navigation. An older adult can use the platform themselves. An adult child or caregiver can also help prepare the file.",
      },
      {
        type: "p",
        text: "The goal is not to remove human interaction. It is to reduce time lost before those interactions, so families arrive better prepared when they speak with a residence.",
      },
      {
        type: "h3",
        text: "Recognition from the RPA sector",
      },
      {
        type: "p",
        text: "HavenApply has entered into an agreement as a supplier of the RQRA, which states that it represents nearly 800 members and about 108,000 rental units in Quebec. That recognition opens a dialogue with RPA managers. It does not mean every member residence has adopted, approved or recommended the platform.",
      },
      {
        type: "h3",
        text: "Modernizing a precise journey, without building another heavy system",
      },
      {
        type: "p",
        text: "Recent debates about costs tied to legacy public-network human-resources systems concern a different domain. HavenApply is not a substitute for that infrastructure. The example still points to two modernization realities: replacing complex institutional systems, and addressing a precise problem with a lighter tool.",
      },
      {
        type: "p",
        text: "HavenApply belongs to that second category. It focuses on the moment a family starts looking for a residence and does not know where to begin—to return time, clarity and a file ready to send.",
      },
    ],
  },
  facts: {
    sectionLabel: "Key facts",
    title: "What to remember",
    items: [
      {
        title: "One file",
        body: "A family prepares their information once.",
        kind: "statement",
      },
      {
        title: "Multiple online applications",
        body: "The same file can support outreach to several RPAs.",
        kind: "statement",
      },
      {
        title: "Every active RPA",
        body: "Facilities listed in Quebec's public registry are available from launch.",
        kind: "registry",
        sourceLabel: "Official RPA registry",
        sourceHref: pressAssets.rpaRegistry,
      },
      {
        title: "Free for families",
        body: "No family subscription is required to use the journey.",
        kind: "statement",
      },
      {
        title: "Nearly 800 members",
        body: "The RQRA states that it represents nearly 800 members—managers and owners of RPAs.",
        kind: "rqra",
        sourceLabel: "RQRA",
        sourceHref: pressAssets.rqraHome,
      },
      {
        title: "About 108,000 units",
        body: "RQRA members account for about 108,000 rental units in Quebec.",
        kind: "rqra",
        sourceLabel: "RQRA",
        sourceHref: pressAssets.rqraHome,
      },
    ],
  },
  faq: {
    sectionLabel: "Press FAQ",
    title: "Frequently asked questions for journalists",
    items: [
      {
        q: "Does the RQRA own HavenApply?",
        a: "No. HavenApply is an independent company that entered into an agreement as a supplier of the RQRA.",
      },
      {
        q: "What does RQRA supplier status mean?",
        a: "HavenApply is recognized under the RQRA supplier program. That status supports collaboration and visibility with members. It does not mean the RQRA has certified, approved, endorsed or recommended HavenApply to all of its residences.",
      },
      {
        q: "Do all residences already use HavenApply?",
        a: "Every active RPA in the public registry is available in the search journey from launch. Use of the HavenApply professional console depends on each residence's individual signup.",
      },
      {
        q: "Can families really submit applications online?",
        a: "Yes. Families prepare one file and can submit admission applications online to multiple residences through HavenApply.",
      },
      {
        q: "How does a residence receive an application if it does not yet have an account?",
        a: "Residences that use the HavenApply console receive and track structured files there. For details on handling when a residence does not yet have an account, email hello@havenapply.com.",
      },
      {
        q: "How are residences recommended?",
        a: "Suggestions draw on information in the file, including area, budget and expressed needs. For a detailed description of criteria, contact hello@havenapply.com.",
      },
      {
        q: "Can a residence pay to improve its ranking?",
        a: "In the current family journey, no paid-placement mechanism improves a residence's rank. For commercial details, contact hello@havenapply.com.",
      },
      {
        q: "How does HavenApply use artificial intelligence?",
        a: "The AI explains steps, helps organize information and flags missing details. It does not make diagnoses, determine eligibility or take admission decisions.",
      },
      {
        q: "Is the service truly free for families?",
        a: "Yes. HavenApply is free for families. No family subscription is required to prepare a file and use the search and application journey.",
      },
      {
        q: "How is personal information protected?",
        a: "HavenApply describes its practices in its privacy policy (authentication, access control, HTTPS encryption in transit). Families can exercise their rights via privacy@havenapply.com. Details: havenapply.com/privacy",
      },
    ],
  },
  sources: {
    sectionLabel: "Sources and documents",
    title: "Documents for journalists",
    items: [
      {
        label: "RQRA",
        href: pressAssets.rqraHome,
        note: "About the association and membership figures.",
      },
      {
        label: "RQRA supplier and partner program",
        href: pressAssets.rqraProgram,
        note: "Framework for supplier status.",
      },
      {
        label: "Official RPA registry",
        href: pressAssets.rpaRegistry,
        note: "Public list of authorized residences.",
      },
      {
        label: "TVA Nouvelles investigation (August 31, 2026)",
        href: pressAssets.tvaArticle,
        note: "Context on aging health-network HR systems — a different domain from HavenApply.",
      },
      {
        label: "HavenApply privacy policy",
        href: pressAssets.privacyEn,
        note: "Practices described by HavenApply.",
      },
    ],
  },
  kit: {
    sectionLabel: "Media kit",
    title: "Identity and available files",
    brandLineLabel: "Brand line",
    brandLine: "Artificial intelligence in service of families—never in their place.",
    logoLightAlt: "HavenApply logo on light background",
    usage:
      "Clear space equal to the height of the symbol. No distortion, no recoloring, no added shapes.",
    downloadsLabel: "Downloads",
    downloads: [
      {
        id: "logo-png",
        label: "HavenApply logo (PNG)",
        href: pressAssets.logoPng,
        filename: "havenapply-logo.png",
        alt: "HavenApply logo",
        caption: "Color logo on transparent background.",
        credit: "HavenApply",
      },
      {
        id: "homepage-capture",
        label: "Homepage screenshot",
        href: pressAssets.homepageCapture,
        filename: "havenapply-homepage.png",
        alt: "HavenApply homepage screenshot",
        caption: "havenapply.com homepage.",
        credit: "HavenApply",
      },
    ],
  },
  contact: {
    sectionLabel: "Media contact",
    title: "Interviews and press requests",
    name: "Tom Grosse",
    role: "Cofounder, HavenApply",
    city: "Montreal, Quebec",
    languages: "French and English",
    email: "hello@havenapply.com",
    body: "Available for interviews and demos, in Montreal or remotely. Introductions to a family or residence only with their prior consent.",
    ctaInterview: "Request an interview",
    ctaDemo: "Request a demo",
    siteLabel: "Visit havenapply.com",
    defs: [
      { label: "Email", value: "hello@havenapply.com" },
      { label: "Headquarters", value: "Montreal, Quebec" },
      { label: "Languages", value: "French, English" },
    ],
  },
  footer: {
    updated: "HavenApply press room",
    siteLink: "havenapply.com",
  },
  anchors: {
    front: "top",
    summary: "essentials",
    release: "release",
    feature: "feature",
    facts: "facts",
    faq: "faq",
    resources: "resources",
    contact: "contact",
  },
};

export const press = {
  fr: pressFr,
  en: pressEn,
} as const;
