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
    <div className="bg-[var(--surface)]">
      <div className="mx-auto max-w-[900px] px-5 py-16 md:px-16 md:py-20">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-[16px] text-[var(--ink-muted)]">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight size={14} className="text-[var(--ink-faint)]" aria-hidden />}
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="transition hover:text-[var(--brand-strong)]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={last ? "font-medium text-[var(--ink)]" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <header className="max-w-2xl">
          <p className="home-eyebrow text-[var(--brand-strong)]">{eyebrow}</p>
          <h1 className="home-h1 mt-4 text-[var(--ink)] !text-[34px] md:!text-[44px]">{title}</h1>
          <p className="home-lead mt-4 text-[var(--ink-secondary)]">{description}</p>
        </header>

        <div className="mt-14 space-y-0 border-y border-[var(--line)]">
          {points.map((point, i) => (
            <section
              key={point.title}
              className={cn(
                "grid gap-4 border-t border-[var(--line)] py-8 first:border-t-0 sm:grid-cols-[4.5rem_1fr] sm:gap-6",
              )}
            >
              <p className="font-semibold tabular-nums text-[var(--brand-strong)] sm:pt-1">
                {String(i + 1).padStart(2, "0")}
              </p>
              <div>
                <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
                  {point.title}
                </h2>
                <p className="mt-2 max-w-prose text-[18px] leading-[1.6] text-[var(--ink-secondary)]">
                  {point.body}
                </p>
              </div>
            </section>
          ))}
        </div>

        {footer ? (
          <footer className="mt-12 max-w-prose text-[16px] leading-relaxed text-[var(--ink-muted)]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
