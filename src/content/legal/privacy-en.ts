/**
 * Public Law 25 texts — English product drafts for bilingual users.
 * Must be reviewed by Québec counsel before being treated as final.
 */

import type { PrivacySection } from "@/content/legal/privacy-fr";
import {
  PRIVACY_POLICY_VERSION,
  COLLECTION_NOTICE_ACCOUNT_VERSION,
  COLLECTION_NOTICE_PROFILE_VERSION,
} from "@/content/legal/privacy-fr";

export const PRIVACY_POLICY_EFFECTIVE_DATE_EN = "August 29, 2026";

export const COLLECTION_NOTICE_ACCOUNT_EN = {
  version: COLLECTION_NOTICE_ACCOUNT_VERSION,
  title: "Collection notice: account creation",
  body: `HavenApply (Québec) collects your first name, last name, email address and, where applicable, your phone number to create and secure your family account, authenticate you, and send you service-related information. Creating an account alone does not transmit these details to a private seniors' residence.`,
};

export const COLLECTION_NOTICE_PROFILE_EN = {
  version: COLLECTION_NOTICE_PROFILE_VERSION,
  title: "Collection notice: family file",
  body: `We collect information about the applicant and the senior (identity, contact details, housing situation, needs, preferences, documents) only to build and retain your private seniors' residence search file. Creating the file does not authorize transmission to a residence: a separate consent will be required later, if applicable.`,
};

export const PRIVACY_POLICY_EN = {
  version: PRIVACY_POLICY_VERSION,
  effectiveDate: PRIVACY_POLICY_EFFECTIVE_DATE_EN,
  title: "Privacy policy",
  subtitle: "HavenApply: protection of personal information (Québec)",
  legalDraftBanner:
    "Product draft (version " +
    PRIVACY_POLICY_VERSION +
    "). This text describes our intended practices; it must be validated by Québec legal counsel before being presented as final.",
  sections: [
    {
      id: "responsable",
      title: "1. Who is responsible",
      paragraphs: [
        "HavenApply is responsible for collecting and using the personal information described in this policy, to simplify searching for and applying to private seniors' residences in Québec.",
        "For privacy questions or to exercise your rights: privacy@havenapply.com (address to confirm before production).",
      ],
    },
    {
      id: "finalites",
      title: "2. Purposes of collection",
      paragraphs: [
        "We collect personal information only for the following purposes:",
      ],
      bullets: [
        "create and manage your user account;",
        "build, retain, and update the file of the senior you support;",
        "calculate file completeness and guide next steps;",
        "store documents you upload securely;",
        "record your consents (creating/retaining the profile; future transmission to a residence, when enabled);",
        "respond to your requests (support, access, correction, deletion);",
        "secure the service (authentication, unauthorized-access prevention).",
      ],
    },
    {
      id: "categories",
      title: "3. What data we collect",
      paragraphs: [
        "Depending on what you choose to provide, we may process:",
      ],
      bullets: [
        "applicant identity and contact details (name, email, phone, relationship to the senior, communication and language preferences);",
        "senior information (identity, date of birth, address, housing situation, urgency, needs and preferences);",
        "documents (ID, medical summaries, medication lists, etc.) and related metadata;",
        "consents (purpose, version, date, withdrawal);",
        "technical session data needed for secure sign-in.",
      ],
    },
    {
      id: "transmission",
      title: "4. Transmission to a residence",
      paragraphs: [
        "Creating an account or a file does not automatically authorize sharing your information with a residence.",
        "When that feature is offered, a separate, explicit, unchecked consent will be required before any share with an establishment. You may withdraw future transmission consent, subject to legal obligations or processing already completed.",
      ],
    },
    {
      id: "conservation",
      title: "5. Retention",
      paragraphs: [
        "We keep your information while your account is active and the file is needed for the purposes above, then for the minimum period required for legal or security obligations.",
        "Target periods (to confirm legally): active account and file: for the relationship; after a deletion request or prolonged inactivity: anonymization or deletion within a reasonable time once processed; security logs: limited to detection and investigation needs.",
        "You can request deletion of your profile or account from the family space. The request is recorded and processed; some elements may be kept in a limited way if the law requires it.",
      ],
    },
    {
      id: "droits",
      title: "6. Your rights (Québec Law 25)",
      paragraphs: [
        "Subject to exceptions provided by law, you may notably:",
      ],
      bullets: [
        "access the personal information we hold about you;",
        "request correction of inaccurate information;",
        "withdraw consent for the future, where applicable;",
        "request deletion or de-indexing in cases provided by law;",
        "be informed of purposes before a new collection.",
      ],
    },
    {
      id: "securite",
      title: "7. Security",
      paragraphs: [
        "We apply reasonable measures: authentication, access control, encryption in transit (HTTPS), document storage without permanent public URLs, and logging of sensitive operations when available.",
        "No system is risk-free. If an incident may cause serious harm, we will follow applicable notification duties.",
      ],
    },
    {
      id: "sous-traitants",
      title: "8. Providers and hosting",
      paragraphs: [
        "Technical providers may process data on our behalf (for example authentication, database, and file storage). We select providers with appropriate security measures and frame these arrangements with agreements when required.",
        "The exact hosting region (e.g. cloud provider / Supabase) must be confirmed and clearly communicated before public production.",
      ],
    },
    {
      id: "mineurs",
      title: "9. Minors",
      paragraphs: [
        "The service is for adults supporting a senior or looking for a residence for themselves. It is not intended to collect information from minors.",
      ],
    },
    {
      id: "modifs",
      title: "10. Changes",
      paragraphs: [
        "We may update this policy. The version and effective date appear at the top of the page. For material purpose changes, we will inform you appropriately and collect a new consent if the law requires it.",
      ],
    },
  ] satisfies PrivacySection[],
};

export const SIGNUP_TERMS_LABEL_EN = {
  beforeLinks: "I have read and accept ",
  termsLink: "the terms of use",
  mid: " and the ",
  privacyLink: "privacy policy",
  after: ", including the collection notice for creating my account.",
};

export const TERMS_OF_USE_EN = {
  title: "Terms of use",
  draftBanner:
    "Product draft. This text frames use of the service and must be legally validated before a final version.",
  paragraphs: [
    "HavenApply provides a digital platform to help Québec families prepare a search and admission file for private seniors' residences.",
    "You are responsible for the accuracy of the information you enter and for the legitimacy of your access to a senior's information when you support someone else.",
    "HavenApply does not replace medical, legal, or financial advice. Residences remain responsible for their admission decisions.",
    "How personal information is handled is described in the privacy policy.",
    "We may suspend an account in case of abusive, fraudulent, or unsafe use.",
  ],
};

export const COLLECTION_PAGE_EN = {
  title: "Collection notices",
  intro:
    "These notices appear when HavenApply asks you for information. They state the purpose of collection. Creating an account or a file does not authorize transmission to a residence.",
};
