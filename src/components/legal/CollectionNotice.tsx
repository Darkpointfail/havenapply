import Link from "next/link";
import {
  COLLECTION_NOTICE_ACCOUNT,
  COLLECTION_NOTICE_PROFILE,
} from "@/content/legal/privacy-fr";

type Variant = "account" | "profile";

const COPY: Record<Variant, typeof COLLECTION_NOTICE_ACCOUNT> = {
  account: COLLECTION_NOTICE_ACCOUNT,
  profile: COLLECTION_NOTICE_PROFILE,
};

/**
 * Avis de collecte court, visible avant/pendant la collecte (Loi 25).
 */
export function CollectionNotice({
  variant,
  className = "",
}: {
  variant: Variant;
  className?: string;
}) {
  const notice = COPY[variant];
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
          href="/confidentialite"
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: "#0A6F63" }}
        >
          Politique de confidentialité
        </Link>
        <span style={{ color: "#5c6f66" }}> · version {notice.version}</span>
      </p>
    </aside>
  );
}
