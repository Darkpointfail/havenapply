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
  { href: "/#comment", label: "Comment ça marche" },
  { href: "/get-started", label: "Commencer" },
  { href: "/contact", label: "Contact" },
];

export const publicAuthLinks = {
  signIn: "/sign-in",
  register: "/get-started",
  getStarted: "/get-started",
};

/**
 * Primary family journey — the product UI is FamilySpace at /family/dashboard.
 * Account destinations (settings, privacy, members) stay reachable from the avatar menu.
 */
export const familyNav: NavItem[] = [
  { href: "/family/dashboard", label: "Accueil" },
  { href: "/family/settings", label: "Paramètres" },
  { href: "/family/privacy", label: "Confidentialité" },
];

/**
 * Header groups for remaining family account pages (settings, privacy, etc.).
 * Journey pages redirect into FamilySpace and no longer need nested portal nav.
 */
export const familyNavGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Accueil",
    href: "/family/dashboard",
    children: [{ href: "/family/dashboard", label: "Espace famille" }],
  },
  {
    id: "account",
    label: "Compte",
    href: "/family/settings",
    children: [
      { href: "/family/settings", label: "Paramètres" },
      { href: "/family/privacy", label: "Confidentialité et données" },
      { href: "/family/notifications", label: "Notifications" },
      { href: "/family/family-members", label: "Membres de la famille" },
    ],
  },
];

/** Bottom bar — FamilySpace owns in-app navigation; Accueil for account pages. */
export const familyMobileNav: NavItem[] = [
  { href: "/family/dashboard", label: "Accueil" },
  { href: "/family/settings", label: "Paramètres" },
  { href: "/family/privacy", label: "Confidentialité" },
];

/**
 * Community portal, intelligent admissions inbox.
 * Console · Transition · History · Messages · Community · Team
 */
export const communityNav: NavItem[] = [
  { href: "/community/dashboard", label: "Console" },
  { href: "/community/transition", label: "Transition" },
  { href: "/community/applications?filter=history", label: "History" },
  { href: "/community/messages", label: "Messages" },
  { href: "/community/profile", label: "Community" },
  { href: "/community/team", label: "Team" },
];

/** Flat nav only, no nested groups for the admissions portal */
export const communityNavGroups: NavGroup[] = [];

export const internalNav: NavItem[] = [
  { href: "/internal/overview", label: "Overview" },
  { href: "/internal/users", label: "Users" },
  { href: "/internal/families", label: "Families" },
  { href: "/internal/seniors", label: "Seniors" },
  { href: "/internal/communities", label: "Communities" },
  { href: "/internal/applications", label: "Applications" },
  { href: "/internal/documents", label: "Documents" },
  { href: "/internal/messages", label: "Messages" },
  { href: "/internal/reports", label: "Reports" },
  { href: "/internal/content", label: "Content" },
  { href: "/internal/audit-logs", label: "Audit Logs" },
  { href: "/internal/settings", label: "Settings" },
];

/** Internal header: few main titles with nested destinations */
export const internalNavGroups: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    href: "/internal/overview",
    children: [
      { href: "/internal/overview", label: "Overview" },
      { href: "/internal/reports", label: "Analytics" },
    ],
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
    id: "governance",
    label: "Governance",
    href: "/internal/content",
    children: [
      { href: "/internal/content", label: "Moderation" },
      { href: "/internal/audit-logs", label: "Audit logs" },
      { href: "/internal/settings", label: "Settings" },
    ],
  },
];

/**
 * Care professional portal, discharge planners, social workers, care coordinators.
 * Focus: patients, placement status, applications, messages, facility contacts.
 */
export const professionalNav: NavItem[] = [
  { href: "/professional/dashboard", label: "Dashboard" },
  { href: "/professional/patients", label: "Patients" },
  { href: "/professional/applications", label: "Applications" },
  { href: "/professional/messages", label: "Messages" },
  { href: "/professional/communities", label: "Communities" },
  { href: "/professional/contacts", label: "Contacts" },
  { href: "/professional/organization", label: "My Organization" },
];

export const familyHome = "/family/dashboard";
export const communityHome = "/community/dashboard";
export const internalHome = "/internal/overview";
export const professionalHome = "/professional/dashboard";
