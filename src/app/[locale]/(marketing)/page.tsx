import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n";
import { dashboardPathForRole } from "@/lib/paths";
import { PublicHomePage } from "@/components/marketing/PublicHomePage";

export const metadata: Metadata = {
  title: "HavenApply — Envoyez votre demande d'admission en ligne",
  description:
    "Le dossier se remplit en quelques minutes, puis nous vous recommandons les résidences qui correspondent vraiment aux besoins de votre proche, à votre budget et à votre secteur.",
};

export default async function MarketingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const session = await auth();

  if (session?.user?.emailVerified) {
    redirect(dashboardPathForRole(session.user.role, locale));
  }

  return (
    <PublicHomePage
      locale={locale}
      signedIn={false}
      accountHome={`/${locale}/sign-in`}
    />
  );
}
