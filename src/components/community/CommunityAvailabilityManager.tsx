"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCommunityPortal } from "@/lib/community-portal-store";
import type { AvailabilityStatus, AvailabilityUnit } from "@/lib/community-portal";
import { useT } from "@/lib/i18n/locale";

const emptyUnit = (): AvailabilityUnit => ({
  id: `av-${Date.now()}`,
  roomType: "",
  count: 1,
  availableDate: "",
  price: null,
  careLevel: "Assisted living",
  status: "estimated",
  waitlistCount: 0,
});

export function CommunityAvailabilityManager() {

  const t = useT();  const { ready, workspace, can, upsertAvailability, removeAvailability } =
    useCommunityPortal();
  const [draft, setDraft] = useState<AvailabilityUnit | null>(null);

  if (!ready || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Loading availability…")}
      </div>
    );
  }

  const editable = can("editAvailability");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Availability")}
        description="Keep room inventory, pricing, and waitlists current for admissions."
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Availability" },
        ]}
        actions={
          editable ? (
            <Button size="sm" onClick={() => setDraft(emptyUnit())}>
              {t("Add unit")}
            </Button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-2xl font-semibold">{workspace.metrics.openBeds}</p>
          <p className="text-sm text-ink-muted">Places available</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold">{workspace.metrics.waitlistTotal}</p>
          <p className="text-sm text-ink-muted">On waitlists</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold">{workspace.availability.length}</p>
          <p className="text-sm text-ink-muted">Room categories</p>
        </Card>
      </div>

      {draft && editable && (
        <Card className="mb-6 space-y-3 p-5">
          <h2 className="font-semibold">
            {workspace.availability.some((u) => u.id === draft.id)
              ? "Edit unit"
              : "New unit"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-ink-muted">Room type</span>
              <input
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={draft.roomType}
                onChange={(e) => setDraft({ ...draft, roomType: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-muted">Care level</span>
              <input
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={draft.careLevel}
                onChange={(e) => setDraft({ ...draft, careLevel: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-muted">Number available</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={draft.count}
                onChange={(e) =>
                  setDraft({ ...draft, count: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-muted">Available date</span>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={draft.availableDate}
                onChange={(e) =>
                  setDraft({ ...draft, availableDate: e.target.value })
                }
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-muted">Price / month</span>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={draft.price ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    price: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-muted">Waitlist count</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={draft.waitlistCount}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    waitlistCount: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-ink-muted">Status</span>
              <select
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as AvailabilityStatus,
                  })
                }
              >
                <option value="confirmed">Confirmed</option>
                <option value="estimated">Estimated</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (!draft.roomType.trim()) {
                  alert(t("Enter a room type."));
                  return;
                }
                const res = upsertAvailability(draft);
                if (res.ok) setDraft(null);
                else alert(res.error ? t(res.error) : t("Unable to save availability."));
              }}
            >
              {t("Save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              {t("Cancel")}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {workspace.availability.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{u.roomType}</p>
                  <Badge tone={u.status === "confirmed" ? "success" : "warn"}>
                    {u.status === "confirmed" ? "Confirmed" : "Estimated"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {u.careLevel} · {u.count} available · from {u.availableDate || "TBD"}
                  {u.price != null ? ` · $${u.price.toLocaleString()}/mo` : ""}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  Waitlist: {u.waitlistCount}
                </p>
              </div>
              {editable && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDraft(u)}>
                    {t("Edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Remove ${u.roomType}?`)) removeAvailability(u.id);
                    }}
                  >
                    {t("Remove")}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
