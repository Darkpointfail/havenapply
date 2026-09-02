import { describe, expect, it } from "vitest";
import {
  contentDisposition,
  detectMimeFromMagic,
  generateOpaqueStorageKey,
  sanitizeOriginalFileName,
  sha256Buffer,
} from "@/lib/document-files";
import { DevPassthroughScanner } from "@/lib/virus-scan";
import { sampleJpeg, samplePdf, samplePng } from "../helpers/sample-files";

describe("document file validation", () => {
  it("sniffs PDF/JPEG/PNG magic bytes", () => {
    expect(detectMimeFromMagic(samplePdf())).toBe("application/pdf");
    expect(detectMimeFromMagic(sampleJpeg())).toBe("image/jpeg");
    expect(detectMimeFromMagic(samplePng())).toBe("image/png");
    expect(detectMimeFromMagic(Buffer.from("not a file"))).toBeNull();
    expect(detectMimeFromMagic(Buffer.from("fake.pdf"))).toBeNull();
  });

  it("sanitizes filenames and builds safe Content-Disposition", () => {
    expect(sanitizeOriginalFileName("../../etc/passwd.pdf", "pdf")).toBe("passwd.pdf");
    const cleaned = sanitizeOriginalFileName('report"name\n.pdf', "pdf");
    expect(cleaned).not.toContain('"');
    expect(cleaned).not.toContain("\n");
    expect(contentDisposition("id.pdf", "attachment")).toContain("attachment");
    expect(contentDisposition("id.pdf", "inline")).toContain("inline");
  });

  it("generates opaque keys not derived from filename", () => {
    const key = generateOpaqueStorageKey("fam-1");
    expect(key.startsWith("docs/fam-1/")).toBe(true);
    expect(key.includes("secret.pdf")).toBe(false);
    expect(sha256Buffer(samplePdf()).length).toBe(64);
  });
});

describe("virus scanner adapters", () => {
  it("dev passthrough is explicitly not a real scan", async () => {
    const scanner = new DevPassthroughScanner();
    const result = await scanner.scan(samplePdf());
    expect(result.isRealScan).toBe(false);
    expect(result.adapter).toBe("dev-passthrough");
    expect(result.scanResult).toBe("skipped_dev");
  });
});
