"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useTheme } from "@/lib/theme";

const sections: { label: string; href?: string; soon?: boolean }[] = [
  { label: "Mon profil", href: "/family/dashboard?view=dossier" },
  { label: "Membres de la famille", href: "/family/family-members" },
  { label: "Notifications", href: "/family/notifications" },
  { label: "Confidentialité et données", href: "/family/privacy" },
  { label: "Facturation", soon: true },
  { label: "Comptes connectés", soon: true },
  { label: "Langue", soon: true },
  { label: "Accessibilité", soon: true },
];

function SettingsInner() {
  const { theme, toggle } = useTheme();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Paramètres"
        description="Contrôlez la confidentialité, la sécurité et le fonctionnement de HavenApply pour votre famille."
        breadcrumbs={[
          { label: "Accueil", href: "/family/dashboard" },
          { label: "Paramètres" },
        ]}
      />

      <Card className="divide-y divide-line overflow-hidden p-0">
        {sections.map((s) =>
          s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="flex min-h-[52px] w-full items-center justify-between px-5 py-4 text-left transition hover:bg-bg-soft"
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-ink-faint" aria-hidden>
                →
              </span>
            </Link>
          ) : (
            <div
              key={s.label}
              className="flex min-h-[52px] w-full items-center justify-between px-5 py-4 text-left opacity-60"
              aria-disabled="true"
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-ink-faint">Bientôt</span>
            </div>
          ),
        )}
      </Card>

      <Card className="mt-4 flex items-center justify-between gap-4 p-5">
        <div>
          <p className="font-medium">Apparence</p>
          <p className="text-sm text-ink-muted">
            Mode actuel : {theme === "dark" ? "sombre" : "clair"}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={toggle}>
          Passer en mode {theme === "dark" ? "clair" : "sombre"}
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
