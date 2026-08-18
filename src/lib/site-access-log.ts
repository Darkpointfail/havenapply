import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseUserAgent, type DeviceCategory } from "@/lib/site-access-ua";
import { createAdminClient } from "@/lib/supabase/admin";

/** httpOnly cookie: stable pseudonymous visitor id for the access session. */
export const SITE_ACCESS_VISITOR_COOKIE = "haven_access_vid";

/** httpOnly cookie: set after a successful log for this gate version (dedupe reloads). */
export const SITE_ACCESS_LOGGED_COOKIE = "haven_access_logged";

export const SITE_ACCESS_LOG_RETENTION_DAYS = 90;

export type SiteAccessLogRecord = {
  id: string;
  createdAt: string;
  visitorId: string;
  deviceCategory: DeviceCategory;
  osName: string;
  osVersion: string;
  browserName: string;
  browserMajorVersion: string;
  browserLanguage: string | null;
  timeZone: string | null;
  entryPage: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  hostname: string | null;
  country: string | null;
  region: string | null;
  ipHash: string | null;
  gateVersion: string;
};

export type SiteAccessLogClientHints = {
  language?: string | null;
  timeZone?: string | null;
  entryPage?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  hostname?: string | null;
};

export type FailedAttemptAggregate = {
  day: string; // YYYY-MM-DD UTC
  count: number;
};

const LOG_FILE_NAME = "site-access-logs.json";
const FAIL_FILE_NAME = "site-access-failed.json";

function dataDir() {
  return path.join(process.cwd(), ".data");
}

function logFilePath() {
  return path.join(dataDir(), LOG_FILE_NAME);
}

function failFilePath() {
  return path.join(dataDir(), FAIL_FILE_NAME);
}

function retentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - SITE_ACCESS_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function hashIpAddress(ip: string | null | undefined, secret: string | undefined): string | null {
  const trimmed = (ip || "").trim();
  if (!trimmed || !secret) return null;
  return createHmac("sha256", secret).update(trimmed).digest("hex");
}

export function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return null;
}

/** Country/region only from host-provided headers — no external GeoIP call. */
export function extractGeoFromHeaders(headers: Headers): { country: string | null; region: string | null } {
  const country =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    null;
  const region =
    headers.get("x-vercel-ip-country-region") ||
    headers.get("x-region-code") ||
    null;
  return {
    country: country && country !== "XX" ? country.slice(0, 8) : null,
    region: region ? region.slice(0, 16) : null,
  };
}

function sanitizePath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().slice(0, 500);
  if (!t.startsWith("/")) return null;
  if (t.startsWith("//")) return null;
  return t;
}

function sanitizeHost(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase().slice(0, 253);
  if (!/^[a-z0-9.-]+$/.test(t)) return null;
  return t;
}

function sanitizeUtm(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().slice(0, 120);
  return t || null;
}

function sanitizeReferrer(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().slice(0, 500);
  if (!t || t.toLowerCase().startsWith("data:")) return null;
  return t;
}

export function buildAccessLogRecord(input: {
  visitorId: string;
  gateVersion: string;
  userAgent: string | null;
  headers: Headers;
  hints: SiteAccessLogClientHints;
  now?: Date;
}): SiteAccessLogRecord {
  const now = input.now ?? new Date();
  const ua = parseUserAgent(input.userAgent);
  const geo = extractGeoFromHeaders(input.headers);
  const secret = process.env.ACCESS_LOG_HASH_SECRET;
  const ipHash = hashIpAddress(extractClientIp(input.headers), secret);

  return {
    id: randomUUID(),
    createdAt: now.toISOString(),
    visitorId: input.visitorId,
    deviceCategory: ua.deviceCategory,
    osName: ua.osName,
    osVersion: ua.osVersion,
    browserName: ua.browserName,
    browserMajorVersion: ua.browserMajorVersion,
    browserLanguage: input.hints.language?.slice(0, 32) || null,
    timeZone: input.hints.timeZone?.slice(0, 64) || null,
    entryPage: sanitizePath(input.hints.entryPage),
    referrer: sanitizeReferrer(input.hints.referrer),
    utmSource: sanitizeUtm(input.hints.utmSource),
    utmMedium: sanitizeUtm(input.hints.utmMedium),
    utmCampaign: sanitizeUtm(input.hints.utmCampaign),
    hostname: sanitizeHost(input.hints.hostname) || sanitizeHost(input.headers.get("host")),
    country: geo.country,
    region: geo.region,
    ipHash,
    gateVersion: input.gateVersion,
  };
}

async function ensureDataDir() {
  await mkdir(dataDir(), { recursive: true });
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function pruneLogs(logs: SiteAccessLogRecord[], now = new Date()): SiteAccessLogRecord[] {
  const cutoff = retentionCutoff(now).toISOString();
  return logs.filter((l) => l.createdAt >= cutoff);
}

export async function hasLogForVisitorGate(
  visitorId: string,
  gateVersion: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("site_access_logs")
      .select("id")
      .eq("visitor_id", visitorId)
      .eq("gate_version", gateVersion)
      .limit(1);
    if (!error && data && data.length > 0) return true;
    // Fall through to file if table missing.
  }

  const logs = pruneLogs(await readJsonFile<SiteAccessLogRecord[]>(logFilePath(), []));
  return logs.some((l) => l.visitorId === visitorId && l.gateVersion === gateVersion);
}

