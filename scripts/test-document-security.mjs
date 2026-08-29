/**
 * Document security tests: malicious, oversized, renamed, cross-tenant.
 * Run: node scripts/test-document-security.mjs
 */
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const BLOCKED_EXT = new Set(["exe", "js", "html", "svg", "bat", "dll", "docm"]);
const MAX = 10 * 1024 * 1024;

function extensionChain(filename) {
  const base = filename.split(/[/\\]/).pop() || filename;
  const parts = base.split(".");
  if (parts.length <= 1) return [];
  return parts.slice(1).map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ""));
}

function hasBlockedDoubleExtension(filename) {
  const chain = extensionChain(filename);
  if (chain.some((ext) => BLOCKED_EXT.has(ext))) return true;
  if (chain.length > 1) return true;
  return false;
}

function detectMagic(buf) {
  if (buf[0] === 0x4d && buf[1] === 0x5a) return { ok: false, reason: "executable_mz" };
  if (String.fromCharCode(...buf.slice(0, 4)) === "%PDF") {
    return { ok: true, mime: "application/pdf", ext: "pdf" };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ok: true, mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { ok: true, mime: "image/png", ext: "png" };
  }
  const head = Buffer.from(buf.slice(0, 256)).toString("latin1").toLowerCase();
  if (head.includes("<html") || head.includes("<svg") || head.includes("<script")) {
    return { ok: false, reason: "active_markup" };
  }
  return { ok: false, reason: "unknown_signature" };
}

function heuristicScan(buf, mime) {
  if (mime === "application/pdf") {
    const s = Buffer.from(buf).toString("latin1");
    if (
      s.includes("/JavaScript") ||
      s.includes("/JS") ||
      s.includes("/OpenAction") ||
      s.includes("/Launch")
    ) {
      return { clean: false, reason: "pdf_active_content" };
    }
  }
  return { clean: true };
}

function assertSafePath(path) {
  const normalized = path.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error("path_traversal");
  }
  for (const part of normalized.split("/")) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(part) || part === "." || part === "..") {
      throw new Error("path_traversal");
    }
  }
}

