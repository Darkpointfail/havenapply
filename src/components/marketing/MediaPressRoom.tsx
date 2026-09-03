"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import {
  press,
  pressAssets,
  type PressBlock,
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

function PressBlocks({ blocks }: { blocks: PressBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "p":
            return <p key={index}>{block.text}</p>;
          case "h3":
            return <h3 key={index}>{block.text}</h3>;
          case "ul":
            return (
              <ul key={index} className="pr-list">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <figure key={index} className="pr-quote">
                <blockquote>{block.text}</blockquote>
                <figcaption>{block.attribution}</figcaption>
              </figure>
            );
          case "link":
            return (
              <p key={index} className="pr-ext-link">
                <a
                  className="pr-text-link"
                  href={block.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {block.label}
                </a>
              </p>
            );
          case "meta":
            return (
              <dl key={index} className="pr-release-meta-list">
                {block.rows.map((row) => (
                  <div className="pr-release-meta-row" key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>
                      {row.href ? (
                        <a href={row.href} rel="noopener noreferrer">
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

function interviewMailto(locale: PressLocale) {
  const subject =
    locale === "en"
      ? "Interview request — HavenApply"
      : "Demande d'entrevue — HavenApply";
  return `mailto:hello@havenapply.com?subject=${encodeURIComponent(subject)}`;
}

function demoMailto(locale: PressLocale) {
  const subject =
    locale === "en"
      ? "Demo request — HavenApply"
      : "Demande de démonstration — HavenApply";
  return `mailto:hello@havenapply.com?subject=${encodeURIComponent(subject)}`;
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

  return (
    <div className={`pr ${sourceSerif.variable} ${publicSans.variable}`}>
      <header className="pr-header">
        <div className="pr-wrap pr-header-inner">
          <Link href="/" className="pr-brand" aria-label={copy.header.brand}>
            <span className="pr-brand-mark" aria-hidden>
              <Image
                src={pressAssets.logoPng}
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

      <section className="pr-section" aria-labelledby="pr-hero-title">
        <div className="pr-wrap pr-hero">
          <div className="pr-hero-copy">
            <p className="pr-label">{copy.hero.eyebrow}</p>
            <h1 id="pr-hero-title">{copy.hero.title}</h1>
            <p className="pr-hero-lead">{copy.hero.lead}</p>
            <div className="pr-hero-actions">
              <a className="pr-btn" href={`#${copy.anchors.release}`}>
                {copy.hero.ctaRelease}
              </a>
              <a className="pr-text-link" href={`#${copy.anchors.feature}`}>
                {copy.hero.ctaFeature}
              </a>
              <a className="pr-text-link" href={`#${copy.anchors.facts}`}>
                {copy.hero.ctaFacts}
              </a>
              <a className="pr-text-link" href={interviewMailto(activeLocale)}>
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
                {/* eslint-disable-next-line @next/next/no-img-element -- capture height drives scroll animation */}
                <img
                  className="pr-browser-scroll"
                  src={pressAssets.homepageCapture}
                  alt={copy.hero.captureAlt}
                />
              </div>
            </div>
            <p className="pr-capture-caption">
              {copy.hero.captureCaption}{" "}
              <span className="pr-credit">{copy.hero.captureCredit}</span>
            </p>
          </div>
        </div>
      </section>

      <section
        id={copy.anchors.release}
        className="pr-section pr-section--band pr-release"
        aria-labelledby="pr-release-title"
      >
        <div className="pr-wrap">
          <p className="pr-label pr-release-kicker">{copy.release.sectionLabel}</p>
          <article className="pr-release-col">
            <h2 id="pr-release-title">{copy.release.title}</h2>
            <p className="pr-release-dek">{copy.release.dek}</p>
            <hr className="pr-release-rule" />
            <div className="pr-release-body">
              <p>
                <span className="pr-dateline">{copy.release.dateline} </span>
                {copy.release.lead}
              </p>
              <PressBlocks blocks={copy.release.blocks} />
            </div>
            <p className="pr-end-mark">{copy.release.endMark}</p>
          </article>
        </div>
      </section>

      <section
        id={copy.anchors.feature}
        className="pr-section pr-feature"
        aria-labelledby="pr-feature-title"
      >
        <div className="pr-wrap">
          <p className="pr-label">{copy.feature.sectionLabel}</p>
          <article className="pr-release-col">
            <h2 id="pr-feature-title">{copy.feature.title}</h2>
            <div className="pr-release-body">
              <PressBlocks blocks={copy.feature.blocks} />
            </div>
          </article>
        </div>
      </section>

      <section
        id={copy.anchors.facts}
        className="pr-section pr-section--band pr-facts"
        aria-labelledby="pr-facts-title"
      >
        <div className="pr-wrap">
          <p className="pr-label">{copy.facts.sectionLabel}</p>
          <h2 id="pr-facts-title">{copy.facts.title}</h2>
          <div className="pr-facts-grid">
            {copy.facts.items.map((item) => (
              <article className="pr-fact" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                {item.sourceHref && item.sourceLabel ? (
                  <a
                    className="pr-fact-source"
                    href={item.sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.sourceLabel}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id={copy.anchors.ai}
        className="pr-section pr-ai"
        aria-labelledby="pr-ai-title"
      >
        <div className="pr-wrap">
          <p className="pr-label">{copy.ai.sectionLabel}</p>
          <h2 id="pr-ai-title">{copy.ai.title}</h2>
          <p className="pr-brand-line">{copy.ai.brandLine}</p>
          <div className="pr-ai-grid">
            <div className="pr-ai-col">
              <h3>{copy.ai.canTitle}</h3>
              <ul className="pr-list">
                {copy.ai.can.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="pr-ai-col pr-ai-col--limits">
              <h3>{copy.ai.cannotTitle}</h3>
              <ul className="pr-list">
                {copy.ai.cannot.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        id={copy.anchors.faq}
        className="pr-section pr-section--band pr-faq"
        aria-labelledby="pr-faq-title"
      >
        <div className="pr-wrap">
          <p className="pr-label">{copy.faq.sectionLabel}</p>
          <h2 id="pr-faq-title">{copy.faq.title}</h2>
          <div className="pr-faq-list">
            {copy.faq.items.map((item) => (
              <details key={item.q} className="pr-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id={copy.anchors.brand}
        className="pr-section pr-kit"
        aria-labelledby="pr-kit-title"
      >
        <div className="pr-wrap">
          <p className="pr-label">{copy.kit.sectionLabel}</p>
          <h2 id="pr-kit-title">{copy.kit.title}</h2>
          <p className="pr-kit-brandline">
            <span className="pr-label">{copy.kit.brandLineLabel}</span>
            <span className="pr-brand-line">{copy.kit.brandLine}</span>
          </p>
          <div className="pr-kit-grid">
            <div>
              <div className="pr-logo-tiles">
                <div className="pr-logo-tile pr-logo-tile--light">
                  <Image
                    src={pressAssets.logoPng}
                    alt={copy.kit.logoLightAlt}
                    width={200}
                    height={46}
                    unoptimized
                  />
                </div>
              </div>
              <p className="pr-kit-usage">{copy.kit.usage}</p>
              <div className="pr-downloads">
                <h3>{copy.kit.downloadsLabel}</h3>
                <ul className="pr-download-list">
                  {copy.kit.downloads.map((file) => (
                    <li key={file.id}>
                      <a
                        className="pr-text-link"
                        href={file.href}
                        download={file.filename}
                      >
                        {file.label}
                      </a>
                      <span className="pr-download-meta">
                        {file.caption} · {file.credit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
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

      <section
        id={copy.anchors.contact}
        className="pr-section pr-section--band pr-contact"
        aria-labelledby="pr-contact-title"
      >
        <div className="pr-wrap pr-contact-grid">
          <div>
            <p className="pr-label">{copy.contact.sectionLabel}</p>
            <h2 id="pr-contact-title">{copy.contact.title}</h2>
            <p className="pr-contact-person">
              <strong>{copy.contact.name}</strong>
              <br />
              {copy.contact.role}
              <br />
              {copy.contact.city}
              <br />
              {copy.contact.languages}
            </p>
            <p className="pr-contact-body">{copy.contact.body}</p>
            <div className="pr-contact-actions">
              <a className="pr-btn" href={interviewMailto(activeLocale)}>
                {copy.contact.ctaInterview}
              </a>
              <a className="pr-btn pr-btn--ghost" href={demoMailto(activeLocale)}>
                {copy.contact.ctaDemo}
              </a>
              <a className="pr-text-link" href={pressAssets.siteUrl}>
                {copy.contact.siteLabel}
              </a>
            </div>
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
              src={pressAssets.logoPng}
              alt={copy.header.brand}
              width={110}
              height={22}
              unoptimized
            />
            <p className="pr-footer-meta">{copy.footer.updated}</p>
          </div>
          <a className="pr-text-link" href={pressAssets.siteUrl} rel="noopener noreferrer">
            {copy.footer.siteLink}
          </a>
        </div>
      </footer>
    </div>
  );
}
