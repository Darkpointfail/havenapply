import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  markOnly = false,
  light = false,
  href = "/",
  size = "md",
}: {
  className?: string;
  markOnly?: boolean;
  light?: boolean;
  href?: string;
  size?: "md" | "lg";
}) {
  const large = size === "lg";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center transition-opacity hover:opacity-80",
        large ? "gap-3" : "gap-2.5",
        className,
      )}
      aria-label="Haven home"
    >
      <span
        className={cn(
          "relative flex items-center justify-center rounded-[10px]",
          large ? "h-10 w-10 rounded-xl" : "h-8 w-8 rounded-[10px]",
          light ? "bg-white/15" : "bg-brand-soft",
        )}
        aria-hidden
      >
        <svg
          width={large ? 22 : 18}
          height={large ? 22 : 18}
          viewBox="0 0 22 22"
          fill="none"
        >
          <path
            d="M4 12.5C4 8.5 7 5.5 11 4c4 1.5 7 4.5 7 8.5 0 3.2-2.4 5.5-7 7.5-4.6-2-7-4.3-7-7.5Z"
            className={light ? "stroke-white" : "stroke-brand"}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="11" cy="12.2" r="1.6" className={light ? "fill-white" : "fill-brand"} />
        </svg>
      </span>
      {!markOnly && (
        <span
          className={cn(
            "font-semibold tracking-tight",
            large ? "text-[1.55rem] leading-none" : "text-[1.2rem]",
            light ? "text-white" : "text-ink",
          )}
        >
          Haven
        </span>
      )}
    </Link>
  );
}
