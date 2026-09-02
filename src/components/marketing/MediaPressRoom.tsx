"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import {
  press,
  pressAssets,
  showTodo,
  type PressLocale,
} from "@/data/press";
import { useLocale } from "@/lib/i18n/locale";
import "./media-press.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

function resolvePressLocale(param: string | null, siteLocale: string): PressLocale {
  if (param === "en" || param === "fr") return param;
  return siteLocale === "en" ? "en" : "fr";
}

/** Surligne les passages entre crochets (éléments à compléter). */
function withPlaceholders(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? (
      <span key={i} className="pr-todo-mark">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function MediaPressRoom() {
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const didMountLang = useRef(false);

  const langParam = searchParams.get("lang");
  const activeLocale = useMemo(
    () => resolvePressLocale(langParam, locale),
    [langParam, locale],
  );
  const copy = press[activeLocale];

  useEffect(() => {
    if (!didMountLang.current) {
      didMountLang.current = true;
      if (langParam === "en" || langParam === "fr") {
        setLocale(langParam);
      }
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (locale === "en") params.set("lang", "en");
    else params.delete("lang");
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    if (next !== current) router.replace(next, { scroll: false });
  }, [locale, langParam, pathname, router, searchParams, setLocale]);

  const setLang = (next: PressLocale) => {
    setLocale(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "en") params.set("lang", "en");
    else params.delete("lang");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const releaseHref = `#${copy.anchors.release}`;
  const numbersHref = `#${copy.anchors.numbers}`;
  const brandHref = `#${copy.anchors.brand}`;

  return (
    <div className={`pr ${sourceSerif.variable} ${publicSans.variable}`}>
      <header className="pr-header">
        <div className="pr-wrap pr-header-inner">
          <Link href="/" className="pr-brand" aria-label={copy.header.brand}>
            <span className="pr-brand-mark" aria-hidden>
              <Image
                src={pressAssets.logo}
                alt=""
                width={875}
                height={199}
                priority
                unoptimized
              />
            </span>
            <span className="pr-brand-name">{copy.header.brand}</span>
            <span className="pr-brand-label">{copy.header.label}</span>
          </Link>
          <div className="pr-header-right">
            <div className="pr-lang" role="group" aria-label={copy.header.langAria}>
              <button
                type="button"
                aria-pressed={activeLocale === "fr"}
                onClick={() => setLang("fr")}
              >
                {copy.header.langFr}
              </button>
              <span className="pr-lang-sep" aria-hidden>
                /
              </span>
              <button
                type="button"
                aria-pressed={activeLocale === "en"}
                onClick={() => setLang("en")}
              >
                {copy.header.langEn}
              </button>
            </div>
            <a className="pr-header-mail" href={pressAssets.mailto}>
              {copy.header.email}
            </a>
          </div>
        </div>
      </header>

      {showTodo ? (
        <aside className="pr-todo" aria-label={copy.todo.label}>
          <div className="pr-wrap pr-todo-inner">
            <span className="pr-todo-label">{copy.todo.label}</span>
            <p className="pr-todo-body">{copy.todo.body}</p>
          </div>
        </aside>
      ) : null}

      <section className="pr-section" aria-labelledby="pr-hero-title">
        <div className="pr-wrap pr-hero">
          <div className="pr-hero-copy">
            <p className="pr-label">{copy.hero.eyebrow}</p>
            <h1 id="pr-hero-title">{copy.hero.title}</h1>
            <p className="pr-hero-lead">{copy.hero.lead}</p>
            <div className="pr-hero-actions">
              <a className="pr-btn" href={releaseHref}>
                {copy.hero.ctaRead}
              </a>
              <a className="pr-text-link" href={numbersHref}>
                {copy.hero.ctaNumbers}
              </a>
              <a className="pr-text-link" href={brandHref}>
                {copy.hero.ctaKit}
              </a>
              <a className="pr-text-link" href={pressAssets.mailto}>
                {copy.hero.ctaInterview}
              </a>
            </div>
          </div>
          <div className="pr-hero-media">
            <div className="pr-browser">
              <div className="pr-browser-bar" aria-hidden>
                <div className="pr-browser-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="pr-browser-url">{pressAssets.siteHost}</div>
              </div>
              <div className="pr-browser-viewport">
                {/* eslint-disable-next-line @next/next/no-img-element -- capture must drive its own height for scroll animation */}
                <img
                  className="pr-browser-scroll"
                  src={pressAssets.homepageCapture}
                  alt={copy.hero.captureAlt}
                />
              </div>
            </div>
            <p className="pr-capture-caption">{copy.hero.captureCaption}</p>
          </div>
        </div>
      </section>

      <section
        id={copy.anchors.release}
        className="pr-section pr-section--band pr-release"
        aria-labelledby="pr-release-title"
      >
        <div className="pr-wrap">
          <div className="pr-release-meta">
            <p className="pr-label">{copy.release.sectionLabel}</p>
            <p className="pr-release-meta-right">
              {withPlaceholders(copy.release.forImmediate)}
            </p>
          </div>
          <article className="pr-release-col">
            <h2 id="pr-release-title">{copy.release.title}</h2>
            <p className="pr-release-dek">{withPlaceholders(copy.release.dek)}</p>
            <hr className="pr-release-rule" />
            <div className="pr-release-body">
              <p>
                <span className="pr-dateline">
                  {withPlaceholders(copy.release.dateline)}{" "}
                </span>
                {withPlaceholders(copy.release.paragraphs[0])}
              </p>
              <p>{withPlaceholders(copy.release.paragraphs[1])}</p>
              <p>{withPlaceholders(copy.release.paragraphs[2])}</p>
              <figure className="pr-quote">
                <blockquote>{copy.release.quote.text}</blockquote>
                <figcaption>{withPlaceholders(copy.release.quote.attribution)}</figcaption>
              </figure>
              <p>{withPlaceholders(copy.release.paragraphs[3])}</p>
              <p>{withPlaceholders(copy.release.paragraphs[4])}</p>
            </div>
            <div className="pr-about">
              <p className="pr-label">{copy.release.about.label}</p>
              <p className="pr-about-body">{copy.release.about.body}</p>
              <p className="pr-about-contact">{copy.release.about.contact}</p>
              <p className="pr-end-mark">{copy.release.endMark}</p>
            </div>
          </article>
        </div>
      </section>

      <section
        id={copy.anchors.numbers}
        className="pr-section pr-numbers"
        aria-labelledby="pr-numbers-label"
      >
        <div className="pr-wrap">
          <p className="pr-label" id="pr-numbers-label">
            {copy.numbers.sectionLabel}
          </p>
          <div className="pr-numbers-grid">
            {copy.numbers.items.map((item) => (
              <div className="pr-number" key={item.value}>
                <p
                  className={
                    item.accent
                      ? "pr-number-value pr-number-value--accent"
                      : "pr-number-value"
                  }
                >
                  {item.value}
                </p>
                <p className="pr-number-desc">{item.description}</p>
                <p className="pr-number-source">{item.source}</p>
              </div>
            ))}
          </div>
          <p className="pr-numbers-foot">{withPlaceholders(copy.numbers.footnote)}</p>
        </div>
      </section>

      <section
        id={copy.anchors.brand}
        className="pr-section pr-section--band pr-kit"
        aria-labelledby="pr-kit-title"
      >
        <div className="pr-wrap">
          <p className="pr-label">{copy.kit.sectionLabel}</p>
          <h2 id="pr-kit-title">{copy.kit.title}</h2>
          <div className="pr-kit-grid">
            <div>
              <div className="pr-logo-tiles">
                <div className="pr-logo-tile pr-logo-tile--light">
                  <Image
                    src={pressAssets.logo}
                    alt={copy.kit.logoLightAlt}
                    width={200}
                    height={46}
                    unoptimized
                  />
                </div>
                <div className="pr-logo-tile pr-logo-tile--dark">
                  <span className="pr-logo-dark-ph">
                    {withPlaceholders(copy.kit.logoDarkPlaceholder)}
                  </span>
                </div>
              </div>
              <p className="pr-kit-usage">{copy.kit.usage}</p>
              <a
                className="pr-text-link"
                href={pressAssets.logo}
                download="havenapply-logo.png"
              >
                {copy.kit.download}
              </a>
            </div>
            <div className="pr-kit-panel">
              <div className="pr-kit-block">
                <h3>{copy.kit.colorsLabel}</h3>
                {copy.kit.colors.map((c) => (
                  <div className="pr-swatch-row" key={c.hex}>
                    <span
                      className="pr-swatch"
                      style={{ background: c.hex }}
                      aria-hidden
                    />
                    <span>{c.name}</span>
                    <span className="pr-swatch-hex">{c.hex}</span>
                  </div>
                ))}
              </div>
              <div className="pr-kit-block">
                <h3>{copy.kit.typeLabel}</h3>
                <p className="pr-type-serif">{copy.kit.serifName}</p>
                <p className="pr-type-cap">{copy.kit.serifCaption}</p>
                <p className="pr-type-sans">{copy.kit.sansName}</p>
                <p className="pr-type-cap">{copy.kit.sansCaption}</p>
              </div>
              <div className="pr-kit-block">
                <h3>{copy.kit.brandLabel}</h3>
                <p className="pr-brand-rule">{copy.kit.brandRule}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pr-section pr-contact" aria-labelledby="pr-contact-title">
        <div className="pr-wrap pr-contact-grid">
          <div>
            <p className="pr-label">{copy.contact.sectionLabel}</p>
            <h2 id="pr-contact-title">{copy.contact.title}</h2>
            <p className="pr-contact-body">{copy.contact.body}</p>
            <a className="pr-btn" href={pressAssets.mailto}>
              {copy.contact.cta}
            </a>
          </div>
          <dl className="pr-defs">
            {copy.contact.defs.map((row) => (
              <div className="pr-def" key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  {row.value.includes("@") ? (
                    <a href={`mailto:${row.value}`}>{row.value}</a>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="pr-footer">
        <div className="pr-wrap pr-footer-inner">
          <div className="pr-footer-left">
            <Image
              src={pressAssets.logo}
              alt={copy.header.brand}
              width={110}
              height={22}
              unoptimized
            />
            <p className="pr-footer-meta">{withPlaceholders(copy.footer.updated)}</p>
          </div>
          <a className="pr-text-link" href={pressAssets.siteUrl} rel="noopener noreferrer">
            {copy.footer.siteLink}
          </a>
        </div>
      </footer>
    </div>
  );
}
