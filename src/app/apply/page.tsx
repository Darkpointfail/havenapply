import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ residence?: string; ids?: string }>;
};

export default async function ApplyRedirect({ searchParams }: Props) {
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
