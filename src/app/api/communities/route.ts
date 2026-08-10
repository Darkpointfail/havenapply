import { NextResponse } from "next/server";
import { searchCommunities } from "@/lib/cms-nursing-homes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = searchCommunities({
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
  });

  return NextResponse.json(result);
}
