"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";

export function MessageButton({
  className,
  size = "lg",
  residenceId,
  children = "Message",
  variant = "secondary",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  residenceId?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "soft";
}) {
  const { user, ready } = useAuth();
  const next = residenceId
    ? `/family/messages?community=${residenceId}`
    : "/family/messages";
  const href =
    ready && user?.role === "family"
      ? next
      : `/sign-in?next=${encodeURIComponent(next)}`;

  return (
    <Button href={href} variant={variant} size={size} className={className}>
      {children}
    </Button>
  );
}
