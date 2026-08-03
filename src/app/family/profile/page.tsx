"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Pencil,
  Upload,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useFamilyData } from "@/lib/family-data";
import {
  HOUSING_TYPES,
  LIVING_SITUATIONS,
  URGENCY_OPTIONS,
  labelForId,
  seniorAge,
  seniorDisplayName,
} from "@/lib/senior-profile";
import { cn } from "@/lib/utils";
import DocumentsPage from "@/app/documents/page";
import { useT } from "@/lib/i18n/locale";

type TabId = "overview" | "documents";

const TABS: { id: TabId; label: string; icon: typeof UserRound }[] = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "documents", label: "Documents", icon: FileText },
];

function ProfileHubInner() {
  const t = useT();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const tab: TabId =
    tabParam === "documents" || tabParam === "docs" ? "documents" : "overview";

  const { ready, data, completeness } = useFamilyData();
  const senior = data.senior;
  const name = seniorDisplayName(senior) || data.person.name || "Senior profile";
  const age = seniorAge(senior) || data.person.age;

  const checklist = useMemo(
    () => [
      {
        label: "Resident dossier",
        done: data.seniorCreated && completeness >= 40,
        href: "/family/dossier",
      },
      {
        label: "Documents",
        done: data.documents.length >= 1,
        href: "/family/profile?tab=documents",
      },
      {
        label: "Applications",
        done: data.applications.some((a) => a.status !== "draft"),
        href: "/family/applications",
      },
    ],
    [
      data.seniorCreated,
      completeness,
      data.documents.length,
      data.applications,
    ],
  );

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Manage profile</h1>
        <p className="mt-1 text-ink-muted">
          {t("One place to view, edit, and attach documents. Created once, reused everywhere.")}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Link
              key={t.id}
              href={t.id === "overview" ? "/family/profile" : `/family/profile?tab=${t.id}`}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:flex-none sm:px-5",
                active
                  ? "bg-brand text-white shadow-xs"
                  : "text-ink-muted hover:bg-bg-soft hover:text-ink",
              )}
            >
              <Icon size={15} />
              {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold tracking-tight">{name}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {[
                    age ? `Age ${age}` : null,
                    senior.city && senior.state
                      ? `${senior.city}, ${senior.state}`
                      : senior.city || null,
                    labelForId(LIVING_SITUATIONS, senior.livingSituation) || null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Profile still in progress"}
                </p>
              </div>
              <Badge tone={completeness >= 70 ? "success" : "warn"}>
                {completeness}% complete
              </Badge>
            </div>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-bg-soft px-3 py-3">
                <dt className="text-[11px] text-ink-faint">Care focus</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {senior.housingTypes
                    .map((id) => labelForId(HOUSING_TYPES, id))
                    .slice(0, 2)
                    .join(", ") || "Not set"}
                </dd>
              </div>
              <div className="rounded-xl bg-bg-soft px-3 py-3">
                <dt className="text-[11px] text-ink-faint">Timeline</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {labelForId(URGENCY_OPTIONS, senior.urgency) || "Not set"}
                </dd>
              </div>
              <div className="rounded-xl bg-bg-soft px-3 py-3">
                <dt className="text-[11px] text-ink-faint">Documents</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {data.documents.length} uploaded
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button href="/family/dossier" size="sm">
                <Pencil size={14} /> {t("Edit resident dossier")}
              </Button>
              <Button href="/family/profile?tab=documents" size="sm" variant="secondary">
                <Upload size={14} /> {t("Manage documents")}
              </Button>
              <Button href="/family/family-members" size="sm" variant="ghost">
                {t("Family members")}
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Readiness checklist</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t("Clear these before applying so communities get a complete packet.")}
            </p>
            <ul className="mt-4 space-y-2">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 transition hover:border-brand/25"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full",
                        item.done ? "bg-success text-white" : "bg-bg-soft text-ink-faint",
                      )}
                    >
                      {item.done ? <CheckCircle2 size={14} /> : null}
                    </span>
                    <span className={cn("flex-1 text-sm font-medium", item.done && "text-ink-muted")}>
                      {item.label}
                    </span>
                    <ArrowRight size={14} className="text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button href="/family/communities">{t("Choose communities")}</Button>
            <Button href="/family/applications" variant="secondary">
              {t("My applications")}
            </Button>
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="-mx-5 md:-mx-8">
          <DocumentsPage />
        </div>
      )}
    </div>
  );
}

export default function FamilyProfilePage() {

  const t = useT();  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-pulse-soft rounded-full bg-brand-soft" />
        </div>
      }
    >
      <ProfileHubInner />
    </Suspense>
  );
}
