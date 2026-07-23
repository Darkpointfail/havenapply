"use client";

import { FormEvent, useMemo, useState } from "react";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { residences } from "@/data/residences";
import { formatRelative } from "@/lib/format-relative";
import { contactName, type FacilityContact } from "@/lib/professional-data";
import { useProfessional } from "@/lib/professional-store";
import { cn } from "@/lib/utils";

const emptyDraft = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  email: "",
  phone: "",
  notes: "",
  facilityIds: [] as string[],
};

export default function ProfessionalContactsPage() {
  const { contacts, addContact, updateContact, deleteContact } = useProfessional();
  const [q, setQ] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const residenceById = useMemo(() => {
    const map = new Map(residences.map((r) => [r.id, r]));
    return map;
  }, []);

  const filtered = contacts.filter((c) => {
    const facilities = c.facilityIds
      .map((id) => residenceById.get(id)?.name || id)
      .join(" ");
    const hay = `${contactName(c)} ${c.jobTitle} ${c.email} ${c.phone} ${facilities} ${c.notes}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (facilityFilter !== "all" && !c.facilityIds.includes(facilityFilter)) return false;
    return true;
  });

  const openNew = () => {
    setEditingId("new");
    setDraft(emptyDraft);
  };

  const openEdit = (c: FacilityContact) => {
    setEditingId(c.id);
    setDraft({
      firstName: c.firstName,
      lastName: c.lastName,
      jobTitle: c.jobTitle,
      email: c.email,
      phone: c.phone,
      notes: c.notes,
      facilityIds: [...c.facilityIds],
    });
  };

  const toggleFacility = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      facilityIds: prev.facilityIds.includes(id)
        ? prev.facilityIds.filter((f) => f !== id)
        : [...prev.facilityIds, id],
    }));
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.firstName.trim() || !draft.lastName.trim()) return;
    if (editingId === "new") {
      addContact(draft);
    } else if (editingId) {
      updateContact(editingId, draft);
    }
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand";

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10 md:px-8">
      <PageHeader
        title="Contacts"
        description="Keep admissions contacts for each community in one place, and attach them to the right establishments."
        breadcrumbs={[
          { label: "Care professional", href: "/professional/dashboard" },
          { label: "Contacts" },
        ]}
        actions={
          <Button onClick={openNew}>
            <Plus size={16} />
            Add contact
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, role, community…"
            className="w-full rounded-xl border border-line bg-bg px-9 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <select
          value={facilityFilter}
          onChange={(e) => setFacilityFilter(e.target.value)}
          className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm"
        >
          <option value="all">All establishments</option>
          {residences.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {editingId ? (
        <Card className="mb-6 p-6">
          <p className="text-lg font-semibold text-ink">
            {editingId === "new" ? "New contact" : "Edit contact"}
          </p>
          <form onSubmit={onSave} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                First name
                <input
                  required
                  className={inputClass}
                  value={draft.firstName}
                  onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium">
                Last name
                <input
                  required
                  className={inputClass}
                  value={draft.lastName}
                  onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Job title
                <input
                  className={inputClass}
                  value={draft.jobTitle}
                  onChange={(e) => setDraft((d) => ({ ...d, jobTitle: e.target.value }))}
                  placeholder="Director of Admissions"
                />
              </label>
              <label className="text-sm font-medium">
                Phone
                <input
                  className={inputClass}
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                className={inputClass}
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium">
              Notes
              <textarea
                rows={3}
                className={inputClass}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Preferred contact times, document preferences…"
              />
            </label>

            <div>
              <p className="text-sm font-medium text-ink">Associated establishments</p>
              <p className="mt-1 text-xs text-ink-muted">
                Select one or more communities this contact works with.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {residences.map((r) => {
                  const on = draft.facilityIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleFacility(r.id)}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                        on
                          ? "border-brand bg-brand-soft/40 text-ink"
                          : "border-line bg-surface text-ink-muted hover:border-brand/40",
                      )}
                    >
                      <Building2 size={16} className={on ? "text-brand" : "text-ink-faint"} />
                      <span>
                        <span className="block font-medium text-ink">{r.name}</span>
                        <span className="text-xs text-ink-faint">
                          {r.city} · {r.careLevels[0]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save contact</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{contactName(c)}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{c.jobTitle || "Contact"}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                  Edit
                </Button>
                <button
                  type="button"
                  aria-label="Delete contact"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-danger-soft hover:text-danger"
                  onClick={() => deleteContact(c.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-ink-secondary">
              {c.email ? <p>{c.email}</p> : null}
              {c.phone ? <p>{c.phone}</p> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.facilityIds.length === 0 ? (
                <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-medium text-warn">
                  No establishment linked
                </span>
              ) : (
                c.facilityIds.map((id) => (
                  <span
                    key={id}
                    className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-strong"
                  >
                    {residenceById.get(id)?.name || id}
                  </span>
                ))
              )}
            </div>
            {c.notes ? <p className="mt-3 text-sm text-ink-muted">{c.notes}</p> : null}
            <p className="mt-3 text-xs text-ink-faint">Updated {formatRelative(c.updatedAt)}</p>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-4 p-8 text-center text-sm text-ink-muted">
          No contacts yet. Add admissions staff and link them to communities.
        </Card>
      ) : null}
    </div>
  );
}
