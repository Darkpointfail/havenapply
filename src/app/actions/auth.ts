"use server";

import { redirect } from "next/navigation";
import {
  destroyDatabaseSession,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from "@/lib/auth-actions";
import { dashboardPathForRole } from "@/lib/paths";

export async function registerAction(locale: string, formData: FormData) {
  const result = await registerUser({
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    role: String(formData.get("role") || "FAMILY"),
    csrfToken: String(formData.get("csrfToken") || ""),
  });
  if (!result.ok) {
    redirect(`/${locale}/sign-up?error=${result.error.toLowerCase()}`);
  }
  redirect(`/${locale}/check-email?email=${encodeURIComponent(String(formData.get("email") || ""))}`);
}

export async function loginAction(locale: string, formData: FormData) {
  const result = await loginUser({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    csrfToken: String(formData.get("csrfToken") || ""),
  });
  if (!result.ok) {
    redirect(`/${locale}/sign-in?error=${result.error.toLowerCase()}`);
  }
  redirect(dashboardPathForRole(result.role, locale));
}

export async function forgotAction(locale: string, formData: FormData) {
  await requestPasswordReset({
    email: String(formData.get("email") || ""),
    csrfToken: String(formData.get("csrfToken") || ""),
  });
  redirect(`/${locale}/forgot-password?sent=1`);
}

export async function resetAction(locale: string, formData: FormData) {
  const result = await resetPassword({
    email: String(formData.get("email") || ""),
    token: String(formData.get("token") || ""),
    password: String(formData.get("password") || ""),
    csrfToken: String(formData.get("csrfToken") || ""),
  });
  if (!result.ok) {
    redirect(
      `/${locale}/reset-password?error=1&email=${encodeURIComponent(String(formData.get("email") || ""))}&token=${encodeURIComponent(String(formData.get("token") || ""))}`,
    );
  }
  redirect(`/${locale}/sign-in`);
}

export async function verifyAction(locale: string, formData: FormData) {
  const result = await verifyEmail({
    email: String(formData.get("email") || ""),
    token: String(formData.get("token") || ""),
  });
  if (!result.ok) {
    redirect(`/${locale}/verify-email?error=1`);
  }
  redirect(dashboardPathForRole(result.role, locale));
}

export async function logoutAction(locale: string) {
  await destroyDatabaseSession();
  redirect(`/${locale}/sign-in`);
}
