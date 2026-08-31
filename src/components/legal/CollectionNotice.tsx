"use client";

import Link from "next/link";
import {
  COLLECTION_NOTICE_ACCOUNT,
  COLLECTION_NOTICE_PROFILE,
} from "@/content/legal/privacy-fr";
import { getCollectionNotice, privacyPath } from "@/content/legal";
import { useLocale } from "@/lib/i18n/locale";

type Variant = "account" | "profile";

/**
 * Short collection notice shown before/during collection (Law 25).
 * Follows the active UI locale (FR/EN).
 */
export function CollectionNotice({
  variant,
  className = "",
}: {
  variant: Variant;
  className?: string;
}) {
  const { locale } = useLocale();
  const notice = getCollectionNotice(locale, variant);
  const privacyLabel =
    locale === "en" ? "Privacy policy" : "Politique de confidentialité";

  return (
    <aside
      className={className}
      role="note"
      aria-label={notice.title}
      style={{
        border: "1px solid rgba(15, 61, 46, 0.12)",
        background: "rgba(15, 61, 46, 0.04)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#5c6f66",
        }}
      >
        {notice.title}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "#2a3832",
        }}
      >
        {notice.body}{" "}
        <Link
          href={privacyPath(locale)}
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: "#0A6F63" }}
        >
          {privacyLabel}
        </Link>
        <span style={{ color: "#5c6f66" }}>
          {" "}
          · {locale === "en" ? "version" : "version"} {notice.version}
        </span>
      </p>
    </aside>
  );
}

// Keep type exports reachable for tests / docs
export type CollectionNoticeSource = typeof COLLECTION_NOTICE_ACCOUNT | typeof COLLECTION_NOTICE_PROFILE;
