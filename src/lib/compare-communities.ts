import type { Residence } from "@/data/residences";
import { computeCompatibility, type CompatibilityResult } from "@/lib/community-match";
import type { CareNeeds } from "@/lib/care-needs";
import type { SeniorProfile } from "@/lib/senior-profile";
import { buildCommunityDetail } from "@/lib/residence-detail";
import { formatCurrency } from "@/lib/utils";

export type CompareCellTone = "best" | "missing" | "mismatch" | "diff" | "neutral";

export type CompareCell = {
  text: string;
  tone: CompareCellTone;
  hint?: string;
};

export type CompareRow = {
  id: string;
  label: string;
  cells: CompareCell[];
};

function yesNo(v: boolean): string {
  return v ? "Yes" : "No";
}

function feeEstimate(r: Residence): number | null {
  if (!r.priceAvailable || r.priceFrom == null) return null;
  return Math.round(r.priceFrom * 0.2);
}

function availabilityScore(r: Residence): number {
  if (r.availableNow && r.availabilityConfirmed) return 3;
  if (r.availableNow) return 2;
  if (r.waitingWeeks != null) return 1;
  return 0;
}

function availabilityText(r: Residence): string {
  if (r.availableNow && r.availabilityConfirmed) return "Available now";
  if (r.availableNow) return "Limited / unconfirmed";
  if (r.waitingWeeks != null) return `Waitlist ~${r.waitingWeeks} wk`;
  return "Ask community";
}

function markBest(
  values: (number | null)[],
  prefer: "max" | "min",
): boolean[] {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return values.map(() => false);
  const best = prefer === "max" ? Math.max(...nums) : Math.min(...nums);
  return values.map((v) => v != null && v === best);
}

