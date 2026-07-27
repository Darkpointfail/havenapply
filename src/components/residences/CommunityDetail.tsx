"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Building2,
  CalendarClock,
  Check,
  GitCompare,
  MapPin,
  Phone,
  Star,
  X,
} from "lucide-react";
import { ApplyButton } from "@/components/auth/ApplyButton";
import { MessageButton } from "@/components/auth/MessageButton";
import { CommunitiesMap } from "@/components/residences/CommunitiesMap";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { computeCompatibility } from "@/lib/community-match";
import { useFamilyData } from "@/lib/family-data";
import {
  canMessageCommunity,
  compareCommunitiesHref,
  messageSignInHref,
} from "@/lib/permissions";
import type { CommunityDetail } from "@/lib/residence-detail";
import { cn, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "care", label: "Care Services" },
  { id: "pricing", label: "Rooms & Pricing" },
  { id: "availability", label: "Availability" },
  { id: "amenities", label: "Amenities" },
  { id: "admission", label: "Admission" },
  { id: "reviews", label: "Reviews" },
  { id: "location", label: "Location" },
  { id: "contact", label: "Contact & Tour" },
] as const;

function availBadge(detail: CommunityDetail) {
  const s = detail.availabilityDetail.status;
  if (s === "available") return { tone: "success" as const, text: detail.availabilityDetail.label };
  if (s === "limited") return { tone: "warn" as const, text: detail.availabilityDetail.label };
  if (s === "waitlist") return { tone: "warn" as const, text: detail.availabilityDetail.label };
  return { tone: "neutral" as const, text: detail.availabilityDetail.label };
}

function SectionTitle({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div id={id} className="scroll-mt-28 border-b border-line pb-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
    </div>
  );
}

