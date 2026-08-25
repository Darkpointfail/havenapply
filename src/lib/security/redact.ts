/** Avoid logging secrets or obvious PII. */

const SECRET_KEY =
  /pass(word)?|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|service[_-]?role/i;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function redactString(input: string): string {
  return input.replace(EMAIL_RE, "[redacted-email]");
}

export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => redactForLog(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = redactForLog(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

export function safeConsoleError(label: string, err: unknown) {
  const message =
    err instanceof Error ? redactString(err.message) : redactForLog(err);
  console.error(label, message);
}
