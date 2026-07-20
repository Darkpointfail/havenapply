import { notFound } from "next/navigation";
import { CommunityDetailView } from "@/components/residences/CommunityDetail";
import { residences } from "@/data/residences";
import { getCommunityDetail } from "@/lib/residence-detail";

export function generateStaticParams() {
  return residences.map((r) => ({ id: r.id }));
}

export default async function ResidenceProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const community = getCommunityDetail(id);
  if (!community) notFound();

  return <CommunityDetailView community={community} />;
}
