/** Client-side analytics helpers. Never send IP, passwords, or PII. */

export const ANALYTICS_CONSENT_KEY = "haven_analytics_consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  } catch {
    /* ignore */
  }
  return false;
}

export function setAnalyticsConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, granted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * GA4 event after successful site-password unlock.
 * Only fires when analytics consent is granted.
 */
export function trackPasswordAccessGranted(params: {
  device_category: string;
  entry_page: string;
}) {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", "password_access_granted", {
    device_category: params.device_category,
    entry_page: params.entry_page.slice(0, 200),
    access_method: "site_password",
  });
}

export function coarseDeviceCategoryFromUa(ua: string): "mobile" | "tablet" | "desktop" | "unknown" {
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android.*Mobile/i.test(ua)) return "mobile";
  if (!ua) return "unknown";
  return "desktop";
}