export async function persistAccessLog(record: SiteAccessLogRecord): Promise<{ stored: boolean; deduped: boolean }> {
  if (await hasLogForVisitorGate(record.visitorId, record.gateVersion)) {
    return { stored: false, deduped: true };
  }

  const admin = createAdminClient();
  if (admin) {
    const { error } = await admin.from("site_access_logs").insert({
      id: record.id,
      created_at: record.createdAt,
      visitor_id: record.visitorId,
      device_category: record.deviceCategory,
      os_name: record.osName,
      os_version: record.osVersion,
      browser_name: record.browserName,
      browser_major_version: record.browserMajorVersion,
      browser_language: record.browserLanguage,
      time_zone: record.timeZone,
      entry_page: record.entryPage,
      referrer: record.referrer,
      utm_source: record.utmSource,
      utm_medium: record.utmMedium,
      utm_campaign: record.utmCampaign,
      hostname: record.hostname,
      country: record.country,
      region: record.region,
      ip_hash: record.ipHash,
      gate_version: record.gateVersion,
    });
    if (!error) {
      // Best-effort retention purge
      const cutoff = retentionCutoff().toISOString();
      void admin.from("site_access_logs").delete().lt("created_at", cutoff);
      return { stored: true, deduped: false };
    }
  }

  await ensureDataDir();
  const existing = pruneLogs(await readJsonFile<SiteAccessLogRecord[]>(logFilePath(), []));
  if (existing.some((l) => l.visitorId === record.visitorId && l.gateVersion === record.gateVersion)) {
    return { stored: false, deduped: true };
  }
  existing.unshift(record);
  await writeFile(logFilePath(), JSON.stringify(existing, null, 2), "utf8");
  return { stored: true, deduped: false };
}

export async function recordFailedAttempt(now = new Date()): Promise<number> {
  const day = now.toISOString().slice(0, 10);
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin
      .from("site_access_failed_daily")
      .select("day, attempt_count")
      .eq("day", day)
      .maybeSingle();
    const next = (data?.attempt_count || 0) + 1;
    const { error } = await admin.from("site_access_failed_daily").upsert({
      day,
      attempt_count: next,
      updated_at: now.toISOString(),
    });
    if (!error) return next;
  }

  await ensureDataDir();
  const rows = await readJsonFile<FailedAttemptAggregate[]>(failFilePath(), []);
  const idx = rows.findIndex((r) => r.day === day);
  if (idx >= 0) {
    rows[idx]!.count += 1;
  } else {
    rows.push({ day, count: 1 });
  }
  // Keep ~180 days of aggregates max
  const pruned = rows.filter((r) => r.day >= retentionCutoff(now).toISOString().slice(0, 10));
  await writeFile(failFilePath(), JSON.stringify(pruned, null, 2), "utf8");
  return pruned.find((r) => r.day === day)?.count || 1;
}

export async function listAccessLogs(options?: {
  from?: string | null;
  to?: string | null;
  device?: DeviceCategory | "all" | null;
  limit?: number;
  offset?: number;
}): Promise<{ logs: SiteAccessLogRecord[]; total: number }> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const offset = Math.max(options?.offset ?? 0, 0);
  const device = options?.device && options.device !== "all" ? options.device : null;

  const admin = createAdminClient();
  if (admin) {
    let q = admin
      .from("site_access_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (options?.from) q = q.gte("created_at", options.from);
    if (options?.to) q = q.lte("created_at", options.to);
    if (device) q = q.eq("device_category", device);
    q = q.range(offset, offset + limit - 1);
    const { data, error, count } = await q;
    if (!error && data) {
      return {
        total: count ?? data.length,
        logs: data.map(rowToRecord),
      };
    }
  }

  let logs = pruneLogs(await readJsonFile<SiteAccessLogRecord[]>(logFilePath(), []));
  if (options?.from) logs = logs.filter((l) => l.createdAt >= options.from!);
  if (options?.to) logs = logs.filter((l) => l.createdAt <= options.to!);
  if (device) logs = logs.filter((l) => l.deviceCategory === device);
  logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = logs.length;
  return { total, logs: logs.slice(offset, offset + limit) };
}

