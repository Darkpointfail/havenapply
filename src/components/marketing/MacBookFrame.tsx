import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./macbook-frame.css";

type MacBookFrameProps = {
  children?: ReactNode;
  className?: string;
  /** Accessible label for the decorative device chrome */
  label?: string;
};

/**
 * Front-facing MacBook Pro 16" mockup (pure HTML/CSS).
 * Put screenshots, iframes, or UI demos inside `.laptop-screen` via `children`.
 */
export function MacBookFrame({
  children,
  className,
  label = "Laptop preview",
}: MacBookFrameProps) {
  return (
    <div className={cn("laptop", className)} aria-label={label}>
      <div className="laptop-display">
        <div className="laptop-bezel">
          <div className="laptop-notch" aria-hidden>
            <span className="laptop-camera" />
          </div>
          <div className="laptop-screen">{children}</div>
        </div>
      </div>

      <div className="laptop-base" aria-hidden>
        <span className="laptop-foot laptop-foot--left" />
        <span className="laptop-foot laptop-foot--right" />
      </div>
    </div>
  );
}
