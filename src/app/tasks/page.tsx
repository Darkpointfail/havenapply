"use client";

import { useMemo, useState } from "react";
import { Check, Circle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useNotificationsTasks } from "@/lib/notifications-tasks-store";
import {
  formatNotifTime,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/notifications-tasks";
import { cn } from "@/lib/utils";

function priorityTone(p: TaskPriority): "danger" | "warn" | "neutral" {
  if (p === "High") return "danger";
  if (p === "Medium") return "warn";
  return "neutral";
}

function TasksInner() {
  const {
    ready,
    tasks,
    openTaskCount,
    addTask,
    updateTaskStatus,
    addTaskComment,
  } = useNotificationsTasks();

  const [statusFilter, setStatusFilter] = useState<"open" | "all" | TaskStatus>("open");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [communityName, setCommunityName] = useState("");

  const list = useMemo(() => {
    let items = [...tasks];
    if (statusFilter === "open") {
      items = items.filter((t) => t.status === "open" || t.status === "in_progress");
    } else if (statusFilter !== "all") {
      items = items.filter((t) => t.status === statusFilter);
    }
    const order = { High: 0, Medium: 1, Low: 2 };
    return items.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (b.status === "done" && a.status !== "done") return -1;
      return order[a.priority] - order[b.priority];
    });
  }, [tasks, statusFilter]);

  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading tasks…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader
        title="Tasks"
        description={`${openTaskCount} open · keep admissions moving with clear owners and due dates.`}
        breadcrumbs={[
          { label: "Family", href: "/family/dashboard" },
          { label: "Tasks" },
        ]}
        actions={
          <Button size="sm" onClick={() => setShowNew((v) => !v)}>
            {showNew ? "Cancel" : "New task"}
          </Button>
        }
      />

      <Card className="mb-6 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">Completion</span>
          <span className="font-semibold text-brand">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      {showNew && (
        <Card className="mb-6 space-y-3 p-5">
          <h2 className="font-semibold">Create task</h2>
          <input
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            rows={2}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              placeholder="Assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
            <input
              type="date"
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <select
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <input
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              placeholder="Linked community (optional)"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (!title.trim()) return;
              addTask({
                title,
                description,
                assignee,
                dueDate: dueDate || new Date().toISOString().slice(0, 10),
                priority,
                communityName: communityName || null,
              });
              setTitle("");
              setDescription("");
              setAssignee("");
              setDueDate("");
              setCommunityName("");
              setShowNew(false);
            }}
          >
            Add task
          </Button>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        {(
          [
            { id: "open", label: "Open" },
            { id: "all", label: "All" },
            { id: "done", label: "Done" },
            { id: "in_progress", label: "In progress" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              statusFilter === f.id
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-bg-soft",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((t) => {
          const isOpen = expanded === t.id;
          const doneTask = t.status === "done";
          return (
            <Card key={t.id} className={cn("p-4", doneTask && "opacity-70")}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    doneTask
                      ? "border-success bg-success text-white"
                      : "border-line",
                  )}
                  onClick={() =>
                    updateTaskStatus(t.id, doneTask ? "open" : "done")
                  }
                  aria-label={doneTask ? "Reopen" : "Complete"}
                >
                  {doneTask ? <Check size={12} /> : <Circle size={12} className="opacity-0" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("font-semibold", doneTask && "line-through")}>
                      {t.title}
                    </p>
                    <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                    <Badge tone="neutral">{t.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{t.description}</p>
                  <p className="mt-2 text-xs text-ink-faint">
                    {t.assignee} · due {t.dueDate}
                    {t.communityName ? ` · ${t.communityName}` : ""}
                    {t.applicationLabel ? ` · ${t.applicationLabel}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.status !== "in_progress" && t.status !== "done" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateTaskStatus(t.id, "in_progress")}
                      >
                        Start
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setExpanded(isOpen ? null : t.id);
                        setCommentDraft("");
                      }}
                    >
                      {isOpen ? "Hide" : `Comments (${t.comments.length})`}
                    </Button>
                  </div>
                  {isOpen && (
                    <div className="mt-4 space-y-3 border-t border-line pt-3">
                      {t.comments.map((c) => (
                        <div key={c.id} className="rounded-xl bg-bg-soft p-3 text-sm">
                          <p className="font-medium">{c.author}</p>
                          <p className="mt-1">{c.body}</p>
                          <p className="mt-1 text-xs text-ink-faint">
                            {formatNotifTime(c.createdAt)}
                          </p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
                          placeholder="Add a comment"
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            addTaskComment(t.id, commentDraft);
                            setCommentDraft("");
                          }}
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {list.length === 0 && (
          <Card className="p-8 text-center text-ink-muted">No tasks in this view.</Card>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <RequireAuth role="family">
      <TasksInner />
    </RequireAuth>
  );
}
