"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Inbox,
  Lock,
  MessageSquare,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LaptopFrame } from "@/components/marketing/LaptopFrame";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

function ProductPreview() {
  const t = useT();

  return (
    <LaptopFrame className="max-w-md lg:max-w-none" screenClassName="bg-[var(--bg-soft)]">
      <div className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-ink-faint">{t("Admissions inbox")}</p>
            <p className="text-sm font-semibold text-ink">Maple Grove</p>
          </div>
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-strong">
            {t("4 need attention")}
          </span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t("New"), value: "2" },
              { label: t("In review"), value: "3" },
              { label: t("Need info"), value: "1" },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-line bg-bg-soft/60 px-2.5 py-2.5 text-center"
              >
                <p className="text-lg font-semibold tabular-nums text-ink">{m.value}</p>
                <p className="text-[10px] text-ink-faint">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[14px] border border-line bg-surface p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-semibold">{t("Incoming packets")}</p>
              <span className="text-[10px] text-ink-faint">{t("Today")}</span>
            </div>
            <div className="space-y-2">
              {[
                {
                  name: "Paul Gilbert",
                  meta: t("Assisted living · 6 documents"),
                  status: t("New"),
                  tone: "brand",
                },
                {
                  name: "Robert Chen",
                  meta: t("Memory care · Docs shared"),
                  status: t("Under review"),
                  tone: "neutral",
                },
                {
                  name: "Helen Walsh",
                  meta: t("Physician report missing"),
                  status: t("Need info"),
                  tone: "warn",
                },
              ].map((app) => (
                <div
                  key={app.name}
                  className="flex items-center justify-between gap-2 rounded-xl bg-bg-soft/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{app.name}</p>
                    <p className="truncate text-[10px] text-ink-faint">{app.meta}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      app.tone === "warn"
                        ? "bg-warn-soft text-warn"
                        : app.tone === "brand"
                          ? "bg-brand-soft text-brand-strong"
                          : "bg-bg-mute text-ink-muted",
                    )}
                  >
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-line bg-bg-soft/50 p-3.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-strong" />
              <p className="text-xs font-semibold">{t("Decision ready")}</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
              {t("Accept, decline, or request information, the family is notified in Haven.")}
            </p>
          </div>
        </div>
      </div>
    </LaptopFrame>
  );
}

