"use client";

import { Button } from "@/components/ui/Button";

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
  const href = residenceId
    ? `/family/messages?community=${residenceId}`
    : "/family/messages";

  return (
    <Button href={href} variant={variant} size={size} className={className}>
      {children}
    </Button>
  );
}
