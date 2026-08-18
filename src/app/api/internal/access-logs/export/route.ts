import { NextResponse } from "next/server";
import { requireAccessLogsAdmin } from "@/lib/access-logs-admin";
import { listAccessLogs, logsToCsv } from "@/lib/site-access-log";
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
  const device =
    deviceParam === "mobile" ||
    deviceParam === "tablet" ||
    deviceParam === "desktop" ||
    deviceParam === "unknown"
      ? (deviceParam as DeviceCategory)
      : "all";

  // Cap export size.
  const { logs } = await listAccessLogs({ from, to, device, limit: 200, offset: 0 });
  const csv = logsToCsv(logs);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="site-access-logs.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
