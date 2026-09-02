import type { Locale } from "@/lib/i18n/messages";
import {
  COLLECTION_NOTICE_ACCOUNT,
  COLLECTION_NOTICE_PROFILE,
  PRIVACY_POLICY,
  SIGNUP_TERMS_LABEL,
  type PrivacySection,
} from "@/content/legal/privacy-fr";
import {
  COLLECTION_NOTICE_ACCOUNT_EN,
  COLLECTION_NOTICE_PROFILE_EN,
  COLLECTION_PAGE_EN,
  PRIVACY_POLICY_EN,
  SIGNUP_TERMS_LABEL_EN,
  TERMS_OF_USE_EN,
} from "@/content/legal/privacy-en";

export type { PrivacySection };

export function legalLocale(locale: string | null | undefined): Locale {
  return locale === "en" ? "en" : "fr";
}

export function getPrivacyPolicy(locale: Locale) {
  return locale === "en" ? PRIVACY_POLICY_EN : PRIVACY_POLICY;
}

export function getCollectionNotice(locale: Locale, variant: "account" | "profile") {
  if (locale === "en") {
    return variant === "account" ? COLLECTION_NOTICE_ACCOUNT_EN : COLLECTION_NOTICE_PROFILE_EN;
  }
  return variant === "account" ? COLLECTION_NOTICE_ACCOUNT : COLLECTION_NOTICE_PROFILE;
}

export function getSignupTermsLabel(locale: Locale) {
  return locale === "en" ? SIGNUP_TERMS_LABEL_EN : SIGNUP_TERMS_LABEL;
}

export function getTermsOfUse(locale: Locale) {
  if (locale === "en") return TERMS_OF_USE_EN;
  return {
    title: "Conditions d'utilisation",
    draftBanner:
      "Brouillon produit. Ce texte cadre l'usage du service et doit être validé juridiquement avant une version définitive.",
    paragraphs: [
      "HavenApply fournit une plateforme numérique pour aider les familles québécoises à préparer un dossier de recherche et d'admission en résidence privée pour aînés.",
      "Vous êtes responsable de l'exactitude des renseignements que vous saisissez et de la légitimité de votre accès aux renseignements d'une personne aînée que vous accompagnez.",
      "HavenApply ne remplace pas un avis médical, juridique ou financier. Les résidences demeurent responsables de leurs décisions d'admission.",
      "Le traitement des renseignements personnels est décrit dans la politique de confidentialité.",
      "Nous pouvons suspendre un compte en cas d'usage abusif, frauduleux ou contraire à la sécurité des personnes concernées.",
    ],
  };
}

export function getCollectionPageCopy(locale: Locale) {
  if (locale === "en") return COLLECTION_PAGE_EN;
  return {
    title: "Avis de collecte",
    intro:
      "Ces avis sont présentés au moment où HavenApply vous demande des renseignements. Ils précisent la finalité de la collecte. La création d'un compte ou d'un dossier n'autorise pas la transmission à une résidence.",
  };
}

export function privacyPath(locale: Locale) {
  return locale === "en" ? "/privacy" : "/confidentialite";
}

export function collectionPath(locale: Locale) {
  return locale === "en" ? "/collection-notice" : "/avis-de-collecte";
}

export function termsPath(locale: Locale) {
  return locale === "en" ? "/terms" : "/conditions";
}

export function rightsPath(locale: Locale) {
  return locale === "en" ? "/family/rights" : "/family/droits";
}
