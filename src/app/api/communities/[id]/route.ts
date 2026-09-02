import { NextResponse } from "next/server";
import {
  getCatalogResidence,
  getCmsRawById,
} from "@/lib/cms-nursing-homes";
import { buildCommunityDetail } from "@/lib/residence-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const residence = getCatalogResidence(id);
  if (!residence) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const detail = buildCommunityDetail(residence);
  const cms = id.startsWith("cms-") ? getCmsRawById(id) : null;

  if (cms) {
    detail.streetAddress = cms.address || detail.streetAddress;
    detail.phone = cms.phone
      ? cms.phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
      : "N/A";
    detail.email = "N/A";
    detail.capacity = cms.beds != null ? Math.round(cms.beds) : detail.capacity;
    detail.yearOpened = cms.certifiedSince
      ? Number(cms.certifiedSince.slice(0, 4)) || detail.yearOpened
      : detail.yearOpened;
    detail.pricingNote = "Pricing is not published by CMS (N/A). Contact the facility for rates.";
    detail.licenses = [
      `CMS CCN ${cms.ccn}`,
      cms.providerType || "Medicare-certified",
      cms.ownership || "Ownership on file with CMS",
    ];
    detail.philosophy =
      "Profile built from Medicare Care Compare / CMS Provider Data Catalog. Photos and public pricing are not included.";
  }

  return NextResponse.json(detail);
}
