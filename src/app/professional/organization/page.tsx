"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useProfessional } from "@/lib/professional-store";
import { useT } from "@/lib/i18n/locale";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand";

export default function ProfessionalOrganizationPage() {

  const t = useT();  const { organization, profile, patients, updateOrganization, updateProfile } =
    useProfessional();
  const [orgDraft, setOrgDraft] = useState(organization);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [unitsText, setUnitsText] = useState(organization.units.join("\n"));
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    setOrgDraft(organization);
    setUnitsText(organization.units.join("\n"));
  }, [organization]);

  useEffect(() => {
    setProfileDraft(profile);
  }, [profile]);

  const saveOrg = (e: FormEvent) => {
    e.preventDefault();
    updateOrganization({
      ...orgDraft,
      units: unitsText
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean),
    });
    setSaved("Organization updated");
    window.setTimeout(() => setSaved(null), 2000);
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    updateProfile(profileDraft);
    setSaved("Your profile updated");
    window.setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <PageHeader
        title={t("My organization")}
        description="Edit your workplace and personal details. Changes stay with your care professional workspace."
        breadcrumbs={[
          { label: "Care professional", href: "/professional/dashboard" },
          { label: "My Organization" },
        ]}
      />

      {saved ? (
        <p className="mb-4 rounded-xl bg-success-soft px-3 py-2 text-sm font-medium text-success">
          {saved}
        </p>
      ) : null}

      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {t("Your profile")}
        </p>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("First name")}
              <input
                className={inputClass}
                value={profileDraft.firstName}
                onChange={(e) =>
                  setProfileDraft((d) => ({ ...d, firstName: e.target.value }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              {t("Last name")}
              <input
                className={inputClass}
                value={profileDraft.lastName}
                onChange={(e) =>
                  setProfileDraft((d) => ({ ...d, lastName: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("Job title")}
              <input
                className={inputClass}
                value={profileDraft.jobTitle}
                onChange={(e) =>
                  setProfileDraft((d) => ({ ...d, jobTitle: e.target.value }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              {t("Phone")}
              <input
                className={inputClass}
                value={profileDraft.phone}
                onChange={(e) => setProfileDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            {t("Email")}
            <input
              type="email"
              className={inputClass}
              value={profileDraft.email}
              onChange={(e) => setProfileDraft((d) => ({ ...d, email: e.target.value }))}
            />
          </label>
          <div className="flex justify-end">
            <Button type="submit">Save profile</Button>
          </div>
        </form>
      </Card>

      <Card className="mt-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Organization
        </p>
        <p className="mt-1 text-sm text-ink-muted">{patients.length} active patients on caseload</p>
        <form onSubmit={saveOrg} className="mt-4 space-y-4">
          <label className="block text-sm font-medium">
            {t("Name")}
            <input
              className={inputClass}
              value={orgDraft.name}
              onChange={(e) => setOrgDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium">
            Type
            <input
              className={inputClass}
              value={orgDraft.type}
              onChange={(e) => setOrgDraft((d) => ({ ...d, type: e.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              {t("City")}
              <input
                className={inputClass}
                value={orgDraft.city}
                onChange={(e) => setOrgDraft((d) => ({ ...d, city: e.target.value }))}
              />
            </label>
            <label className="text-sm font-medium">
              {t("Phone")}
              <input
                className={inputClass}
                value={orgDraft.phone}
                onChange={(e) => setOrgDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Units (one per line)
            <textarea
              rows={4}
              className={inputClass}
              value={unitsText}
              onChange={(e) => setUnitsText(e.target.value)}
            />
          </label>
          <div className="flex justify-end">
            <Button type="submit">Save organization</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
