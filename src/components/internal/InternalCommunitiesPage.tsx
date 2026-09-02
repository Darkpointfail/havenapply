"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInternalAdmin } from "@/lib/internal-admin-store";
import { useT } from "@/lib/i18n/locale";
import {
  formatAdminTime,
  type PartnershipStatus,
} from "@/lib/internal-admin";

function statusTone(
  s: PartnershipStatus,
): "success" | "warn" | "danger" | "brand" | "accent" {
  switch (s) {
    case "verified":
      return "success";
    case "approved":
      return "brand";
    case "pending_review":
      return "warn";
    case "rejected":
    case "suspended":
      return "danger";
    default:
      return "accent";
  }
}

export function InternalCommunitiesPage() {

  const t = useT();  const {
    ready,
    workspace,
    setCommunityStatus,
    setCommunityVerified,
    updateCommunityPublished,
  } = useInternalAdmin();
  const [filter, setFilter] = useState("all");

  const list = useMemo(() => {
    if (!workspace) return [];
    if (filter === "all") return workspace.communities;
    return workspace.communities.filter((c) => c.status === filter);
  }, [workspace, filter]);

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Loading communities…")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Communities")}
        description="Review partnership requests, verify listings, and control published pricing & availability."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Communities" },
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {[
          "all",
          "pending_review",
          "approved",
          "verified",
          "suspended",
          "rejected",
        ].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-bg-soft"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {list.map((c) => (
          <Card key={c.id} className="space-y-4 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold">{c.name}</p>
                  <Badge tone={statusTone(c.status)}>
                    {c.status.replace("_", " ")}
                  </Badge>
                  {c.verifiedProfile && <Badge tone="success">Verified profile</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {c.city}, {c.state} · {c.contactName} · {c.contactEmail}
                </p>
                <p className="mt-2 text-sm">{c.aboutPreview}</p>
                <p className="mt-2 text-xs text-ink-faint">
                  Submitted {formatAdminTime(c.submittedAt)}
                  {c.lastReviewedAt
                    ? ` · Reviewed ${formatAdminTime(c.lastReviewedAt)}`
                    : ""}
                </p>
                {c.flags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.flags.map((f) => (
                      <Badge key={f} tone="warn">
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-bg-soft p-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="text-ink-muted">Published price from</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1.5"
                  value={c.publishedPriceFrom ?? ""}
                  onChange={(e) =>
                    updateCommunityPublished(c.id, {
                      publishedPriceFrom: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-ink-muted">Published beds</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1.5"
                  value={c.publishedBeds}
                  onChange={(e) =>
                    updateCommunityPublished(c.id, {
                      publishedBeds: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-ink-muted">Published waitlist</span>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1.5"
                  value={c.waitlistPublished}
                  onChange={(e) =>
                    updateCommunityPublished(c.id, {
                      waitlistPublished: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {c.status === "pending_review" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setCommunityStatus(c.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setCommunityStatus(c.id, "rejected", "Rejected after review")
                    }
                  >
                    Refuse
                  </Button>
                </>
              )}
              {(c.status === "approved" || c.status === "verified") && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCommunityVerified(c.id, !c.verifiedProfile)}
                >
                  {c.verifiedProfile ? "Unmark verified" : "Mark verified"}
                </Button>
              )}
              {c.status !== "suspended" && c.status !== "rejected" && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    setCommunityStatus(c.id, "suspended", "Suspended by admin")
                  }
                >
                  Suspend
                </Button>
              )}
              {c.status === "suspended" && (
                <Button
                  size="sm"
                  onClick={() => setCommunityStatus(c.id, "approved")}
                >
                  Reinstate
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
