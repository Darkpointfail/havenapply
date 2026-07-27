import { emptySearchFilters, type SearchFilters } from "@/lib/community-match";

/** Lightweight NL → SearchFilters (no LLM). */
export function parseSearchIntent(text: string, base?: SearchFilters): SearchFilters {
  const filters = { ...(base || emptySearchFilters()) };
  const n = text.toLowerCase();

  const miles = text.match(/(\d+)\s*miles?/i);
  if (miles) filters.maxMiles = Number(miles[1]);

  const under = text.match(/under\s*\$?\s*([\d,]+)\s*k?/i);
  const around = text.match(/\$?\s*([\d,]+)\s*(?:-|to|–)\s*\$?\s*([\d,]+)/i);
  if (under) {
    let v = Number(under[1].replace(/,/g, ""));
    if (/k/i.test(under[0]) || v < 100) v *= 1000;
    filters.budgetMax = v;
  } else if (around) {
    let a = Number(around[1].replace(/,/g, ""));
    let b = Number(around[2].replace(/,/g, ""));
    if (a < 100) a *= 1000;
    if (b < 100) b *= 1000;
    filters.budgetMin = Math.min(a, b);
    filters.budgetMax = Math.max(a, b);
  }

  if (n.includes("memory") || n.includes("alzheimer") || n.includes("dementia")) {
    filters.careTypes = [...new Set([...filters.careTypes, "Memory Care"])];
    filters.secureMemoryCare = true;
  }
  if (n.includes("assisted")) {
    filters.careTypes = [...new Set([...filters.careTypes, "Assisted Living"])];
  }
  if (n.includes("independent")) {
    filters.careTypes = [...new Set([...filters.careTypes, "Independent Living"])];
  }
  if (n.includes("nursing") || n.includes("skilled")) {
    filters.careTypes = [...new Set([...filters.careTypes, "Skilled Nursing"])];
  }

  const near = text.match(/(?:in|near|around)\s+([A-Za-z .]+?)(?:,\s*([A-Z]{2})|(?:\s+under|\s+within|$))/i);
  if (near) {
    filters.query = near[2] ? `${near[1].trim()}, ${near[2].trim()}` : near[1].trim();
  } else if (!filters.query && text.length < 40 && !/under|mile|\$/.test(n)) {
    filters.query = text.trim();
  }

  if (n.includes("medicaid")) filters.medicaid = true;
  if (n.includes("veteran")) filters.veterans = true;
  if (n.includes("immediate") || n.includes("available now")) {
    filters.availability = "now";
    filters.immediateOnly = true;
  }

  return filters;
}

export function describeFilters(f: SearchFilters): string {
  const parts: string[] = [];
  if (f.postalCode.trim()) parts.push(`postal ${f.postalCode.trim()}`);
  if (f.query) parts.push(`near ${f.query}`);
  if (f.maxMiles) parts.push(`within ${f.maxMiles} miles`);
  if (f.budgetMax) parts.push(`under $${f.budgetMax.toLocaleString()}/mo`);
  if (f.careTypes.length) parts.push(f.careTypes.join(", "));
  return parts.length ? parts.join(" · ") : "your current filters";
}
