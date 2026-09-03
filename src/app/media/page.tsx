import type { Metadata } from "next";
import { Suspense } from "react";
import { MediaPressRoom } from "@/components/marketing/MediaPressRoom";
import {
  PRESS_SITE_ORIGIN,
  press,
  pressAssets,
  type PressLocale,
} from "@/data/press";

type MediaSearchParams = Promise<{ lang?: string | string[] }>;

function localeFromSearchParams(lang: string | string[] | undefined): PressLocale {
  const value = Array.isArray(lang) ? lang[0] : lang;
  return value === "en" ? "en" : "fr";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: MediaSearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const locale = localeFromSearchParams(params.lang);
  const meta = press[locale].meta;
  const canonical =
    locale === "en" ? pressAssets.mediaUrlEn : pressAssets.mediaUrl;
  const ogImage = `${PRESS_SITE_ORIGIN}${pressAssets.ogImage}`;

  return {
    title: {
      absolute: meta.title,
    },
    description: meta.description,
    alternates: {
      canonical,
      languages: {
        fr: pressAssets.mediaUrl,
        en: pressAssets.mediaUrlEn,
        "x-default": pressAssets.mediaUrl,
      },
    },
    openGraph: {
      type: "website",
      siteName: "HavenApply",
      title: meta.title,
      description: meta.description,
      locale: locale === "en" ? "en_CA" : "fr_CA",
      alternateLocale: locale === "en" ? ["fr_CA"] : ["en_CA"],
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: meta.ogAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function MediaPage() {
  return (
    <Suspense fallback={null}>
      <MediaPressRoom />
    </Suspense>
  );
}
