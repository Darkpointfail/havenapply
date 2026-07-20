"use client";

import { Suspense } from "react";
import { MessagingInbox } from "@/components/messaging/MessagingInbox";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
          Loading messages…
        </div>
      }
    >
      <MessagingInbox portal="family" />
    </Suspense>
  );
}
