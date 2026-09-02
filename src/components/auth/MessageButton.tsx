"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n/locale";
import {
  canMessageCommunity,
  canUseProfessionalApplyFlow,
  messageSignInHref,
} from "@/lib/permissions";

/**
 * Opens messaging with a community.
 * Guests must sign in first, messaging is never available anonymously.
 */
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

  const t = useT();  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        {children}
      </Button>
    );
  }

  if (!canMessageCommunity(user)) {
    return (
      <Button
        href={messageSignInHref(residenceId)}
        variant={variant}
        size={size}
        className={className}
      >
        {t("Sign in to message")}
      </Button>
    );
  }

  const href = canUseProfessionalApplyFlow(user)
    ? residenceId
      ? `/professional/messages?community=${encodeURIComponent(residenceId)}`
      : "/professional/messages"
    : residenceId
      ? `/family/dashboard?view=assistance&community=${encodeURIComponent(residenceId)}`
      : "/family/dashboard?view=assistance";

  return (
    <Button href={href} variant={variant} size={size} className={className}>
      {children}
    </Button>
  );
}