export function CommunityDetailView({ community }: { community: CommunityDetail }) {

  const t = useT();  const { user } = useAuth();
  const { data, toggleSavedCommunity, toggleCompareCommunity } = useFamilyData();
  const [slots, setSlots] = useState<string[]>([]);
  const [contactMode, setContactMode] = useState<"message" | "call" | "tour">("tour");
  const [sent, setSent] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const backHref =
    user?.role === "professional" ? "/professional/communities" : "/find-senior-living";
  const canContact = canMessageCommunity(user);

  const match = useMemo(
    () =>
      computeCompatibility(
        community,
        data.seniorCreated ? data.senior : null,
        data.careNeeds,
      ),
    [community, data.senior, data.seniorCreated, data.careNeeds],
  );

  const saved = data.savedFavorites.some((f) => f.communityId === community.id);
  const comparing = data.compareIds.includes(community.id);
  const avail = availBadge(community);
  const compareHref = compareCommunitiesHref([...data.compareIds, community.id]);

  const toggleSlot = (id: string) => {
    setSlots((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSent(false);
  };

  const submitContact = () => {
    if (!canContact) return;
    setSent(true);
  };

  return (
    <div className="pb-28">
      <div className="mx-auto max-w-7xl px-5 pt-6 md:px-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft size={16} /> Back to search
        </Link>

        {/* Gallery */}
        <div className="mt-4 grid gap-2 md:h-[400px] md:grid-cols-4 md:grid-rows-2">
          <button
            type="button"
            className="relative overflow-hidden rounded-[1.25rem] md:col-span-2 md:row-span-2"
            onClick={() => setGalleryOpen(true)}
          >
            <Image
              src={community.gallery[0] || community.image}
              alt={community.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width:768px) 100vw, 50vw"
            />
          </button>
          {community.gallery.slice(1, 5).map((src, i) => (
            <button
              key={src}
              type="button"
              className="relative hidden overflow-hidden rounded-[1rem] md:block"
              onClick={() => setGalleryOpen(true)}
            >
              <Image
                src={src}
                alt={`${community.name} photo ${i + 2}`}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-xs font-medium text-brand hover:underline"
          onClick={() => setGalleryOpen(true)}
        >
          {t("View photo gallery")}
        </button>

        {/* Header */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge tone={avail.tone}>{avail.text}</Badge>
              {!community.partner && <Badge tone="neutral">Non-partner</Badge>}
              <Badge tone="ai">{match.score}% match</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              {community.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} />
                {community.streetAddress}, {community.city}, {community.state} {community.zip}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={15} />
                {community.communityType}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Star size={15} className="fill-warn text-warn" />
                {community.rating} · {community.reviewCount} reviews
              </span>
            </p>
            <p className="mt-2 text-lg font-semibold">
              {community.priceAvailable && community.priceFrom != null ? (
                <>
                  From {formatCurrency(community.priceFrom)}
                  <span className="text-sm font-normal text-ink-muted"> / month</span>
                </>
              ) : (
                <span className="text-base font-medium text-ink-muted">Starting price unavailable</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={saved ? "soft" : "secondary"}
              onClick={() => toggleSavedCommunity(community.id)}
            >
              <Bookmark size={15} className={saved ? "fill-current" : undefined} />
              {saved ? "Saved" : "Save"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={comparing ? "soft" : "secondary"}
              onClick={() => toggleCompareCommunity(community.id)}
            >
              <GitCompare size={15} />
              {comparing ? "In compare" : "Compare"}
            </Button>
            <Button href={compareHref} size="sm" variant="ghost">
              {t("Open compare")}
            </Button>
            <MessageButton residenceId={community.id} size="sm">
              Message
            </MessageButton>
            <ApplyButton residenceId={community.id} size="sm">
              {t("Apply")}
            </ApplyButton>
          </div>
        </div>

        {/* Compatibility strip */}
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("Compatibility score")}
              </p>
              <p className="mt-1 text-2xl font-semibold text-ai">{match.score}%</p>
            </div>
            <ul className="max-w-2xl space-y-1">
              {match.reasons.slice(0, 3).map((r) => (
                <li
                  key={r.text}
                  className={cn(
                    "text-sm",
                    r.tone === "fit" && "text-success",
                    r.tone === "partial" && "text-ink-muted",
                    r.tone === "gap" && "text-warn",
                  )}
                >
                  {r.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-[11px] leading-snug text-ink-faint">{match.disclaimer}</p>
        </Card>

        {/* Section nav */}
        <nav
          className="sticky top-16 z-20 -mx-5 mt-6 overflow-x-auto border-y border-line bg-surface/95 px-5 py-2 backdrop-blur md:-mx-0 md:rounded-xl md:border md:px-2"
          aria-label={t("Page sections")}
        >
          <ul className="flex min-w-max gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-block rounded-lg px-3 py-1.5 text-sm text-ink-muted transition hover:bg-bg-soft hover:text-ink"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-12">
            {/* Overview */}
            <section>
              <SectionTitle
                id="overview"
                title={t("Overview")}
                subtitle="Description, philosophy, and community facts."
              />
              <p className="mt-4 leading-relaxed text-ink">{community.about}</p>
              <p className="mt-3 leading-relaxed text-ink-muted">
                <span className="font-medium text-ink">Philosophy, </span>
                {community.philosophy}
              </p>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Opened", String(community.yearOpened)],
                  ["Capacity", `${community.capacity} residents`],
                  ["Care types", community.careLevels.join(", ")],
                  ["Staff ratio", community.staffRatio],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-line bg-bg px-3 py-2.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                      {k}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {t("Licenses & certifications")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {community.licenses.map((lic) => (
                    <Badge key={lic} tone="brand">
                      {lic}
                    </Badge>
                  ))}
                  {community.inspections.map((ins) => (
                    <Badge key={ins.date} tone="sage">
                      Inspection {ins.date}: {ins.result}
                    </Badge>
                  ))}
                </div>
              </div>
            </section>

            {/* Care Services */}
            <section>
              <SectionTitle
                id="care"
                title={t("Care Services")}
                subtitle="What daily and clinical support looks like here."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {community.careServices.map((svc) => (
                  <div
                    key={svc.title}
                    className="rounded-xl border border-line bg-surface px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{svc.title}</h3>
                      {svc.available ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <Check size={14} /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-faint">
                          <X size={14} /> Limited / N/A
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-ink-muted">{svc.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { label: "Doctors", people: community.doctors },
                  { label: "Nurses", people: community.nurses },
                  { label: "Therapists", people: community.therapists },
                ].map((g) => (
                  <Card key={g.label} className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {g.label}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {g.people.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>

            {/* Rooms & Pricing */}
            <section>
              <SectionTitle
                id="pricing"
                title={t("Rooms and Pricing")}
                subtitle="Base rents, fees, deposits, and what’s included."
              />
              {community.pricingNote && (
                <p className="mt-3 rounded-xl bg-warn-soft/60 px-3 py-2 text-sm text-warn">
                  {community.rooms.some((r) => r.estimated) || !community.priceAvailable
                    ? "Estimative pricing, "
                    : ""}
                  {community.pricingNote}
                </p>
              )}
              <div className="mt-4 space-y-4">
                {community.rooms.map((room) => (
                  <Card key={room.name} className="overflow-hidden">
                    <div className="grid md:grid-cols-[200px_1fr]">
                      <div className="relative min-h-[140px] bg-bg-soft">
                        <Image
                          src={community.gallery[0] || community.image}
                          alt={room.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4 md:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{room.name}</h3>
                            <p className="text-sm text-ink-muted">
                              {room.type}
                              {room.sqft != null ? ` · ~${room.sqft} sq ft` : ""}
                              {room.estimated ? " · Estimative rate" : ""}
                            </p>
                          </div>
                          <p className="text-right">
                            <span className="text-lg font-semibold">
                              {room.basePrice != null
                                ? formatCurrency(room.basePrice)
                                : "Quote required"}
                            </span>
                            {room.basePrice != null && (
                              <span className="block text-xs text-ink-faint">base / month</span>
                            )}
                          </p>
                        </div>
                        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                          <div>
                            <dt className="text-xs text-ink-faint">Community fee</dt>
                            <dd className="font-medium">
                              {room.communityFee != null
                                ? formatCurrency(room.communityFee)
                                : ","}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-faint">Care fee (typical)</dt>
                            <dd className="font-medium">
                              {room.careFee != null ? formatCurrency(room.careFee) : ","}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-faint">Deposit</dt>
                            <dd className="font-medium">
                              {room.deposit != null ? formatCurrency(room.deposit) : ","}
                            </dd>
                          </div>
                        </dl>
                        <p className="mt-2 text-sm text-ink-muted">{room.notes}</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                              Included
                            </p>
                            <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
                              {room.included.slice(0, 5).map((i) => (
                                <li key={i}>· {i}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                              {t("Extra services")}
                            </p>
                            <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
                              {room.extras.map((i) => (
                                <li key={i}>· {i}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Availability */}
            <section>
              <SectionTitle
                id="availability"
                title={t("Availability")}
                subtitle="Current status and how to move forward."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-brand" />
                    <h3 className="font-semibold">{community.availabilityDetail.label}</h3>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    Estimated move-in:{" "}
                    <span className="font-medium text-ink">
                      {community.availabilityDetail.estimatedMoveIn || "Confirm with community"}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-ink-muted">
                    {community.availabilityDetail.contactNote}
                  </p>
                </Card>
                <Card className="flex flex-col justify-between p-4">
                  <div>
                    <h3 className="font-semibold">Contact the community</h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      {t("Message admissions, request a call, or book a tour below.")}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <MessageButton residenceId={community.id} size="sm">
                      Message
                    </MessageButton>
                    <Button href="#contact" size="sm" variant="secondary">
                      {t("Request call / tour")}
                    </Button>
                  </div>
                </Card>
              </div>
            </section>

            {/* Amenities */}
            <section>
              <SectionTitle
                id="amenities"
                title={t("Amenities")}
                subtitle="Daily life beyond clinical care."
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {community.amenityGroups.map((g) => (
                  <div key={g.title} className="rounded-xl border border-line px-4 py-3">
                    <h3 className="text-sm font-semibold">{g.title}</h3>
                    <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                      {g.items.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Admission */}
            <section>
              <SectionTitle
                id="admission"
                title={t("Admission Requirements")}
                subtitle="Documents, clinical fit, and financial criteria."
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <h3 className="font-semibold">Documents needed</h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                    {community.admission.documents.map((d) => (
                      <li key={d}>· {d}</li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold">Residency criteria</h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                    {community.admission.residencyCriteria.map((d) => (
                      <li key={d}>· {d}</li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold text-success">Conditions typically accepted</h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                    {community.admission.acceptedConditions.map((d) => (
                      <li key={d}>· {d}</li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold text-warn">Often not accepted</h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                    {community.admission.notAccepted.map((d) => (
                      <li key={d}>· {d}</li>
                    ))}
                  </ul>
                </Card>
              </div>
              <div className="mt-4 space-y-3">
                <Card className="p-4">
                  <h3 className="font-semibold">Assessment required</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {community.admission.assessmentRequired}
                  </p>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold">Financial policy</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {community.admission.financialPolicy}
                  </p>
                </Card>
              </div>
            </section>

            {/* Reviews */}
            <section>
              <SectionTitle
                id="reviews"
                title={t("Reviews")}
                subtitle="Family feedback, not a clinical or admission decision."
              />
              <div className="mt-4 flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-4xl font-semibold">{community.rating}</p>
                  <p className="text-sm text-ink-muted">{community.reviewCount} reviews</p>
                </div>
                <div className="grid min-w-[220px] flex-1 gap-2 sm:grid-cols-2">
                  {community.reviewCategories.map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">{c.label}</span>
                      <span className="font-medium">{c.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {community.detailedReviews.map((rev) => (
                  <Card key={`${rev.name}-${rev.date}`} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex text-warn">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} size={14} className="fill-warn" />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{rev.name}</span>
                      <span className="text-sm text-ink-faint">
                        {rev.relation} · {rev.date}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink">“{rev.text}”</p>
                    {rev.communityResponse && (
                      <div className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm text-ink-muted">
                        <span className="font-medium text-ink">Community response, </span>
                        {rev.communityResponse}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>

            {/* Location */}
            <section>
              <SectionTitle
                id="location"
                title={t("Location")}
                subtitle="Map context and nearby services."
              />
              <div className="mt-4">
                <CommunitiesMap
                  residences={[community]}
                  selectedId={community.id}
                  className="min-h-[280px]"
                />
                <p className="mt-2 text-sm text-ink-muted">{community.familyDistanceNote}</p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["Hospitals nearby", community.nearbyHospitals],
                    ["Pharmacies", community.nearbyPharmacies],
                    ["Services nearby", community.nearbyServices],
                  ] as const
                ).map(([title, places]) => (
                  <Card key={title} className="p-4">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <ul className="mt-2 space-y-2 text-sm">
                      {places.map((p) => (
                        <li key={p.name}>
                          <span className="font-medium">{p.name}</span>
                          <span className="block text-xs text-ink-faint">
                            {p.type} · {p.distance}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>

            {/* Contact & Tour */}
            <section>
              <SectionTitle
                id="contact"
                title={t("Contact and Tour")}
                subtitle="Message, request a call, pick tour times, or start an application."
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ["message", "Send a message"],
                    ["call", "Request a call"],
                    ["tour", "Request a visit"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setContactMode(id);
                      setSent(false);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition",
                      contactMode === id
                        ? "border-brand bg-brand-soft font-medium text-brand-strong"
                        : "border-line text-ink-muted hover:border-line-strong",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {contactMode === "tour" && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Choose one or more time slots</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {community.tourSlots.map((slot) => {
                      const on = slots.includes(slot.id);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => toggleSlot(slot.id)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-left text-sm transition",
                            on
                              ? "border-brand bg-brand-soft text-brand-strong"
                              : "border-line hover:border-line-strong",
                          )}
                        >
                          <span className="block font-medium">{slot.label}</span>
                          <span className="text-xs text-ink-muted">{slot.when}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Card className="mt-4 p-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={14} /> {community.phone}
                  </span>
                  <span>{community.email}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {contactMode === "message" ? (
                    <MessageButton residenceId={community.id}>Open messages</MessageButton>
                  ) : canContact ? (
                    <Button
                      type="button"
                      onClick={submitContact}
                      disabled={contactMode === "tour" && slots.length === 0}
                    >
                      {contactMode === "call" ? "Request a call back" : "Request selected visit times"}
                    </Button>
                  ) : (
                    <Button href={messageSignInHref(community.id)}>
                      {t("Sign in to contact")}
                    </Button>
                  )}
                  <ApplyButton residenceId={community.id} variant="soft" size="md">
                    {t("Apply here")}
                  </ApplyButton>
                </div>
                {sent && (
                  <p className="mt-3 text-sm text-success">
                    {t("Request saved for this demo. In production, admissions would receive it on Haven.")}
                  </p>
                )}
              </Card>
            </section>
          </div>

          {/* Sticky sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <Card className="p-5 shadow-card">
              <p className="text-xs uppercase tracking-wide text-ink-faint">From</p>
              <p className="text-2xl font-semibold">
                {community.priceAvailable && community.priceFrom != null ? (
                  <>
                    {formatCurrency(community.priceFrom)}
                    <span className="text-sm font-normal text-ink-muted"> / mo</span>
                  </>
                ) : (
                  <span className="text-lg text-ink-muted">Price on request</span>
                )}
              </p>
              <Badge tone={avail.tone} className="mt-2">
                {avail.text}
              </Badge>
              <p className="mt-2 text-sm text-ink-muted">
                Match {match.score}% · {community.rating}★ ({community.reviewCount})
              </p>
              {!community.partner && (
                <p className="mt-2 text-xs text-ink-faint">
                  {t("Non-partner listing, some Haven flows may be limited.")}
                </p>
              )}
              <ApplyButton residenceId={community.id} size="lg" className="mt-5 w-full">
                {t("Apply here")}
              </ApplyButton>
              <MessageButton residenceId={community.id} size="md" className="mt-2 w-full">
                Message
              </MessageButton>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={saved ? "soft" : "secondary"}
                  className="w-full"
                  onClick={() => toggleSavedCommunity(community.id)}
                >
                  {saved ? "Saved" : "Save"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={comparing ? "soft" : "secondary"}
                  className="w-full"
                  onClick={() => toggleCompareCommunity(community.id)}
                >
                  {t("Compare")}
                </Button>
              </div>
              <Button href="#contact" size="sm" variant="ghost" className="mt-2 w-full">
                {t("Request a tour")}
              </Button>
            </Card>
          </aside>
        </div>
      </div>

      {/* Mobile sticky */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {community.priceAvailable && community.priceFrom != null
                ? `${formatCurrency(community.priceFrom)}/mo`
                : "Price on request"}
            </p>
            <p className="text-xs text-ink-muted">
              {avail.text} · {match.score}% match
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <MessageButton residenceId={community.id} size="sm">
              Message
            </MessageButton>
            <ApplyButton residenceId={community.id} size="sm">
              {t("Apply")}
            </ApplyButton>
          </div>
        </div>
      </div>

      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
          role="dialog"
          aria-modal
          onClick={() => setGalleryOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Photos · {community.name}</h2>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-bg-soft"
                onClick={() => setGalleryOpen(false)}
                aria-label={t("Close")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(community.gallery.length ? community.gallery : [community.image]).map((src) => (
                <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <Image src={src} alt="" fill className="object-cover" sizes="50vw" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