export function buildCompareRows(
  cols: Residence[],
  senior?: SeniorProfile | null,
  care?: CareNeeds | null,
): { rows: CompareRow[]; matches: CompatibilityResult[] } {
  const details = cols.map((r) => buildCommunityDetail(r));
  const matches = cols.map((r) => computeCompatibility(r, senior, care));

  const careWanted = new Set(
    (senior?.housingTypes || []).flatMap((h) => {
      const map: Record<string, string[]> = {
        independent: ["Independent living"],
        assisted: ["Assisted living"],
        memory: ["Memory care"],
        nursing: ["Nursing care"],
        respite: ["Respite care"],
        ccrc: ["CCRC"],
      };
      return map[h] || [];
    }),
  );

  const needsMemory =
    care?.cognition?.some((c) =>
      ["dementia", "alzheimers", "wandering", "secure", "sundowning"].includes(c),
    ) ?? false;
  const needsPets = Boolean(care?.preferences?.pets?.trim());
  const budgetMax =
    senior && !senior.budgetUnsure && senior.budgetMax ? Number(senior.budgetMax) : null;

  const scores = matches.map((m) => m.score);
  const prices = cols.map((r) => (r.priceAvailable ? r.priceFrom : null));
  const fees = cols.map((r) => feeEstimate(r));
  const distances = cols.map((r) => r.distanceMiles);
  const ratings = cols.map((r) => r.rating);
  const availScores = cols.map(availabilityScore);
  const waitWeeks = cols.map((r) => (r.availableNow ? 0 : r.waitingWeeks ?? 999));

  const bestScore = markBest(scores, "max");
  const bestPrice = markBest(prices, "min");
  const bestFee = markBest(fees, "min");
  const bestDist = markBest(distances, "min");
  const bestRating = markBest(ratings, "max");
  const bestAvail = markBest(availScores, "max");
  const bestWait = markBest(waitWeeks, "min");

  const rows: CompareRow[] = [
    {
      id: "care",
      label: "Care type",
      cells: cols.map((r) => {
        const text = r.careLevels.join(", ");
        const hit =
          careWanted.size === 0 ||
          r.careLevels.some((c) => careWanted.has(c));
        const memoryGap = needsMemory && !r.secureMemoryCare && !r.careLevels.includes("Memory care");
        return {
          text,
          tone: memoryGap ? "mismatch" : hit ? "neutral" : "diff",
          hint: memoryGap
            ? "May not match cognitive / secure memory needs"
            : !hit
              ? "Differs from housing types in senior profile"
              : undefined,
        };
      }),
    },
    {
      id: "match",
      label: "Compatibility score",
      cells: matches.map((m, i) => ({
        text: `${m.score}%`,
        tone: bestScore[i] ? "best" : "neutral",
        hint: m.reasons.find((x) => x.tone === "gap")?.text,
      })),
    },
    {
      id: "price",
      label: "Starting price / mo",
      cells: cols.map((r, i) => {
        if (!r.priceAvailable || r.priceFrom == null) {
          return { text: "Unavailable", tone: "missing", hint: "Request a written quote" };
        }
        const overBudget = budgetMax != null && r.priceFrom > budgetMax;
        return {
          text: formatCurrency(r.priceFrom),
          tone: overBudget ? "mismatch" : bestPrice[i] ? "best" : "neutral",
          hint: overBudget ? `Above stated max (${formatCurrency(budgetMax)})` : undefined,
        };
      }),
    },
    {
      id: "fees",
      label: "Extra fees (est.)",
      cells: cols.map((r, i) => {
        const fee = fees[i];
        if (fee == null) {
          return { text: "Unavailable", tone: "missing" };
        }
        return {
          text: `~${formatCurrency(fee)} / mo care + community`,
          tone: bestFee[i] ? "best" : "neutral",
          hint: "Estimate from published base rate — confirm with admissions",
        };
      }),
    },
    {
      id: "availability",
      label: "Availability",
      cells: cols.map((r, i) => ({
        text: availabilityText(r),
        tone: !r.availabilityConfirmed && r.availableNow
          ? "missing"
          : bestAvail[i]
            ? "best"
            : "neutral",
        hint: !r.availabilityConfirmed ? "Not fully confirmed" : undefined,
      })),
    },
    {
      id: "waitlist",
      label: "Waitlist",
      cells: cols.map((r, i) => ({
        text: r.availableNow
          ? "None (open)"
          : r.waitingWeeks != null
            ? `~${r.waitingWeeks} weeks`
            : "Unknown",
        tone:
          r.waitingWeeks == null && !r.availableNow
            ? "missing"
            : bestWait[i]
              ? "best"
              : "neutral",
      })),
    },
    {
      id: "distance",
      label: "Distance",
      cells: cols.map((r, i) => ({
        text: `${r.distanceMiles} mi`,
        tone: bestDist[i] ? "best" : "neutral",
      })),
    },
    {
      id: "rooms",
      label: "Room types",
      cells: cols.map((r) => ({
        text: r.roomTypes.join(", ") || "—",
        tone: r.roomTypes.length ? "neutral" : "missing",
      })),
    },
    {
      id: "services",
      label: "Medical services",
      cells: cols.map((r) => ({
        text: r.medicalServices.length ? r.medicalServices.join(" · ") : "Not listed",
        tone: r.medicalServices.length ? "neutral" : "missing",
      })),
    },
    {
      id: "amenities",
      label: "Amenities",
      cells: cols.map((r) => ({
        text: r.amenities.slice(0, 4).join(" · ") + (r.amenities.length > 4 ? "…" : ""),
        tone: r.amenities.length ? "neutral" : "missing",
      })),
    },
    {
      id: "rating",
      label: "Ratings",
      cells: cols.map((r, i) => ({
        text: `${r.rating}★ (${r.reviewCount})`,
        tone: bestRating[i] ? "best" : "neutral",
      })),
    },
    {
      id: "admission",
      label: "Admission criteria",
      cells: details.map((d) => ({
        text: d.admission.residencyCriteria.slice(0, 2).join("; "),
        tone: "neutral",
      })),
    },
    {
      id: "documents",
      label: "Documents requested",
      cells: details.map((d) => ({
        text: d.admission.documents.slice(0, 3).join("; ") + "…",
        tone: "neutral",
      })),
    },
    {
      id: "medicaid",
      label: "Medicaid",
      cells: cols.map((r) => ({
        text: yesNo(r.acceptsMedicaid),
        tone: r.acceptsMedicaid ? "best" : "diff",
      })),
    },
    {
      id: "veterans",
      label: "Veterans Benefits",
      cells: cols.map((r) => ({
        text: yesNo(r.acceptsVeteransBenefits),
        tone: r.acceptsVeteransBenefits ? "best" : "diff",
      })),
    },
    {
      id: "pets",
      label: "Pets",
      cells: cols.map((r) => {
        const mismatch = needsPets && !r.petFriendly;
        return {
          text: yesNo(r.petFriendly),
          tone: mismatch ? "mismatch" : r.petFriendly ? "best" : "neutral",
          hint: mismatch ? "Senior profile mentions pets" : undefined,
        };
      }),
    },
    {
      id: "pros",
      label: "Advantages",
      cells: cols.map((r, i) => ({
        text: [
          ...r.highlights.slice(0, 2),
          ...(matches[i].reasons.filter((x) => x.tone === "fit").map((x) => x.text).slice(0, 1)),
        ].join(" · ") || "—",
        tone: "best",
      })),
    },
    {
      id: "cons",
      label: "Watch-outs",
      cells: cols.map((r, i) => {
        const gaps = matches[i].reasons.filter((x) => x.tone === "gap" || x.tone === "partial");
        const notes = [
          ...gaps.map((g) => g.text),
          !r.partner ? "Non-partner listing" : null,
          !r.priceAvailable ? "Price unavailable" : null,
          !r.availabilityConfirmed ? "Availability unconfirmed" : null,
        ].filter(Boolean) as string[];
        return {
          text: notes.slice(0, 3).join(" · ") || "None flagged",
          tone: notes.length ? "mismatch" : "neutral",
        };
      }),
    },
  ];

  return { rows, matches };
}
