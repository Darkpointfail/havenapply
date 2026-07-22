import { cn } from "@/lib/utils";

export function AuthAlert({
  children,
  tone = "error",
  className,
}: {
  children: React.ReactNode;
  tone?: "error" | "success" | "info";
  className?: string;
}) {
  const tones = {
    error: "border-danger/25 bg-danger-soft text-danger",
    success: "border-success/25 bg-success-soft text-success",
    info: "border-info/25 bg-info-soft text-info",
  };

  return (
    <div
      role="alert"
      className={cn("rounded-xl border px-3.5 py-3 text-sm leading-relaxed", tones[tone], className)}
    >
      {children}
    </div>
  );
}

export function AuthField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export const authInputClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-ink shadow-xs outline-none transition placeholder:text-ink-faint focus:border-brand focus:shadow-sm";

export function DemoInbox({
  email,
  confirmHref,
  resetHref,
}: {
  email: string;
  confirmHref?: string | null;
  resetHref?: string | null;
}) {
  if (!confirmHref && !resetHref) return null;

  return (
    <div className="mt-4 rounded-xl border border-dashed border-line bg-bg-soft/80 p-4 text-left text-sm">
      <p className="font-medium text-ink">Demo inbox · {email}</p>
      <p className="mt-1 text-ink-muted">
        No email server in this prototype, use the link below as if it arrived in your inbox.
      </p>
      <ul className="mt-3 space-y-2">
        {confirmHref ? (
          <li>
            <a href={confirmHref} className="font-medium text-brand underline-offset-2 hover:underline">
              Confirm your email
            </a>
          </li>
        ) : null}
        {resetHref ? (
          <li>
            <a href={resetHref} className="font-medium text-brand underline-offset-2 hover:underline">
              Reset your password
            </a>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
