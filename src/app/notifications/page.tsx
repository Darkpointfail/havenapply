"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useNotificationsTasks } from "@/lib/notifications-tasks-store";
import {
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  formatNotifTime,
  notificationTone,
  type NotificationType,
} from "@/lib/notifications-tasks";
import { cn } from "@/lib/utils";

function NotificationsInner() {
  const {
    ready,
    visibleNotifications,
    unreadCount,
    preferences,
    markRead,
    markAllRead,
    setPreferences,
  } = useNotificationsTasks();

  const [filter, setFilter] = useState<"all" | "unread" | NotificationType>("all");
  const [showPrefs, setShowPrefs] = useState(false);

  const list = useMemo(() => {
    let items = [...visibleNotifications];
    if (filter === "unread") items = items.filter((n) => !n.read);
    else if (filter !== "all") items = items.filter((n) => n.type === filter);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [visibleNotifications, filter]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading notifications…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread · stay on top of applications, documents, and family invites.`
            : "You’re caught up."
        }
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Notifications" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowPrefs((v) => !v)}
            >
              <Settings2 size={14} /> Preferences
            </Button>
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      {showPrefs && (
        <Card className="mb-6 space-y-4 p-5">
          <h2 className="font-semibold">Notification preferences</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preferences.inApp}
              onChange={(e) =>
                setPreferences({ ...preferences, inApp: e.target.checked })
              }
            />
            In-app notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={(e) =>
                setPreferences({ ...preferences, email: e.target.checked })
              }
            />
            Email notifications
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_NOTIFICATION_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.types[t] !== false}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      types: { ...preferences.types, [t]: e.target.checked },
                    })
                  }
                />
                {NOTIFICATION_TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            filter === "all"
              ? "bg-brand-soft text-brand-strong"
              : "text-ink-muted hover:bg-bg-soft",
          )}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            filter === "unread"
              ? "bg-brand-soft text-brand-strong"
              : "text-ink-muted hover:bg-bg-soft",
          )}
        >
          Unread
        </button>
        {(
          [
            "new_message",
            "document_missing",
            "application_sent",
            "tour_proposed",
            "family_invitation",
            "task_reminder",
          ] as NotificationType[]
        ).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              filter === t
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-bg-soft",
            )}
          >
            {NOTIFICATION_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((n) => (
          <Card
            key={n.id}
            className={cn("p-4", !n.read && "border-brand/30 bg-brand-soft/20")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                  )}
                  <p className="font-semibold">{n.title}</p>
                  <Badge tone={notificationTone(n.type)}>
                    {NOTIFICATION_TYPE_LABELS[n.type]}
                  </Badge>
                  {n.priority === "high" && <Badge tone="warn">Priority</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{n.body}</p>
                <p className="mt-2 text-xs text-ink-faint">
                  {formatNotifTime(n.createdAt)}
                  {n.meta ? ` · ${n.meta}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Link
                  href={n.href}
                  onClick={() => markRead(n.id)}
                  className="inline-flex h-9 items-center justify-center rounded-[10px] bg-brand px-3.5 text-sm font-medium text-white"
                >
                  Open
                </Link>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-10 text-center text-ink-muted">
            <Bell size={28} className="text-ink-faint" />
            <p>No notifications in this view.</p>
            <Link href="/family/dashboard" className="text-sm text-brand hover:underline">
              Back to dashboard
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth role="family">
      <NotificationsInner />
    </RequireAuth>
  );
}
