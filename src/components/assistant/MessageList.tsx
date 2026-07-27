"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/lib/assistant/conversation-engine";
import { cn } from "@/lib/utils";

export function MessageList({
  messages,
  busy,
}: {
  messages: ChatMessage[];
  busy?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-1 pb-2">
      <AnimatePresence initial={false}>
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[min(100%,34rem)] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[15px] leading-relaxed",
                m.role === "user"
                  ? "bg-ink text-white"
                  : "bg-surface text-ink shadow-xs ring-1 ring-line/50",
              )}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {busy ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 px-2 text-sm text-ink-faint"
        >
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint [animation-delay:240ms]" />
          </span>
          Haven is typing…
        </motion.div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
