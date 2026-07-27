import { redirect } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

type Props = {
  searchParams: Promise<{ ids?: string; residence?: string }>;
};

export default async function FamilyApplyMultiRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const residence = params.residence?.trim();
  if (residence) {
    redirect(`/family/apply/${residence}`);
  }
  const firstId = params.ids?.split(",").map((s) => s.trim()).find(Boolean);
  if (firstId) {
    redirect(`/family/apply/${firstId}`);
  }
  redirect("/family/find-communities");
}
