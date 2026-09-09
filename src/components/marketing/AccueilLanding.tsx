"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { privacyPath } from "@/content/legal";
import { homeLinks, showResidences } from "@/data/home";
import { useI18n } from "@/lib/i18n/locale";
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

const residencesConsoleHref = "/community";

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

export function AccueilLanding() {
  const { t, locale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const faqBaseId = useId();

  const closeMenu = () => setMenuOpen(false);

  const navItems = [
    { href: homeLinks.comment, label: t("hp.nav.how") },
    { href: homeLinks.assistante, label: t("hp.nav.companion") },
    ...(showResidences
      ? [{ href: homeLinks.residences, label: t("hp.nav.residences") }]
      : []),
    { href: homeLinks.questions, label: t("hp.nav.faq") },
  ];

  const steps = [
    { n: "1", title: t("hp.steps.1.title"), body: t("hp.steps.1.body") },
    { n: "2", title: t("hp.steps.2.title"), body: t("hp.steps.2.body") },
    { n: "3", title: t("hp.steps.3.title"), body: t("hp.steps.3.body") },
  ];

  const companionBullets = [t("hp.claire.b1"), t("hp.claire.b2"), t("hp.claire.b3")];

  const chatBubbles = [
    { from: "claire" as const, text: t("hp.demo.claire1") },
    { from: "family" as const, text: t("hp.demo.family1") },
    { from: "claire" as const, text: t("hp.demo.claire2") },
  ];

  const chatSuggestions = [t("hp.claire.s2"), t("hp.claire.s3"), t("hp.demo.s3")];

  const savesItems = [
    { bold: t("hp.saves.1.bold"), rest: t("hp.saves.1.rest") },
    { bold: t("hp.saves.2.bold"), rest: t("hp.saves.2.rest") },
    { bold: t("hp.saves.3.bold"), rest: t("hp.saves.3.rest") },
    { bold: t("hp.saves.4.bold"), rest: t("hp.saves.4.rest") },
  ];

  const residenceTiles = [
    { title: t("hp.res.t1.title"), body: t("hp.res.t1.body") },
    { title: t("hp.res.t2.title"), body: t("hp.res.t2.body") },
    { title: t("hp.res.t3.title"), body: t("hp.res.t3.body") },
    { title: t("hp.res.t4.title"), body: t("hp.res.t4.body") },
  ];

  const faqItems = [
    { id: "faq-gratuit", q: t("hp.faq.1.q"), a: t("hp.faq.1.a") },
    { id: "faq-medical", q: t("hp.faq.2.q"), a: t("hp.faq.2.a") },
    { id: "faq-soins", q: t("hp.faq.3.q"), a: t("hp.faq.3.a") },
    { id: "faq-clsc", q: t("hp.faq.4.q"), a: t("hp.faq.4.a") },
    { id: "faq-multi", q: t("hp.faq.5.q"), a: t("hp.faq.5.a") },
  ];

  return (
    <div className={`al ${sourceSerif.variable} ${publicSans.variable}`}>
      <header className="al-header">
        <div className="al-header-inner">
          <Logo size="nav" className="al-logo" />
          <nav className="al-nav" aria-label={t("hp.aria.mainNav")}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="al-header-actions">
            <LanguageSwitcher compact />
            <Link href={homeLinks.signIn} className="al-link-green">
              {t("hp.nav.signIn")}
            </Link>
            <Link href={homeLinks.getStarted} className="al-btn al-btn-primary">
              {t("hp.nav.start")}
            </Link>
          </div>
          <button
            type="button"
            className="al-burger"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("hp.nav.close") : t("hp.nav.menu")}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="al-burger-lines" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
          {menuOpen ? (
            <nav className="al-mobile-nav" aria-label={t("hp.aria.mobileNav")}>
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={closeMenu}>
                  {item.label}
                </a>
              ))}
              <div className="al-mobile-lang">
                <LanguageSwitcher />
              </div>
              <Link
                href={homeLinks.signIn}
                className="al-btn al-btn-secondary"
                onClick={closeMenu}
              >
                {t("hp.nav.signIn")}
              </Link>
            </nav>
          ) : null}
        </div>
      </header>

      <main>
        <section className="al-hero" aria-labelledby="al-hero-title">
          <div className="al-hero-grid">
            <div className="al-hero-copy">
              <span className="al-pill">{t("hp.hero.pill")}</span>
              <h1 id="al-hero-title" className="al-h1">
                {t("hp.hero.title")}
              </h1>
              <p className="al-hero-lead">{t("hp.hero.lead")}</p>
              <div className="al-hero-actions">
                <Link href={homeLinks.getStarted} className="al-btn al-btn-primary">
                  {t("hp.hero.ctaPrimary")}
                </Link>
                <a href={homeLinks.comment} className="al-btn al-btn-secondary">
                  {t("hp.hero.ctaSecondary")}
                </a>
              </div>
              <p className="al-hero-note">{t("hp.hero.note")}</p>
            </div>
            <div className="al-hero-media">
              <Image
                src="/home/hero.jpg"
                alt={t("hp.hero.photoAlt")}
                fill
                priority
                sizes="(max-width: 720px) 100vw, 560px"
              />
            </div>
          </div>
        </section>

        <section id="comment" className="al-section scroll-mt-24" aria-labelledby="al-steps-title">
          <div className="al-wrap">
            <h2 id="al-steps-title" className="al-h2">
              {t("hp.steps.title")}
            </h2>
            <p className="al-section-lead">{t("hp.steps.lead")}</p>
            <div className="al-steps-grid">
              {steps.map((step) => (
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
              <span className="al-pill-dark">{t("hp.claire.pill")}</span>
              <h2 id="al-companion-title" className="al-h2" style={{ marginTop: 16 }}>
                {t("hp.claire.title")}
              </h2>
              <p className="al-companion-lead">{t("hp.claire.lead")}</p>
              <ul className="al-companion-list">
                {companionBullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="al-chat" aria-hidden="true">
              <div className="al-chat-head">
                <span className="al-avatar al-avatar-sm">C</span>
                <div>
                  <p className="al-chat-name">Claire</p>
                  <p className="al-chat-role">{t("hp.demo.role")}</p>
                </div>
              </div>
              <div className="al-bubbles">
                {chatBubbles.map((b, i) => (
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
                {chatSuggestions.map((s) => (
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
                alt={t("hp.saves.photoAlt")}
                fill
                sizes="(max-width: 720px) 100vw, 560px"
              />
            </div>
            <div>
              <h2 id="al-saves-title" className="al-h2">
                {t("hp.saves.title")}
              </h2>
              <ul className="al-saves-list">
                {savesItems.map((item) => (
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

        {showResidences ? (
          <section
            id="residences"
            className="al-section scroll-mt-24"
            aria-labelledby="al-res-title"
          >
            <div className="al-wrap" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div className="al-res-card">
                <div>
                  <p className="al-res-eyebrow">{t("hp.res.eyebrow")}</p>
                  <h2 id="al-res-title" className="al-h2">
                    {t("hp.res.title")}
                  </h2>
                  <p className="al-res-body">{t("hp.res.body")}</p>
                  <Link href={residencesConsoleHref} className="al-btn al-btn-primary">
                    {t("hp.res.cta")}
                  </Link>
                </div>
                <div className="al-res-tiles">
                  {residenceTiles.map((tile) => (
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
              {t("hp.faq.title")}
            </h2>
            <div className="al-faq-list">
              {faqItems.map((item, i) => {
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
            {t("hp.cta.title")}
          </h2>
          <p className="al-final-lead">{t("hp.cta.lead")}</p>
          <Link href={homeLinks.getStarted} className="al-btn al-btn-white">
            {t("hp.cta.button")}
          </Link>
        </section>
      </main>

      <footer className="al-footer">
        <div className="al-footer-inner">
          <Logo size="nav" light className="al-logo-footer" />
          <p className="al-footer-tag">{t("hp.footer.tagline")}</p>
          <nav className="al-footer-links" aria-label={t("hp.aria.footerNav")}>
            <a href={homeLinks.comment}>{t("hp.footer.how")}</a>
            {showResidences ? (
              <a href={homeLinks.residences}>{t("hp.footer.residences")}</a>
            ) : null}
            <a href={homeLinks.questions}>{t("hp.footer.faq")}</a>
            <Link href={privacyPath(locale)}>{t("hp.footer.privacy")}</Link>
          </nav>
        </div>
      </footer>

      <div className="al-sticky-wrap" aria-hidden={false}>
        <div className="al-sticky-bar">
          <Link href={homeLinks.signIn} className="al-link-green">
            {t("hp.nav.signIn")}
          </Link>
          <Link href={homeLinks.getStarted} className="al-btn al-btn-primary">
            {t("hp.nav.start")}
          </Link>
        </div>
      </div>
    </div>
  );
}
