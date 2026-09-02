import { randomBytes } from "crypto";

/** Crockford base32 without confusing characters (I, L, O, U). */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Readable, non-guessable application number: HA-XXXXXXXX (8 chars ≈ 40 bits).
 */
export function generateApplicationPublicRef(): string {
  const bytes = randomBytes(8);
  let value = "";
  for (let i = 0; i < 8; i++) {
    value += ALPHABET[bytes[i]! % 32];
  }
  return `HA-${value}`;
}
