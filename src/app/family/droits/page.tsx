"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

/** Canonical Loi 25 rights UI lives under Privacy and data. */
export default function FamilyRightsRedirect() {
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    router.replace("/family/privacy#droits");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
      {t("Redirecting to Privacy and data…")}
    </div>
  );
}
