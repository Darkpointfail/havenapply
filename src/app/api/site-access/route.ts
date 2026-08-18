import { NextResponse } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_COOKIE_VALUE,
  SITE_ACCESS_PASSWORD,
  normalizeSitePassword,
  passwordsMatch,
  safeSiteNextPath,
} from "@/lib/site-access";
import {
  SITE_ACCESS_LOGGED_COOKIE,
  SITE_ACCESS_VISITOR_COOKIE,
  buildAccessLogRecord,
  newVisitorId,
  persistAccessLog,
  recordFailedAttempt,
  type SiteAccessLogClientHints,
} from "@/lib/site-access-log";

export async function POST(request: Request) {
  let rawPassword: unknown = "";
  let hints: SiteAccessLogClientHints = {};
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      password?: unknown;
      language?: unknown;
      timeZone?: unknown;
      entryPage?: unknown;
      referrer?: unknown;
      utmSource?: unknown;
      utmMedium?: unknown;
      utmCampaign?: unknown;
      hostname?: unknown;
    } | null;
    rawPassword = body?.password;
    hints = {
      language: typeof body?.language === "string" ? body.language : null,
      timeZone: typeof body?.timeZone === "string" ? body.timeZone : null,
      entryPage: typeof body?.entryPage === "string" ? safeSiteNextPath(body.entryPage) : null,
      referrer: typeof body?.referrer === "string" ? body.referrer : null,
      utmSource: typeof body?.utmSource === "string" ? body.utmSource : null,
      utmMedium: typeof body?.utmMedium === "string" ? body.utmMedium : null,
      utmCampaign: typeof body?.utmCampaign === "string" ? body.utmCampaign : null,
      hostname: typeof body?.hostname === "string" ? body.hostname : null,
    };
  } else {
    const form = await request.formData().catch(() => null);
    rawPassword = form?.get("password");
  }

  const password = normalizeSitePassword(rawPassword);
  if (!password || !passwordsMatch(password, SITE_ACCESS_PASSWORD)) {
    // Never log the submitted or expected password. Aggregate failures only.
    void recordFailedAttempt().catch(() => undefined);
    return NextResponse.json(
      { ok: false, error: "Incorrect password" },
      { status: 401 },
    );
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const existingVid = readCookie(cookieHeader, SITE_ACCESS_VISITOR_COOKIE);
  const alreadyLogged =
    readCookie(cookieHeader, SITE_ACCESS_LOGGED_COOKIE) === SITE_ACCESS_COOKIE_VALUE;
  const visitorId = existingVid && isUuid(existingVid) ? existingVid : newVisitorId();

  let logged = false;
  let deduped = false;
  if (!alreadyLogged) {
    const record = buildAccessLogRecord({
      visitorId,
      gateVersion: SITE_ACCESS_COOKIE_VALUE,
      userAgent: request.headers.get("user-agent"),
      headers: request.headers,
      hints,
    });
    const result = await persistAccessLog(record).catch(() => ({
      stored: false,
      deduped: false,
    }));
    logged = result.stored;
    deduped = result.deduped;
  } else {
    deduped = true;
  }

  const response = NextResponse.json({
    ok: true,
    accessLogged: logged,
    deduped,
  });

  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    value: SITE_ACCESS_COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  response.cookies.set({
    name: SITE_ACCESS_VISITOR_COOKIE,
    value: visitorId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  response.cookies.set({
    name: SITE_ACCESS_LOGGED_COOKIE,
    value: SITE_ACCESS_COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Session cookie mirrors access unlock lifetime for reload dedupe.
  });

  return response;
}

function readCookie(header: string, name: string): string | null {
  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
