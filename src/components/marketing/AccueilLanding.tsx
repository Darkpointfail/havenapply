"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import {
  homeCompanion,
  homeCta,
  homeFaq,
  homeFooter,
  homeHero,
  homeLinks,
  homeNav,
  homeProof,
  homeQuote,
  homeResidences,
  homeSaves,
  homeSteps,
  showResidences,
} from "@/data/home";
import "./accueil-landing.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});

function CheckIcon() {
  return (
    <svg className="al-check" width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M3.5 9.2L7 12.7L14.5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link href="/" className={footer ? "al-footer-brand" : "al-brand"}>
      <Image
        src="/brand/havenapply-logo.png"
        alt="HavenApply"
        width={footer ? 26 : 34}
        height={footer ? 26 : 34}
        className={footer ? undefined : "al-brand-mark"}
        style={
          footer
            ? undefined
            : { width: 34, height: 34, borderRadius: 8, objectFit: "cover" }
        }
        priority={!footer}
      />
      <span className={footer ? undefined : "al-brand-name"}>
        {footer ? homeFooter.brand : "HavenApply"}
      </span>
    </Link>
  );
}

export function AccueilLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const faqBaseId = useId();

  const closeMenu = () => setMenuOpen(false);

  const navItems = [
    { href: homeLinks.comment, label: homeNav.how },
    { href: homeLinks.assistante, label: homeNav.companion },
    ...(showResidences
      ? [{ href: homeLinks.residences, label: homeNav.residences }]
      : []),
    { href: homeLinks.questions, label: homeNav.faq },
  ];

  return (
    <div className={`al ${sourceSerif.variable} ${publicSans.variable}`}>
      <header className="al-header">
        <div className="al-header-inner">
          <Brand />
          <nav className="al-nav" aria-label="Navigation principale">
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="al-header-actions">
            <Link href={homeLinks.signIn} className="al-link-green">
              {homeNav.signIn}
            </Link>
            <Link href={homeLinks.getStarted} className="al-btn al-btn-primary">
              {homeNav.start}
            </Link>
          </div>
          <button
            type="button"
            className="al-burger"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? homeNav.menuClose : homeNav.menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="al-burger-lines" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
          {menuOpen ? (
            <nav className="al-mobile-nav" aria-label="Menu mobile">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={closeMenu}>
                  {item.label}
                </a>
              ))}
              <Link
                href={homeLinks.signIn}
                className="al-btn al-btn-secondary"
                onClick={closeMenu}
              >
                {homeNav.signIn}
              </Link>
            </nav>
          ) : null}
        </div>
      </header>

      <main>
        <section className="al-hero" aria-labelledby="al-hero-title">
          <div className="al-hero-grid">
            <div className="al-hero-copy">
              <span className="al-pill">{homeHero.pill}</span>
              <h1 id="al-hero-title" className="al-h1">
                {homeHero.title}
              </h1>
              <p className="al-hero-lead">{homeHero.lead}</p>
              <div className="al-hero-actions">
                <Link href={homeLinks.getStarted} className="al-btn al-btn-primary">
                  {homeHero.ctaPrimary}
                </Link>
                <a href={homeLinks.comment} className="al-btn al-btn-secondary">
                  {homeHero.ctaSecondary}
                </a>
              </div>
              <p className="al-hero-note">{homeHero.note}</p>
            </div>
            <div className="al-hero-media">
              <Image
                src="/home/hero.jpg"
                alt={homeHero.photoAlt}
                fill
                priority
                sizes="(max-width: 720px) 100vw, 560px"
              />
            </div>
          </div>
        </section>

        <div className="al-proof" aria-label={homeProof.lead}>
          <p className="al-proof-lead">{homeProof.lead}</p>
          {homeProof.items.map((item) => (
            <div key={item.value} className="al-proof-item">
              <span className="al-proof-value">{item.value}</span>
              <span className="al-proof-label">{item.label}</span>
            </div>
          ))}
        </div>

        <section id="comment" className="al-section scroll-mt-24" aria-labelledby="al-steps-title">
          <div className="al-wrap">
            <h2 id="al-steps-title" className="al-h2">
              {homeSteps.title}
            </h2>
            <p className="al-section-lead">{homeSteps.lead}</p>
            <div className="al-steps-grid">
              {homeSteps.items.map((step) => (
                <article key={step.n} className="al-step-card">
                  <span className="al-step-n" aria-hidden>
                    {step.n}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="assistante"
          className="al-companion scroll-mt-24"
          aria-labelledby="al-companion-title"
        >
          <div className="al-companion-grid">
            <div>
              <span className="al-pill-dark">{homeCompanion.pill}</span>
              <h2 id="al-companion-title" className="al-h2" style={{ marginTop: 16 }}>
                {homeCompanion.title}
              </h2>
              <p className="al-companion-lead">{homeCompanion.lead}</p>
              <ul className="al-companion-list">
                {homeCompanion.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="al-chat" aria-hidden="true">
              <div className="al-chat-head">
                <span className="al-avatar al-avatar-sm">C</span>
                <div>
                  <p className="al-chat-name">{homeCompanion.chat.name}</p>
                  <p className="al-chat-role">{homeCompanion.chat.role}</p>
                </div>
              </div>
              <div className="al-bubbles">
                {homeCompanion.chat.bubbles.map((b, i) => (
                  <div
                    key={i}
                    className={
                      b.from === "claire" ? "al-bubble al-bubble-claire" : "al-bubble al-bubble-family"
                    }
                  >
                    {b.text}
                  </div>
                ))}
              </div>
              <div className="al-suggestions">
                {homeCompanion.chat.suggestions.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="al-section" aria-labelledby="al-saves-title">
          <div className="al-saves-grid">
            <div className="al-saves-media">
              <Image
                src="/home/saves-online.jpg"
                alt={homeSaves.photoAlt}
                fill
                sizes="(max-width: 720px) 100vw, 560px"
              />
            </div>
            <div>
              <h2 id="al-saves-title" className="al-h2">
                {homeSaves.title}
              </h2>
              <ul className="al-saves-list">
                {homeSaves.items.map((item) => (
                  <li key={item.bold}>
                    <CheckIcon />
                    <span>
                      <strong>{item.bold}</strong> {item.rest}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="al-quote al-section-quote" aria-label="Témoignage">
          <div className="al-quote-inner">
            <blockquote className="al-quote-body">« {homeQuote.body} »</blockquote>
            <div className="al-quote-by">
              <span className="al-avatar al-avatar-md" aria-hidden>
                {homeQuote.initials}
              </span>
              <div>
                <p className="al-quote-name">{homeQuote.name}</p>
                <p className="al-quote-meta">{homeQuote.meta}</p>
              </div>
            </div>
          </div>
        </section>

        {showResidences ? (
          <section
            id="residences"
            className="al-section scroll-mt-24"
            aria-labelledby="al-res-title"
          >
            <div className="al-wrap" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div className="al-res-card">
                <div>
                  <p className="al-res-eyebrow">{homeResidences.eyebrow}</p>
                  <h2 id="al-res-title" className="al-h2">
                    {homeResidences.title}
                  </h2>
                  <p className="al-res-body">{homeResidences.body}</p>
                  <Link href={homeResidences.ctaHref} className="al-btn al-btn-primary">
                    {homeResidences.cta}
                  </Link>
                </div>
                <div className="al-res-tiles">
                  {homeResidences.tiles.map((tile) => (
                    <div key={tile.title} className="al-res-tile">
                      <h3>{tile.title}</h3>
                      <p>{tile.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="questions" className="scroll-mt-24" aria-labelledby="al-faq-title">
          <div className="al-faq-inner">
            <h2 id="al-faq-title" className="al-h2">
              {homeFaq.title}
            </h2>
            <div className="al-faq-list">
              {homeFaq.items.map((item, i) => {
                const open = openFaq === i;
                const panelId = `${faqBaseId}-${item.id}`;
                return (
                  <div key={item.id} className="al-faq-item">
                    <button
                      type="button"
                      className="al-faq-trigger"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenFaq(open ? -1 : i)}
                    >
                      <span>{item.q}</span>
                      <span className="al-faq-sign" aria-hidden>
                        {open ? "−" : "+"}
                      </span>
                    </button>
                    {open ? (
                      <div id={panelId} className="al-faq-panel" role="region">
                        {item.a}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="al-final al-section-cta" aria-labelledby="al-cta-title">
          <h2 id="al-cta-title" className="al-h2">
            {homeCta.title}
          </h2>
          <p className="al-final-lead">{homeCta.lead}</p>
          <Link href={homeLinks.getStarted} className="al-btn al-btn-white">
            {homeCta.button}
          </Link>
        </section>
      </main>

      <footer className="al-footer">
        <div className="al-footer-inner">
          <Brand footer />
          <p className="al-footer-tag">{homeFooter.tagline}</p>
          <nav className="al-footer-links" aria-label="Pied de page">
            <a href={homeLinks.comment}>{homeFooter.how}</a>
            {showResidences ? (
              <a href={homeLinks.residences}>{homeFooter.residences}</a>
            ) : null}
            <a href={homeLinks.questions}>{homeFooter.faq}</a>
            <Link href={homeLinks.privacy}>{homeFooter.privacy}</Link>
          </nav>
        </div>
      </footer>

      <div className="al-sticky-wrap" aria-hidden={false}>
        <div className="al-sticky-bar">
          <Link href={homeLinks.signIn} className="al-link-green">
            {homeNav.signIn}
          </Link>
          <Link href={homeLinks.getStarted} className="al-btn al-btn-primary">
            {homeNav.start}
          </Link>
        </div>
      </div>
    </div>
  );
}
