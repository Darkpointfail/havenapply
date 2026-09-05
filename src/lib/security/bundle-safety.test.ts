/**
 * Guard against shipping privileged material to the browser.
 * Walks the source tree instead of the build output so the check is fast and
 * runs on every `npm test`.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(process.cwd(), "src");

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
    }),
  );
  return files.flat();
}

async function clientModules(): Promise<{ file: string; source: string }[]> {
  const files = await walk(SRC);
  const results: { file: string; source: string }[] = [];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    const head = source.slice(0, 200);
    if (head.includes('"use client"') || head.includes("'use client'")) {
      results.push({ file, source });
    }
  }
  return results;
}

describe("client bundle safety", () => {
  it("never references the service role key from a client module", async () => {
    const offenders = (await clientModules())
      .filter(({ source }) => source.includes("SUPABASE_SERVICE_ROLE_KEY"))
      .map(({ file }) => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  it("never imports the admin client or server security modules from a client module", async () => {
    const forbidden = [
      "@/lib/supabase/admin",
      "@/lib/security/identity-store",
      "@/lib/security/identity-repository",
      "@/lib/security/identity-supabase",
      "@/lib/security/auth-service",
      "@/lib/security/session",
      "@/lib/security/guards",
      "@/lib/admissions/local-store",
    ];
    const offenders: string[] = [];
    for (const { file, source } of await clientModules()) {
      for (const target of forbidden) {
        if (source.includes(`from "${target}"`)) {
          offenders.push(`${path.relative(process.cwd(), file)} -> ${target}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps password hashing and verification out of client modules", async () => {
    const offenders = (await clientModules())
      .filter(({ source }) => source.includes('from "@/lib/security/password"'))
      .map(({ file }) => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  it("exposes no secret-looking NEXT_PUBLIC variable", async () => {
    const files = await walk(SRC);
    const suspicious: string[] = [];
    for (const file of files) {
      const source = await fs.readFile(file, "utf8");
      for (const match of source.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
        const name = match[0];
        if (/SECRET|SERVICE_ROLE|PRIVATE|PASSWORD/.test(name)) {
          suspicious.push(`${path.relative(process.cwd(), file)}: ${name}`);
        }
      }
    }
    expect(suspicious).toEqual([]);
  });
});
