"use client";

import { cn } from "@/lib/utils";
import type { Residence } from "@/data/residences";

/** Stylized metro map — no external map SDK required for the demo. */
export function CommunitiesMap({
  residences,
  selectedId,
  onSelect,
  className,
}: {
  residences: Residence[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const lats = residences.map((r) => r.lat);
  const lngs = residences.map((r) => r.lng);
  const minLat = Math.min(...lats, 30.1);
  const maxLat = Math.max(...lats, 30.6);
  const minLng = Math.min(...lngs, -97.95);
  const maxLng = Math.max(...lngs, -97.55);
  const pad = 0.04;

  const toPos = (r: Residence) => {
    const x = ((r.lng - (minLng - pad)) / (maxLng - minLng + pad * 2)) * 100;
    const y = (1 - (r.lat - (minLat - pad)) / (maxLat - minLat + pad * 2)) * 100;
    return { left: `${Math.min(94, Math.max(6, x))}%`, top: `${Math.min(90, Math.max(8, y))}%` };
  };

  return (
    <div
      className={cn(
        "relative min-h-[420px] overflow-hidden rounded-[1.5rem] border border-line bg-[#e8efe9]",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,40,35,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,40,35,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute inset-[12%] rounded-[40%] border border-brand/15 bg-brand/[0.04]" />
      <div className="absolute left-[18%] top-[28%] h-[38%] w-[28%] rounded-[2rem] border border-teal-900/10 bg-white/35" />
      <div className="absolute bottom-[18%] right-[14%] h-[32%] w-[36%] rounded-[2rem] border border-teal-900/10 bg-white/30" />
      <p className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-ink-muted shadow-xs">
        Austin metro · stylized map
      </p>

      {residences.map((r) => {
        const pos = toPos(r);
        const active = selectedId === r.id;
        return (
          <button
            key={r.id}
            type="button"
            style={{ left: pos.left, top: pos.top }}
            className={cn(
              "absolute z-10 -translate-x-1/2 -translate-y-full rounded-2xl px-2.5 py-1.5 text-left shadow-card transition",
              active
                ? "bg-brand text-white ring-4 ring-brand/25"
                : "bg-white text-ink hover:bg-brand-soft",
            )}
            onClick={() => onSelect?.(r.id)}
          >
            <span className="block max-w-[140px] truncate text-xs font-semibold">{r.name}</span>
            <span className={cn("block text-[10px]", active ? "text-white/80" : "text-ink-faint")}>
              {r.availableNow ? "Open" : "Waitlist"} · {r.distanceMiles} mi
            </span>
            <span
              className={cn(
                "absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent",
                active ? "border-t-brand" : "border-t-white",
              )}
            />
          </button>
        );
      })}

      {residences.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-ink-muted">
          No communities in this map view — loosen filters to see pins.
        </div>
      )}
    </div>
  );
}
