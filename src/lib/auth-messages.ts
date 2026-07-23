/** User-facing auth copy, never expose technical errors. */

export const AUTH_MESSAGES = {
  emailTaken: "This email is already connected to an account.",
  confirmBeforeSignIn: "Please confirm your email before signing in.",
  resetExpired: "Your password reset link has expired. Request a new one.",
  resetInvalid: "This password reset link is invalid. Request a new one.",
  confirmInvalid: "This confirmation link is invalid or has already been used.",
  confirmExpired: "This confirmation link has expired. Request a new one.",
  accessDenied: "You do not have permission to access this page.",
  badCredentials: "Incorrect email or password.",
  accountNotFound: "We couldn’t find an account with that email.",
  weakPassword: "Use at least 8 characters for your password.",
  passwordMismatch: "Passwords do not match.",
  acceptTerms: "Please accept the Terms of Use and Privacy Policy to continue.",
  communityPending:
    "Your community is awaiting verification. You’ll get access once Haven reviews your organization.",
  alreadyConfirmed: "Your email is already confirmed. You can sign in.",
  confirmSent: "We’ve sent a confirmation link to your email.",
  accountCreatedSignIn:
    "Your account is ready. Sign in with the email and password you just created.",
  resetSent: "If an account exists for that email, you’ll receive a reset link shortly.",
  resetSuccess: "Your password has been updated. You can sign in now.",
  confirmSuccess: "Your email is confirmed. You can sign in now.",
  resendSuccess: "A new confirmation link has been sent.",
  generic: "Something went wrong. Please try again.",
  required: "Please fill in all required fields.",
  emailInvalid:
    "This email can’t be used for signup right now. Try another address, or ask your admin to finish Supabase email setup.",
  emailNotAuthorized:
    "Supabase’s built-in email only allows team member addresses. Add a custom SMTP provider, or set SUPABASE_SERVICE_ROLE_KEY in .env.local for local signup.",
  signupNeedsSmtp:
    "Account creation needs Supabase email setup. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Project Settings → API → service_role) for local testing, or configure custom SMTP in Supabase Auth.",
} as const;