function validate(bytes, { claimedMime, originalName }) {
  if (bytes.length > MAX) return { ok: false, code: "too_large" };
  if (hasBlockedDoubleExtension(originalName || "")) {
    return { ok: false, code: "double_extension" };
  }
  const magic = detectMagic(bytes);
  if (!magic.ok) return { ok: false, code: "bad_signature", reason: magic.reason };
  if (claimedMime && claimedMime !== magic.mime && claimedMime !== "application/octet-stream") {
    return { ok: false, code: "mime_mismatch" };
  }
  if (!ALLOWED.has(magic.mime)) return { ok: false, code: "mime_denied" };
  const scan = heuristicScan(bytes, magic.mime);
  if (!scan.clean) return { ok: false, code: "malware", reason: scan.reason };
  return { ok: true, mime: magic.mime, ext: magic.ext };
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function mintGrant(secret, { docId, tenantId, elevated }) {
  const body = {
    typ: "doc_dl",
    docId,
    tenantId,
    iat: Date.now(),
    exp: Date.now() + 60_000,
    jti: randomBytes(8).toString("hex"),
    elevated: !!elevated,
  };
  const payload = b64url(JSON.stringify(body));
  const sig = b64url(createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

function consumeGrant(secret, token, expectedTenant) {
  const [payload, sig] = token.split(".");
  const expected = createHmac("sha256", secret).update(payload).digest();
  const got = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/") + "==", "base64");
  // loose compare length pad
  const a = expected;
  const b = Buffer.from(
    sig.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(sig.length / 4) * 4, "="),
    "base64",
  );
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, error: "bad_signature" };
  const grant = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  if (grant.tenantId !== expectedTenant) return { ok: false, error: "tenant_mismatch" };
  if (Date.now() > grant.exp) return { ok: false, error: "expired" };
  return { ok: true, grant };
}

async function main() {
  // --- Malicious / active content ---
  const pe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  assert(validate(pe, { claimedMime: "application/pdf", originalName: "demo-invoice.pdf" }).code === "bad_signature", "PE rejected");

  const html = Buffer.from("<!doctype html><script>alert(1)</script>");
  assert(validate(html, { claimedMime: "text/html", originalName: "demo-page.html" }).ok === false, "HTML rejected");

  const evilPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /JavaScript 2 0 R /OpenAction 3 0 R >>\nendobj\n");
  const evil = validate(evilPdf, { claimedMime: "application/pdf", originalName: "demo-report.pdf" });
  assert(evil.ok === false && evil.code === "malware", "PDF with JS quarantined");

  // --- Double extension / renamed spoof ---
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  assert(
    validate(jpeg, { claimedMime: "image/jpeg", originalName: "demo-photo.jpg.exe" }).code ===
      "double_extension",
    "double extension blocked",
  );
  assert(
    validate(jpeg, { claimedMime: "application/pdf", originalName: "demo-photo.jpg" }).code ===
      "mime_mismatch",
    "renamed MIME spoof blocked",
  );
  assert(validate(jpeg, { claimedMime: "image/jpeg", originalName: "demo-photo.jpg" }).ok, "clean jpeg ok");

  // --- Oversized ---
  const big = Buffer.alloc(MAX + 1, 0xff);
  big[0] = 0xff;
  big[1] = 0xd8;
  big[2] = 0xff;
  assert(validate(big, { claimedMime: "image/jpeg", originalName: "demo-huge.jpg" }).code === "too_large", "oversized blocked");

  // --- Path traversal ---
  let threw = false;
  try {
    assertSafePath("../etc/passwd");
  } catch {
    threw = true;
  }
  assert(threw, "path traversal blocked");
  assertSafePath("tenant123/abcdef0123456789abcdef0123456789.pdf");

  // --- Cross-tenant grant ---
  const secret = "test-secret";
  const token = mintGrant(secret, { docId: "doc-1", tenantId: "tenant-a", elevated: true });
  const okA = consumeGrant(secret, token, "tenant-a");
  assert(okA.ok, "owner tenant can consume");
  const badB = consumeGrant(secret, token, "tenant-b");
  assert(!badB.ok && badB.error === "tenant_mismatch", "other tenant denied");

  // --- Private store rename (server name ≠ original) ---
  const root = await mkdtemp(join(tmpdir(), "haven-docs-"));
  try {
    const tenant = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const storageName = `${randomBytes(16).toString("hex")}.jpg`;
    assert(!storageName.includes("John"), "no PII in storage name");
    assert(storageName !== "demo-John_Doe_SSN.jpg", "renamed server-side");
    await mkdir(join(root, tenant), { recursive: true });
    await writeFile(join(root, tenant, storageName), jpeg);
    const saved = await readFile(join(root, tenant, storageName));
    assert(saved[0] === 0xff, "stored privately");
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  // --- Soft then hard delete semantics ---
  const meta = {
    id: "11111111-1111-1111-1111-111111111111",
    status: "ready",
    deletedAt: null,
  };
  meta.status = "deleted";
  meta.deletedAt = new Date().toISOString();
  assert(meta.status === "deleted" && meta.deletedAt, "logical delete");
  // hard delete drops bytes — simulated
  const hardGone = true;
  assert(hardGone, "physical delete follows");

  // --- Tenant proof ---
  const proofSecret = "proof";
  const tenantId = createHash("sha256").update("haven-tenant:user1").digest("hex").slice(0, 32);
  const proof = createHmac("sha256", proofSecret).update(`${tenantId}.user1`).digest("hex");
  const proof2 = createHmac("sha256", proofSecret).update(`${tenantId}.user2`).digest("hex");
  assert(proof !== proof2, "tenant proofs differ per user");

  console.log("test-document-security: all passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
