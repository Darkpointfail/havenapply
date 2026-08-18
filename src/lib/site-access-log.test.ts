/**
 * Site access log security tests.
 * Run: npm run test:access-logs
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("site-access-ua", async () => {
  const { parseUserAgent } = await import("@/lib/site-access-ua");

  it("classifies desktop chrome", () => {
    const p = parseUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    );
    assert.equal(p.deviceCategory, "desktop");
    assert.equal(p.browserName, "Chrome");
    assert.equal(p.browserMajorVersion, "124");
    assert.equal(p.osName, "Windows");
  });

  it("classifies mobile safari", () => {
    const p = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    assert.equal(p.deviceCategory, "mobile");
    assert.equal(p.browserName, "Safari");
    assert.equal(p.osName, "iOS");
  });
});

describe("ip hashing & record build", async () => {
  const {
    hashIpAddress,
    buildAccessLogRecord,
    adminTokensMatch,
  } = await import("@/lib/site-access-log");

  it("HMAC hashes IP and never returns raw IP", () => {
    const hash = hashIpAddress("203.0.113.10", "test-secret-key");
    assert.ok(hash);
    assert.equal(hash!.length, 64);
    assert.notEqual(hash, "203.0.113.10");
    assert.equal(hashIpAddress("203.0.113.10", "test-secret-key"), hash);
    assert.equal(hashIpAddress("203.0.113.10", undefined), null);
  });

  it("builds a log without password fields", () => {
    const headers = new Headers({
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "x-forwarded-for": "198.51.100.20",
      "x-vercel-ip-country": "CA",
      "x-vercel-ip-country-region": "QC",
      host: "preview.havenapply.com",
    });
    process.env.ACCESS_LOG_HASH_SECRET = "unit-test-secret";
    const record = buildAccessLogRecord({
      visitorId: "11111111-1111-4111-8111-111111111111",
      gateVersion: "gate-test",
      userAgent: headers.get("user-agent"),
      headers,
      hints: {
        language: "fr-CA",
        timeZone: "America/Toronto",
        entryPage: "/family/dashboard",
        referrer: "https://example.com/start",
        utmSource: "newsletter",
        hostname: "preview.havenapply.com",
      },
    });
    const json = JSON.stringify(record);
    assert.equal(record.country, "CA");
    assert.equal(record.region, "QC");
    assert.equal(record.deviceCategory, "desktop");
    assert.ok(record.ipHash);
    assert.equal(json.includes("198.51.100.20"), false);
    assert.equal(json.toLowerCase().includes("password"), false);
    assert.equal(json.includes("SoftwareForBetter"), false);
  });

  it("compares admin tokens safely", () => {
    assert.equal(adminTokensMatch("abc", "abc"), true);
    assert.equal(adminTokensMatch("abc", "abd"), false);
  });
});

describe("persist + dedupe + failed attempts", async () => {
  let tmp: string;
  let prevCwd: string;

  before(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), "haven-access-logs-"));
    prevCwd = process.cwd();
    process.chdir(tmp);
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.ACCESS_LOG_HASH_SECRET = "dedupe-secret";
  });

  after(async () => {
    process.chdir(prevCwd);
    await rm(tmp, { recursive: true, force: true });
  });

  it("stores successful unlock once per visitor+gate", async () => {
    const {
      buildAccessLogRecord,
      persistAccessLog,
      listAccessLogs,
      recordFailedAttempt,
    } = await import("@/lib/site-access-log");

    const headers = new Headers({
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/121.0.0.0 Safari/537.36",
      "x-forwarded-for": "192.0.2.5",
    });
    const record = buildAccessLogRecord({
      visitorId: "22222222-2222-4222-8222-222222222222",
      gateVersion: "gate-v-test",
      userAgent: headers.get("user-agent"),
      headers,
      hints: { entryPage: "/" },
    });

    const first = await persistAccessLog(record);
    assert.equal(first.stored, true);
    assert.equal(first.deduped, false);

    const second = await persistAccessLog({ ...record, id: "33333333-3333-4333-8333-333333333333" });
    assert.equal(second.stored, false);
    assert.equal(second.deduped, true);

    const { total } = await listAccessLogs({ limit: 50, offset: 0 });
    assert.equal(total, 1);

    const fails = await recordFailedAttempt();
    assert.ok(fails >= 1);
  });
});

describe("admin route protection", async () => {
  it("denies unauthenticated access-log reads", async () => {
    const { requireAccessLogsAdmin } = await import("@/lib/access-logs-admin");
    delete process.env.ACCESS_LOGS_ADMIN_TOKEN;
    const denied = await requireAccessLogsAdmin(new Request("http://localhost/api/internal/access-logs"));
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.ok(denied.status === 401 || denied.status === 403);
  });

  it("allows bearer admin token", async () => {
    process.env.ACCESS_LOGS_ADMIN_TOKEN = "super-admin-token-value";
    const { requireAccessLogsAdmin } = await import("@/lib/access-logs-admin");
    const allowed = await requireAccessLogsAdmin(
      new Request("http://localhost/api/internal/access-logs", {
        headers: { Authorization: "Bearer super-admin-token-value" },
      }),
    );
    assert.equal(allowed.ok, true);
  });
});
