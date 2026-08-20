import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Front-facing MacBook-style device frame:
 * thin black bezels, centered camera notch, silver aluminum base with finger pull.
 */
export function LaptopFrame({
  children,
  className,
  screenClassName,
}: {
  children: ReactNode;
  className?: string;
  screenClassName?: string;
}) {
  return (
    <div
      className={cn(
        "laptop-frame animate-float relative mx-auto w-full max-w-[560px]",
        className,
      )}
    >
      {/* Soft ground shadow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-4 left-[10%] right-[10%] h-7 rounded-[100%] bg-[rgba(15,20,25,0.22)] blur-2xl"
      />

      {/* Lid */}
      <div
        className="relative overflow-hidden rounded-[16px] p-[8px] sm:rounded-[20px] sm:p-[10px]"
        style={{
          background:
            "linear-gradient(180deg, #2f2f31 0%, #141416 55%, #0a0a0b 100%)",
          boxShadow:
            "0 30px 60px -28px rgba(15, 20, 25, 0.5), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.55)",
        }}
      >
        {/* Top specular */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />

        {/* Camera notch */}
        <div
          aria-hidden
          className="absolute left-1/2 top-0 z-20 flex h-[12px] w-[70px] -translate-x-1/2 items-start justify-center rounded-b-[10px] bg-[#050505] sm:h-[14px] sm:w-[82px]"
          style={{
            boxShadow: "0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <span
            className="mt-[3px] h-[5px] w-[5px] rounded-full sm:mt-[3.5px] sm:h-[5.5px] sm:w-[5.5px]"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #4a4a52 0%, #1c1c22 55%, #0d0d10 100%)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
            }}
          />
        </div>

        {/* Display */}
        <div
          className={cn(
            "relative min-h-[220px] overflow-hidden rounded-[8px] bg-white sm:rounded-[11px]",
            screenClassName,
          )}
        >
          {children}
        </div>
      </div>

      {/* Slim hinge */}
      <div
        aria-hidden
        className="relative z-[1] mx-auto -mt-px h-[6px] w-[97.5%]"
        style={{
          background:
            "linear-gradient(180deg, #7d7d81 0%, #c5c5c9 40%, #a6a6aa 100%)",
          clipPath: "polygon(1.2% 0, 98.8% 0, 100% 100%, 0 100%)",
        }}
      />

      {/* Aluminum chassis front */}
      <div
        aria-hidden
        className="relative mx-auto h-[15px] w-full rounded-b-[11px] sm:h-[17px] sm:rounded-b-[13px]"
        style={{
          background:
            "linear-gradient(180deg, #e3e3e6 0%, #c9c9cd 32%, #b0b0b4 68%, #9b9b9f 100%)",
          boxShadow:
            "0 12px 24px -14px rgba(15, 20, 25, 0.45), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      >
        {/* Finger pull indentation */}
        <div
          className="absolute left-1/2 top-[3px] h-[5px] w-[48px] -translate-x-1/2 rounded-full sm:w-[56px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(70,70,74,0.28) 0%, rgba(255,255,255,0.18) 100%)",
            boxShadow:
              "inset 0 1px 2px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.35)",
          }}
        />

        {/* Feet */}
        <span
          className="absolute -bottom-[3px] left-[12%] h-[3.5px] w-[24px] rounded-b-full sm:w-[28px]"
          style={{
            background: "linear-gradient(180deg, #5a5a5e, #3a3a3e)",
          }}
        />
        <span
          className="absolute -bottom-[3px] right-[12%] h-[3.5px] w-[24px] rounded-b-full sm:w-[28px]"
          style={{
            background: "linear-gradient(180deg, #5a5a5e, #3a3a3e)",
          }}
        />
      </div>
    </div>
  );
}
