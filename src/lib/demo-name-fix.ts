/** One-time renames for stale local demo data */

const REPLACEMENTS: [RegExp, string][] = [
  [/Andrea\s+Mazurie/gi, "Paul Gilbert"],
  [/Margaret\s+Chen/gi, "Paul Gilbert"],
  [/\bMaggie\b/g, "Paul"],
];

export function rewriteDemoNames(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function isLegacyDemoSeniorName(name: string | undefined | null) {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === "andrea mazurie" ||
    n === "margaret chen" ||
    n === "maggie" ||
    n.includes("andrea mazurie")
  );
}

export function canonicalSeniorName(name: string | undefined | null, fallback = "Paul Gilbert") {
  if (!name?.trim()) return fallback;
  if (isLegacyDemoSeniorName(name)) return "Paul Gilbert";
  return rewriteDemoNames(name.trim());
}

/** Deep-rewrite string fields that still contain legacy demo names */
export function scrubDemoNamesDeep<T>(value: T): T {
  if (typeof value === "string") return rewriteDemoNames(value) as T;
  if (Array.isArray(value)) return value.map((v) => scrubDemoNamesDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubDemoNamesDeep(v);
    }
    return out as T;
  }
  return value;
}
