"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/locale";

const bigSteps = [
  {
    n: "1",
    title: "Create",
    short: "Build one profile for your loved one",
    detail:
      "Answer a few questions with Haven AI or fill forms yourself. Add care needs and upload documents once.",
  },
  {
    n: "2",
    title: "Discover",
    short: "Find communities that match",
    detail:
      "Browse by location, care type, and budget. Save favorites and compare before you apply.",
  },
  {
    n: "3",
    title: "Apply",
    short: "Send the same packet in a few clicks",
    detail:
      "Confirm once. Haven sends the profile and documents. Track each community separately.",
  },
];

const details = [
  {
    icon: Users,
    title: "One shared family profile",
    body: "Identity, living situation, timeline, budget, and care needs live in one place. Update anytime.",
    hint: "Profile",
  },
  {
    icon: FileText,
    title: "Documents in one vault",
    body: "ID, insurance, physician notes, upload once, then attach what each community needs.",
    hint: "Documents",
  },
  {
    icon: Search,
    title: "Search with clarity",
    body: "See match scores, care levels, and pricing signals so shortlisting feels less overwhelming.",
    hint: "Discover",
  },
  {
    icon: Send,
    title: "Apply without retyping",
    body: "Send a complete packet to one community or several. No rebuilding the same forms.",
    hint: "Apply",
  },
  {
    icon: MessageSquare,
    title: "Follow up privately",
    body: "Messages, document requests, and decisions stay tied to each application, not mixed together.",
    hint: "Track",
  },
];

export default function HowItWorksPage() {
  const t = useT();
  return (
    <div className="bg-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-[1320px] px-5 pb-12 pt-12 md:px-16 md:pb-16 md:pt-16">
          <p className="home-eyebrow text-brand-strong">
            {t("How it works")}
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-ink md:text-[2.85rem] md:leading-[1.12]">
            {t("One profile. Then apply everywhere.")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted md:text-lg">
            {t("Create the dossier once, discover the right communities, and send applications without")}
            starting over, so your family can move forward with clarity.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/family/dashboard" size="lg">
              {t("Create a family profile")}
            </Button>
            <Button href="/for-communities" size="lg" variant="secondary">
              {t("I’m a community")}
            </Button>
          </div>
        </div>
      </section>

      {/* Big 3 steps, the mental model */}
      <section className="border-y border-line/80 bg-surface/80">
        <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-8 md:py-16">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.12em] text-ink-faint">
            {t("The whole journey in three steps")}
          </p>

          <ol className="relative mt-10 grid gap-6 md:grid-cols-3 md:gap-5">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[18%] right-[18%] top-[1.85rem] hidden h-px bg-gradient-to-r from-brand/15 via-brand/35 to-brand/15 md:block"
            />
            {bigSteps.map((step) => (
              <li
                key={step.n}
                className="relative rounded-[20px] border border-line bg-surface p-6 text-center  md:px-5"
              >
                <span className="relative z-[1] mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand/25 bg-brand-soft text-xl font-semibold text-brand-strong">
                  {step.n}
                </span>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{t(step.title)}</h2>
                <p className="mt-2 text-sm font-medium text-ink-secondary">{t(step.short)}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t(step.detail)}</p>
              </li>
            ))}
          </ol>

          <p className="mt-8 text-center text-sm text-ink-faint">
            {t("That’s it. Everything else is detail to make those three steps easier.")}
          </p>
        </div>
      </section>

      {/* What you do, concretely */}
      <section className="mx-auto max-w-[1320px] px-5 py-16 md:px-8 md:py-20">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-[2.1rem]">
            {t("What that looks like in Haven")}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            {t("Each step is designed so you always know what to do next, without admin overwhelm.")}
          </p>
        </div>

        <ul className="mt-10 space-y-3">
          {details.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={t(item.title)}
                className="grid gap-4 rounded-[14px] border border-line bg-surface p-4 shadow-xs sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-6 sm:p-5"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand-strong">
                    <Icon size={18} />
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-ink-faint sm:hidden">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-ink">{t(item.title)}</h3>
                    <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
                      {item.hint}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t(item.body)}</p>
                </div>
                <span className="hidden text-xs font-semibold tabular-nums text-ink-faint sm:block">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Two audiences */}
      <section className="border-t border-line/70 bg-brand-soft/30">
        <div className="mx-auto grid max-w-[1320px] gap-5 px-5 py-14 md:grid-cols-2 md:px-8 md:py-16">
          <div className="rounded-[20px] border border-line bg-surface p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-strong">Families</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">
              {t("Create once. Stay in control.")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {[
                "Chat with Haven or use simple forms",
                "Share access with siblings or caregivers",
                "Nothing is sent without your approval",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-strong" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/for-families"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline"
            >
              For families <ArrowRight size={14} />
            </Link>
          </div>

          <div className="rounded-[20px] border border-line bg-surface p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-strong">
              Communities
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-ink">
              {t("Receive. Review. Decide.")}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {[
                "Get complete digital admission packets",
                "Request docs or info from the application",
                "Accept, decline, or wait, families are notified",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-strong" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/for-communities"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline"
            >
              For communities <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* AI note */}
      <section className="mx-auto max-w-[1320px] px-5 py-14 md:px-8 md:py-16">
        <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-6 shadow-xs md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-ink text-white">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">
                {t("Prefer talking it through?")}
              </h3>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-ink-muted">
                {t("Haven can gather the profile in a conversation, or you can switch to manual forms")}
                anytime. Same result either way.
              </p>
            </div>
          </div>
          <Button href="/family/dashboard" className="shrink-0">
            {t("Get started")}
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20 md:px-16 md:pb-28">
        <div className="mx-auto max-w-[920px] rounded-[1.75rem] border border-brand/20 bg-gradient-to-br from-brand-soft/80 via-surface to-surface px-6 py-12 text-center md:px-12 md:py-14">
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-[2.15rem]">
            {t("Ready when you are")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-ink-muted">
            {t("Start with the profile. Discover communities next. Apply when it feels right.")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/family/dashboard" size="lg">
              {t("Create a family profile")}
            </Button>
            <Button href="/find-senior-living" size="lg" variant="secondary">
              {t("Browse communities")}
            </Button>
          </div>
          <p className="mt-5 text-sm text-ink-faint">
            {t("Free to create a profile. No application is sent without your approval.")}
          </p>
        </div>
      </section>
    </div>
  );
}
