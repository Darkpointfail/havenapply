"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";

export function ApplyButton({
  residenceId,
  size = "lg",
  className,
  children = "Apply now",
  variant = "primary",
}: {
  residenceId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "soft";
}) {
  const { user, ready } = useAuth();
  const applyPath = residenceId ? `/apply?residence=${residenceId}` : "/apply";
  const href =
    ready && user?.role === "family"
      ? applyPath
      : `/get-started?next=${encodeURIComponent(applyPath)}`;

  return (
    <Button href={href} size={size} variant={variant} className={className}>
      {children}
    </Button>
  );
}