function rowToRecord(row: Record<string, unknown>): SiteAccessLogRecord {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    visitorId: String(row.visitor_id),
    deviceCategory: row.device_category as DeviceCategory,
    osName: String(row.os_name || ""),
    osVersion: String(row.os_version || ""),
    browserName: String(row.browser_name || ""),
    browserMajorVersion: String(row.browser_major_version || ""),
    browserLanguage: (row.browser_language as string) || null,
    timeZone: (row.time_zone as string) || null,
    entryPage: (row.entry_page as string) || null,
    referrer: (row.referrer as string) || null,
    utmSource: (row.utm_source as string) || null,
    utmMedium: (row.utm_medium as string) || null,
    utmCampaign: (row.utm_campaign as string) || null,
    hostname: (row.hostname as string) || null,
    country: (row.country as string) || null,
    region: (row.region as string) || null,
    ipHash: (row.ip_hash as string) || null,
    gateVersion: String(row.gate_version || ""),
  };
}

export type AccessLogStats = {
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

function bump(map: Record<string, number>, key: string) {
  const k = key || "unknown";
  map[k] = (map[k] || 0) + 1;
}

export async function computeAccessLogStats(filter?: {
  from?: string | null;
  to?: string | null;
  device?: DeviceCategory | "all" | null;
}): Promise<AccessLogStats> {
  const { logs } = await listAccessLogs({
    from: filter?.from,
    to: filter?.to,
    device: filter?.device,
    limit: 200,
    offset: 0,
  });
  // For file backend, listAccessLogs already filtered but capped — load all for stats when file.
  let all = logs;
  const admin = createAdminClient();
  if (!admin) {
    all = (await listAccessLogs({ ...filter, limit: 200, offset: 0 })).logs;
    // Load full pruned set for accurate file stats
    let full = pruneLogs(await readJsonFile<SiteAccessLogRecord[]>(logFilePath(), []));
    if (filter?.from) full = full.filter((l) => l.createdAt >= filter.from!);
    if (filter?.to) full = full.filter((l) => l.createdAt <= filter.to!);
    if (filter?.device && filter.device !== "all") {
      full = full.filter((l) => l.deviceCategory === filter.device);
    }
    all = full;
  } else {
    const { logs: page } = await listAccessLogs({
      from: filter?.from,
      to: filter?.to,
      device: filter?.device,
      limit: 200,
      offset: 0,
    });
    all = page;
    // Pull additional pages up to 2000 for stats
    for (let offset = 200; offset < 2000; offset += 200) {
      const next = await listAccessLogs({
        from: filter?.from,
        to: filter?.to,
        device: filter?.device,
        limit: 200,
        offset,
      });
      if (!next.logs.length) break;
      all = all.concat(next.logs);
      if (next.logs.length < 200) break;
    }
  }

  const byDevice: Record<string, number> = {};
  const byBrowser: Record<string, number> = {};
  const byOs: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byEntryPage: Record<string, number> = {};
  const byReferrer: Record<string, number> = {};
  const visitors = new Set<string>();

  for (const l of all) {
    visitors.add(l.visitorId);
    bump(byDevice, l.deviceCategory);
    bump(byBrowser, `${l.browserName} ${l.browserMajorVersion}`.trim());
    bump(byOs, `${l.osName} ${l.osVersion}`.trim());
    if (l.country) bump(byCountry, l.region ? `${l.country}/${l.region}` : l.country);
    if (l.entryPage) bump(byEntryPage, l.entryPage);
    if (l.referrer) bump(byReferrer, l.referrer);
  }

  const day = new Date().toISOString().slice(0, 10);
  let failedAttemptsToday = 0;
  if (admin) {
    const { data } = await admin
      .from("site_access_failed_daily")
      .select("attempt_count")
      .eq("day", day)
      .maybeSingle();
    failedAttemptsToday = data?.attempt_count || 0;
  } else {
    const rows = await readJsonFile<FailedAttemptAggregate[]>(failFilePath(), []);
    failedAttemptsToday = rows.find((r) => r.day === day)?.count || 0;
  }

  return {
    totalValidations: all.length,
    uniqueVisitors: visitors.size,
    byDevice,
    byBrowser,
    byOs,
    byCountry,
    byEntryPage,
    byReferrer,
    failedAttemptsToday,
  };
}

export function logsToCsv(logs: SiteAccessLogRecord[]): string {
  const headers = [
    "created_at_utc",
    "visitor_id",
    "device_category",
    "os_name",
    "os_version",
    "browser_name",
    "browser_major_version",
    "browser_language",
    "time_zone",
    "entry_page",
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "hostname",
    "country",
    "region",
    "ip_hash",
    "gate_version",
  ];
  const escape = (v: string | null) => {
    const s = v ?? "";
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const l of logs) {
    lines.push(
      [
        l.createdAt,
        l.visitorId,
        l.deviceCategory,
        l.osName,
        l.osVersion,
        l.browserName,
        l.browserMajorVersion,
        l.browserLanguage,
        l.timeZone,
        l.entryPage,
        l.referrer,
        l.utmSource,
        l.utmMedium,
        l.utmCampaign,
        l.hostname,
        l.country,
        l.region,
        l.ipHash,
        l.gateVersion,
      ]
        .map((v) => escape(v))
        .join(","),
    );
  }
  return lines.join("\n");
}

/** Constant-time compare for admin bearer tokens. */
export function adminTokensMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function newVisitorId(): string {
  return randomUUID();
}
