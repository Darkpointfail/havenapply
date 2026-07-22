"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Navigates to the apply review page (community details + AI fit).
 * That page requires a complete dossier before showing the review / send flow.
 */
export function ApplyButton({
  residenceId,
  size = "lg",
  className,
  children = "Apply",
  variant = "primary",
}: {
  residenceId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "soft";
  /** @deprecated ignored — apply always goes to the review page */
  inline?: boolean;
  /** @deprecated ignored */
  autoOpen?: boolean;
}) {
  if (!residenceId) {
    return (
      <Button href="/family/find-communities" size={size} variant={variant} className={className}>
        {children}
      </Button>
    );
  }

  return (
    <Button
      href={`/family/apply/${residenceId}`}
      size={size}
      variant={variant}
      className={cn(className)}
    >
      {children}
    </Button>
  );
}
