import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MarketingPoint = {
  title: string;
  body: string;
};

type Crumb = { label: string; href?: string };

export function MarketingPage({
  eyebrow,
  title,
  description,
  breadcrumbs,
  points,
  footer,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: Crumb[];
  points: MarketingPoint[];
  footer?: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-80",
          align === "right"
            ? "bg-[radial-gradient(ellipse_at_top_right,_var(--brand-soft)_0%,_transparent_52%)]"
            : "bg-[radial-gradient(ellipse_at_top_left,_var(--brand-soft)_0%,_transparent_52%)]",
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/25 to-transparent"
      />

      <div className="relative mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight size={14} className="text-ink-faint" aria-hidden />}
                  {crumb.href && !last ? (
                    <Link href={crumb.href} className="transition hover:text-brand">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={last ? "font-medium text-ink" : undefined}>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-[2.75rem] md:leading-[1.15]">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">{description}</p>
        </header>

        <div className="mt-14 space-y-0 divide-y divide-line/80 border-y border-line/80">
          {points.map((point, i) => (
            <section key={point.title} className="grid gap-4 py-8 sm:grid-cols-[4.5rem_1fr] sm:gap-6">
              <p className="font-semibold tabular-nums text-brand/70 sm:pt-1">
                {String(i + 1).padStart(2, "0")}
              </p>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-ink">{point.title}</h2>
                <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-muted md:text-base">
                  {point.body}
                </p>
              </div>
            </section>
          ))}
        </div>

        {footer ? (
          <footer className="mt-12 max-w-prose text-sm leading-relaxed text-ink-muted">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
