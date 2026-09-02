import Link from "next/link";

export function AuthCard({
  title,
  children,
  locale = "fr",
}: {
  title: string;
  children: React.ReactNode;
  locale?: string;
}) {
  return (
    <div className="w-full">
      <div
        className="rounded-[18px] border border-[var(--si-border,#dce6e2)] bg-[var(--si-surface,#fff)] p-7 shadow-[var(--shadow-md)] sm:p-8"
      >
        <p className="si-eyebrow">
          {locale === "en" ? "Secure access" : "Accès sécurisé"}
        </p>
        <h1 className="si-h1 !mt-3 mb-6">{title}</h1>
        {children}
      </div>
      <p className="mt-6 text-center text-sm text-[var(--si-ink-muted,#586863)]">
        <Link
          href={`/${locale}`}
          className="font-semibold text-[var(--si-green,#0e9384)] underline-offset-2 hover:underline"
        >
          ← HavenApply
        </Link>
      </p>
    </div>
  );
}
