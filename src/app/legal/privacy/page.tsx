import { LEGAL_PLACEHOLDER_BANNER, getPolicyByDocumentKey } from "@/lib/consent/policy-versions";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default function LegalPrivacyPage() {
  const doc = getPolicyByDocumentKey("privacy_notice");
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <PageHeader
        title="Privacy Notice"
        description={`Version ${doc?.version || "draft"} · effective ${doc?.effectiveFrom || "TBD"}`}
      />
      <Card className="space-y-4 whitespace-pre-wrap p-6 text-sm text-ink">
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {LEGAL_PLACEHOLDER_BANNER}
        </p>
        <p>{doc?.bodyPlaceholder}</p>
        <p className="text-xs text-ink-muted">Document id: {doc?.id}</p>
      </Card>
    </div>
  );
}
