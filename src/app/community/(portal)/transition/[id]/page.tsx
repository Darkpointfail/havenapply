import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Post-accept steps live on the application detail (signature → admission). */
export default async function TransitionDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/community/applications/${id}`);
}
