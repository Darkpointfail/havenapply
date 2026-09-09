import { notFound } from "next/navigation";
import { CommunityDetailGate } from "@/components/residences/CommunityDetailGate";
import { residences } from "@/data/residences";
import { getCatalogResidence, getCmsRawById } from "@/lib/cms-nursing-homes";
import {
  getCommunityDetail,
  getCommunityDetailFromResidence,
  applyProfileToDetail,
} from "@/lib/residence-detail";
import { getProfile } from "@/lib/community-profile/repository";

export function generateStaticParams() {
  // Curated communities with photos only — Medicare facilities are resolved on demand.
  return residences.map((r) => ({ id: r.id }));
}

export default async function ResidenceProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let community = getCommunityDetail(id);
  if (!community) {
    const fromCatalog = getCatalogResidence(id);
    if (fromCatalog) {
      community = getCommunityDetailFromResidence(fromCatalog);
      const cms = id.startsWith("cms-") ? getCmsRawById(id) : null;
      if (cms) {
        const phone = cms.phone.replace(/\D/g, "");
        community = {
          ...community,
          streetAddress: cms.address || community.streetAddress,
          phone:
            phone.length === 10
              ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
              : cms.phone || "N/A",
          email: "N/A",
          capacity: cms.beds != null ? Math.round(cms.beds) : community.capacity,
          yearOpened: cms.certifiedSince
            ? Number(cms.certifiedSince.slice(0, 4)) || community.yearOpened
            : community.yearOpened,
          pricingNote:
            "Pricing is not published by CMS (N/A). Contact the facility for rates.",
          philosophy:
            "Profile built from Medicare Care Compare / CMS Provider Data Catalog. Photos and public pricing are not included.",
          licenses: [
            `CMS CCN ${cms.ccn}`,
            cms.providerType || "Medicare-certified",
            cms.ownership || "Ownership on file with CMS",
          ],
          rooms: [
            {
              name: "Skilled nursing room",
              type: "Private",
              sqft: null,
              basePrice: null,
              communityFee: null,
              careFee: null,
              deposit: null,
              estimated: true,
              included: ["Medicare / Medicaid certified care"],
              extras: [],
              notes: "Price N/A — request a quote from the facility.",
            },
          ],
        };
      }
    }
  }

  if (!community) notFound();

  // A résidence that saved its own profile in the staff console (whether a
  // curated demo listing or a real self-serve-claimed site) overrides the
  // fields it filled in, on top of whatever generated/CMS content is above.
  const profile = await getProfile(id);
  if (profile) {
    community = applyProfileToDetail(community, profile);
  }

  return <CommunityDetailGate community={community} />;
}
