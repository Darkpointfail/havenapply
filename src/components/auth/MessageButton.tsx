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

  if (!ready) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        {children}
      </Button>
    );
  }

  if (!user) {
    const next = residenceId
      ? `/family/messages?community=${encodeURIComponent(residenceId)}`
      : "/family/messages";
    return (
      <Button
        href={`/sign-in?next=${encodeURIComponent(next)}`}
        variant={variant}
        size={size}
        className={className}
      >
        Sign in to message
      </Button>
    );
  }

  const href =
    user.role === "professional"
      ? residenceId
        ? `/professional/messages?community=${encodeURIComponent(residenceId)}`
        : "/professional/messages"
      : residenceId
        ? `/family/messages?community=${encodeURIComponent(residenceId)}`
        : "/family/messages";

  return (
    <Button href={href} variant={variant} size={size} className={className}>
      {children}
    </Button>
  );
}
