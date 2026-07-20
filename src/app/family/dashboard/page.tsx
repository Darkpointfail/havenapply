"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileWarning,
  MessageSquare,
  MapPin,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import { toDisplayApplication } from "@/lib/family-applications";
import {
  HOUSING_TYPES,
  LIVING_SITUATIONS,
  URGENCY_OPTIONS,
  labelForId,
  seniorAge,
  seniorDisplayName,
} from "@/lib/senior-profile";
import { useMemo } from "react";

export default function FamilyDashboardPage() {
  const { user } = useAuth();
  const { data, completeness } = useFamilyData();
  const senior = data.senior;
  const name = seniorDisplayName(senior) || data.person.name;
  const age = seniorAge(senior) || data.person.age;

  const active = useMemo(() => {
    return data.applications
      .filter((a) =>
        !["declined", "withdrawn", "closed", "draft"].includes(a.status),
      )
      .map(toDisplayApplication);
  }, [data.applications]);

  const needsOnboarding = !data.seniorCreated || !user?.onboardingCompleted;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Dashboard"
        description={`Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}. See your senior profile, applications, and what to do next.`}
        breadcrumbs={[{ label: "Family", href: "/family/dashboard" }, { label: "Dashboard" }]}
        actions={
          <>
            <Button href="/family/find-communities" variant="secondary">
              Find communities
            </Button>
            <Button href="/family/apply-multi" variant="secondary">
              Multi-apply
            </Button>
            <Button href="/apply">
              Apply <ArrowRight size={16} />
            </Button>
          </>
        }
      />

      {needsOnboarding && (
        <Card className="mb-6 flex flex-col gap-4 border-brand/25 bg-brand-soft/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-brand-strong">Continue senior profile setup</p>
            <p className="mt-1 text-sm text-ink-muted">
              Your progress is saved. Resume where you left off — it only takes a few minutes.
            </p>
          </div>
          <Button href="/onboarding">
            Continue onboarding <ArrowRight size={16} />
          </Button>
        </Card>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <UserRound size={26} />
              </span>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand">
                  Primary senior
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {name || "Profile in progress"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {[
                    age ? `Age ${age}` : null,
                    senior.relationship || data.person.relationship || null,
                    senior.city && senior.state ? `${senior.city}, ${senior.state}` : senior.city || null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Complete onboarding to create this profile."}
                </p>
              </div>
            </div>
            <Badge tone={data.seniorCreated ? "success" : "warn"}>
              {data.seniorCreated ? `${completeness}% profile` : "Draft"}
            </Badge>
          </div>
          {data.seniorCreated && (
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-bg-soft px-3 py-2.5">
                <dt className="text-xs text-ink-faint">Living now</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {senior.livingSituation === "other"
                    ? senior.livingSituationOther
                    : labelForId(LIVING_SITUATIONS, senior.livingSituation) || "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-bg-soft px-3 py-2.5">
                <dt className="text-xs text-ink-faint">Looking for</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {senior.housingTypes
                    .map((id) => labelForId(HOUSING_TYPES, id))
                    .slice(0, 2)
                    .join(", ") || "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-bg-soft px-3 py-2.5">
                <dt className="text-xs text-ink-faint">Timeline</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  {labelForId(URGENCY_OPTIONS, senior.urgency) || "—"}
                </dd>
              </div>
            </dl>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button href="/family/senior-profile" size="sm" variant="soft">
              Open senior profile
            </Button>
            <Button href="/family/care-needs" size="sm" variant="secondary">
              Care needs
            </Button>
            {!data.seniorCreated && (
              <Button href="/onboarding" size="sm">
                Finish setup
              </Button>
            )}
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Quick links</h2>
          <Button href="/family/documents" size="sm" variant="secondary" className="w-full">
            Documents
          </Button>
          <Button href="/family/tasks" size="sm" variant="ghost" className="w-full">
            <CheckCircle2 size={14} /> Tasks
          </Button>
          <Button href="/family/messages" size="sm" variant="ghost" className="w-full">
            <MessageSquare size={14} /> Messages
          </Button>
          <Button href="/family/family-members" size="sm" variant="ghost" className="w-full">
            Family members
          </Button>
          <div className="flex items-start gap-2 pt-2 text-sm text-ink-muted">
            <CalendarDays size={16} className="mt-0.5 shrink-0" />
            Tours and deadlines will appear here in a later step.
          </div>
          <div className="flex items-start gap-2 text-sm text-ink-muted">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            Save communities from search to build your shortlist.
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Active applications</h2>
          <Link href="/family/applications" className="text-sm font-medium text-brand">
            View all
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {active.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
              <p className="text-sm text-ink-muted">No active applications yet.</p>
              <Button href="/family/find-communities" size="sm" className="mt-3">
                Find communities
              </Button>
            </div>
          ) : (
            active.slice(0, 4).map((app) => (
              <Link
                key={app.id}
                href={`/family/applications/${app.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:bg-bg-soft"
              >
                <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                  <Image src={app.image} alt="" fill className="object-cover" sizes="48px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{app.residenceName}</p>
                  <p className="text-xs text-ink-muted">{app.submittedDate ?? "Draft"}</p>
                </div>
                {app.requestedDocuments.length > 0 && (
                  <Badge tone="warn">
                    <FileWarning size={12} /> Docs
                  </Badge>
                )}
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
