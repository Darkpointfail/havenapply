"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";

type Stats = {
  totalValidations: number;
  uniqueVisitors: number;
  byDevice: Record<string, number>;
  byBrowser: Record<string, number>;
  byOs: Record<string, number>;
  byCountry: Record<string, number>;
  byEntryPage: Record<string, number>;
  byReferrer: Record<string, number>;
  failedAttemptsToday: number;
};

type LogRow = {
  id: string;
  createdAt: string;
  visitorId: string;
  deviceCategory: string;
  osName: string;
  osVersion: string;
  browserName: string;
  browserMajorVersion: string;
  browserLanguage: string | null;
  timeZone: string | null;
  entryPage: string | null;
  referrer: string | null;
  hostname: string | null;
  country: string | null;
  region: string | null;
};

const TOKEN_KEY = "haven_access_logs_admin_token";
const PAGE_SIZE = 25;

function readStoredToken() {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function topEntries(map: Record<string, number>, n = 6) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function InternalAccessLogsPage() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [device, setDevice] = useState("all");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = readStoredToken();
    queueMicrotask(() => {
      setToken(saved);
      setTokenInput(saved);
      setHydrated(true);
    });
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", new Date(from).toISOString());
    if (to) p.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
    if (device && device !== "all") p.set("device", device);
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    return p.toString();
  }, [from, to, device, offset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/internal/access-logs?${query}`, {
        headers,
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        setError("Admin authentication required. Enter the ACCESS_LOGS_ADMIN_TOKEN or sign in as internal.");
        setStats(null);
        setLogs([]);
        setTotal(0);
        return;
      }
      if (!res.ok) {
        setError("Unable to load access logs.");
        return;
      }
      const data = (await res.json()) as {
        total: number;
        stats: Stats;
        logs: LogRow[];
      };
      setTotal(data.total);
      setStats(data.stats);
      setLogs(data.logs);
    } catch {
      setError("Unable to load access logs.");
    } finally {
      setLoading(false);
    }
  }, [query, token]);

  useEffect(() => {
    if (!hydrated) return;
    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [hydrated, load]);

  const saveToken = () => {
    const next = tokenInput.trim();
    setToken(next);
    try {
      if (next) sessionStorage.setItem(TOKEN_KEY, next);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  };

  const exportCsv = async () => {
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const p = new URLSearchParams();
    if (from) p.set("from", new Date(from).toISOString());
    if (to) p.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
    if (device && device !== "all") p.set("device", device);
    const res = await fetch(`/api/internal/access-logs/export?${p.toString()}`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) {
      setError("Export denied or failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "site-access-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site access logs"
        description="Successful site-password unlocks only. No passwords or raw IPs are stored."
        breadcrumbs={[
          { label: "Internal", href: "/internal/overview" },
          { label: "Access logs" },
        ]}
        actions={
          <Button type="button" size="sm" variant="secondary" onClick={() => void exportCsv()}>
            Export CSV
          </Button>
        }
      />

      <Card className="space-y-3 p-5">
        <p className="text-sm text-ink-muted">
          Server admin auth required. Prefer an internal Supabase session, or paste{" "}
          <code className="text-xs">ACCESS_LOGS_ADMIN_TOKEN</code> (session only).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
            autoComplete="off"
          />
          <Button type="button" onClick={saveToken}>
            Save token
          </Button>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </Card>

      <Card className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setOffset(0);
              setFrom(e.target.value);
            }}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setOffset(0);
              setTo(e.target.value);
            }}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Device</label>
          <select
            value={device}
            onChange={(e) => {
              setOffset(0);
              setDevice(e.target.value);
            }}
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div className="flex items-end">
          <p className="text-sm text-ink-muted">
            <Link href="/internal/audit-logs" className="text-brand hover:underline">
              Platform audit
            </Link>
          </p>
        </div>
      </Card>

      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Validations</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.totalValidations}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Unique visitors</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.uniqueVisitors}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Failed today</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.failedAttemptsToday}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Devices</p>
            <ul className="mt-2 space-y-1 text-sm">
              {topEntries(stats.byDevice).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span>{k}</span>
                  <span className="tabular-nums text-ink-muted">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {stats ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-semibold">Browsers</h3>
            <ul className="mt-3 space-y-1 text-sm">
              {topEntries(stats.byBrowser).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="truncate">{k}</span>
                  <span className="tabular-nums text-ink-muted">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Operating systems</h3>
            <ul className="mt-3 space-y-1 text-sm">
              {topEntries(stats.byOs).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="truncate">{k}</span>
                  <span className="tabular-nums text-ink-muted">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Countries / regions</h3>
            <ul className="mt-3 space-y-1 text-sm">
              {topEntries(stats.byCountry).length === 0 ? (
                <li className="text-ink-muted">No host geo headers observed</li>
              ) : (
                topEntries(stats.byCountry).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2">
                    <span>{k}</span>
                    <span className="tabular-nums text-ink-muted">{v}</span>
                  </li>
                ))
              )}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Entry pages & referrers</h3>
            <ul className="mt-3 space-y-1 text-sm">
              {topEntries(stats.byEntryPage, 4).map(([k, v]) => (
                <li key={`e-${k}`} className="flex justify-between gap-2">
                  <span className="truncate">page {k}</span>
                  <span className="tabular-nums text-ink-muted">{v}</span>
                </li>
              ))}
              {topEntries(stats.byReferrer, 4).map(([k, v]) => (
                <li key={`r-${k}`} className="flex justify-between gap-2">
                  <span className="truncate">ref {k}</span>
                  <span className="tabular-nums text-ink-muted">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="font-semibold">Recent unlocks</h3>
          <p className="text-xs text-ink-muted">
            {loading ? "Loading…" : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`}
          </p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-bg-soft text-ink-muted">
            <tr>
              <th className="px-4 py-2 font-medium">UTC</th>
              <th className="px-4 py-2 font-medium">Visitor</th>
              <th className="px-4 py-2 font-medium">Device</th>
              <th className="px-4 py-2 font-medium">Browser / OS</th>
              <th className="px-4 py-2 font-medium">Entry</th>
              <th className="px-4 py-2 font-medium">Geo</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                  {new Date(row.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{row.visitorId.slice(0, 8)}…</td>
                <td className="px-4 py-2">{row.deviceCategory}</td>
                <td className="px-4 py-2">
                  {row.browserName} {row.browserMajorVersion}
                  <span className="text-ink-muted">
                    {" "}
                    / {row.osName} {row.osVersion}
                  </span>
                </td>
                <td className="px-4 py-2 max-w-[180px] truncate">{row.entryPage || "—"}</td>
                <td className="px-4 py-2">
                  {row.country ? `${row.country}${row.region ? `/${row.region}` : ""}` : "—"}
                </td>
              </tr>
            ))}
            {!logs.length && !loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  No access logs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={offset <= 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
}
