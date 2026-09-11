import { NextResponse } from "next/server";
import { paginateAndFilterResidences, searchCommunities } from "@/lib/cms-nursing-homes";
import { listPublicResidences } from "@/lib/admissions/public-registry";
import { isSupabaseBackend } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = {
    query: searchParams.get("q") || undefined,
    state: searchParams.get("state") || undefined,
    careType: searchParams.get("care") || undefined,
    medicaid: searchParams.get("medicaid") === "1",
    minRating: searchParams.get("minRating")
      ? Number(searchParams.get("minRating"))
      : undefined,
    postalCode: searchParams.get("postal") || undefined,
    maxMiles: searchParams.get("miles") ? Number(searchParams.get("miles")) : undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 48,
    source: (searchParams.get("source") as "all" | "curated" | "medicare") || "all",
  };

  if (isSupabaseBackend()) {
    const list = await listPublicResidences();
    const result = paginateAndFilterResidences(list, input);
    // No CMS import and no curated demo catalog in Supabase mode — real
    // listings only, so the "N Medicare facilities indexed" messaging on the
    // client simply doesn't render (it's gated on medicareCount > 0).
    return NextResponse.json({ ...result, medicareCount: 0, curatedCount: result.total });
  }

  const result = searchCommunities(input);
  return NextResponse.json(result);
}