export default function ForCommunitiesPage() {
  const t = useT();

  const trustItems = [
    { icon: Inbox, label: t("Complete digital applications") },
    { icon: FileText, label: t("Documents in one packet") },
    { icon: MessageSquare, label: t("Messaging on the application") },
    { icon: ClipboardCheck, label: t("Clear accept / decline trail") },
  ];

  const journey = [
    {
      title: t("Receive"),
      body: t(
        "Get a structured admission packet with profile, care needs, and shared documents.",
      ),
    },
    {
      title: t("Review"),
      body: t(
        "Read the file, request what’s missing, message the family, and propose a tour.",
      ),
    },
    {
      title: t("Decide"),
      body: t(
        "Accept, decline, or wait for information, the family is notified automatically.",
      ),
    },
  ];

  return (
    <div className="bg-bg">
      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid max-w-[1320px] gap-12 px-5 pb-16 pt-12 md:px-16 md:pb-20 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
          <div>
            <span className="inline-flex rounded-[10px] bg-brand-soft px-3 py-1.5 text-[16px] font-semibold tracking-wide text-brand-strong">
              {t("For Residences")}
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-ink md:text-[2.85rem] md:leading-[1.12]">
              {t("A simpler way to receive and review senior living applications")}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-muted md:text-lg">
              {t(
                "Haven is an admissions channel, not occupancy software. Families send complete digital packets. Your team reviews, messages, and decides in one place.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/community/dashboard" size="lg">
                {t("Create a community account")}
              </Button>
            </div>
            <p className="mt-5 text-sm text-ink-faint">
              {t("Receive. Review. Respond. Nothing else.")}
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-line/80 bg-surface/70">
        <div className="mx-auto grid max-w-[1320px] gap-4 px-5 py-6 sm:grid-cols-2 md:px-8 lg:grid-cols-4 lg:gap-2 lg:py-5">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-1 py-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                <Icon size={16} />
              </span>
              <p className="text-sm font-medium leading-snug text-ink-secondary">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line/70 bg-brand-soft/35">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-[2.1rem]">
              {t("Keep your admissions team aligned")}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
              {t(
                "Invite directors, coordinators, or site leads to review applications together. Internal notes stay private to your team. Families only see what you send.",
              )}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Users, label: t("Shared inbox") },
                { icon: Shield, label: t("Role-based access") },
                { icon: MessageSquare, label: t("Notes stay internal") },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-[14px] border border-line/80 bg-surface/90 px-4 py-4 shadow-xs"
                >
                  <Icon size={16} className="text-brand-strong" />
                  <p className="mt-2.5 text-sm font-semibold leading-snug text-ink">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-line bg-surface p-5  md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("Admissions team")}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-strong">
                <UserPlus size={12} /> {t("Invite")}
              </span>
            </div>
            <ul className="space-y-3">
              {[
                {
                  name: "Laura M.",
                  role: t("Director of Admissions"),
                  initials: "LM",
                  you: true,
                },
                {
                  name: "James K.",
                  role: t("Can review & decide"),
                  initials: "JK",
                  you: false,
                },
                {
                  name: "Priya S.",
                  role: t("View & message"),
                  initials: "PS",
                  you: false,
                },
              ].map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-bg-soft/40 px-3.5 py-3"
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
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-ink-muted">{p.role}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                    {p.you ? t("Admin") : t("Member")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 rounded-[20px] border border-line bg-surface p-6  md:grid-cols-[1fr_1.05fr] md:items-center md:gap-12 md:p-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              {t("Every application arrives complete")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              {t(
                "No more scattered emails or incomplete PDFs. Each packet includes the senior profile, care context, and the documents the family chose to share, ready to review.",
              )}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Users, name: t("Profile"), note: t("Care needs included") },
              { icon: FileText, name: t("Documents"), note: t("Attached & shared") },
              { icon: Lock, name: t("Your copy only"), note: t("Not visible to others") },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.name}
                  className="rounded-[14px] border border-line bg-bg-soft/50 p-4 text-center"
                >
                  <Icon size={14} className="mx-auto text-brand-strong" />
                  <p className="mt-2 text-sm font-semibold">{c.name}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-ink-muted">{c.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-line/70 bg-surface/60">
        <div className="mx-auto max-w-[1320px] px-5 py-16 md:px-8 md:py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-ink">
            {t("Three steps. Clear admissions.")}
          </h2>
          <ol className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-brand/20 via-brand/40 to-brand/20 md:block"
            />
            {journey.map((step, i) => (
              <li key={step.title} className="relative text-center md:px-4">
                <span className="relative z-[1] mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand/25 bg-surface text-lg font-semibold text-brand-strong shadow-xs">
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
        <div className="mx-auto max-w-[920px] rounded-[1.75rem] border border-brand/20 bg-gradient-to-br from-brand-soft/80 via-surface to-surface px-6 py-12 text-center  md:px-12 md:py-14">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-[2.2rem]">
            {t("Ready to simplify admissions?")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-ink-muted">
            {t(
              "Create a community account and start receiving complete applications in one organized inbox.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/community/dashboard" size="lg">
              {t("Create a community account")}
            </Button>
            <Button href="/community/dashboard" size="lg" variant="secondary">
              {t("Sign in to your portal")}
            </Button>
          </div>
          <p className="mt-5 text-sm text-ink-faint">
            {t("Focused on admissions only. No occupancy or resident management tools.")}
          </p>
          <p className="mt-8 text-sm text-ink-muted">
            {t("Also see")}{" "}
            <Link href="/for-families" className="font-medium text-brand-strong hover:underline">
              {t("For families")}
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
