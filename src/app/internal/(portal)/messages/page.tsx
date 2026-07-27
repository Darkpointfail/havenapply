"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { useT } from "@/lib/i18n/locale";

export default function Page() {

  const t = useT();  const { ready, workspace } = useInternalAdmin();
  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }
  const messageFlags = workspace.moderation.filter((m) => m.kind === "message");
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Messages")}
        description="Oversight of flagged threads only, message bodies stay redacted."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Messages" },
        ]}
        actions={
          <Button href="/internal/content" size="sm" variant="secondary">
            {t("Full moderation")}
          </Button>
        }
      />
      <div className="space-y-3">
        {messageFlags.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{m.title}</p>
              <Badge tone={m.status === "open" ? "warn" : "success"}>{m.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{m.target}</p>
            <p className="mt-2 text-sm">{m.summary}</p>
          </Card>
        ))}
        {messageFlags.length === 0 && (
          <Card className="p-8 text-center text-ink-muted">No flagged messages.</Card>
        )}
      </div>
    </div>
  );
}
