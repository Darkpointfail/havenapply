/**
 * Textes publics Loi 25 — brouillons produits à faire valider par un avocat québécois.
 * Ne pas présenter comme une conformité certifiée.
 */

export const PRIVACY_POLICY_VERSION = "2026-08-29-v1";
export const PRIVACY_POLICY_EFFECTIVE_DATE = "29 août 2026";

export const COLLECTION_NOTICE_ACCOUNT_VERSION = "2026-08-29-account-v1";
export const COLLECTION_NOTICE_PROFILE_VERSION = "2026-08-29-profile-v1";

/** Court avis à l'inscription (compte) */
export const COLLECTION_NOTICE_ACCOUNT = {
  version: COLLECTION_NOTICE_ACCOUNT_VERSION,
  title: "Avis de collecte : création de compte",
  body: `HavenApply (Québec) collecte votre prénom, nom, adresse courriel et, le cas échéant, votre numéro de téléphone pour créer et sécuriser votre compte famille, vous authentifier et vous communiquer des informations liées au service. Ces renseignements ne sont pas transmis à une résidence privée pour aînés du seul fait de la création du compte.`,
};

/** Court avis avant / pendant la création du dossier */
export const COLLECTION_NOTICE_PROFILE = {
  version: COLLECTION_NOTICE_PROFILE_VERSION,
  title: "Avis de collecte : dossier familial",
  body: `Nous collectons les renseignements du demandeur et de la personne aînée (identité, coordonnées, situation de logement, besoins, préférences, documents) uniquement pour constituer et conserver votre dossier de recherche de résidence privée pour aînés. La création du dossier n'autorise pas sa transmission à une résidence : un consentement distinct sera exigé plus tard, le cas échéant.`,
};

