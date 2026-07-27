"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  applySignInHref,
  canUseFamilyApplyFlow,
  canUseProfessionalApplyFlow,
} from "@/lib/permissions";

/**
 * Navigates to the role-appropriate apply flow.
 * Guests must sign in first, Apply is never available anonymously.
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
  /** @deprecated ignored, apply always goes to the review page */
  inline?: boolean;
  /** @deprecated ignored */
  autoOpen?: boolean;
}) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <Button size={size} variant={variant} className={cn(className)} disabled>
        {children}
      </Button>
    );
  }

  if (canUseProfessionalApplyFlow(user)) {
    const href = residenceId
      ? `/professional/apply/${residenceId}`
      : "/professional/communities";
    return (
      <Button href={href} size={size} variant={variant} className={cn(className)}>
        {children}
      </Button>
    );
  }

  if (!canUseFamilyApplyFlow(user)) {
    return (
      <Button
        href={applySignInHref(residenceId)}
        size={size}
        variant={variant}
        className={className}
      >
        Sign in to apply
      </Button>
    );
  }

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
