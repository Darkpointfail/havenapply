"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BadgeCheck,
  Calendar,
  FileText,
  History,
  Lock,
  Paperclip,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { useMessaging } from "@/lib/messaging-store";
import {
  QUICK_TEMPLATES,
  threadPreview,
  unreadForRole,
  type MessageThread,
} from "@/lib/messaging";
import { getResidence, residences } from "@/data/residences";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/locale";

export function MessagingInbox({
  portal = "family",
}: {
  portal?: "family" | "community";
}) {

  const t = useT();  const { user } = useAuth();
  const params = useSearchParams();
  const {
    ready,
    visibleThreads,
    sendMessage,
    markThreadRead,
    archiveThread,
    startConversation,
  } = useMessaging();

  const role = portal === "community" ? "community" : "family";
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sensitiveWarn, setSensitiveWarn] = useState<string[] | null>(null);
  const [attachName, setAttachName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleThreads
      .filter((t) => {
        const archived = role === "family" ? t.archivedByFamily : t.archivedByCommunity;
        if (showArchived ? !archived : archived) return false;
        if (!q) return true;
        return (
          t.residenceName.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          threadPreview(t).toLowerCase().includes(q) ||
          (t.applicationId || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [visibleThreads, query, showArchived, role]);

  // Deep link ?community= (family) or ?family= (community)
  useEffect(() => {
    if (!ready) return;
    const community = params.get("community");
    const familyEmail = params.get("family");
    const applicationId = params.get("application");
    const senior = params.get("senior");

    if (portal === "community" && familyEmail) {
      const existing = visibleThreads.find(
        (t) =>
          t.authorizedFamilyEmails.includes(familyEmail.toLowerCase()) &&
          (!applicationId || t.applicationId === applicationId) &&
          !t.archivedByCommunity,
      );
      if (existing) {
        setActiveId(existing.id);
        return;
      }
      const residenceId = params.get("residence") || "maple-grove";
      const r = getResidence(residenceId);
      const id = startConversation({
        scope: applicationId ? "application" : "general",
        residenceId,
        residenceName: r?.name || "Your community",
        avatar: r?.image || "/images/residences/maple-grove.jpg",
        applicationId,
        familyEmail,
        fromRole: "community",
        subject: senior
          ? `Application · ${decodeURIComponent(senior)}`
          : `Message · ${familyEmail}`,
        firstMessage: senior
          ? `Hello, regarding ${decodeURIComponent(senior)}’s application, we’d like to connect securely on Haven.`
          : "Hello, we’d like to connect securely on Haven about your application.",
      });
      if (id) setActiveId(id);
      return;
    }

    if (community) {
      const existing = visibleThreads.find((t) => t.residenceId === community && !t.archivedByFamily);
      if (existing) setActiveId(existing.id);
      else {
        const r = getResidence(community);
        if (r && portal === "family") {
          const id = startConversation({
            scope: "general",
            residenceId: r.id,
            residenceName: r.name,
            avatar: r.image,
            subject: `Inquiry · ${r.name}`,
            firstMessage: `Hello ${r.name} admissions, we’d like to start a private conversation on Haven.`,
          });
          if (id) setActiveId(id);
        }
      }
    } else if (!activeId && filtered[0]) {
      setActiveId(filtered[0].id);
    }
  }, [ready, params, visibleThreads, portal, startConversation, activeId, filtered]);

  const active = filtered.find((t) => t.id === activeId) || visibleThreads.find((t) => t.id === activeId);

  useEffect(() => {
    if (activeId) markThreadRead(activeId);
  }, [activeId, markThreadRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, activeId]);

  const doSend = (forceSensitive = false) => {
    if (!active || !draft.trim()) return;
    const result = sendMessage(active.id, draft, {
      forceSensitive,
      attachments: attachName ? [{ name: attachName, size: "," }] : undefined,
      type: attachName ? "attachment" : "text",
      meta: attachName ? `Attachment: ${attachName}` : undefined,
    });
    if (!result.ok && result.sensitiveFlags) {
      setSensitiveWarn(result.sensitiveFlags);
      return;
    }
    setDraft("");
    setAttachName(null);
    setSensitiveWarn(null);
    setShowTemplates(false);
  };

  const applyTemplate = (body: string) => {
    setDraft(body);
    setShowTemplates(false);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Loading messages…")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title={t("Messages")}
        description={
          portal === "community"
            ? "Private conversations with applicant families, only your community’s threads."
            : "Secure conversations with communities, tied to an application or a general inquiry."
        }
        breadcrumbs={
          portal === "community"
            ? [
                { label: "Community", href: "/community/dashboard" },
                { label: "Messages" },
              ]
            : [
                { label: "Family", href: "/family/dashboard" },
                { label: "Messages" },
              ]
        }
        actions={
          portal === "family" ? (
            <NewConversationButton
              onCreated={(id) => {
                setActiveId(id);
                setShowArchived(false);
              }}
            />
          ) : undefined
        }
      />

      <div className="mb-3 flex items-start gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink-muted">
        <Lock size={14} className="mt-0.5 shrink-0 text-brand" />
        {t("Conversations are private. Communities only see their own threads. Family members only see")}
        threads they’re authorized for. Sensitive IDs and account numbers trigger a send warning.
      </div>

      <div className="grid h-[min(740px,78vh)] overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-soft md:grid-cols-[340px_1fr]">
        {/* List */}
        <aside className="flex min-h-0 flex-col border-b border-line md:border-b-0 md:border-r">
          <div className="space-y-2 border-b border-line p-3">
            <label className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2">
              <Search size={16} className="text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search conversations…")}
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  !showArchived ? "bg-brand-soft text-brand-strong" : "text-ink-muted",
                )}
              >
                Inbox
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  showArchived ? "bg-brand-soft text-brand-strong" : "text-ink-muted",
                )}
              >
                <Archive size={12} /> Archived
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-muted">No conversations match.</p>
            ) : (
              filtered.map((c) => {
                const unread = unreadForRole(c, role);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "flex w-full gap-3 border-b border-line px-4 py-3.5 text-left transition",
                      activeId === c.id ? "bg-brand-soft/50" : "hover:bg-bg",
                    )}
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
                      <Image src={c.avatar} alt="" fill className="object-cover" sizes="44px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{c.residenceName}</p>
                        {unread > 0 && <Badge tone="danger">{unread}</Badge>}
                      </div>
                      <p className="truncate text-[11px] text-ink-faint">
                        {scopeLabel(c)} · {c.subject}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink-muted">{threadPreview(c)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Thread */}
        {!active ? (
          <div className="flex items-center justify-center text-sm text-ink-muted">
            {t("Select a conversation")}
          </div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="font-semibold">{active.residenceName}</h2>
                <p className="text-xs text-ink-faint">
                  {scopeLabel(active)}
                  {active.applicationId ? ` · ${active.applicationId}` : ""} · End-to-end private on
                  Haven (demo)
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  <History size={14} /> History
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    archiveThread(
                      active.id,
                      !(role === "family" ? active.archivedByFamily : active.archivedByCommunity),
                    )
                  }
                >
                  <Archive size={14} />
                  {(role === "family" ? active.archivedByFamily : active.archivedByCommunity)
                    ? "Unarchive"
                    : "Archive"}
                </Button>
              </div>
            </div>

            {showHistory && (
              <div className="max-h-36 overflow-y-auto border-b border-line bg-bg px-4 py-2 text-xs text-ink-muted">
                {active.auditLog
                  .slice()
                  .reverse()
                  .map((a) => (
                    <p key={a.id} className="py-0.5">
                      <span className="text-ink-faint">
                        {new Date(a.at).toLocaleString()} ·{" "}
                      </span>
                      <span className="font-medium text-ink">{a.actor}</span>, {a.action}
                    </p>
                  ))}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-bg to-surface px-4 py-5">
              {active.messages.map((m) => {
                const mine =
                  (role === "family" && m.fromRole === "family") ||
                  (role === "community" && m.fromRole === "community");
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-3xl px-4 py-3 shadow-soft",
                        mine
                          ? "rounded-br-lg bg-brand text-white"
                          : "rounded-bl-lg border border-line bg-surface text-ink",
                      )}
                    >
                      <p
                        className={cn(
                          "text-[11px] font-medium",
                          mine ? "text-white/80" : "text-ink-faint",
                        )}
                      >
                        {m.senderName} · {m.senderRole}
                      </p>
                      {m.type === "document-request" && (
                        <TypeChip mine={mine} icon={<FileText size={12} />} label={t("Document request")} />
                      )}
                      {m.type === "visit" && (
                        <TypeChip mine={mine} icon={<Calendar size={12} />} label={t("Visit")} />
                      )}
                      {m.type === "admission" && (
                        <TypeChip mine={mine} icon={<BadgeCheck size={12} />} label={t("Admission")} />
                      )}
                      {m.type === "attachment" && (
                        <TypeChip mine={mine} icon={<Paperclip size={12} />} label={t("Attachment")} />
                      )}
                      <p className="mt-1 text-[15px] leading-relaxed">{m.text}</p>
                      {m.meta && (
                        <p
                          className={cn(
                            "mt-2 rounded-xl px-3 py-2 text-sm",
                            mine ? "bg-white/15" : "bg-bg",
                          )}
                        >
                          {m.meta}
                        </p>
                      )}
                      {m.attachments?.map((a) => (
                        <p
                          key={a.name}
                          className={cn(
                            "mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs",
                            mine ? "bg-white/15" : "bg-bg",
                          )}
                        >
                          <Paperclip size={12} /> {a.name}
                        </p>
                      ))}
                      <p
                        className={cn(
                          "mt-2 text-[11px]",
                          mine ? "text-white/70" : "text-ink-faint",
                        )}
                      >
                        {m.time}
                        {mine ? ` · ${deliveryLabel(m.delivery)}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {sensitiveWarn && (
              <div className="border-t border-warn/30 bg-warn-soft/50 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-warn">
                  <ShieldAlert size={16} /> Sensitive content detected
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  This message may include {sensitiveWarn.join(", ")}. Only send if the community
                  truly needs it for admissions, prefer Haven document vault for IDs and clinical
                  files.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setSensitiveWarn(null)}>
                    {t("Edit message")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (
                        !confirm(
                          "Send this message with possible sensitive content? Prefer the document vault for IDs and clinical files. This choice is your responsibility.",
                        )
                      ) {
                        return;
                      }
                      doSend(true);
                    }}
                  >
                    {t("Send anyway")}
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t border-line p-3">
              {portal === "family" && (
                <div className="mb-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-brand hover:underline"
                    onClick={() => setShowTemplates((v) => !v)}
                  >
                    {showTemplates ? "Hide quick replies" : "Quick message templates"}
                  </button>
                  {showTemplates && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {QUICK_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => applyTemplate(t.body)}
                          className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted hover:border-brand hover:text-brand"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {attachName && (
                <p className="mb-2 text-xs text-ink-muted">
                  Attached: {attachName}{" "}
                  <button type="button" className="text-brand" onClick={() => setAttachName(null)}>
                    {t("Remove")}
                  </button>
                </p>
              )}
              <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg p-2">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted hover:bg-surface"
                  aria-label={t("Attach file")}
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip size={18} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (
                      !confirm(
                        "Attach this file to a message? Avoid SSN cards, full bank statements, or other identifiers the community does not need. Prefer the document vault with explicit sharing.",
                      )
                    ) {
                      e.target.value = "";
                      return;
                    }
                    setAttachName(f.name);
                  }}
                />
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder={t("Write a calm, clear message…")}
                  className="max-h-28 flex-1 resize-none bg-transparent py-2 text-sm outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      doSend();
                    }
                  }}
                />
                <Button
                  size="sm"
                  type="button"
                  aria-label={t("Send")}
                  disabled={!draft.trim()}
                  onClick={() => doSend()}
                >
                  <Send size={16} />
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] text-ink-faint">
                Signed in as {user?.name} ({user?.email}) · Replies stay on this private thread
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function scopeLabel(t: MessageThread) {
  if (t.scope === "application") return "Application";
  if (t.scope === "general") return "General inquiry";
  return "Community";
}

function deliveryLabel(d: string) {
  if (d === "read") return "Read";
  if (d === "delivered") return "Delivered";
  if (d === "sending") return "Sending…";
  return "Sent";
}

function TypeChip({
  mine,
  icon,
  label,
}: {
  mine: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={cn(
        "mt-1 mb-1 inline-flex items-center gap-1 text-[11px] font-medium",
        mine ? "text-white/85" : "text-brand",
      )}
    >
      {icon} {label}
    </div>
  );
}

function NewConversationButton({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useT();
  const { startConversation } = useMessaging();
  const [open, setOpen] = useState(false);
  const [residenceId, setResidenceId] = useState(residences[0]?.id || "");
  const [scope, setScope] = useState<"general" | "application" | "community">("general");
  const [message, setMessage] = useState("");

  const r = getResidence(residenceId);

  return (
    <div className="relative">
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
        {t("New conversation")}
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="text-sm font-semibold">Start a private thread</p>
          <label className="mt-3 block text-xs font-medium text-ink-muted">Community</label>
          <select
            className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-2 text-sm"
            value={residenceId}
            onChange={(e) => setResidenceId(e.target.value)}
          >
            {residences.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <label className="mt-2 block text-xs font-medium text-ink-muted">Attach to</label>
          <select
            className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-2 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
          >
            <option value="general">General inquiry</option>
            <option value="application">Application</option>
            <option value="community">Community</option>
          </select>
          <textarea
            className="mt-2 w-full rounded-lg border border-line bg-bg px-2 py-2 text-sm"
            rows={3}
            placeholder={t("First message…")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            className="mt-2 w-full"
            disabled={!r || !message.trim()}
            onClick={() => {
              if (!r) return;
              const id = startConversation({
                scope,
                residenceId: r.id,
                residenceName: r.name,
                avatar: r.image,
                applicationId: scope === "application" ? `app-${r.id}` : null,
                subject:
                  scope === "application"
                    ? `Application · ${r.name}`
                    : scope === "general"
                      ? `General inquiry · ${r.name}`
                      : `Community · ${r.name}`,
                firstMessage: message.trim(),
              });
              setOpen(false);
              setMessage("");
              if (id) onCreated(id);
            }}
          >
            Start
          </Button>
        </div>
      )}
    </div>
  );
}