export type PrivacySection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const PRIVACY_POLICY = {
  version: PRIVACY_POLICY_VERSION,
  effectiveDate: PRIVACY_POLICY_EFFECTIVE_DATE,
  title: "Politique de confidentialité",
  subtitle: "HavenApply : protection des renseignements personnels (Québec)",
  legalDraftBanner:
    "Brouillon produit (version " +
    PRIVACY_POLICY_VERSION +
    "). Ce texte décrit nos pratiques prévues ; il doit être validé par un conseiller juridique québécois avant d'être présenté comme définitif.",
  sections: [
    {
      id: "responsable",
      title: "1. Qui est responsable",
      paragraphs: [
        "HavenApply est le service responsable de la collecte et de l'utilisation des renseignements personnels décrits dans cette politique, dans le cadre de la simplification de la recherche et de l'admission en résidence privée pour aînés au Québec.",
        "Pour toute question relative à la confidentialité ou pour exercer vos droits : privacy@havenapply.com (adresse à confirmer avant mise en production).",
      ],
    },
    {
      id: "finalites",
      title: "2. Finalités de la collecte",
      paragraphs: [
        "Nous collectons des renseignements personnels uniquement pour les finalités suivantes :",
      ],
      bullets: [
        "créer et gérer votre compte utilisateur ;",
        "constituer, conserver et mettre à jour le dossier de la personne aînée que vous accompagnez ;",
        "calculer la complétude du dossier et vous guider dans les prochaines étapes ;",
        "stocker de façon sécurisée les documents que vous téléversez ;",
        "enregistrer vos consentements (création/conservation du profil ; transmission future à une résidence, lorsqu'elle sera activée) ;",
        "répondre à vos demandes (soutien, droits d'accès, correction, suppression) ;",
        "assurer la sécurité du service (authentification, prévention des accès non autorisés).",
      ],
    },
    {
      id: "categories",
      title: "3. Quelles données nous collectons",
      paragraphs: [
        "Selon ce que vous choisissez de fournir, nous pouvons traiter :",
      ],
      bullets: [
        "identité et coordonnées du demandeur (prénom, nom, courriel, téléphone, lien avec la personne aînée, préférences de communication et de langue) ;",
        "renseignements sur la personne aînée (identité, date de naissance, adresse, situation de logement, urgence, besoins et préférences) ;",
        "documents (pièces d'identité, bilans, listes de médicaments, etc.) et métadonnées associées ;",
        "consentements (objet, version, date, retrait) ;",
        "données techniques de session nécessaires à la connexion sécurisée.",
      ],
    },
    {
      id: "transmission",
      title: "4. Transmission à une résidence",
      paragraphs: [
        "La création d'un compte ou d'un dossier n'autorise pas automatiquement la transmission de vos renseignements à une résidence.",
        "Lorsque cette fonctionnalité sera offerte, un consentement distinct, explicite et non précoché sera exigé avant tout partage avec un établissement. Vous pourrez retirer un consentement de transmission pour l'avenir, sous réserve des obligations légales ou des traitements déjà effectués.",
      ],
    },
    {
      id: "conservation",
      title: "5. Conservation",
      paragraphs: [
        "Nous conservons vos renseignements aussi longtemps que votre compte est actif et que le dossier est nécessaire aux finalités ci-dessus, puis pour la durée minimale requise pour répondre à nos obligations légales ou de sécurité.",
        "Durées cibles (à confirmer juridiquement) : compte et dossier actifs : durée de la relation ; après demande de suppression ou inactivité prolongée : anonymisation ou suppression dans un délai raisonnable une fois la demande traitée ; journaux de sécurité : durée limitée au besoin de détection et d'enquête.",
        "Vous pouvez demander la suppression de votre profil ou de votre compte depuis l'espace famille. La demande est enregistrée et traitée ; certains éléments peuvent être conservés de façon limitée si la loi l'exige.",
      ],
    },
    {
      id: "droits",
      title: "6. Vos droits (Loi 25)",
      paragraphs: [
        "Sous réserve des exceptions prévues par la loi, vous pouvez notamment :",
      ],
      bullets: [
        "accéder aux renseignements personnels que nous détenons sur vous ;",
        "demander la rectification de renseignements inexacts ;",
        "retirer un consentement pour l'avenir, lorsque applicable ;",
        "demander la suppression ou la désindexation dans les cas prévus ;",
        "être informé des finalités avant une nouvelle collecte.",
      ],
    },
    {
      id: "securite",
      title: "7. Sécurité",
      paragraphs: [
        "Nous appliquons des mesures raisonnables : authentification, contrôle d'accès, chiffrement en transit (HTTPS), stockage des documents hors URL publique permanente, et journalisation des opérations sensibles lorsque disponible.",
        "Aucun système n'est exempt de risque. En cas d'incident susceptible de présenter un préjudice sérieux, nous suivrons les obligations applicables de notification.",
      ],
    },
    {
      id: "sous-traitants",
      title: "8. Fournisseurs et hébergement",
      paragraphs: [
        "Des fournisseurs techniques peuvent traiter des données pour notre compte (par exemple authentification, base de données et stockage de fichiers). Nous sélectionnons des fournisseurs offrant des mesures de sécurité appropriées et encadrons ces traitements par des ententes lorsque requis.",
        "La région d'hébergement exacte (p. ex. fournisseur cloud / Supabase) doit être confirmée et communiquée clairement avant la mise en production publique.",
      ],
    },
    {
      id: "mineurs",
      title: "9. Personnes mineures",
      paragraphs: [
        "Le service s'adresse aux adultes qui accompagnent une personne aînée ou qui cherchent une résidence pour eux-mêmes. Il n'est pas destiné à la collecte de renseignements auprès de personnes mineures.",
      ],
    },
    {
      id: "modifs",
      title: "10. Modifications",
      paragraphs: [
        "Nous pouvons mettre à jour cette politique. La version et la date d'entrée en vigueur sont indiquées en tête de page. En cas de changement important des finalités, nous vous en informerons de façon appropriée et recueillerons un nouveau consentement si la loi l'exige.",
      ],
    },
  ] satisfies PrivacySection[],
};

/** Case à cocher inscription — libellé sans promesse de conformité certifiée */
export const SIGNUP_TERMS_LABEL = {
  beforeLinks: "J'ai lu et j'accepte ",
  termsLink: "les conditions d'utilisation",
  mid: " et la ",
  privacyLink: "politique de confidentialité",
  after: ", y compris l'avis de collecte lié à la création de mon compte.",
};
