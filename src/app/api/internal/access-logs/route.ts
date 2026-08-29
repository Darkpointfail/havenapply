import { NextResponse } from "next/server";
import { requireAccessLogsAdmin } from "@/lib/access-logs-admin";
import {
  computeAccessLogStats,
  listAccessLogs,
  type SiteAccessLogRecord,
} from "@/lib/site-access-log";
import type { DeviceCategory } from "@/lib/site-access-ua";

export async function GET(request: Request) {
  const gate = await requireAccessLogsAdmin(request);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: gate.status });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const deviceParam = url.searchParams.get("device");
  const device = isDevice(deviceParam) ? deviceParam : "all";
  const limit = Number(url.searchParams.get("limit") || "50");
  const offset = Number(url.searchParams.get("offset") || "0");

  const [{ logs, total }, stats] = await Promise.all([
    listAccessLogs({ from, to, device, limit, offset }),
    computeAccessLogStats({ from, to, device }),
  ]);

  return NextResponse.json({
    ok: true,
    total,
    offset,
    limit,
    stats,
    logs: logs.map(publicLog),
  });
}

function isDevice(value: string | null): value is DeviceCategory | "all" {
  return (
    value === "all" ||
    value === "mobile" ||
    value === "tablet" ||
    value === "desktop" ||
    value === "unknown"
  );
}

/** Strip nothing sensitive beyond what we already store (no raw IP, no password). */
function publicLog(log: SiteAccessLogRecord) {
  return {
    id: log.id,
    createdAt: log.createdAt,
    visitorId: log.visitorId,
    deviceCategory: log.deviceCategory,
    osName: log.osName,
    osVersion: log.osVersion,
    browserName: log.browserName,
    browserMajorVersion: log.browserMajorVersion,
    browserLanguage: log.browserLanguage,
    timeZone: log.timeZone,
    entryPage: log.entryPage,
    referrer: log.referrer,
    utmSource: log.utmSource,
    utmMedium: log.utmMedium,
    utmCampaign: log.utmCampaign,
    hostname: log.hostname,
    country: log.country,
    region: log.region,
    // ipHash is a one-way value; still admin-only via this route.
    ipHash: log.ipHash ? `${log.ipHash.slice(0, 10)}…` : null,
    gateVersion: log.gateVersion,
  };
}
