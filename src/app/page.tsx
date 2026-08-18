"use client";

import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartHandshake,
  Hospital,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { images } from "@/data/images";
import { useT } from "@/lib/i18n/locale";
import { residences } from "@/data/residences";

const journey = [
  "Create profile",
  "Find communities",
  "Submit applications",
  "Complete assessments",
  "Receive decisions",
  "Move in",
];

const faq = [
  {
    q: "Can I apply to multiple communities?",
    a: "Yes. Build your loved one’s profile once, then send it to as many communities as you need, without starting over each time.",
  },
  {
    q: "Do I need every document before I start?",
    a: "No. Begin with what you have. You can upload records and fill in details gradually as you gather them.",
  },
  {
    q: "Can my siblings help manage the application?",
    a: "Yes. Invite family members to share the same profile so everyone stays informed and can help when needed.",
  },
  {
    q: "Can a hospital social worker submit an application?",
    a: "Yes. Care professionals can prepare and submit applications on behalf of patients, then keep everyone updated in one place.",
  },
  {
    q: "How is my medical information protected?",
    a: "You decide who receives your information. Medical records are only shared after you give explicit consent for each application.",
  },
];

const previewCommunities = residences.slice(0, 3);

function ProductPreview() {
  const t = useT();
  return (
    <div className="rounded-[28px] border border-line bg-bg-soft/80 p-4 shadow-soft md:p-5">
      <div className="space-y-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("Care profile")}
              </p>
              <p className="mt-1 text-base font-semibold text-ink">Paul Gilbert</p>
              <p className="text-sm text-ink-muted">{t("Ready to share when you are")}</p>
            </div>
            <Badge tone="success">{t("Complete")}</Badge>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-mute">
            <div className="h-full w-[92%] rounded-full bg-brand" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-brand" />
              <p className="text-xs font-semibold">{t("Documents")}</p>
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums">6</p>
            <p className="text-[11px] text-ink-faint">{t("In your vault")}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex items-center gap-2">
              <HeartHandshake size={14} className="text-brand" />
              <p className="text-xs font-semibold">{t("Applications")}</p>
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums">3</p>
            <p className="text-[11px] text-ink-faint">{t("In progress")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <p className="mb-2.5 text-xs font-semibold">{t("Where things stand")}</p>
          <div className="space-y-2">
            {[
              { name: "Maple Grove", status: t("Waiting review") },
              { name: "Lakeside Haven", status: t("Assessment requested") },
              { name: "Oak Hill", status: t("Tour scheduled") },
            ].map((app) => (
              <div
                key={app.name}
                className="flex items-center justify-between gap-2 rounded-xl bg-bg-soft/70 px-3 py-2"
              >
                <p className="truncate text-sm font-medium">{app.name}</p>
                <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-strong">
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const t = useT();
  return (
    <div className="gradient-mesh">
      {/* 1 - Hero */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/community-photos/amenity-garden.jpg"
          alt=""
          fill
          priority
          aria-hidden
          sizes="100vw"
          className="hero-drift -z-20 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.72) 38%, rgba(255,255,255,0.94) 100%), radial-gradient(ellipse 62% 55% at 50% 48%, rgba(255,255,255,0.75), transparent 72%)",
          }}
        />

        <div className="mx-auto max-w-[1400px] px-5 py-24 text-center md:px-8 md:pb-[88px] md:pt-24">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-strong">
            {t("Senior living admissions")}
          </p>
          <h1 className="mx-auto mt-[22px] max-w-[820px] text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-pretty text-ink md:text-[66px]">
            {t("One application. Every community you’re considering.")}
          </h1>
          <p className="mx-auto mt-6 max-w-[600px] text-lg leading-[1.55] text-ink-secondary md:text-xl">
            {t(
              "Fill it out once for your parent. Send it to as many care communities as you like, and follow every answer in one place.",
            )}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button href="/get-started" size="lg" className="h-14 rounded-full px-7">
              {t("Start an application")}
            </Button>
            <Button
              href="#how-it-works"
              size="lg"
              variant="secondary"
              className="h-14 rounded-full border-line-strong bg-white px-7"
            >
              {t("See how it works")}
            </Button>
          </div>
          <p className="mt-[26px] text-[15px] text-ink-muted">
            {t("Free for families · Takes about 15 minutes")}
          </p>

          <div className="mx-auto mt-16 grid max-w-[900px] grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            {[
              { k: "1", v: "form to fill out" },
              { k: "Any", v: "number of communities" },
              { k: "0", v: "documents shared without your consent" },
            ].map((s) => (
              <div key={s.v} className="bg-surface/90 p-6 text-left backdrop-blur-sm">
                <p className="text-3xl font-semibold tracking-[-0.02em]">{s.k}</p>
                <p className="mt-1.5 text-[15px] text-ink-muted">{t(s.v)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2 - Everything in one place */}
      <section
        id="how-it-works"
        className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 md:px-8 md:py-28"
      >
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("Everything families need in one place.")}
          </h2>
          <p className="mt-4 text-lg text-ink-muted">
            {t("When you’re helping a parent, the last thing you need is another maze of forms and folders.")}
          </p>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <ProductPreview />
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: t("Build a complete care profile"),
                text: t("Upload records or answer guided questions. Haven organizes everything into a clear profile you review before sharing."),
              },
              {
                title: t("Keep documents organized"),
                text: t("Medication lists, insurance, diagnoses, assessments, and emergency contacts, no more searching through emails and PDFs."),
              },
              {
                title: t("Apply to multiple communities"),
                text: t("Complete your profile once. Reuse it anywhere. No duplicate paperwork."),
              },
              {
                title: t("Track every application"),
                text: t("See where each application stands, waiting review, assessment requested, more information needed, tour scheduled, or accepted."),
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 - Find the right community */}
      <section className="border-y border-line bg-surface px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[1400px]">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {t("Find communities that fit your family’s needs.")}
            </h2>
            <p className="mt-4 text-lg text-ink-muted">
              {t("Search by care type, budget, distance, insurance, and availability, so you spend less time guessing and more time comparing what matters.")}
            </p>
          </div>

          <div className="mt-10 rounded-[28px] border border-line bg-bg-soft/60 p-4 md:p-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xs sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-2 text-sm text-ink-muted">
                <Search size={16} className="text-brand" />
                {t("Near home · Assisted living · Within budget")}
              </div>
              <div className="flex flex-wrap gap-2">
                {["Care type", "Budget", "Distance", "Insurance", "Availability"].map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-bg-soft px-3 py-1 text-xs font-medium text-ink-secondary"
                  >
                    {t(f)}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-line bg-brand-soft/40">
                <Image
                  src={previewCommunities[0]?.image || images.community}
                  alt={t("Senior living community setting")}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-ink/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-sm font-medium text-white">
                  <MapPin size={16} />
                  {t("Communities near your family")}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {previewCommunities.map((c) => (
                  <Card key={c.id} className="overflow-hidden p-0" hover>
                    <div className="relative h-28">
                      <Image
                        src={c.image}
                        alt={c.name}
                        fill
                        className="object-cover"
                        sizes="(max-width:768px) 100vw, 220px"
                      />
                    </div>
                    <div className="p-3.5">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="mt-1 truncate text-xs text-ink-muted">
                        {c.city} · {c.careLevels[0] || t("Senior living")}
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
                        {t("Care offered · Pricing · Admission needs · Availability")}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button href="/find-senior-living" size="lg">
              {t("Browse communities")}
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      {/* 4 - Medical records */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28">
        <div className="overflow-hidden rounded-[32px] border border-line bg-surface shadow-card">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 md:p-12 lg:p-14">
              <h2 className="max-w-md text-3xl font-semibold tracking-tight md:text-4xl">
                {t("Your medical records become a living profile.")}
              </h2>
              <p className="mt-4 max-w-md text-ink-muted">
                {t("Simply upload the documents you already have. Haven gently organizes medications, diagnoses, physicians, care needs, and insurance into fields you can edit.")}
              </p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-secondary">
                {t("Nothing is shared until you review it. You stay in control of every detail.")}
              </p>
              <ul className="mt-8 space-y-3 text-sm text-ink-secondary">
                {[
                  "Medications and diagnoses, clearly listed",
                  "Physicians and care needs in one view",
                  "Insurance details ready when communities ask",
                  "Everything editable before you send an application",
                ].map((row) => (
                  <li key={row} className="flex gap-2.5">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
                    {t(row)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative min-h-[320px] bg-bg-soft p-6 md:p-10">
              <div className="absolute inset-6 rounded-2xl border border-line bg-surface p-5 shadow-soft md:inset-10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-ink-faint">{t("Profile details")}</p>
                  <Badge tone="success" className="opacity-80">
                    {t("Ready to review")}
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    "Mild cognitive impairment",
                    "Amlodipine 5mg",
                    "RAMQ + private rider",
                    "Walker outdoors",
                  ].map((row) => (
                    <div
                      key={row}
                      className="flex items-center justify-between rounded-xl bg-bg-soft px-3 py-2.5 text-sm"
                    >
                      <span>{row}</span>
                      <Badge tone="success">{t("Verified")}</Badge>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-ink-faint">
                  {t("Confidence cues help you review, your confirmation is what matters.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 - Built for everyone involved */}
      <section className="border-y border-line bg-surface px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[1400px]">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {t("Built for everyone involved.")}
            </h2>
            <p className="mt-4 text-lg text-ink-muted">
              {t("Families, care teams, and communities can finally work from the same clear picture.")}
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: t("Families"),
                points: [
                  "Create one application",
                  "Stay informed",
                  "Collaborate with siblings",
                ],
              },
              {
                icon: Hospital,
                title: t("Hospitals & social workers"),
                points: [
                  "Prepare referrals faster",
                  "Avoid duplicate paperwork",
                  "Track every placement",
                ],
              },
              {
                icon: ClipboardList,
                title: t("Senior living communities"),
                points: [
                  "Receive complete applications",
                  "Review organized medical information",
                  "Request more details in one conversation",
                ],
              },
            ].map((card) => (
              <Card key={card.title} className="p-7" hover>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <card.icon size={20} />
                </span>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{card.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {card.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-ink-muted">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand" />
                      {t(p)}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6 - Admissions journey */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("The admissions journey, made clearer.")}
          </h2>
          <p className="mt-4 text-lg text-ink-muted">
            {t("From the first conversation to moving day, one path you can follow together.")}
          </p>
        </div>
        <ol className="mx-auto mt-14 flex max-w-3xl flex-col items-center gap-0">
          {journey.map((step, i) => (
            <li key={step} className="flex w-full flex-col items-center">
              <div className="flex w-full max-w-sm items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 shadow-xs">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
                  {i + 1}
                </span>
                <span className="text-base font-medium text-ink">{t(step)}</span>
              </div>
              {i < journey.length - 1 ? (
                <span
                  aria-hidden
                  className="my-2 h-6 w-px bg-gradient-to-b from-brand/40 to-brand/10"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* 7 - Privacy */}
      <section className="border-y border-line bg-surface px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
              {t("Your information stays under your control.")}
            </h2>
            <div className="mt-6 max-w-xl space-y-4 text-ink-muted">
              <p>{t("Families decide exactly who receives their information.")}</p>
              <p>{t("Medical records are only shared after explicit consent.")}</p>
              <p>{t("Documents remain securely stored for the people you trust.")}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Lock, label: t("Encrypted storage") },
              { icon: ShieldCheck, label: t("Consent tracking") },
              { icon: FileText, label: t("Audit history") },
              { icon: HeartHandshake, label: t("Share only what you choose") },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-line bg-bg p-4"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <item.icon size={18} />
                </span>
                <span className="text-sm font-medium text-ink">{t(item.label)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("Less stress. Clearer communication.")}
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              q: "We applied to five homes in one evening. Haven made the hardest week of our lives feel manageable.",
              n: "Claire M.",
              r: "Daughter · Family",
            },
            {
              q: "I spend less time chasing documents and more time helping families. Referrals move faster when the profile is already complete.",
              n: "Jordan P.",
              r: "Hospital social worker",
            },
            {
              q: "We finally see the full medical picture on day one, and can ask for what we need without endless email chains.",
              n: "Amélie R.",
              r: "Residence administrator",
            },
          ].map((item) => (
            <Card key={item.n} className="p-7" hover>
              <p className="text-[1.05rem] leading-relaxed text-ink">“{t(item.q)}”</p>
              <p className="mt-6 text-sm font-semibold">{item.n}</p>
              <p className="text-sm text-ink-muted">{t(item.r)}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-16 md:px-8 md:pb-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">{t("Questions families ask")}</h2>
        <div className="mt-10 space-y-3">
          {faq.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-line bg-surface px-5 py-4 open:shadow-soft"
            >
              <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-4">
                  <span>{t(item.q)}</span>
                  <span className="text-ink-faint transition group-open:rotate-45">+</span>
                </div>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t(item.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-brand px-8 py-16 text-center text-white shadow-card md:px-16 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("Ready to make senior living admissions simpler?")}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/85">
            {t("Build one secure profile. Apply with confidence. Track every admission from one place.")}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/get-started" size="lg" variant="onDark">
              {t("Start your application")}
              <ArrowRight size={18} />
            </Button>
            <Button
              href="/find-senior-living"
              size="lg"
              variant="ghost"
              className="border border-white/25 text-white hover:bg-white/10 hover:text-white"
            >
              {t("Find senior living")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
