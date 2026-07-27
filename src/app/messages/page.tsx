"use client";

import { Suspense } from "react";
import { MessagingInbox } from "@/components/messaging/MessagingInbox";
import { useT } from "@/lib/i18n/locale";

export default function MessagesPage() {

  const t = useT();  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          {t("Loading messages…")}
        </div>
      }
    >
      <MessagingInbox portal="family" />
    </Suspense>
  );
}
