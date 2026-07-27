"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useTheme } from "@/lib/theme";
import { useT } from "@/lib/i18n/locale";

const sections: { label: string; href?: string; soon?: boolean }[] = [
  { label: "Profile", href: "/family/senior-profile" },
  { label: "Family members", href: "/family/family-members" },
  { label: "Notifications", href: "/family/notifications" },
  { label: "Privacy & security", href: "/family/privacy" },
  { label: "Billing", soon: true },
  { label: "Connected accounts", soon: true },
  { label: "Language", soon: true },
  { label: "Accessibility", soon: true },
];

function SettingsInner() {
  const t = useT();
  const { theme, toggle } = useTheme();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Settings")}
        description="Control privacy, security, and how Haven works for your family."
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Settings" },
        ]}
      />

      <Card className="divide-y divide-line overflow-hidden p-0">
        {sections.map((s) =>
          s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-bg-soft"
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-ink-faint">→</span>
            </Link>
          ) : (
            <div
              key={s.label}
              className="flex w-full items-center justify-between px-5 py-4 text-left opacity-60"
              aria-disabled="true"
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-ink-faint">Coming later</span>
            </div>
          ),
        )}
      </Card>

      <Card className="mt-4 flex items-center justify-between p-5">
        <div>
          <p className="font-medium">Appearance</p>
          <p className="text-sm text-ink-muted">Currently {theme} mode</p>
        </div>
        <Button size="sm" variant="secondary" onClick={toggle}>
          Toggle {theme === "dark" ? "light" : "dark"}
        </Button>
      </Card>
    </div>
  );
}

export default function SettingsPage() {

  const t = useT();  return (
    <RequireAuth role="family">
      <SettingsInner />
    </RequireAuth>
  );
}
