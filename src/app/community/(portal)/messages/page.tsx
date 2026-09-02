"use client";

import { Suspense } from "react";
import { MessagingInbox } from "@/components/messaging/MessagingInbox";
import { useT } from "@/lib/i18n/locale";

export default function CommunityMessagesPage() {

  const t = useT();  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
        <header className="mb-6">
          <p className="text-sm font-medium text-ink-muted">Messages</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            {t("Conversations with families, hospitals, and social workers, always attached to an")}
            application.
          </p>
        </header>
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
              {t("Loading messages…")}
            </div>
          }
        >
          <MessagingInbox portal="community" />
        </Suspense>
      </div>
    </div>
  );
}
