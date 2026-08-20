"use client";

import { Reveal } from "@/components/marketing/Reveal";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

type StatusShape = "square" | "circle" | "ring" | "triangle" | "dash";

const rows: {
  name: "home.tracking.r1" | "home.tracking.r2" | "home.tracking.r3";
  status: "home.tracking.status.review" | "home.tracking.status.docs" | "home.tracking.status.visit";
  shape: StatusShape;
}[] = [
  { name: "home.tracking.r1", status: "home.tracking.status.review", shape: "square" },
  { name: "home.tracking.r2", status: "home.tracking.status.docs", shape: "circle" },
  { name: "home.tracking.r3", status: "home.tracking.status.visit", shape: "ring" },
];

function StatusMark({ shape }: { shape: StatusShape }) {
  if (shape === "square") {
    return <span aria-hidden className="h-2.5 w-2.5 rounded-[2px] bg-[var(--brand-strong)]" />;
  }
  if (shape === "circle") {
    return <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[var(--warn)]" />;
  }
  if (shape === "ring") {
    return (
      <span
        aria-hidden
        className="h-2.5 w-2.5 rounded-full border-[1.5px] border-[var(--info)] bg-transparent"
      />
    );
  }
  if (shape === "triangle") {
    return (
      <span
        aria-hidden
        className="inline-block h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-[var(--success)]"
      />
    );
  }
  return <span aria-hidden className="h-0.5 w-2.5 rounded-full bg-[var(--ink-muted)]" />;
}

export function TrackingPreview() {
  const t = useT();

  return (
    <Reveal>
      <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
        <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--ink)] md:text-[22px]">
          {t("home.tracking.title")}
        </h3>
        <ul className="mt-6 space-y-4">
          {rows.map((row) => (
            <li
              key={row.name}
              className="flex items-center gap-4 rounded-[14px] border border-[var(--line)] p-3"
            >
              <div
                aria-hidden
                className="h-14 w-14 shrink-0 rounded-[12px] bg-[var(--bg-soft)]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold text-[var(--ink)]">
                  {t(row.name)}
                </p>
                <span
                  className={cn(
                    "mt-1.5 inline-flex items-center gap-2 rounded-[10px] bg-[var(--bg-soft)] px-2.5 py-1 text-[16px] font-medium text-[var(--ink-secondary)]",
                  )}
                >
                  <StatusMark shape={row.shape} />
                  {t(row.status)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="home-small mt-5 text-[var(--ink-muted)]">{t("home.tracking.disclaimer")}</p>
      </div>
    </Reveal>
  );
}
