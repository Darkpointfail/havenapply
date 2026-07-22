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
  { href: "/find-senior-living", label: "Find Senior Living" },
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
 * Primary family journey, keep this short.
 * Dashboard → Profile → Communities → My applications
 * Apply happens on each community profile.
 */
export const familyNav: NavItem[] = [
  { href: "/family/dashboard", label: "Dashboard" },
  { href: "/family/profile", label: "Profile" },
  { href: "/family/find-communities", label: "Communities" },
  { href: "/family/applications", label: "My applications" },
];

/**
 * Header: four journey steps. Account lives on the user name in the header.
 */
export const familyNavGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/family/dashboard",
    children: [{ href: "/family/dashboard", label: "Home" }],
  },
  {
    id: "profile",
    label: "Profile",
    href: "/family/profile",
    children: [
      { href: "/family/profile", label: "Manage profile" },
      { href: "/family/profile?tab=documents", label: "Documents" },
    ],
  },
  {
    id: "communities",
    label: "Communities",
    href: "/family/find-communities",
    children: [
      { href: "/family/find-communities", label: "Browse communities" },
      { href: "/family/saved", label: "Saved" },
      { href: "/family/compare", label: "Compare" },
    ],
  },
  {
    id: "applications",
    label: "My applications",
    href: "/family/applications",
    children: [
      { href: "/family/applications", label: "My applications" },
      { href: "/family/messages", label: "Messages" },
    ],
  },
  {
    id: "account",
    label: "Account",
    href: "/family/settings",
    children: [
      { href: "/family/notifications", label: "Notifications" },
      { href: "/family/family-members", label: "Family members" },
      { href: "/family/privacy", label: "Privacy & security" },
      { href: "/family/settings", label: "Settings" },
    ],
  },
];

/** Bottom bar, mirrors the four journey steps */
export const familyMobileNav: NavItem[] = [
  { href: "/family/dashboard", label: "Home" },
  { href: "/family/profile", label: "Profile" },
  { href: "/family/find-communities", label: "Communities" },
  { href: "/family/applications", label: "My applications" },
];

/**
 * Community portal, intelligent admissions inbox.
 * Admissions · Messages · Community · Team · Settings
 */
export const communityNav: NavItem[] = [
  { href: "/community/dashboard", label: "Admissions" },
  { href: "/community/messages", label: "Messages" },
  { href: "/community/profile", label: "Community" },
  { href: "/community/team", label: "Team" },
  { href: "/community/settings", label: "Settings" },
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

export const familyHome = "/family/dashboard";
export const communityHome = "/community/dashboard";
export const internalHome = "/internal/overview";
