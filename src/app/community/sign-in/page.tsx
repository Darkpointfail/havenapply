import { redirect } from "next/navigation";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

/**
 * /community/sign-in UI removed — unified account entry is /get-started.
 * Preserve a safe `next` when present so deep links still resume after signup.
 */
export default function CommunitySignInRedirectPage({ searchParams }: Props) {
  const raw = searchParams?.next;
  const next = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const dest =
    next && next.startsWith("/") && !next.startsWith("//")
      ? `/get-started?next=${encodeURIComponent(next)}`
      : `/get-started?next=${encodeURIComponent("/family/dashboard?claire=1")}`;
  redirect(dest);
}
