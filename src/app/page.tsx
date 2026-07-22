import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSearch,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { images } from "@/data/images";

const steps = [
  {
    title: "Create one intelligent profile",
    text: "Guided AI onboarding, upload records or answer calmly. Autosaved. Resumable.",
  },
  {
    title: "Discover & compare communities",
    text: "Search like Airbnb. Filter by care, insurance, budget, waitlist, and distance.",
  },
  {
    title: "Apply once. Everywhere.",
    text: "One-click applications with shared documents, timelines, and clear next steps.",
  },
  {
    title: "Track admission to move-in",
    text: "Tours, assessments, waitlists, and messages, one calm operating system.",
  },
];

export default function HomePage() {
  return (
    <div className="gradient-mesh">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 pb-16 pt-12 md:px-8 md:pb-24 md:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="animate-rise">
            <Badge tone="ai" className="mb-5">
              <Sparkles size={12} /> AI-first admissions OS
            </Badge>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink md:text-6xl">
              The Common App for senior living.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-secondary md:text-xl">
              One intelligent profile. Apply to assisted living, memory care, and nursing homes in a
              few clicks, with clarity families can trust.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/family/dashboard" size="lg">
                Start your application
                <ArrowRight size={18} />
              </Button>
              <Button href="/find-senior-living" size="lg" variant="secondary">
                Find Senior Living
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-brand" /> No duplicate paperwork
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-brand" /> Privacy controls & consent tracking
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-brand" /> Built for adult children
              </span>
            </div>
          </div>

          <div className="relative animate-rise overflow-hidden rounded-[28px] shadow-lift">
            <div className="relative aspect-[4/5] md:aspect-[5/4]">
              <Image
                src={images.hero}
                alt="Family caregiver supporting a senior parent"
                fill
                priority
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl glass p-4 text-ink shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">Live preview</p>
                <p className="mt-1 text-sm font-medium">Paul Gilbert’s profile · 82% complete</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-mute">
                  <div className="h-full w-[82%] rounded-full bg-brand" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience promise */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8">
          <p className="text-center text-base leading-snug text-ink-secondary md:whitespace-nowrap md:text-lg">
            For families and care professionals alike, Haven makes transfers and integration simpler,
            clearer, and more human.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">The problem</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Admissions today are slow, opaque, and exhausting.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: FileSearch,
              title: "Duplicate forms",
              text: "Every community asks for the same medical story, again and again.",
            },
            {
              icon: Timer,
              title: "Black-box waiting",
              text: "Families don’t know who’s reviewing, what’s missing, or how long it takes.",
            },
            {
              icon: Users,
              title: "Scattered coordination",
              text: "Siblings, hospitals, and communities juggle email, PDFs, and phone tag.",
            },
          ].map((item) => (
            <Card key={item.title} className="p-6" hover>
              <item.icon className="text-brand" size={22} />
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Solution */}
      <section className="bg-ink px-5 py-20 text-white md:px-8 md:py-28">
        <div className="mx-auto max-w-[1400px]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">Solution</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Haven is the operating system for senior living admissions.
          </h2>
          <p className="mt-4 max-w-xl text-white/70">
            Not a marketplace. A shared application layer for families, care professionals, and
            residences, with AI that removes busywork.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              [
                "Families & loved ones",
                "One profile for the person you care for. Apply everywhere. Track every response.",
              ],
              [
                "Social workers & care coordinators",
                "Discharge planners and care teams place seniors without fax chaos or phone tag.",
              ],
              [
                "Residences",
                "Complete applicants. Faster admissions decisions. Higher occupancy.",
              ],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-white/65">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Four calm steps from overwhelm to clarity
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <Card key={step.title} className="p-6" hover>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Step {i + 1}
              </p>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[32px] border border-line bg-surface shadow-card">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 md:p-12">
              <Badge tone="ai">
                <Sparkles size={12} /> Haven AI
              </Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Upload records. Get a living profile.
              </h2>
              <p className="mt-3 text-ink-muted">
                Discharge summaries, medication lists, and insurance cards become editable fields with
                confidence scores, you verify, we don’t guess silently.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Extract diagnoses, meds, physicians, and care needs",
                  "Flag missing documents before you apply",
                  "Recommend communities with AI Match %",
                  "Draft messages and explain medical terms in plain language",
                ].map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-ink-secondary">
                    <Zap size={16} className="mt-0.5 shrink-0 text-ai" />
                    {t}
                  </li>
                ))}
              </ul>
              <Button href="/assistant" className="mt-8" variant="ai">
                Talk with Haven
              </Button>
            </div>
            <div className="relative min-h-[320px] bg-bg-soft p-6 md:p-10">
              <div className="absolute inset-6 rounded-2xl border border-line bg-surface p-5 shadow-soft md:inset-10">
                <p className="text-xs font-semibold text-ink-faint">AI extraction · 94% confidence</p>
                <div className="mt-4 space-y-3">
                  {["Mild cognitive impairment", "Amlodipine 5mg", "RAMQ + private rider", "Walker outdoors"].map(
                    (row) => (
                      <div
                        key={row}
                        className="flex items-center justify-between rounded-xl bg-bg-soft px-3 py-2.5 text-sm"
                      >
                        <span>{row}</span>
                        <Badge tone="success">Verified</Badge>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-[1400px] px-5 py-16 md:px-8 md:py-20">
        <h2 className="text-3xl font-semibold tracking-tight">Trusted in hard moments</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              q: "We applied to five homes in one evening. Haven made the hardest week of our lives feel navigable.",
              n: "Claire M.",
              r: "Daughter · Montreal",
            },
            {
              q: "As a case manager, complete profiles mean fewer bounce-backs and faster placement.",
              n: "Jordan P.",
              r: "Hospital case management",
            },
            {
              q: "Our intake team finally sees medical context on day one, not after three email chains.",
              n: "Amélie R.",
              r: "Residence director",
            },
          ].map((t) => (
            <Card key={t.n} className="p-6" hover>
              <p className="text-[1.05rem] leading-relaxed text-ink">“{t.q}”</p>
              <p className="mt-6 text-sm font-semibold">{t.n}</p>
              <p className="text-sm text-ink-muted">{t.r}</p>
            </Card>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-8 text-sm font-medium text-ink-faint">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={16} /> Access controls & audit trails
          </span>
          <span>Care Alliance Network</span>
          <span>Family Care Collective</span>
          <span>Residence Directors Guild</span>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Free for families. Built for partners.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              name: "Families",
              price: "$0",
              desc: "Profile, applications, vault, messaging, AI guidance.",
              cta: "Create account",
              href: "/family/dashboard",
              featured: false,
            },
            {
              name: "Communities",
              price: "Custom",
              desc: "Receive complete applications, review the packet, message families, decide.",
              cta: "Join as a community",
              href: "/community/dashboard",
              featured: true,
            },
            {
              name: "Hospitals",
              price: "Custom",
              desc: "Discharge workflows, multi-send applications, tracking.",
              cta: "Hospital login",
              href: "/hospital-login",
              featured: false,
            },
          ].map((p) => (
            <Card
              key={p.name}
              className={`p-7 ${p.featured ? "border-brand shadow-card ring-1 ring-brand/20" : ""}`}
            >
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-4 text-4xl font-semibold tracking-tight">{p.price}</p>
              <p className="mt-3 text-sm text-ink-muted">{p.desc}</p>
              <Button href={p.href} className="mt-6 w-full" variant={p.featured ? "primary" : "secondary"}>
                {p.cta}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-20 md:px-8 md:pb-28">
        <h2 className="text-center text-3xl font-semibold tracking-tight">FAQ</h2>
        <div className="mt-8 space-y-3">
          {[
            [
              "Is this a marketplace?",
              "No. Haven is a common application and admissions OS. Communities remain the decision-makers.",
            ],
            [
              "Do I need an account to browse?",
              "Browse freely. Account required to apply, upload documents, message, or save a medical profile.",
            ],
            [
              "How does AI use our medical data?",
              "AI extracts and suggests, you verify. Sharing is explicit per application.",
            ],
            [
              "Can hospitals and siblings collaborate?",
              "Yes. Shared family access and hospital discharge flows are first-class.",
            ],
          ].map(([q, a]) => (
            <details
              key={q}
              className="group rounded-2xl border border-line bg-surface px-5 py-4 open:shadow-soft"
            >
              <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-4">
                  <span>{q}</span>
                  <span className="text-ink-faint transition group-open:rotate-45">+</span>
                </div>
              </summary>
              <p className="mt-3 text-sm text-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-strong via-brand to-accent px-8 py-14 text-center text-white shadow-lift md:px-16">
          <Building2 className="mx-auto opacity-80" size={28} />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Start the calmest admissions journey you’ve had
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Talk with Haven to build your loved one&apos;s profile once, then apply to communities with clarity.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/family/dashboard" size="lg" variant="onDark">
              Let&apos;s build your loved one&apos;s profile
            </Button>
            <Button
              href="/find-senior-living"
              size="lg"
              variant="ghost"
              className="border border-white/25 text-white hover:bg-white/10 hover:text-white"
            >
              Find Senior Living
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
