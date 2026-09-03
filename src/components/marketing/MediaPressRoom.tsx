"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import {
  press,
  pressAssets,
  pressPublication,
  type PressBlock,
  type PressLocale,
} from "@/data/press";
import { useLocale } from "@/lib/i18n/locale";
import "./media-press.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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

function formatPressDate(iso: string, locale: PressLocale) {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function estimateReadingMinutes(blocks: PressBlock[], lead: string, dek: string) {
  const parts: string[] = [lead, dek];
  for (const block of blocks) {
    if (block.type === "p" || block.type === "h3" || block.type === "quote") {
      parts.push(block.text);
      if (block.type === "quote") parts.push(block.attribution);
    } else if (block.type === "ul") {
      parts.push(...block.items);
    } else if (block.type === "link") {
      parts.push(block.label);
    }
  }
  const words = parts.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
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
                  className="pr-inline-link"
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
  const [shareNote, setShareNote] = useState<string | null>(null);

  const langParam = searchParams.get("lang");
  const activeLocale = useMemo(
    () => resolvePressLocale(langParam, locale),
    [langParam, locale],
  );
  const copy = press[activeLocale];
  const readingMinutes = useMemo(
    () => estimateReadingMinutes(copy.feature.blocks, copy.feature.dek, copy.hero.lead),
    [copy.feature.blocks, copy.feature.dek, copy.hero.lead],
  );
  const published = formatPressDate(pressPublication.publishedISO, activeLocale);
  const updated = formatPressDate(pressPublication.updatedISO, activeLocale);
  const briefFacts = copy.facts.items.slice(0, 3);
  const pageUrl =
    typeof window !== "undefined"
      ? window.location.href
      : activeLocale === "en"
        ? pressAssets.mediaUrlEn
        : pressAssets.mediaUrl;

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

  const flashShare = (message: string) => {
    setShareNote(message);
    window.setTimeout(() => setShareNote(null), 1800);
  };

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      flashShare(message);
    } catch {
      flashShare(message);
    }
  };

  const navItems = [
    { href: `#${copy.anchors.front}`, label: copy.header.nav.front },
    { href: `#${copy.anchors.feature}`, label: copy.header.nav.article },
    { href: `#${copy.anchors.release}`, label: copy.header.nav.release },
    { href: `#${copy.anchors.facts}`, label: copy.header.nav.facts },
    { href: `#${copy.anchors.resources}`, label: copy.header.nav.resources },
    { href: `#${copy.anchors.contact}`, label: copy.header.nav.contact },
  ];

  return (
    <div className={`pr ${sourceSerif.variable} ${publicSans.variable}`}>
      <header className="pr-header">
        <div className="pr-wrap pr-header-top">
          <Link href="/" className="pr-brand" aria-label={copy.header.brand}>
            <Image
              src={pressAssets.logoPng}
              alt=""
              width={160}
              height={36}
              className="pr-brand-logo"
              priority
              unoptimized
            />
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
        <nav className="pr-subnav" aria-label={copy.header.navAria}>
          <div className="pr-wrap pr-subnav-inner">
            {navItems.map((item, index) => (
              <span key={item.href} className="pr-subnav-item">
                {index > 0 ? <span className="pr-subnav-sep" aria-hidden /> : null}
                <a href={item.href}>{item.label}</a>
              </span>
            ))}
          </div>
        </nav>
      </header>

      <section id={copy.anchors.front} className="pr-masthead" aria-labelledby="pr-hero-title">
        <div className="pr-wrap pr-masthead-inner">
          <p className="pr-kicker">{copy.hero.category}</p>
          <h1 id="pr-hero-title">{copy.hero.title}</h1>
          <p className="pr-dek">{copy.hero.lead}</p>
          <div className="pr-byline">
            <span>{copy.hero.byline}</span>
            <span aria-hidden>·</span>
            <span>
              {copy.hero.publishedPrefix} {published}
            </span>
            <span aria-hidden>·</span>
            <span>
              {copy.hero.updatedPrefix} {updated}
            </span>
            <span aria-hidden>·</span>
            <span>
              {copy.hero.readingPrefix} : {readingMinutes} {copy.hero.readingUnit}
            </span>
          </div>
          <figure className="pr-hero-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pressAssets.homepageCapture}
              alt={copy.hero.captureAlt}
            />
            <figcaption>
              {copy.hero.captureCaption}
              <span className="pr-credit"> — {copy.hero.captureCredit}</span>
            </figcaption>
          </figure>
          <div className="pr-masthead-actions">
            <a className="pr-text-cta" href={`#${copy.anchors.release}`}>
              {copy.hero.ctaRelease}
            </a>
            <a className="pr-text-cta pr-text-cta--quiet" href={interviewMailto(activeLocale)}>
              {copy.hero.ctaInterview}
            </a>
          </div>
          <div className="pr-share" aria-label={copy.share.label}>
            <button
              type="button"
              onClick={() => copyText(pageUrl, copy.share.copiedLink)}
            >
              {copy.share.copyLink}
            </button>
            <button
              type="button"
              onClick={() => copyText(copy.hero.title, copy.share.copiedTitle)}
            >
              {copy.share.copyTitle}
            </button>
            <button type="button" onClick={() => window.print()}>
              {copy.share.print}
            </button>
            <a href={`#${copy.anchors.release}`}>{copy.share.openRelease}</a>
            <a href={pressAssets.mailto}>{copy.share.email}</a>
            {shareNote ? <span className="pr-share-note">{shareNote}</span> : null}
          </div>
        </div>
      </section>

      <section
        id={copy.anchors.summary}
        className="pr-section pr-summary"
        aria-labelledby="pr-summary-title"
      >
        <div className="pr-wrap pr-summary-inner">
          <p className="pr-kicker">{copy.summary.sectionLabel}</p>
          <h2 id="pr-summary-title">{copy.summary.title}</h2>
          {copy.summary.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="pr-section pr-feature-shell" aria-labelledby="pr-feature-title">
        <div className="pr-wrap pr-feature-layout">
          <article id={copy.anchors.feature} className="pr-article">
            <p className="pr-kind">{copy.kinds.article}</p>
            <p className="pr-disclosure">{copy.disclosure}</p>
            <p className="pr-kicker">{copy.feature.sectionLabel}</p>
            <h2 id="pr-feature-title">{copy.feature.title}</h2>
            <p className="pr-article-dek">{copy.feature.dek}</p>
            <div className="pr-article-meta">
              <span>{copy.hero.byline}</span>
              <span aria-hidden>·</span>
              <span>
                {copy.hero.publishedPrefix} {published}
              </span>
              <span aria-hidden>·</span>
              <span>
                {copy.hero.readingPrefix} : {readingMinutes} {copy.hero.readingUnit}
              </span>
            </div>
            <figure className="pr-article-figure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pressAssets.homepageCapture}
                alt={copy.hero.captureAlt}
              />
              <figcaption>
                {copy.hero.captureCaption}
                <span className="pr-credit"> — {copy.hero.captureCredit}</span>
              </figcaption>
            </figure>
            <div className="pr-article-body">
              <PressBlocks blocks={copy.feature.blocks} />
            </div>
            <aside className="pr-also">
              <p className="pr-also-title">{copy.alsoRead.title}</p>
              <ul>
                {copy.alsoRead.items.map((item) => (
                  <li key={item.href}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </aside>
          </article>

          <aside className="pr-rail" aria-label={copy.sidebar.briefTitle}>
            <div className="pr-rail-block">
              <p className="pr-rail-label">{copy.sidebar.briefTitle}</p>
              <ul className="pr-rail-facts">
                {briefFacts.map((fact) => (
                  <li key={fact.title}>
                    <strong>{fact.title}</strong>
                    <span>{fact.body}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pr-rail-block">
              <p className="pr-rail-label">{copy.sidebar.contactTitle}</p>
              <p className="pr-rail-contact">
                <strong>{copy.contact.name}</strong>
                <br />
                {copy.contact.role}
                <br />
                <a href={pressAssets.mailto}>{copy.contact.email}</a>
              </p>
            </div>
            <div className="pr-rail-block">
              <a className="pr-rail-link" href={`#${copy.anchors.release}`}>
                {copy.sidebar.releaseCta}
              </a>
            </div>
          </aside>
        </div>
      </section>

      <section
        id={copy.anchors.release}
        className="pr-section pr-release-band"
        aria-labelledby="pr-release-title"
      >
        <div className="pr-wrap">
          <p className="pr-kind">{copy.kinds.release}</p>
          <p className="pr-kicker">{copy.release.sectionLabel}</p>
          <article className="pr-release">
            <h2 id="pr-release-title">{copy.release.title}</h2>
            <p className="pr-article-dek">{copy.release.dek}</p>
            <hr className="pr-rule" />
            <div className="pr-article-body">
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
        id={copy.anchors.facts}
        className="pr-section pr-facts-section"
        aria-labelledby="pr-facts-title"
      >
        <div className="pr-wrap">
          <p className="pr-kicker">{copy.facts.sectionLabel}</p>
          <h2 id="pr-facts-title">{copy.facts.title}</h2>
          <div className="pr-facts-list">
            {copy.facts.items.map((item) => (
              <article className="pr-fact-row" key={item.title}>
                <div>
                  <h3>{item.title}</h3>
                  {item.kind ? (
                    <p className="pr-kind pr-kind--inline">{copy.kinds[item.kind]}</p>
                  ) : null}
                </div>
                <div>
                  <p>{item.body}</p>
                  {item.sourceHref && item.sourceLabel ? (
                    <a
                      className="pr-inline-link"
                      href={item.sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.sourceLabel}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id={copy.anchors.faq}
        className="pr-section pr-release-band"
        aria-labelledby="pr-faq-title"
      >
        <div className="pr-wrap pr-narrow">
          <p className="pr-kicker">{copy.faq.sectionLabel}</p>
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
        id={copy.anchors.resources}
        className="pr-section"
        aria-labelledby="pr-sources-title"
      >
        <div className="pr-wrap">
          <p className="pr-kicker">{copy.sources.sectionLabel}</p>
          <h2 id="pr-sources-title">{copy.sources.title}</h2>
          <ul className="pr-sources-list">
            {copy.sources.items.map((item) => (
              <li key={item.href}>
                <a
                  className="pr-inline-link"
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {item.label}
                </a>
                <span>{item.note}</span>
              </li>
            ))}
          </ul>

          <div className="pr-kit-block">
            <p className="pr-kicker">{copy.kit.sectionLabel}</p>
            <h3>{copy.kit.title}</h3>
            <p className="pr-brand-line">{copy.kit.brandLine}</p>
            <p className="pr-kit-usage">{copy.kit.usage}</p>
            <ul className="pr-download-list">
              {copy.kit.downloads.map((file) => (
                <li key={file.id}>
                  <a className="pr-inline-link" href={file.href} download={file.filename}>
                    {file.label}
                  </a>
                  <span>
                    {file.caption} — {file.credit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id={copy.anchors.contact}
        className="pr-section pr-contact-band"
        aria-labelledby="pr-contact-title"
      >
        <div className="pr-wrap pr-contact-grid">
          <div>
            <p className="pr-kicker">{copy.contact.sectionLabel}</p>
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
              <a className="pr-text-cta" href={interviewMailto(activeLocale)}>
                {copy.contact.ctaInterview}
              </a>
              <a className="pr-text-cta pr-text-cta--quiet" href={demoMailto(activeLocale)}>
                {copy.contact.ctaDemo}
              </a>
              <a className="pr-inline-link" href={pressAssets.siteUrl}>
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
          <p>{copy.footer.updated}</p>
          <a className="pr-inline-link" href={pressAssets.siteUrl}>
            {copy.footer.siteLink}
          </a>
        </div>
      </footer>
    </div>
  );
}
