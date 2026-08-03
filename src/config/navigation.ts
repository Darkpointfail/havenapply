/**
 * HavenApply navigation — MVP only.
 *
 * Pillars: shared dossier · documents · admission workflow ·
 * communication · collaboration · AI assistance (non-clinical).
 */

export type NavItem = {
  href: string;
  label: string;
};

/** Top-level header group, main title with nested destinations */
export type NavGroup = {
  id: string;
  label: string;
  /** Primary href when clicking the main title (or first child) */
  href: string;
  children: NavItem[];
};

export const publicNav: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/for-families", label: "For Families" },
  { href: "/for-communities", label: "For Communities" },
  { href: "/contact", label: "Contact" },
];

export const publicAuthLinks = {
  signIn: "/sign-in",
  register: "/get-started",
  getStarted: "/get-started",
};

/**
 * Family journey: Dossier → Apply → Track → Collaborate
 */
export const familyNav: NavItem[] = [
  { href: "/family/dashboard", label: "Home" },
  { href: "/family/dossier", label: "Dossier" },
  { href: "/family/applications", label: "Applications" },
  { href: "/family/messages", label: "Messages" },
];

export const familyNavGroups: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    href: "/family/dashboard",
    children: [{ href: "/family/dashboard", label: "Home" }],
  },
  {
    id: "dossier",
    label: "Dossier",
    href: "/family/dossier",
    children: [
      { href: "/family/dossier", label: "Resident dossier" },
      { href: "/family/profile?tab=documents", label: "Documents" },
    ],
  },
  {
    id: "applications",
    label: "Applications",
    href: "/family/applications",
    children: [
      { href: "/family/applications", label: "My applications" },
      { href: "/family/communities", label: "Choose communities" },
    ],
  },
  {
    id: "collaborate",
    label: "Collaborate",
    href: "/family/messages",
    children: [
      { href: "/family/messages", label: "Messages" },
      { href: "/family/family-members", label: "Family members" },
    ],
  },
  {
    id: "account",
    label: "Account",
    href: "/family/settings",
    children: [
      { href: "/family/settings", label: "Settings" },
      { href: "/family/privacy", label: "Privacy" },
    ],
  },
];

/** Bottom bar mirrors the four MVP pillars for families */
export const familyMobileNav: NavItem[] = [
  { href: "/family/dashboard", label: "Home" },
  { href: "/family/dossier", label: "Dossier" },
  { href: "/family/applications", label: "Applications" },
  { href: "/family/messages", label: "Messages" },
];

/**
 * Community portal: admissions inbox only.
 */
export const communityNav: NavItem[] = [
  { href: "/community/dashboard", label: "Admissions" },
  { href: "/community/applications", label: "Applications" },
  { href: "/community/messages", label: "Messages" },
  { href: "/community/team", label: "Team" },
  { href: "/community/profile", label: "Community" },
];

export const communityNavGroups: NavGroup[] = [];

/** Internal ops for the admissions loop — no analytics/content CRM */
export const internalNav: NavItem[] = [
  { href: "/internal/overview", label: "Overview" },
  { href: "/internal/users", label: "Users" },
  { href: "/internal/families", label: "Families" },
  { href: "/internal/seniors", label: "Seniors" },
  { href: "/internal/communities", label: "Communities" },
  { href: "/internal/applications", label: "Applications" },
  { href: "/internal/documents", label: "Documents" },
  { href: "/internal/messages", label: "Messages" },
  { href: "/internal/settings", label: "Settings" },
];

export const internalNavGroups: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    href: "/internal/overview",
    children: [{ href: "/internal/overview", label: "Overview" }],
  },
  {
    id: "people",
    label: "People",
    href: "/internal/users",
    children: [
      { href: "/internal/users", label: "Users" },
      { href: "/internal/families", label: "Families" },
      { href: "/internal/seniors", label: "Seniors" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    href: "/internal/communities",
    children: [
      { href: "/internal/communities", label: "Communities" },
      { href: "/internal/applications", label: "Applications" },
      { href: "/internal/documents", label: "Documents" },
      { href: "/internal/messages", label: "Messages" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/internal/settings",
    children: [{ href: "/internal/settings", label: "Settings" }],
  },
];

/**
 * Care professional: patients (dossier) → apply → track → message.
 */
export const professionalNav: NavItem[] = [
  { href: "/professional/dashboard", label: "Dashboard" },
  { href: "/professional/patients", label: "Patients" },
  { href: "/professional/applications", label: "Applications" },
  { href: "/professional/messages", label: "Messages" },
  { href: "/professional/communities", label: "Communities" },
  { href: "/professional/organization", label: "Organization" },
];

export const familyHome = "/family/dashboard";
export const communityHome = "/community/dashboard";
export const internalHome = "/internal/overview";
export const professionalHome = "/professional/dashboard";
