/**
 * Contenu textuel de l'espace presse public `/media`.
 * Aucune chaîne éditoriale ne doit être codée dans le JSX.
 * Structure bilingue : press.fr / press.en (mêmes clés).
 *
 * Libellé RQRA : « fournisseur » (pas « partenaire ») — conforme au programme
 * des fournisseurs et partenaires du RQRA.
 */

export type PressLocale = "fr" | "en";

/**
 * Bandeau interne « À compléter ».
 * Passer à `false` avant la mise en ligne publique.
 */
export const showTodo = true;

export const pressAssets = {
  logo: "/media/havenapply-logo.png",
  homepageCapture: "/media/homepage-capture.png",
  ogImage: "/home/hero.jpg",
  email: "hello@havenapply.com",
  mailto: "mailto:hello@havenapply.com",
  siteUrl: "https://havenapply.com",
  siteHost: "havenapply.com",
  mediaUrl: "https://havenapply.com/media",
  rqraProgram:
    "https://www.rqra.qc.ca/collaborateurs/demande-d-adhesion",
  rqraHome: "https://www.rqra.qc.ca/",
  rpaRegistry: "https://k10.pub.msss.rtss.qc.ca/",
  tvaArticle:
    "https://www.tvanouvelles.ca/2026/08/31/fiasco-informatique--sante-quebec-a-englouti-500-m-pour-maintenir-des-systemes-desuets",
} as const;

export type PressInlineLink = { label: string; href: string };

export type PressBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string; attribution: string }
  | { type: "link"; label: string; href: string }
  | { type: "meta"; rows: Array<{ label: string; value: string; href?: string }> };

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
    paragraphs: string[];
    brandLine: string;
    interviewLabel: string;
    ctaRelease: string;
    ctaFeature: string;
    ctaNumbers: string;
    ctaFaq: string;
    ctaKit: string;
    captureAlt: string;
    captureCaption: string;
    rqraLinkLabel: string;
  };
  release: {
    sectionLabel: string;
    forImmediate: string;
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
    blocks: PressBlock[];
  };
  numbers: {
    sectionLabel: string;
    items: Array<{
      value: string;
      description: string;
      detail: string;
      accent?: boolean;
    }>;
  };
  faq: {
    sectionLabel: string;
    title: string;
    items: Array<{ q: string; a: string }>;
  };
  kit: {
    sectionLabel: string;
    title: string;
    brandLineLabel: string;
    brandLine: string;
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
    resourcesLabel: string;
    resources: string[];
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
    feature: string;
    numbers: string;
    faq: string;
    brand: string;
  };
};

const colorsFr = [
  { name: "Vert HavenApply", hex: "#0E9384" },
  { name: "Encre", hex: "#101815" },
  { name: "Fond clair", hex: "#F1F7F5" },
  { name: "Terracotta", hex: "#A6572B" },
];

const colorsEn = [
  { name: "HavenApply green", hex: "#0E9384" },
  { name: "Ink", hex: "#101815" },
  { name: "Light ground", hex: "#F1F7F5" },
  { name: "Terracotta", hex: "#A6572B" },
];

const resourcesFr = [
  "Logo HavenApply en PNG et SVG",
  "Version blanche du logo",
  "Sceau de fournisseur RQRA, selon les conditions d'utilisation",
  "Portrait professionnel du fondateur",
  "Photo de l'équipe",
  "Captures d'écran de l'assistant IA",
  "Capture du dossier familial",
  "Capture de la console des résidences",
  "Communiqué téléchargeable en PDF et Word",
  "Courte biographie du fondateur",
  "Numéro de téléphone réservé aux médias",
  "Citation autorisée d'un représentant du RQRA",
  "Témoignage autorisé d'une famille",
  "Témoignage d'une résidence utilisant la plateforme",
];

const resourcesEn = [
  "HavenApply logo in PNG and SVG",
  "White logo version",
  "RQRA supplier seal, subject to usage terms",
  "Professional founder portrait",
  "Team photo",
  "AI assistant screenshots",
  "Family file screenshot",
  "Residence console screenshot",
  "Press release downloadable as PDF and Word",
  "Short founder biography",
  "Media-only phone number",
  "Authorized quote from an RQRA representative",
  "Authorized family testimonial",
  "Testimonial from a residence using the platform",
];

