import { describe, expect, test } from "vitest";
import { hasEmailTransport, passwordResetEmail, verificationEmail } from "@/lib/email/mailer";

describe("mailer", () => {
  test("hasEmailTransport is false with no provider configured", () => {
    expect(hasEmailTransport()).toBe(false);
  });

  test("passwordResetEmail links to /reset-password with the token", () => {
    const msg = passwordResetEmail("famille@example.com", "abc123");
    expect(msg.to).toBe("famille@example.com");
    expect(msg.text).toContain("/reset-password?token=abc123");
  });

  test("verificationEmail links to /verify with the token", () => {
    const msg = verificationEmail("residence@example.com", "xyz789");
    expect(msg.to).toBe("residence@example.com");
    expect(msg.text).toContain("/verify?token=xyz789");
  });
});
