"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCommunityPortal } from "@/lib/community-portal-store";
import type { CommunityProfile } from "@/lib/community-portal";

const inputClass =
  "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm disabled:opacity-60";

function listToText(items: string[]) {
  return items.join("\n");
}

function textToList(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CommunityProfileEditor({
  initialTab = "overview",
}: {
  initialTab?: "overview" | "admissions" | "pricing";
}) {
  const { ready, workspace, can, updateProfile } = useCommunityPortal();
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState<CommunityProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (workspace) setDraft({ ...workspace.profile });
  }, [workspace]);

  if (!ready || !workspace || !draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading profile…
      </div>
    );
  }

  const editable =
    can("editProfile") || can("editAdmissions") || can("editPricing");

  const save = () => {
    const res = updateProfile(draft);
    if (res.ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } else alert(res.error);
  };

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "admissions" as const, label: "Admissions" },
    { id: "pricing" as const, label: "Pricing & rooms" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Community profile"
        description="Public listing content families see when exploring your community."
        breadcrumbs={[
          { label: "Community", href: "/community/dashboard" },
          { label: "Profile" },
        ]}
        actions={
          editable ? (
            <Button size="sm" onClick={save}>
              {saved ? "Saved" : "Save changes"}
            </Button>
          ) : null
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-line pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-bg-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Card className="space-y-4 p-5">
          <label className="block text-sm">
            <span className="text-ink-muted">Name</span>
            <input
              className={inputClass}
              disabled={!can("editProfile")}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Description</span>
            <textarea
              className={inputClass}
              rows={5}
              disabled={!can("editProfile")}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["address", "Address"],
                ["city", "City"],
                ["state", "State"],
                ["zip", "ZIP"],
                ["phone", "Phone"],
                ["email", "Email"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-ink-muted">{label}</span>
                <input
                  className={inputClass}
                  disabled={!can("editProfile")}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          {(
            [
              ["careTypes", "Care types"],
              ["amenities", "Amenities"],
              ["services", "Services"],
              ["photos", "Photos (URLs)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="text-ink-muted">{label} (one per line)</span>
              <textarea
                className={inputClass}
                rows={key === "photos" ? 3 : 4}
                disabled={!can("editProfile")}
                value={listToText(draft[key])}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: textToList(e.target.value) })
                }
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="text-ink-muted">Promotions</span>
            <textarea
              className={inputClass}
              rows={2}
              disabled={!can("editProfile")}
              value={draft.promotions}
              onChange={(e) => setDraft({ ...draft, promotions: e.target.value })}
            />
          </label>
        </Card>
      )}

      {tab === "admissions" && (
        <Card className="space-y-4 p-5">
          {(
            [
              ["admissionCriteria", "Admission criteria"],
              ["notAccepted", "Conditions not accepted"],
              ["requiredDocuments", "Required documents"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="text-ink-muted">{label} (one per line)</span>
              <textarea
                className={inputClass}
                rows={4}
                disabled={!can("editAdmissions") && !can("editProfile")}
                value={listToText(draft[key])}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: textToList(e.target.value) })
                }
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="text-ink-muted">Waitlist notes</span>
            <textarea
              className={inputClass}
              rows={3}
              disabled={!can("editAdmissions") && !can("editProfile")}
              value={draft.waitlistNotes}
              onChange={(e) =>
                setDraft({ ...draft, waitlistNotes: e.target.value })
              }
            />
          </label>
        </Card>
      )}

      {tab === "pricing" && (
        <Card className="space-y-4 p-5">
          <p className="text-sm text-ink-muted">
            Room types and starting prices shown to families.
          </p>
          {draft.roomTypes.map((room, idx) => (
            <div
              key={`${room.name}-${idx}`}
              className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-3"
            >
              <input
                className={inputClass}
                disabled={!can("editPricing") && !can("editProfile")}
                value={room.name}
                onChange={(e) => {
                  const roomTypes = [...draft.roomTypes];
                  roomTypes[idx] = { ...room, name: e.target.value };
                  setDraft({ ...draft, roomTypes });
                }}
                placeholder="Room type"
              />
              <input
                className={inputClass}
                type="number"
                disabled={!can("editPricing") && !can("editProfile")}
                value={room.price ?? ""}
                onChange={(e) => {
                  const roomTypes = [...draft.roomTypes];
                  roomTypes[idx] = {
                    ...room,
                    price: e.target.value ? Number(e.target.value) : null,
                  };
                  setDraft({ ...draft, roomTypes });
                }}
                placeholder="Price"
              />
              <input
                className={inputClass}
                disabled={!can("editPricing") && !can("editProfile")}
                value={room.notes}
                onChange={(e) => {
                  const roomTypes = [...draft.roomTypes];
                  roomTypes[idx] = { ...room, notes: e.target.value };
                  setDraft({ ...draft, roomTypes });
                }}
                placeholder="Notes"
              />
            </div>
          ))}
          {(can("editPricing") || can("editProfile")) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setDraft({
                  ...draft,
                  roomTypes: [
                    ...draft.roomTypes,
                    { name: "New room type", price: null, notes: "" },
                  ],
                })
              }
            >
              Add room type
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
