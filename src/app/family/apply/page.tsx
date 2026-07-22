import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ residence?: string; ids?: string }>;
};

/** Legacy /family/apply?residence=… → dedicated apply review page */
export default async function FamilyApplyRedirect({ searchParams }: Props) {
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