const pressFr: PressCopy = {
  meta: {
    title: "Espace presse — HavenApply",
    description:
      "Communiqué, article de fond et ressources médias : HavenApply, fournisseur du RQRA, utilise l'IA pour simplifier l'admission en résidence pour aînés.",
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
    body: "Avant diffusion : date de lancement, nom de famille du cofondateur, modèle économique résidence (FAQ), critères de recommandation (FAQ), version blanche du logo, sceau fournisseur RQRA, portrait, captures, PDF/Word du communiqué, téléphone médias, citations et témoignages autorisés.",
  },
  hero: {
    eyebrow: "Espace presse · Montréal",
    title: "Une technologie de nouvelle génération pour accompagner toutes les générations",
    paragraphs: [
      "HavenApply utilise l'intelligence artificielle pour simplifier l'une des décisions les plus humaines et difficiles qu'une famille puisse prendre : trouver une résidence adaptée pour un parent ou un proche.",
      "Gratuite pour les familles, la plateforme permet de préparer un dossier unique, de découvrir des résidences correspondant aux besoins de la personne et d'entreprendre des démarches auprès de toutes les RPA actives du Québec.",
      "HavenApply vient également de conclure une entente à titre de fournisseur du Regroupement québécois des résidences pour aînés (RQRA), qui représente près de 800 membres et environ 108\u00a0000 unités locatives à travers la province.",
    ],
    brandLine: "L'intelligence artificielle au service des familles, jamais à leur place.",
    interviewLabel: "Demandes d'entrevue",
    ctaRelease: "Lire le communiqué",
    ctaFeature: "Article de fond",
    ctaNumbers: "Le problème en chiffres",
    ctaFaq: "Questions des journalistes",
    ctaKit: "Kit média",
    captureAlt: "Capture de la page d'accueil de HavenApply",
    captureCaption:
      "La page d'accueil de HavenApply. Capture disponible en haute résolution sur demande.",
    rqraLinkLabel: "Portrait du RQRA",
  },
  release: {
    sectionLabel: "Communiqué de presse",
    forImmediate: "Pour diffusion immédiate",
    title:
      "HavenApply conclut une entente avec le RQRA et mise sur l'IA pour simplifier l'admission en résidence pour aînés",
    dek: "Gratuite pour les familles, la plateforme québécoise réunit les RPA de la province et accompagne les utilisateurs à chaque étape de leurs démarches",
    dateline: "MONTRÉAL, [date de lancement] —",
    lead:
      "HavenApply annonce aujourd'hui le lancement de sa plateforme québécoise de recherche et de demande d'admission en résidence privée pour aînés ainsi que la conclusion d'une entente à titre de fournisseur du Regroupement québécois des résidences pour aînés (RQRA).",
    blocks: [
      {
        type: "p",
        text: "Cette entente fait suite à une présentation de HavenApply auprès du RQRA et à l'acceptation de l'entreprise au sein de son réseau de fournisseurs. Le RQRA représente près de 800 membres, gestionnaires et propriétaires de résidences comptant environ 108\u00a0000 unités locatives au Québec.",
      },
      {
        type: "p",
        text: "Dès son lancement, HavenApply permet aux familles de découvrir l'ensemble des RPA actives répertoriées au Québec et d'amorcer leurs démarches à partir d'une seule plateforme.",
      },
      {
        type: "h3",
        text: "Une recherche qui devient rapidement un travail à temps partiel",
      },
      {
        type: "p",
        text: "Trouver une résidence adaptée ne consiste pas uniquement à consulter une liste d'établissements. Les familles doivent comprendre les différents niveaux de soins, vérifier les services offerts, comparer les coûts, contacter plusieurs résidences et répéter les mêmes renseignements à chaque nouvelle démarche.",
      },
      {
        type: "p",
        text: "Cette recherche survient souvent à la suite d'une hospitalisation, d'une perte d'autonomie ou d'un épuisement du proche aidant. La famille doit alors prendre une décision importante dans un environnement fragmenté, avec peu de temps et beaucoup d'incertitude.",
      },
      {
        type: "p",
        text: "Le Québec possède un registre public permettant de rechercher les RPA autorisées par Santé Québec. HavenApply s'appuie sur ces données publiques et ajoute une couche d'accompagnement : préparation du dossier, compréhension des besoins, recommandations et gestion des démarches.",
      },
      {
        type: "link",
        label: "Registre officiel des RPA",
        href: pressAssets.rpaRegistry,
      },
      { type: "h3", text: "Un dossier préparé une fois" },
      {
        type: "p",
        text: "Avec HavenApply, une famille peut réunir au même endroit :",
      },
      {
        type: "ul",
        items: [
          "Le profil de la personne qui cherche une résidence",
          "Ses préférences géographiques et financières",
          "Ses besoins d'assistance et de soins",
          "Les renseignements nécessaires aux démarches",
          "Les documents pertinents",
          "Les résidences contactées",
          "L'état d'avancement de chaque démarche",
        ],
      },
      {
        type: "p",
        text: "Le dossier est préparé une seule fois et peut ensuite servir auprès de plusieurs établissements. La famille conserve le contrôle sur les résidences qu'elle souhaite contacter et les renseignements qu'elle choisit de transmettre.",
      },
      {
        type: "p",
        text: "Le service est offert gratuitement aux familles, en français et en anglais.",
      },
      {
        type: "h3",
        text: "L'intelligence artificielle au service des familles",
      },
      {
        type: "p",
        text: "HavenApply intègre un assistant utilisant l'intelligence artificielle pour guider les utilisateurs pendant leurs démarches.",
      },
      {
        type: "p",
        text: "L'assistant peut expliquer les différentes étapes, aider à préciser les besoins de la personne, signaler des renseignements manquants, simplifier certains termes et préparer la famille à communiquer avec une résidence.",
      },
      {
        type: "p",
        text: "Il ne pose aucun diagnostic médical, ne décide pas à la place de la famille et ne prend aucune décision d'admission. Les résidences demeurent entièrement responsables de l'évaluation des demandes qu'elles reçoivent.",
      },
      {
        type: "quote",
        text: "On présente souvent l'intelligence artificielle comme une technologie complexe ou impersonnelle. Nous voulons démontrer qu'elle peut faire exactement l'inverse : expliquer, rassurer et accompagner les familles dans une transition profondément humaine.",
        attribution: "Tom [nom de famille], cofondateur de HavenApply",
      },
      {
        type: "p",
        text: "La plateforme a été conçue pour être utilisable par différentes générations. Son interface privilégie un langage simple, des étapes progressives et une navigation claire. Un enfant, un proche aidant ou une personne aînée peut préparer le dossier, seul ou avec l'aide de son entourage.",
      },
      {
        type: "quote",
        text: "La technologie ne doit jamais remplacer la famille, le conseiller ou le personnel de la résidence. Elle doit enlever les obstacles administratifs pour permettre à chacun de consacrer plus de temps à la personne.",
        attribution: "Tom [nom de famille], cofondateur de HavenApply",
      },
      { type: "h3", text: "Une solution pour les résidences également" },
      {
        type: "p",
        text: "Les résidences qui utilisent HavenApply disposent d'une console leur permettant de recevoir des dossiers structurés, d'en vérifier le contenu, de suivre les demandes et de communiquer avec les familles.",
      },
      {
        type: "p",
        text: "L'objectif n'est pas d'automatiser la décision d'admission, mais de réduire les renseignements incomplets, les communications répétitives et les tâches administratives entourant le premier contact.",
      },
      {
        type: "p",
        text: "Le statut de fournisseur du RQRA permettra à HavenApply de présenter sa solution aux gestionnaires et propriétaires membres du regroupement et de poursuivre son développement au contact des réalités opérationnelles du secteur.",
      },
      { type: "h3", text: "Une nouvelle génération de solutions québécoises" },
      {
        type: "p",
        text: "Le lancement de HavenApply survient au moment où le coût des systèmes informatiques vieillissants retient fortement l'attention au Québec.",
      },
      {
        type: "p",
        text: "Selon une enquête publiée par TVA Nouvelles le 31 août 2026, près de 500 millions de dollars auraient été consacrés depuis 2023 au maintien d'anciens systèmes de gestion des ressources humaines du réseau de la santé.",
      },
      {
        type: "p",
        text: "Ces systèmes n'ont pas la même fonction que HavenApply, qui est une plateforme indépendante destinée aux familles et aux RPA. Cette situation illustre néanmoins un enjeu plus large : les coûts financiers et humains associés à des parcours reposant sur des technologies fragmentées ou vieillissantes.",
      },
      {
        type: "p",
        text: "Pendant que le réseau public poursuit ses grands chantiers de transformation, de nouvelles entreprises québécoises développent des solutions ciblées pouvant être déployées plus rapidement et offertes directement à la population.",
      },
      {
        type: "p",
        text: "HavenApply en est un exemple : une solution spécialisée dans le parcours vers les RPA, gratuite pour les familles et construite autour d'une utilisation concrète de l'intelligence artificielle.",
      },
      {
        type: "link",
        label: "Consulter l'enquête sur les systèmes informatiques du réseau",
        href: pressAssets.tvaArticle,
      },
      { type: "h3", text: "À propos de HavenApply" },
      {
        type: "p",
        text: "HavenApply est une entreprise technologique québécoise qui simplifie la recherche et les démarches d'admission en résidence privée pour aînés.",
      },
      {
        type: "p",
        text: "Sa plateforme bilingue permet aux familles de préparer un dossier unique, de trouver des résidences correspondant aux besoins de leur proche et de gérer leurs démarches à partir d'un même endroit. HavenApply utilise l'intelligence artificielle pour expliquer, organiser et accompagner—sans remplacer le jugement humain.",
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
          { label: "Contact média", value: "hello@havenapply.com", href: pressAssets.mailto },
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
    blocks: [
      {
        type: "p",
        text: "Lorsqu'un parent perd son autonomie, la famille ne dispose pas toujours de plusieurs mois pour comprendre le fonctionnement des résidences privées pour aînés.",
      },
      {
        type: "p",
        text: "Il faut déterminer le niveau d'assistance nécessaire, comparer les services, comprendre les coûts, visiter des établissements et vérifier les disponibilités. À cela s'ajoutent les appels, les formulaires, les documents et les mêmes renseignements répétés à plusieurs interlocuteurs.",
      },
      {
        type: "p",
        text: "Pour une famille déjà préoccupée par la santé d'un proche, la recherche d'une résidence peut rapidement devenir une charge supplémentaire.",
      },
      { type: "p", text: "C'est le problème auquel s'attaque HavenApply." },
      {
        type: "p",
        text: "La plateforme québécoise permet de préparer un seul dossier regroupant les besoins, les préférences et les renseignements pertinents de la personne. Ce dossier peut ensuite être utilisé pour entreprendre des démarches auprès de plusieurs résidences.",
      },
      {
        type: "p",
        text: "Toutes les RPA actives du Québec sont accessibles dans la plateforme dès son lancement. Les établissements qui utilisent directement HavenApply peuvent également recevoir et traiter les dossiers dans leur propre console.",
      },
      {
        type: "h3",
        text: "Une IA qui explique plutôt qu'une IA qui décide",
      },
      {
        type: "p",
        text: "L'intelligence artificielle occupe une place centrale dans HavenApply, mais son rôle est volontairement limité.",
      },
      {
        type: "p",
        text: "Elle accompagne l'utilisateur, explique les étapes et l'aide à organiser son dossier. Elle peut, par exemple, signaler qu'un renseignement important semble manquer ou aider la famille à mieux définir les besoins quotidiens de la personne.",
      },
      {
        type: "p",
        text: "Elle ne recommande pas un traitement médical, n'évalue pas l'admissibilité clinique et ne décide jamais si une personne doit être acceptée dans une résidence.",
      },
      {
        type: "p",
        text: "Cette distinction est essentielle. Dans un domaine aussi sensible, l'intelligence artificielle doit soutenir le jugement humain, pas s'y substituer.",
      },
      {
        type: "h3",
        text: "Réconcilier la technologie et les générations",
      },
      {
        type: "p",
        text: "Les nouvelles technologies sont souvent développées pour les utilisateurs qui les comprennent déjà. HavenApply adopte l'approche inverse : réduire le vocabulaire technique, diviser les démarches en étapes simples et permettre à plusieurs membres d'une famille de participer.",
      },
      {
        type: "p",
        text: "La personne aînée peut utiliser la plateforme elle-même. Un enfant ou un proche aidant peut également l'accompagner dans la préparation du dossier.",
      },
      {
        type: "p",
        text: "L'objectif n'est pas de retirer les interactions humaines du parcours. Il est de réduire le temps perdu avant ces interactions et de permettre aux familles d'arriver mieux préparées lorsqu'elles parlent avec une résidence.",
      },
      { type: "h3", text: "Une reconnaissance du secteur" },
      {
        type: "p",
        text: "HavenApply a récemment conclu une entente à titre de fournisseur du RQRA, un regroupement représentant près de 800 membres et environ 108\u00a0000 unités locatives au Québec.",
      },
      {
        type: "p",
        text: "Pour la jeune entreprise montréalaise, cette reconnaissance ouvre un dialogue direct avec les gestionnaires de RPA et confirme la pertinence d'un outil consacré au parcours d'admission.",
      },
      {
        type: "p",
        text: "La plateforme demeure gratuite pour les familles. Son développement repose sur la collaboration avec les résidences qui souhaitent moderniser la réception et le suivi de leurs demandes.",
      },
      {
        type: "h3",
        text: "Moderniser sans construire un autre système lourd",
      },
      {
        type: "p",
        text: "Cette arrivée se produit dans un contexte où les dépenses informatiques du réseau public font l'objet d'importantes critiques.",
      },
      {
        type: "p",
        text: "Les quelque 500\u00a0M$ rapportés récemment concernent de vieux systèmes de ressources humaines—notamment un domaine différent de celui de HavenApply. La comparaison ne porte donc pas sur deux produits concurrents.",
      },
      {
        type: "p",
        text: "Elle révèle toutefois deux réalités de la transformation numérique. D'un côté, les institutions doivent remplacer des infrastructures complexes utilisées depuis plusieurs décennies. De l'autre, de petites entreprises peuvent intervenir sur un problème précis avec des outils plus légers et rapidement accessibles.",
      },
      {
        type: "p",
        text: "HavenApply appartient à cette seconde catégorie. Plutôt que de remplacer les systèmes médicaux ou administratifs du gouvernement, l'entreprise souhaite simplifier un moment particulier : celui où une famille commence à chercher une résidence et ne sait pas par où commencer.",
      },
    ],
  },
  numbers: {
    sectionLabel: "Le problème en chiffres",
    items: [
      {
        value: "≈\u00a0800",
        description: "membres",
        detail:
          "Le RQRA rassemble près de 800 membres, gestionnaires et propriétaires de RPA à travers le Québec.",
      },
      {
        value: "≈\u00a0108\u00a0000",
        description: "unités locatives",
        detail:
          "Les membres du regroupement représentent près de 108\u00a0000 unités locatives.",
      },
      {
        value: "Toutes",
        description: "les RPA actives",
        detail:
          "HavenApply rend accessibles dès son lancement les RPA actives figurant dans le registre public québécois.",
        accent: true,
      },
      {
        value: "0\u00a0$",
        description: "pour les familles",
        detail:
          "Aucun abonnement ni paiement n'est demandé à une famille pour préparer son dossier et utiliser le parcours de recherche.",
        accent: true,
      },
    ],
  },
  faq: {
    sectionLabel: "Questions fréquentes",
    title: "Questions fréquentes des journalistes",
    items: [
      {
        q: "HavenApply appartient-elle au RQRA?",
        a: "Non. HavenApply est une entreprise indépendante ayant conclu une entente à titre de fournisseur du RQRA.",
      },
      {
        q: "Le RQRA recommande-t-il HavenApply à toutes ses résidences?",
        a: "HavenApply est reconnu dans le cadre du programme de fournisseurs du RQRA. Chaque résidence demeure libre de choisir les outils et fournisseurs qu'elle utilise.",
      },
      {
        q: "Toutes les résidences utilisent-elles déjà HavenApply?",
        a: "Toutes les RPA actives sont accessibles dans le parcours de recherche dès le lancement. Leur utilisation de la console professionnelle HavenApply dépend de leur inscription individuelle.",
      },
      {
        q: "Comment HavenApply utilise-t-elle l'intelligence artificielle?",
        a: "L'IA explique les étapes, aide à organiser les renseignements et accompagne l'utilisateur. Elle ne pose aucun diagnostic et ne prend aucune décision d'admission.",
      },
      {
        q: "Le service est-il réellement gratuit?",
        a: "Oui, HavenApply est gratuit pour les familles. [Préciser ici comment les résidences paient ou paieront HavenApply.]",
      },
      {
        q: "Comment les résidences sont-elles recommandées?",
        a: "[Préciser les critères : emplacement, budget, niveau d'autonomie, services, disponibilité déclarée, etc. Indiquer clairement si le paiement d'une résidence influence ou non son classement.]",
      },
    ],
  },
  kit: {
    sectionLabel: "Kit média",
    title: "Identité et ressources pour la presse",
    brandLineLabel: "Formule de marque",
    brandLine: "L'intelligence artificielle au service des familles, jamais à leur place.",
    logoLightAlt: "Logo HavenApply sur fond clair",
    logoDarkPlaceholder: "[version renversée (blanc) à fournir]",
    usage:
      "Zone de dégagement égale à la hauteur du symbole. Pas de déformation, pas de recoloration, pas de forme ajoutée. Version renversée obligatoire sur fond foncé.",
    download: "Télécharger le logo (PNG)",
    colorsLabel: "Couleurs",
    colors: colorsFr,
    typeLabel: "Typographie",
    serifName: "Source Serif 4",
    serifCaption: "Titres et texte long",
    sansName: "Public Sans",
    sansCaption: "Interface, étiquettes, chiffres",
    brandLabel: "Nom de la marque",
    brandRule:
      "S'écrit HavenApply, en un mot, H et A majuscules ; jamais « Haven Apply » ni « HAVENAPPLY ».",
    resourcesLabel: "Ressources à ajouter au kit",
    resources: resourcesFr,
  },
  contact: {
    sectionLabel: "Contact média",
    title: "Entrevues et demandes de presse",
    body: "Tom [nom de famille], cofondateur, est disponible en français et en anglais, à Montréal ou à distance. Nous pouvons organiser une démonstration de la plateforme ou, avec leur accord, une mise en relation avec une famille ou une résidence.",
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
    feature: "article",
    numbers: "chiffres",
    faq: "faq",
    brand: "kit",
  },
};

const pressEn: PressCopy = {
  meta: {
    title: "Press room — HavenApply",
    description:
      "Press release, feature article and media resources: HavenApply, an RQRA supplier, uses AI to simplify seniors' residence admissions.",
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
    body: "Before release: launch date, cofounder's last name, residence pricing model (FAQ), recommendation criteria (FAQ), white logo, RQRA supplier seal, portrait, screenshots, PDF/Word release, media phone line, authorized quotes and testimonials.",
  },
  hero: {
    eyebrow: "Press room · Montreal",
    title: "Next-generation technology to support every generation",
    paragraphs: [
      "HavenApply uses artificial intelligence to simplify one of the most human—and difficult—decisions a family can face: finding the right residence for a parent or loved one.",
      "Free for families, the platform lets users prepare a single file, discover residences that match the person's needs, and start applications with every active private seniors' residence (RPA) in Quebec.",
      "HavenApply has also entered into an agreement as a supplier of the Regroupement québécois des résidences pour aînés (RQRA), which represents nearly 800 members and about 108,000 rental units across the province.",
    ],
    brandLine: "Artificial intelligence in service of families—never in their place.",
    interviewLabel: "Interview requests",
    ctaRelease: "Read the release",
    ctaFeature: "Feature article",
    ctaNumbers: "The problem in numbers",
    ctaFaq: "Journalist FAQ",
    ctaKit: "Media kit",
    captureAlt: "Screenshot of the HavenApply homepage",
    captureCaption:
      "The HavenApply homepage. High-resolution capture available on request.",
    rqraLinkLabel: "About the RQRA",
  },
  release: {
    sectionLabel: "Press release",
    forImmediate: "For immediate release",
    title:
      "HavenApply enters into an agreement with the RQRA and uses AI to simplify seniors' residence admissions",
    dek: "Free for families, the Quebec platform brings together the province's RPAs and supports users at every step of the process",
    dateline: "MONTREAL, [launch date] —",
    lead:
      "HavenApply today announces the launch of its Quebec platform for searching and applying to private seniors' residences, as well as an agreement as a supplier of the Regroupement québécois des résidences pour aînés (RQRA).",
    blocks: [
      {
        type: "p",
        text: "The agreement follows a presentation of HavenApply to the RQRA and the company's acceptance into its supplier network. The RQRA represents nearly 800 members—managers and owners of residences accounting for about 108,000 rental units in Quebec.",
      },
      {
        type: "p",
        text: "From launch, HavenApply lets families discover all active RPAs listed in Quebec and begin their process from a single platform.",
      },
      {
        type: "h3",
        text: "A search that quickly becomes a part-time job",
      },
      {
        type: "p",
        text: "Finding the right residence is not just browsing a list of facilities. Families must understand care levels, verify services, compare costs, contact several residences and repeat the same information with every new outreach.",
      },
      {
        type: "p",
        text: "That search often follows a hospitalization, a loss of autonomy or caregiver burnout. The family then has to make a major decision in a fragmented landscape, with little time and a great deal of uncertainty.",
      },
      {
        type: "p",
        text: "Quebec maintains a public registry of RPAs authorized by Santé Québec. HavenApply builds on those public data and adds a guidance layer: preparing the file, clarifying needs, recommendations and managing outreach.",
      },
      {
        type: "link",
        label: "Official RPA registry",
        href: pressAssets.rpaRegistry,
      },
      { type: "h3", text: "One file, prepared once" },
      {
        type: "p",
        text: "With HavenApply, a family can bring together in one place:",
      },
      {
        type: "ul",
        items: [
          "The profile of the person looking for a residence",
          "Geographic and financial preferences",
          "Assistance and care needs",
          "Information required for applications",
          "Relevant documents",
          "Residences contacted",
          "Status of each application",
        ],
      },
      {
        type: "p",
        text: "The file is prepared once and can then be used with several facilities. The family keeps control over which residences to contact and which information to share.",
      },
      {
        type: "p",
        text: "The service is free for families, in French and English.",
      },
      {
        type: "h3",
        text: "Artificial intelligence in service of families",
      },
      {
        type: "p",
        text: "HavenApply includes an assistant that uses artificial intelligence to guide users through the process.",
      },
      {
        type: "p",
        text: "The assistant can explain each step, help clarify the person's needs, flag missing information, simplify certain terms and prepare the family to speak with a residence.",
      },
      {
        type: "p",
        text: "It does not make medical diagnoses, decide on the family's behalf or take any admission decision. Residences remain fully responsible for evaluating the applications they receive.",
      },
      {
        type: "quote",
        text: "Artificial intelligence is often presented as complex or impersonal. We want to show it can do the opposite: explain, reassure and accompany families through a deeply human transition.",
        attribution: "Tom [last name], cofounder of HavenApply",
      },
      {
        type: "p",
        text: "The platform was designed to work across generations. Its interface favors plain language, progressive steps and clear navigation. An adult child, a caregiver or an older adult can prepare the file alone or with help from family.",
      },
      {
        type: "quote",
        text: "Technology should never replace the family, the advisor or residence staff. It should remove administrative barriers so everyone can spend more time with the person who needs care.",
        attribution: "Tom [last name], cofounder of HavenApply",
      },
      { type: "h3", text: "A solution for residences too" },
      {
        type: "p",
        text: "Residences that use HavenApply get a console to receive structured files, review their contents, track applications and communicate with families.",
      },
      {
        type: "p",
        text: "The goal is not to automate the admission decision, but to reduce incomplete information, repetitive outreach and the administrative work around first contact.",
      },
      {
        type: "p",
        text: "RQRA supplier status will let HavenApply present its solution to member managers and owners and keep developing it in contact with the sector's day-to-day realities.",
      },
      { type: "h3", text: "A new generation of Quebec solutions" },
      {
        type: "p",
        text: "HavenApply's launch comes as the cost of aging IT systems is drawing intense attention in Quebec.",
      },
      {
        type: "p",
        text: "According to a TVA Nouvelles investigation published on August 31, 2026, nearly $500 million has reportedly been spent since 2023 maintaining legacy human-resources systems in the health network.",
      },
      {
        type: "p",
        text: "Those systems do not serve the same purpose as HavenApply, an independent platform for families and RPAs. The situation still illustrates a broader issue: the financial and human costs of journeys built on fragmented or aging technology.",
      },
      {
        type: "p",
        text: "While the public network continues its large transformation projects, new Quebec companies are building focused solutions that can be deployed faster and offered directly to the public.",
      },
      {
        type: "p",
        text: "HavenApply is one example: a solution specialized in the path to RPAs, free for families and built around a practical use of artificial intelligence.",
      },
      {
        type: "link",
        label: "Read the investigation on the network's IT systems",
        href: pressAssets.tvaArticle,
      },
      { type: "h3", text: "About HavenApply" },
      {
        type: "p",
        text: "HavenApply is a Quebec technology company that simplifies searching for and applying to private seniors' residences.",
      },
      {
        type: "p",
        text: "Its bilingual platform lets families prepare a single file, find residences that match their loved one's needs and manage outreach from one place. HavenApply uses artificial intelligence to explain, organize and guide—without replacing human judgment.",
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
          { label: "Media contact", value: "hello@havenapply.com", href: pressAssets.mailto },
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
    blocks: [
      {
        type: "p",
        text: "When a parent loses autonomy, a family does not always have months to learn how private seniors' residences work.",
      },
      {
        type: "p",
        text: "They must determine the level of assistance needed, compare services, understand costs, visit facilities and check availability. On top of that come calls, forms, documents and the same information repeated to several contacts.",
      },
      {
        type: "p",
        text: "For a family already worried about a loved one's health, the residence search can quickly become another burden.",
      },
      { type: "p", text: "That is the problem HavenApply sets out to solve." },
      {
        type: "p",
        text: "The Quebec platform lets families prepare a single file that gathers needs, preferences and relevant information. That file can then support outreach to several residences.",
      },
      {
        type: "p",
        text: "Every active RPA in Quebec is available in the platform from launch. Facilities that use HavenApply directly can also receive and process files in their own console.",
      },
      {
        type: "h3",
        text: "An AI that explains rather than an AI that decides",
      },
      {
        type: "p",
        text: "Artificial intelligence sits at the center of HavenApply, but its role is deliberately limited.",
      },
      {
        type: "p",
        text: "It accompanies the user, explains steps and helps organize the file. It can, for example, flag that important information seems missing or help the family better define the person's daily needs.",
      },
      {
        type: "p",
        text: "It does not recommend a medical treatment, assess clinical eligibility or ever decide whether someone should be accepted into a residence.",
      },
      {
        type: "p",
        text: "That distinction matters. In a field this sensitive, artificial intelligence must support human judgment—not replace it.",
      },
      {
        type: "h3",
        text: "Reconciling technology and generations",
      },
      {
        type: "p",
        text: "New technologies are often built for people who already understand them. HavenApply takes the opposite approach: reduce technical vocabulary, break the process into simple steps and let several family members take part.",
      },
      {
        type: "p",
        text: "An older adult can use the platform themselves. An adult child or caregiver can also help prepare the file.",
      },
      {
        type: "p",
        text: "The goal is not to remove human interaction from the journey. It is to reduce time lost before those interactions and help families arrive better prepared when they speak with a residence.",
      },
      { type: "h3", text: "Recognition from the sector" },
      {
        type: "p",
        text: "HavenApply recently entered into an agreement as a supplier of the RQRA, an association representing nearly 800 members and about 108,000 rental units in Quebec.",
      },
      {
        type: "p",
        text: "For the young Montreal company, that recognition opens a direct dialogue with RPA managers and confirms the relevance of a tool dedicated to the admissions journey.",
      },
      {
        type: "p",
        text: "The platform remains free for families. Its development rests on collaboration with residences that want to modernize how they receive and track applications.",
      },
      {
        type: "h3",
        text: "Modernizing without building another heavy system",
      },
      {
        type: "p",
        text: "This arrival comes amid sharp criticism of public-network IT spending.",
      },
      {
        type: "p",
        text: "The roughly $500 million recently reported concerns old human-resources systems—a different domain from HavenApply's. The comparison is therefore not between two competing products.",
      },
      {
        type: "p",
        text: "It does reveal two realities of digital transformation. On one side, institutions must replace complex infrastructure used for decades. On the other, smaller companies can address a precise problem with lighter tools that are quickly available.",
      },
      {
        type: "p",
        text: "HavenApply belongs to that second category. Rather than replacing government medical or administrative systems, the company aims to simplify a particular moment: when a family starts looking for a residence and does not know where to begin.",
      },
    ],
  },
  numbers: {
    sectionLabel: "The problem in numbers",
    items: [
      {
        value: "≈ 800",
        description: "members",
        detail:
          "The RQRA brings together nearly 800 members—managers and owners of RPAs across Quebec.",
      },
      {
        value: "≈ 108,000",
        description: "rental units",
        detail: "Association members represent nearly 108,000 rental units.",
      },
      {
        value: "All",
        description: "active RPAs",
        detail:
          "From launch, HavenApply makes available the active RPAs listed in Quebec's public registry.",
        accent: true,
      },
      {
        value: "$0",
        description: "for families",
        detail:
          "No subscription or payment is required for a family to prepare a file and use the search journey.",
        accent: true,
      },
    ],
  },
  faq: {
    sectionLabel: "FAQ",
    title: "Frequently asked questions from journalists",
    items: [
      {
        q: "Does the RQRA own HavenApply?",
        a: "No. HavenApply is an independent company that entered into an agreement as a supplier of the RQRA.",
      },
      {
        q: "Does the RQRA recommend HavenApply to all of its residences?",
        a: "HavenApply is recognized under the RQRA supplier program. Each residence remains free to choose the tools and suppliers it uses.",
      },
      {
        q: "Do all residences already use HavenApply?",
        a: "All active RPAs are available in the search journey from launch. Use of the HavenApply professional console depends on each residence's individual signup.",
      },
      {
        q: "How does HavenApply use artificial intelligence?",
        a: "The AI explains steps, helps organize information and accompanies the user. It does not make diagnoses or take admission decisions.",
      },
      {
        q: "Is the service truly free?",
        a: "Yes, HavenApply is free for families. [Add a transparent sentence on how residences pay or will pay HavenApply.]",
      },
      {
        q: "How are residences recommended?",
        a: "[Add real criteria: location, budget, autonomy level, services, declared availability, and others. State clearly whether a residence's payment influences ranking.]",
      },
    ],
  },
  kit: {
    sectionLabel: "Media kit",
    title: "Identity and resources for the press",
    brandLineLabel: "Brand line",
    brandLine: "Artificial intelligence in service of families—never in their place.",
    logoLightAlt: "HavenApply logo on light background",
    logoDarkPlaceholder: "[reversed (white) version to provide]",
    usage:
      "Clear space equal to the height of the symbol. No distortion, no recoloring, no added shapes. Reversed version required on dark backgrounds.",
    download: "Download logo (PNG)",
    colorsLabel: "Colors",
    colors: colorsEn,
    typeLabel: "Typography",
    serifName: "Source Serif 4",
    serifCaption: "Headlines and long-form text",
    sansName: "Public Sans",
    sansCaption: "Interface, labels, figures",
    brandLabel: "Brand name",
    brandRule:
      "Written as HavenApply, one word, capital H and A; never “Haven Apply” or “HAVENAPPLY”.",
    resourcesLabel: "Resources to add to the kit",
    resources: resourcesEn,
  },
  contact: {
    sectionLabel: "Media contact",
    title: "Interviews and press requests",
    body: "Tom [last name], cofounder, is available in French and English, in Montreal or remotely. We can arrange a product demonstration or, with their consent, an introduction to a family or residence.",
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
    feature: "feature",
    numbers: "numbers",
    faq: "faq",
    brand: "brand",
  },
};

export const press = {
  fr: pressFr,
  en: pressEn,
} as const;
