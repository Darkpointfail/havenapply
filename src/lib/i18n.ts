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
  emptyFamily: "Aucune candidature pour vos dossiers accessibles.",
  emptyStaff: "Aucune candidature pour vos sites.",
  welcome: "Bienvenue",
  alreadyHaveAccount: "Déjà un compte ?",
  needAccount: "Pas encore de compte ?",
  backHome: "Retour à l'accueil",
  checkEmail: "Si un compte existe, un courriel a été envoyé.",
  checkEmailTitle: "Vérifiez votre courriel",
  checkEmailBody: "Un lien de vérification a été envoyé. Ouvrez-le pour activer votre compte.",
  verifyEmail: "Vérifier le courriel",
  verifyEmailBody: "Confirmez votre adresse pour activer le compte.",
  invalidCredentials: "Courriel ou mot de passe invalide.",
  emailTaken: "Ce courriel est déjà utilisé.",
  emailNotVerified: "Courriel non vérifié. Consultez votre boîte de réception.",
  rateLimited: "Trop de tentatives. Réessayez plus tard.",
  applications: "Candidatures",
  status: "Statut",
  site: "Site",
  family: "Famille",
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
  emptyFamily: "No applications for your accessible files.",
  emptyStaff: "No applications for your sites.",
  welcome: "Welcome",
  alreadyHaveAccount: "Already have an account?",
  needAccount: "Need an account?",
  backHome: "Back to home",
  checkEmail: "If an account exists, an email has been sent.",
  checkEmailTitle: "Check your email",
  checkEmailBody: "A verification link was sent. Open it to activate your account.",
  verifyEmail: "Verify email",
  verifyEmailBody: "Confirm your address to activate the account.",
  invalidCredentials: "Invalid email or password.",
  emailTaken: "This email is already in use.",
  emailNotVerified: "Email not verified. Check your inbox.",
  rateLimited: "Too many attempts. Try again later.",
  applications: "Applications",
  status: "Status",
  site: "Site",
  family: "Family",
};

const catalogs: Record<Locale, Dict> = { fr, en };

export function createT(locale: Locale) {
  const table = catalogs[locale] ?? catalogs.fr;
  return (key: keyof typeof fr) => table[key] ?? en[key] ?? key;
}
