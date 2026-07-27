"use client";

import Link from "next/link";
import {
  Eye,
  FileText,
  FolderLock,
  HeartHandshake,
  Lock,
  MessageSquare,
  Send,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

function ProductPreview() {
  const t = useT();

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[2rem] bg-brand/5 blur-2xl md:-inset-6"
      />
      <div className="relative overflow-hidden rounded-[1.35rem] border border-line bg-surface p-4 shadow-[0_20px_50px_-28px_rgba(15,20,25,0.35)] md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-ink-faint">{t("Family dashboard")}</p>
            <p className="text-sm font-semibold text-ink">{t("Paul’s journey")}</p>
          </div>
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-strong">
            {t("72% ready")}
          </span>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-bg-soft/60 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Users size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t("Senior profile")}</p>
                  <p className="text-xs text-ink-muted">{t("Paul Gilbert · Assisted living")}</p>
                </div>
              </div>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                {t("Complete")}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full w-[92%] rounded-full bg-brand" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-brand" />
                <p className="text-xs font-semibold">{t("Documents")}</p>
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums">6</p>
              <p className="text-[11px] text-ink-faint">{t("2 still useful")}</p>
              <div className="mt-2 flex gap-1">
                <span className="h-1.5 flex-1 rounded-full bg-brand" />
                <span className="h-1.5 flex-1 rounded-full bg-brand" />
                <span className="h-1.5 flex-1 rounded-full bg-brand" />
                <span className="h-1.5 flex-1 rounded-full bg-bg-soft" />
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <HeartHandshake size={14} className="text-brand" />
                <p className="text-xs font-semibold">{t("Saved")}</p>
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums">3</p>
              <p className="text-[11px] text-ink-faint">{t("Communities")}</p>
              <div className="mt-2 flex -space-x-1.5">
                {["MG", "LH", "OH"].map((initials) => (
                  <span
                    key={initials}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-brand-soft text-[9px] font-bold text-brand-strong"
                  >
                    {initials}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-semibold">{t("Applications")}</p>
              <span className="text-[10px] text-ink-faint">{t("Updated today")}</span>
            </div>
            <div className="space-y-2">
              {[
                { name: "Maple Grove", status: t("Under review"), tone: "brand" },
                { name: "Lakeside Haven", status: t("Docs requested"), tone: "warn" },
              ].map((app) => (
                <div
                  key={app.name}
                  className="flex items-center justify-between gap-2 rounded-xl bg-bg-soft/70 px-3 py-2"
                >
                  <p className="truncate text-sm font-medium">{app.name}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      app.tone === "warn"
                        ? "bg-warn-soft text-warn"
                        : "bg-brand-soft text-brand-strong",
                    )}
                  >
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForFamiliesPage() {
  const t = useT();

  const trustItems = [
    { icon: FolderLock, label: t("Secure document storage") },
    { icon: Users, label: t("One shared family profile") },
    { icon: Send, label: t("Apply to multiple communities") },
    { icon: Lock, label: t("Private application updates") },
  ];

  const journey = [
    {
      title: t("Create"),
      body: t(
        "Build a care profile for yourself or a loved one, with AI help or step-by-step forms.",
      ),
    },
    {
      title: t("Discover"),
      body: t("Find and compare communities that match the care needs."),
    },
    {
      title: t("Apply"),
      body: t("Review the application and send it in one or two clicks."),
    },
  ];

  return (
    <div className="bg-bg">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--brand-soft)_0%,_transparent_55%)] opacity-90"
        />
        <div className="relative mx-auto grid max-w-[1120px] gap-12 px-5 pb-16 pt-12 md:px-8 md:pb-20 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
          <div>
            <span className="inline-flex rounded-full border border-brand/20 bg-brand-soft/80 px-3 py-1 text-xs font-semibold tracking-wide text-brand-strong">
              {t("For families")}
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-ink md:text-[2.85rem] md:leading-[1.12]">
              {t("A simpler way to find the right senior living community")}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-muted md:text-lg">
              {t(
                "Haven lets your family create one shared profile, compare communities, and send multiple applications without filling the same forms again.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/family/dashboard" size="lg">
                {t("Create a family profile")}
              </Button>
            </div>
            <p className="mt-5 text-sm text-ink-faint">
              {t("One profile. Multiple applications. Your family stays in control.")}
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-line/80 bg-surface/70">
        <div className="mx-auto grid max-w-[1120px] gap-4 px-5 py-6 sm:grid-cols-2 md:px-8 lg:grid-cols-4 lg:gap-2 lg:py-5">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-1 py-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon size={16} />
              </span>
              <p className="text-sm font-medium leading-snug text-ink-secondary">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line/70 bg-brand-soft/35">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-[2.1rem]">
              {t("Keep everyone in the family aligned")}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
              {t(
                "Invite siblings, caregivers or trusted relatives to help complete the profile and follow the applications. Choose what each person can view or edit.",
              )}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Eye, label: t("Shared visibility") },
                { icon: Shield, label: t("Controlled access") },
                { icon: MessageSquare, label: t("No more forwarded email threads") },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-line/80 bg-surface/90 px-4 py-4 shadow-xs"
                >
                  <Icon size={16} className="text-brand" />
                  <p className="mt-2.5 text-sm font-semibold leading-snug text-ink">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-line bg-surface p-5 shadow-[0_16px_40px_-28px_rgba(15,20,25,0.4)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("Family access")}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-strong">
                <UserPlus size={12} /> {t("Invite")}
              </span>
            </div>
            <ul className="space-y-3">
              {[
                { name: "David G.", role: t("Full access"), initials: "DG", you: true },
                { name: "Sarah G.", role: t("Can edit profile"), initials: "SG", you: false },
                { name: "Michael G.", role: t("View only"), initials: "MG", you: false },
              ].map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg-soft/40 px-3.5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
                      {p.initials}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {p.name}
                        {p.you ? (
                          <span className="ml-1.5 text-xs font-medium text-ink-faint">
                            {t("(you)")}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-ink-muted">{p.role}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                    {p.you ? t("Owner") : t("Guest")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 rounded-[1.5rem] border border-line bg-surface p-6 shadow-[0_12px_36px_-28px_rgba(15,20,25,0.35)] md:grid-cols-[1fr_1.05fr] md:items-center md:gap-12 md:p-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {t("Each application stays private")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              {t(
                "Every community only sees the information and documents you choose to send to them. Acceptances, waitlists and declines remain separate.",
              )}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { name: "Maple Grove", note: t("Under review"), tone: "brand" },
              { name: "Lakeside", note: t("Private thread"), tone: "neutral" },
              { name: "Orchard", note: t("Offer received"), tone: "success" },
            ].map((c) => (
              <div
                key={c.name}
                className="rounded-2xl border border-line bg-bg-soft/50 p-4 text-center"
              >
                <Lock size={14} className="mx-auto text-ink-faint" />
                <p className="mt-2 text-sm font-semibold">{c.name}</p>
                <p
                  className={cn(
                    "mt-1.5 text-[11px] font-medium",
                    c.tone === "success"
                      ? "text-success"
                      : c.tone === "brand"
                        ? "text-brand"
                        : "text-ink-muted",
                  )}
                >
                  {c.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line/70 bg-surface/60">
        <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-ink">
            {t("Three steps. Clear progress.")}
          </h2>
          <ol className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-brand/20 via-brand/40 to-brand/20 md:block"
            />
            {journey.map((step, i) => (
              <li key={step.title} className="relative text-center md:px-4">
                <span className="relative z-[1] mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand/25 bg-surface text-lg font-semibold text-brand shadow-xs">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 pb-20 pt-4 md:px-8 md:pb-28">
        <div className="mx-auto max-w-[920px] rounded-[1.75rem] border border-brand/20 bg-gradient-to-br from-brand-soft/80 via-surface to-surface px-6 py-12 text-center shadow-[0_20px_50px_-32px_rgba(15,118,110,0.45)] md:px-12 md:py-14">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-[2.2rem]">
            {t("Ready to make the search easier?")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-ink-muted">
            {t(
              "Create one family profile and start exploring senior living communities with more clarity.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/family/dashboard" size="lg">
              {t("Create a family profile")}
            </Button>
            <Button href="/find-senior-living" size="lg" variant="secondary">
              {t("Explore senior living communities")}
            </Button>
          </div>
          <p className="mt-5 text-sm text-ink-faint">
            {t("Free to create a profile. No application is sent without your approval.")}
          </p>
          <p className="mt-8 text-sm text-ink-muted">
            {t("Also see")}{" "}
            <Link href="/for-communities" className="font-medium text-brand hover:underline">
              {t("For communities")}
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
