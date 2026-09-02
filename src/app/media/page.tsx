import type { Metadata } from "next";
import { Suspense } from "react";
import { MediaPressRoom } from "@/components/marketing/MediaPressRoom";
import { press, pressAssets, type PressLocale } from "@/data/press";

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

  return {
    title: {
      absolute: meta.title,
    },
    description: meta.description,
    alternates: {
      canonical: locale === "en" ? "/media?lang=en" : "/media",
      languages: {
        fr: "/media",
        en: "/media?lang=en",
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      locale: locale === "en" ? "en_CA" : "fr_CA",
      url: locale === "en" ? "/media?lang=en" : "/media",
      images: [
        {
          url: pressAssets.ogImage,
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
      images: [pressAssets.ogImage],
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
