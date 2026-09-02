"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useT } from "@/lib/i18n/locale";
import { useTheme } from "@/lib/theme";

const sections: { labelKey: string; href?: string; soon?: boolean }[] = [
  { labelKey: "My profile", href: "/family/dashboard?view=dossier" },
  { labelKey: "Family members", href: "/family/family-members" },
  { labelKey: "Notifications", href: "/family/notifications" },
  { labelKey: "Privacy and data", href: "/family/privacy" },
  { labelKey: "Billing", soon: true },
  { labelKey: "Connected accounts", soon: true },
  { labelKey: "Language", soon: true },
  { labelKey: "Accessibility", soon: true },
];

function SettingsInner() {
  const t = useT();
  const { theme, toggle } = useTheme();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Settings")}
        description={t(
          "Control privacy, security, and how HavenApply works for your family.",
        )}
        breadcrumbs={[
          { label: t("Home"), href: "/family/dashboard" },
          { label: t("Settings") },
        ]}
      />

      <Card className="divide-y divide-line overflow-hidden p-0">
        {sections.map((s) =>
          s.href ? (
            <Link
              key={s.labelKey}
              href={s.href}
              className="flex min-h-[52px] w-full items-center justify-between px-5 py-4 text-left transition hover:bg-bg-soft"
            >
              <span className="font-medium">{t(s.labelKey)}</span>
              <span className="text-ink-faint" aria-hidden>
                →
              </span>
            </Link>
          ) : (
            <div
              key={s.labelKey}
              className="flex min-h-[52px] w-full items-center justify-between px-5 py-4 text-left opacity-60"
              aria-disabled="true"
            >
              <span className="font-medium">{t(s.labelKey)}</span>
              <span className="text-xs text-ink-faint">{t("Coming soon")}</span>
            </div>
          ),
        )}
      </Card>

      <Card className="mt-4 flex items-center justify-between gap-4 p-5">
        <div>
          <p className="font-medium">{t("Appearance")}</p>
          <p className="text-sm text-ink-muted">
            {t("Current mode: {mode}", {
              mode: theme === "dark" ? t("dark") : t("light"),
            })}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={toggle}>
          {t("Switch to {mode} mode", {
            mode: theme === "dark" ? t("light") : t("dark"),
          })}
        </Button>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth role="family">
      <SettingsInner />
    </RequireAuth>
  );
}
