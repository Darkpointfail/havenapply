"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import {
  defaultPreferences,
  seedNotifications,
  seedTasks,
  type AppNotification,
  type FamilyTaskItem,
  type NotificationPreferences,
  type NotificationType,
  type TaskComment,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/notifications-tasks";

const STORAGE_KEY = "haven-notif-tasks-v1";

type StoredBundle = {
  notifications: AppNotification[];
  tasks: FamilyTaskItem[];
  preferences: NotificationPreferences;
};

type NotifTasksContextValue = {
  ready: boolean;
  notifications: AppNotification[];
  visibleNotifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  tasks: FamilyTaskItem[];
  openTaskCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setPreferences: (prefs: NotificationPreferences) => void;
  addTask: (input: {
    title: string;
    description: string;
    assignee: string;
    dueDate: string;
    priority: TaskPriority;
    applicationId?: string | null;
    applicationLabel?: string | null;
    communityId?: string | null;
    communityName?: string | null;
  }) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  addTaskComment: (taskId: string, body: string) => void;
  updateTask: (id: string, patch: Partial<FamilyTaskItem>) => void;
};

const NotifTasksContext = createContext<NotifTasksContextValue | null>(null);

function storageKey(email: string) {
  return `${STORAGE_KEY}-${email.toLowerCase()}`;
}

function readBundle(email: string): StoredBundle | null {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return null;
    return JSON.parse(raw) as StoredBundle;
  } catch {
    return null;
  }
}

function writeBundle(email: string, bundle: StoredBundle) {
  localStorage.setItem(storageKey(email), JSON.stringify(bundle));
}

export function NotificationsTasksProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tasks, setTasks] = useState<FamilyTaskItem[]>([]);
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(
    defaultPreferences(),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.role !== "family") {
      setNotifications([]);
      setTasks([]);
      setPreferencesState(defaultPreferences());
      setReady(true);
      return;
    }
    const existing = readBundle(user.email);
    if (existing) {
      setNotifications(existing.notifications);
      setTasks(existing.tasks);
      setPreferencesState({
        ...defaultPreferences(),
        ...existing.preferences,
        types: { ...defaultPreferences().types, ...existing.preferences?.types },
      });
    } else {
      const bundle: StoredBundle = {
        notifications: seedNotifications(),
        tasks: seedTasks(),
        preferences: defaultPreferences(),
      };
      writeBundle(user.email, bundle);
      setNotifications(bundle.notifications);
      setTasks(bundle.tasks);
      setPreferencesState(bundle.preferences);
    }
    setReady(true);
  }, [authReady, user]);

  const persistAll = useCallback(
    (
      n: AppNotification[],
      t: FamilyTaskItem[],
      p: NotificationPreferences,
    ) => {
      if (!user) return;
      writeBundle(user.email, { notifications: n, tasks: t, preferences: p });
      setNotifications(n);
      setTasks(t);
      setPreferencesState(p);
    },
    [user],
  );

  const visibleNotifications = useMemo(() => {
    if (!preferences.inApp) return [];
    return notifications.filter((n) => preferences.types[n.type] !== false);
  }, [notifications, preferences]);

  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => !n.read).length,
    [visibleNotifications],
  );

  const openTaskCount = useMemo(
    () => tasks.filter((t) => t.status === "open" || t.status === "in_progress").length,
    [tasks],
  );

  const markRead = useCallback(
    (id: string) => {
      const next = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistAll(next, tasks, preferences);
    },
    [notifications, tasks, preferences, persistAll],
  );

  const markAllRead = useCallback(() => {
    const next = notifications.map((n) => ({ ...n, read: true }));
    persistAll(next, tasks, preferences);
  }, [notifications, tasks, preferences, persistAll]);

  const setPreferences = useCallback(
    (prefs: NotificationPreferences) => {
      persistAll(notifications, tasks, prefs);
    },
    [notifications, tasks, persistAll],
  );

  const addTask = useCallback(
    (input: {
      title: string;
      description: string;
      assignee: string;
      dueDate: string;
      priority: TaskPriority;
      applicationId?: string | null;
      applicationLabel?: string | null;
      communityId?: string | null;
      communityName?: string | null;
    }) => {
      const now = new Date().toISOString();
      const task: FamilyTaskItem = {
        id: `task-${Date.now()}`,
        title: input.title.trim(),
        description: input.description.trim(),
        assignee: input.assignee.trim() || "Unassigned",
        dueDate: input.dueDate,
        priority: input.priority,
        status: "open",
        applicationId: input.applicationId ?? null,
        applicationLabel: input.applicationLabel ?? null,
        communityId: input.communityId ?? null,
        communityName: input.communityName ?? null,
        comments: [],
        createdAt: now,
        updatedAt: now,
      };
      const reminder: AppNotification = {
        id: `n-task-${Date.now()}`,
        type: "task_reminder",
        title: "New task",
        body: task.title,
        createdAt: now,
        read: false,
        href: "/family/tasks",
        priority: task.priority === "High" ? "high" : "normal",
      };
      persistAll([reminder, ...notifications], [task, ...tasks], preferences);
    },
    [notifications, tasks, preferences, persistAll],
  );

  const updateTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      const next = tasks.map((t) =>
        t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t,
      );
      persistAll(notifications, next, preferences);
    },
    [notifications, tasks, preferences, persistAll],
  );

  const addTaskComment = useCallback(
    (taskId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !user) return;
      const comment: TaskComment = {
        id: `tc-${Date.now()}`,
        author: user.name || "Family",
        body: trimmed,
        createdAt: new Date().toISOString(),
      };
      const next = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              comments: [...t.comments, comment],
              updatedAt: new Date().toISOString(),
            }
          : t,
      );
      persistAll(notifications, next, preferences);
    },
    [notifications, tasks, preferences, persistAll, user],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<FamilyTaskItem>) => {
      const next = tasks.map((t) =>
        t.id === id
          ? { ...t, ...patch, updatedAt: new Date().toISOString() }
          : t,
      );
      persistAll(notifications, next, preferences);
    },
    [notifications, tasks, preferences, persistAll],
  );

  const value = useMemo(
    () => ({
      ready,
      notifications,
      visibleNotifications,
      unreadCount,
      preferences,
      tasks,
      openTaskCount,
      markRead,
      markAllRead,
      setPreferences,
      addTask,
      updateTaskStatus,
      addTaskComment,
      updateTask,
    }),
    [
      ready,
      notifications,
      visibleNotifications,
      unreadCount,
      preferences,
      tasks,
      openTaskCount,
      markRead,
      markAllRead,
      setPreferences,
      addTask,
      updateTaskStatus,
      addTaskComment,
      updateTask,
    ],
  );

  return (
    <NotifTasksContext.Provider value={value}>{children}</NotifTasksContext.Provider>
  );
}

export function useNotificationsTasks() {
  const ctx = useContext(NotifTasksContext);
  if (!ctx) {
    throw new Error("useNotificationsTasks must be used within NotificationsTasksProvider");
  }
  return ctx;
}

/** Safe optional hook when provider may not wrap public pages */
export function useNotificationsTasksOptional() {
  return useContext(NotifTasksContext);
}
