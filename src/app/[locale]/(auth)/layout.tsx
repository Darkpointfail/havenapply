import Link from "next/link";
import { redirect } from "next/navigation";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { isLocale, createT, type Locale } from "@/lib/i18n";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import "@/components/auth/sign-in.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) redirect("/fr");
  const locale = raw as Locale;
  const t = createT(locale);

  return (
    <div className={`si ${sourceSerif.variable} ${publicSans.variable}`}>
      <header className="si-header">
        <div className="si-header-inner">
          <Logo href={`/${locale}`} size="nav" light className="!ml-0 !translate-y-0" />
          <div className="flex items-center gap-4">
            <LocaleSwitcher locale={locale} compact />
            <p className="si-header-cta hidden sm:block">
              {t("needAccount")}{" "}
              <Link href={`/${locale}/sign-up`}>{t("signUp")}</Link>
            </p>
          </div>
        </div>
      </header>
      <div className="si-main !grid-cols-1 !max-w-[520px]">{children}</div>
    </div>
  );
}
