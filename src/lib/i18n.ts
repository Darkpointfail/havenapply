export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

type Dict = Record<string, string>;

const fr: Dict = {
  appName: "HavenApply",
  tagline: "Demandes d'admission famille ↔ résidence",
  home: "Accueil",
  signIn: "Connexion",
  signUp: "Inscription",
  forgotPassword: "Mot de passe oublié",
  signOut: "Déconnexion",
  familyDashboard: "Espace famille",
  staffDashboard: "Espace résidence",
  email: "Courriel",
  password: "Mot de passe",
  name: "Nom",
  role: "Rôle",
  roleFamily: "Famille",
  roleStaff: "Résidence (staff)",
  submit: "Continuer",
  sendReset: "Envoyer le lien",
  resetPassword: "Réinitialiser le mot de passe",
  newPassword: "Nouveau mot de passe",
  accessDenied: "Accès refusé",
  accessDeniedBody: "Votre compte n'a pas la permission d'ouvrir cette page.",
  emptyFamily: "Tableau de bord famille — aucune demande pour le moment.",
  emptyStaff: "Tableau de bord résidence — aucune demande pour le moment.",
  welcome: "Bienvenue",
  alreadyHaveAccount: "Déjà un compte ?",
  needAccount: "Pas encore de compte ?",
  backHome: "Retour à l'accueil",
  checkEmail: "Si un compte existe, un courriel a été envoyé.",
  invalidCredentials: "Courriel ou mot de passe invalide.",
  emailTaken: "Ce courriel est déjà utilisé.",
};

const en: Dict = {
  appName: "HavenApply",
  tagline: "Family ↔ residence admission applications",
  home: "Home",
  signIn: "Sign in",
  signUp: "Sign up",
  forgotPassword: "Forgot password",
  signOut: "Sign out",
  familyDashboard: "Family space",
  staffDashboard: "Residence space",
  email: "Email",
  password: "Password",
  name: "Name",
  role: "Role",
  roleFamily: "Family",
  roleStaff: "Residence (staff)",
  submit: "Continue",
  sendReset: "Send reset link",
  resetPassword: "Reset password",
  newPassword: "New password",
  accessDenied: "Access denied",
  accessDeniedBody: "Your account does not have permission to open this page.",
  emptyFamily: "Family dashboard — no applications yet.",
  emptyStaff: "Residence dashboard — no applications yet.",
  welcome: "Welcome",
  alreadyHaveAccount: "Already have an account?",
  needAccount: "Need an account?",
  backHome: "Back to home",
  checkEmail: "If an account exists, an email has been sent.",
  invalidCredentials: "Invalid email or password.",
  emailTaken: "This email is already in use.",
};

const catalogs: Record<Locale, Dict> = { fr, en };

export function createT(locale: Locale) {
  const table = catalogs[locale] ?? catalogs.fr;
  return (key: keyof typeof fr) => table[key] ?? en[key] ?? key;
}
