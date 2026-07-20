import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { publicAuthLinks } from "@/config/navigation";

export default function Page() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-12 md:px-8 md:py-16">
      <PageHeader
        title="Resources"
        description="Guides on assisted living, memory care, insurance, and family decision-making."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]}
      />
      <Card className="space-y-4 p-8">
        <p className="text-ink-muted">
          This public page is part of Haven&apos;s information architecture. Detailed content and workflows will deepen in later steps — navigation and entry points are ready now.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button href={publicAuthLinks.getStarted}>Get Started</Button>
          <Button href="/find-senior-living" variant="secondary">Find Senior Living</Button>
        </div>
      </Card>
    </div>
  );
}
