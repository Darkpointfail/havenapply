export type NavItem = {
  href: string;
  label: string;
};

/** Top-level header group — main title with nested destinations */
export type NavGroup = {
  id: string;
  label: string;
  /** Primary href when clicking the main title (or first child) */
  href: string;
  children: NavItem[];
};

export const publicNav: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/find-senior-living", label: "Find Senior Living" },
  { href: "/for-families", label: "For Families" },
  { href: "/for-communities", label: "For Communities" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
];

export const publicAuthLinks = {
  signIn: "/sign-in",
  getStarted: "/get-started",
};

/** Flat list kept for redirects / mobile — prefer familyNavGroups in the header */
export const familyNav: NavItem[] = [
  { href: "/family/dashboard", label: "Dashboard" },
  { href: "/family/senior-profile", label: "Senior Profile" },
  { href: "/family/care-needs", label: "Care Needs" },
  { href: "/family/documents", label: "Documents" },
  { href: "/family/find-communities", label: "Find Communities" },
  { href: "/family/saved", label: "Saved Communities" },
  { href: "/family/compare", label: "Compare" },
  { href: "/family/apply-multi", label: "Multi-Apply" },
  { href: "/family/applications", label: "Applications" },
  { href: "/family/messages", label: "Messages" },
  { href: "/family/tasks", label: "Tasks" },
  { href: "/family/family-members", label: "Family Members" },
  { href: "/family/notifications", label: "Notifications" },
  { href: "/family/privacy", label: "Privacy" },
  { href: "/family/settings", label: "Settings" },
];

/**
 * Family header: few main titles; destinations live underneath.
 * Home · Profile · Communities · Applications · Messages · Account
 */
export const familyNavGroups: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    href: "/family/dashboard",
    children: [{ href: "/family/dashboard", label: "Dashboard" }],
  },
  {
    id: "profile",
    label: "Profile",
    href: "/family/senior-profile",
    children: [
      { href: "/family/senior-profile", label: "Senior profile" },
      { href: "/family/care-needs", label: "Care needs" },
      { href: "/family/documents", label: "Documents" },
      { href: "/family/family-members", label: "Family members" },
    ],
  },
  {
    id: "communities",
    label: "Communities",
    href: "/family/find-communities",
    children: [
      { href: "/family/find-communities", label: "Find communities" },
      { href: "/family/saved", label: "Saved" },
      { href: "/family/compare", label: "Compare" },
    ],
  },
  {
    id: "applications",
    label: "Applications",
    href: "/family/applications",
    children: [
      { href: "/family/applications", label: "Track applications" },
      { href: "/family/apply-multi", label: "Multi-apply" },
      { href: "/family/tasks", label: "Tasks" },
    ],
  },
  {
    id: "messages",
    label: "Messages",
    href: "/family/messages",
    children: [{ href: "/family/messages", label: "Inbox" }],
  },
  {
    id: "account",
    label: "Account",
    href: "/family/settings",
    children: [
      { href: "/family/notifications", label: "Notifications" },
      { href: "/family/privacy", label: "Privacy & security" },
      { href: "/family/settings", label: "Settings" },
    ],
  },
];

/** Bottom bar — most used family destinations */
export const familyMobileNav: NavItem[] = [
  { href: "/family/dashboard", label: "Home" },
  { href: "/family/find-communities", label: "Search" },
  { href: "/family/applications", label: "Apps" },
  { href: "/family/documents", label: "Docs" },
  { href: "/family/messages", label: "Inbox" },
];

export const communityNav: NavItem[] = [
  { href: "/community/dashboard", label: "Dashboard" },
  { href: "/community/applications", label: "Applications" },
  { href: "/community/prospects", label: "Prospects" },
  { href: "/community/messages", label: "Messages" },
  { href: "/community/availability", label: "Availability" },
  { href: "/community/pricing", label: "Pricing" },
  { href: "/community/admission-criteria", label: "Admission Criteria" },
  { href: "/community/profile", label: "Community Profile" },
  { href: "/community/team", label: "Team" },
  { href: "/community/analytics", label: "Analytics" },
  { href: "/community/settings", label: "Settings" },
];

/** Community header: few main titles with nested destinations */
export const communityNavGroups: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    href: "/community/dashboard",
    children: [
      { href: "/community/dashboard", label: "Dashboard" },
      { href: "/community/analytics", label: "Analytics" },
    ],
  },
  {
    id: "admissions",
    label: "Admissions",
    href: "/community/applications",
    children: [
      { href: "/community/applications", label: "Applications" },
      { href: "/community/prospects", label: "Prospects" },
      { href: "/community/messages", label: "Messages" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/community/availability",
    children: [
      { href: "/community/availability", label: "Availability" },
      { href: "/community/pricing", label: "Pricing" },
    ],
  },
  {
    id: "listing",
    label: "Listing",
    href: "/community/profile",
    children: [
      { href: "/community/profile", label: "Community profile" },
      { href: "/community/admission-criteria", label: "Admission criteria" },
    ],
  },
  {
    id: "team",
    label: "Team",
    href: "/community/team",
    children: [
      { href: "/community/team", label: "Team & roles" },
      { href: "/community/settings", label: "Settings" },
    ],
  },
];

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
