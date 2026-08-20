"use client";

import { AudienceCards } from "@/components/marketing/AudienceCards";
import { BenefitsSplit } from "@/components/marketing/BenefitsSplit";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { ConcernsGrid } from "@/components/marketing/ConcernsGrid";
import { Faq } from "@/components/marketing/Faq";
import { FrictionList } from "@/components/marketing/FrictionList";
import { Hero } from "@/components/marketing/Hero";
import { HomeFooter } from "@/components/marketing/HomeFooter";
import { HomeHeader } from "@/components/marketing/HomeHeader";
import { PrivacyBlock } from "@/components/marketing/PrivacyBlock";
import { Steps } from "@/components/marketing/Steps";
import { TrackingPreview } from "@/components/marketing/TrackingPreview";

export function HomePageView() {
  return (
    <div className="bg-[var(--surface)] text-[var(--ink)]">
      <HomeHeader />
      <Hero />
      <AudienceCards />
      <Steps />
      <section className="bg-[var(--surface)] px-5 py-20 md:px-16 md:py-24">
        <div className="mx-auto grid max-w-[1320px] gap-12 md:grid-cols-2 md:gap-16 md:items-start">
          <FrictionList />
          <TrackingPreview />
        </div>
      </section>
      <BenefitsSplit />
      <PrivacyBlock />
      <ConcernsGrid />
      <Faq />
      <ClosingCta />
      <HomeFooter />
    </div>
  );
}
