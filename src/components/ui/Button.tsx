import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "soft" | "onDark" | "ai" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-strong hover:shadow-card active:translate-y-px",
  secondary:
    "bg-surface text-ink border border-line shadow-xs hover:bg-bg-soft hover:border-line-strong",
  ghost: "bg-transparent text-ink-secondary hover:text-ink hover:bg-bg-soft",
  soft: "bg-brand-soft text-brand-strong hover:bg-brand-soft/80",
  accent: "bg-accent text-white shadow-sm hover:brightness-95 hover:shadow-card",
  onDark:
    "border border-white/20 bg-white text-ink shadow-md hover:bg-bg-soft",
  ai: "bg-ai-soft text-ai hover:brightness-[0.98]",
  danger: "bg-danger-soft text-danger hover:brightness-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-full",
  md: "h-11 px-5 text-[15px] rounded-full",
  lg: "h-12 px-6 text-base rounded-full",
  icon: "h-10 w-10 rounded-full p-0",
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
