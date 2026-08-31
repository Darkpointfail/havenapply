"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Canonical Loi 25 rights UI lives under Confidentialité et données. */
export default function FamilyRightsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/family/privacy#droits");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
      Redirection vers Confidentialité et données…
    </div>
  );
}
