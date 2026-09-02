import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

/** Locale shell: route groups handle chrome (marketing vs app). */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  return children;
}
