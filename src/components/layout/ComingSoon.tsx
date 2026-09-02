import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader, type Crumb } from "@/components/layout/PageHeader";

export function ComingSoonPage({
  title,
  description,
  breadcrumbs,
  portalLabel,
}: {
  title: string;
  description: string;
  breadcrumbs: Crumb[];
  portalLabel: string;
}) {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <Card className="flex flex-col items-start gap-4 p-8 md:p-10">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Clock3 size={22} />
        </span>
        <div>
          <p className="text-lg font-semibold text-ink">Coming in a later step</p>
          <p className="mt-2 max-w-xl text-ink-muted">
            This screen is part of the {portalLabel} navigation and will be built in a following
            phase. The route is live so you can explore the full information architecture today.
          </p>
        </div>
      </Card>
    </div>
  );
}
