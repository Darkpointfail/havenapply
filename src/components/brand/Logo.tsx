import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  markOnly = false,
  light = false,
  href = "/",
  size = "md",
}: {
  className?: string;
  markOnly?: boolean;
  light?: boolean;
  href?: string;
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  // Cropped assets: height = visible wordmark (no empty PNG padding)
  const heightClass = large ? "h-[2.7rem] md:h-[3.05rem]" : "h-8 md:h-9";
  const markSize = large ? "h-[2.7rem] w-[2.7rem]" : "h-8 w-8";
  const maxWidth = large ? "292px" : "215px";

  const imageClass = cn(
    "w-auto object-contain object-left",
    heightClass,
    light && "brightness-0 invert",
  );

  const imageStyle = {
    width: "auto" as const,
    maxWidth,
  };

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 -translate-y-1.5 items-center leading-none transition-opacity hover:opacity-90 -ml-0.5",
        className,
      )}
      aria-label="HavenApply home"
    >
      {markOnly ? (
        <span className={cn("relative overflow-hidden", markSize, light && "brightness-0 invert")}>
          {!light && (
            <>
              <Image
                src="/brand/havenapply-logo.png"
                alt=""
                width={875}
                height={199}
                className="absolute left-0 top-1/2 h-[140%] w-auto max-w-none -translate-y-1/2 dark:hidden"
                priority
              />
              <Image
                src="/brand/havenapply-logo-dark.png"
                alt=""
                width={875}
                height={199}
                className="absolute left-0 top-1/2 hidden h-[140%] w-auto max-w-none -translate-y-1/2 dark:block"
                priority
              />
            </>
          )}
          {light && (
            <Image
              src="/brand/havenapply-logo.png"
              alt=""
              width={875}
              height={199}
              className="absolute left-0 top-1/2 h-[140%] w-auto max-w-none -translate-y-1/2"
              priority
            />
          )}
        </span>
      ) : light ? (
        <Image
          src="/brand/havenapply-logo.png"
          alt="HavenApply"
          width={875}
          height={199}
          priority
          sizes="(max-width: 768px) 320px, 420px"
          className={imageClass}
          style={imageStyle}
        />
      ) : (
        <>
          <Image
            src="/brand/havenapply-logo.png"
            alt="HavenApply"
            width={875}
            height={199}
            priority
            sizes="(max-width: 768px) 320px, 420px"
            className={cn(imageClass, "dark:hidden")}
            style={imageStyle}
          />
          <Image
            src="/brand/havenapply-logo-dark.png"
            alt="HavenApply"
            width={875}
            height={199}
            priority
            sizes="(max-width: 768px) 320px, 420px"
            className={cn(imageClass, "hidden dark:block")}
            style={imageStyle}
          />
        </>
      )}
    </Link>
  );
}
