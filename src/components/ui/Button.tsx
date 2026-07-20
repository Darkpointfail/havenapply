import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "soft" | "onDark" | "ai" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-soft hover:bg-brand-strong hover:-translate-y-0.5 hover:shadow-card active:translate-y-0",
  secondary:
    "bg-surface text-ink border border-line shadow-xs hover:bg-bg-soft hover:-translate-y-0.5 hover:border-line-strong",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-bg-soft",
  soft: "bg-brand-soft text-brand-strong hover:brightness-95",
  onDark:
    "border border-white/15 bg-white text-[#0f1419] shadow-lift hover:bg-[#f3f3f0] hover:-translate-y-0.5",
  ai: "bg-ai-soft text-ai border border-transparent hover:brightness-95",
  danger: "bg-danger-soft text-danger hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-[10px]",
  md: "h-11 px-[18px] text-[15px] rounded-[12px]",
  lg: "h-12 px-6 text-base rounded-[14px]",
  icon: "h-10 w-10 rounded-[12px] p-0",
};

type Common = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  size?: Size;
};

type ButtonAsButton = Common &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = Common & {
  href: string;
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  href,
  ...props
}: ButtonAsButton | ButtonAsLink) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out disabled:opacity-45 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
