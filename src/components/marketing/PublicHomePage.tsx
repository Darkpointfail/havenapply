"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { askAssistant, type AssistantTurn } from "@/data/assistant";
import {
  RPA_RESIDENCE_COUNT,
  collectionPath,
  privacyPath,
  termsPath,
} from "@/lib/marketing-meta";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import "./public-home.css";

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

function Check() {
  return (
    <span
      aria-hidden
      className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--hp-green-tint)", color: "var(--hp-green)" }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 6.2L4.8 8.5L9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function HeroPhoto({ alt }: { alt: string }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        height: 440,
        border: "1px solid var(--hp-border)",
      }}
    >
      <Image
        src="/home/hero.jpg"
        alt={alt}
        fill
        priority
        sizes="(max-width: 768px) 100vw, 520px"
        className="object-cover object-[50%_30%]"
      />
    </div>
  );
}

function TrackingVisual({ alt }: { alt: string }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[14px]"
      style={{
        height: 400,
        border: "1px solid var(--hp-border)",
      }}
    >
      <Image
        src="/home/saves-online.jpg"
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 520px"
        className="object-cover object-center"
      />
    </div>
  );
}

function ClaireHomeDemo({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const claireHref = `/${locale}/sign-up`;
  const hello = t("hp.claire.hello");
  const [messages, setMessages] = useState<AssistantTurn[]>([{ from: "claire", body: hello }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const suggestions = [t("hp.claire.s1"), t("hp.claire.s2"), t("hp.claire.s3")];

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || typing) return;
    setMessages((m) => [...m, { from: "family", body: message }]);
    setInput("");
    setTyping(true);
    const reply = await askAssistant(0, message);
    setMessages((m) => [...m, { from: "claire", body: reply }]);
    setTyping(false);
  };

  return (
    <div className="hp-card hp-chat-shadow overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-[var(--hp-border)] px-5 py-4">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold"
          style={{ background: "var(--hp-green-tint)", color: "var(--hp-green-deep)" }}
        >
          C
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[var(--hp-ink)]">Claire</p>
          <p className="text-[13px] text-[var(--hp-ink-muted)]">
            {typing ? t("hp.claire.typing") : t("hp.claire.status")}
          </p>
        </div>
      </div>
      <div className="max-h-[320px] space-y-3.5 overflow-y-auto bg-white px-5 py-5" role="log">
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.body.slice(0, 10)}`}
            className={m.from === "family" ? "flex justify-end" : "max-w-[94%]"}
          >
            <div
              className="px-3.5 py-2.5 text-[14.5px] leading-relaxed"
              style={
                m.from === "family"
                  ? {
                      background: "var(--hp-green)",
                      color: "#fff",
                      borderRadius: "12px 12px 4px 12px",
                      maxWidth: "88%",
                    }
                  : {
                      background: "#F3F8F6",
                      color: "var(--hp-ink)",
                      borderRadius: "12px 12px 12px 4px",
                    }
              }
            >
              {m.body}
            </div>
          </div>
        ))}
        {typing ? (
          <div className="max-w-[70%]">
            <div
              className="px-3.5 py-2.5 text-[13px] text-[var(--hp-ink-muted)]"
              style={{ background: "#F3F8F6", borderRadius: "12px 12px 12px 4px" }}
            >
              {t("hp.claire.typing")}
            </div>
          </div>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-[var(--hp-border)] bg-white px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={typing}
              onClick={() => send(s)}
              className="rounded-[20px] border border-[var(--hp-border)] bg-white px-3 py-1.5 text-[13px] font-medium text-[var(--hp-ink-body)] transition-colors hover:bg-[var(--hp-wash)] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={typing}
            placeholder={t("hp.claire.placeholder")}
            aria-label={t("hp.claire.aria")}
            className="min-h-[44px] flex-1 rounded-[12px] border border-[var(--hp-border)] px-3 text-[14.5px] outline-none focus:border-[var(--hp-green)]"
          />
          <button
            type="submit"
            disabled={typing || !input.trim()}
            className="hp-btn hp-btn-primary !min-h-[44px] !px-4 !text-[14px]"
          >
            {t("hp.claire.send")}
          </button>
        </form>
        <Link
          href={claireHref}
          className="inline-flex min-h-[40px] items-center text-[14px] font-semibold text-[var(--hp-green)] no-underline"
        >
          {t("hp.claire.link")}
        </Link>
      </div>
    </div>
  );
}

export function PublicHomePage({
  locale,
  signedIn = false,
  accountHome,
}: {
  locale: Locale;
  signedIn?: boolean;
  accountHome: string;
}) {
  const t = createT(locale);
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = useMemo(
    () =>
      [
        { href: "#comment", label: t("hp.nav.how") },
        { href: "#assistante", label: t("hp.nav.companion") },
        { href: "#residences", label: t("hp.nav.residences") },
        { href: "#questions", label: t("hp.nav.faq") },
      ] as const,
    [t],
  );

  const steps = useMemo(
    () =>
      [
        { n: "1", title: t("hp.steps.1.title"), body: t("hp.steps.1.body") },
        { n: "2", title: t("hp.steps.2.title"), body: t("hp.steps.2.body") },
        { n: "3", title: t("hp.steps.3.title"), body: t("hp.steps.3.body") },
      ] as const,
    [t],
  );

  const saves = useMemo(
    () =>
      [
        { bold: t("hp.saves.1.bold"), rest: t("hp.saves.1.rest") },
        { bold: t("hp.saves.2.bold"), rest: t("hp.saves.2.rest") },
        { bold: t("hp.saves.3.bold"), rest: t("hp.saves.3.rest") },
        { bold: t("hp.saves.4.bold"), rest: t("hp.saves.4.rest") },
      ] as const,
    [t],
  );

  const resTiles = useMemo(
    () =>
      [
        { title: t("hp.res.t1.title"), body: t("hp.res.t1.body") },
        { title: t("hp.res.t2.title"), body: t("hp.res.t2.body") },
        { title: t("hp.res.t3.title"), body: t("hp.res.t3.body") },
        { title: t("hp.res.t4.title"), body: t("hp.res.t4.body") },
      ] as const,
    [t],
  );

  const faq = useMemo(
    () =>
      [
        { q: t("hp.faq.1.q"), a: t("hp.faq.1.a") },
        { q: t("hp.faq.2.q"), a: t("hp.faq.2.a") },
        { q: t("hp.faq.3.q"), a: t("hp.faq.3.a") },
        { q: t("hp.faq.4.q"), a: t("hp.faq.4.a") },
        { q: t("hp.faq.5.q"), a: t("hp.faq.5.a") },
      ] as const,
    [t],
  );

  const claireLines = useMemo(
    () => [t("hp.claire.b1"), t("hp.claire.b2"), t("hp.claire.b3")],
    [t],
  );

  const footerLinks = useMemo(
    () => [
      { href: "#comment", label: t("hp.footer.how") },
      { href: "#residences", label: t("hp.footer.residences") },
      { href: "#questions", label: t("hp.footer.faq") },
      { href: privacyPath(locale), label: t("hp.footer.privacy") },
      { href: collectionPath(locale), label: t("hp.footer.collection") },
      { href: termsPath(locale), label: t("hp.footer.terms") },
    ],
    [locale, t],
  );

  const residenceCount = `${(Math.floor(RPA_RESIDENCE_COUNT / 100) * 100).toLocaleString(
    locale === "en" ? "en-CA" : "fr-CA",
  )}+`;

  return (
    <div className={`hp ${sourceSerif.variable} ${publicSans.variable}`}>
      <header className="hp-header">
        <div className="hp-wrap hp-header-inner">
          <Logo href={`/${locale}`} size="nav" className="!ml-0 !translate-y-0 shrink-0" />

          <nav className="hp-header-nav hp-desktop-nav" aria-label="Navigation">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="hp-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hp-header-actions hp-desktop-nav">
            <LocaleSwitcher locale={locale} compact />
            {signedIn ? (
              <>
                <Link href={accountHome} className="hp-btn-ghost">
                  {t("hp.nav.mySpace")}
                </Link>
                <button
                  type="button"
                  className="hp-btn-ghost"
                  onClick={() => {
                    window.location.href = `/${locale}/sign-in`;
                  }}
                >
                  {t("hp.nav.signOut")}
                </button>
              </>
            ) : (
              <>
                <Link href={`/${locale}/sign-in`} className="hp-btn-ghost">
                  {t("hp.nav.signIn")}
                </Link>
                <Link href={`/${locale}/sign-up`} className="hp-btn hp-btn-primary">
                  {t("hp.nav.start")}
                </Link>
              </>
            )}
          </div>

          <div className="hp-mobile-toggle items-center gap-2">
            <LocaleSwitcher locale={locale} compact />
            <button
              type="button"
              className="hp-btn hp-btn-outline"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? t("hp.nav.close") : t("hp.nav.menu")}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? t("hp.nav.close") : t("hp.nav.menu")}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[var(--hp-border)] bg-white px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="hp-nav-link py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              {signedIn ? (
                <>
                  <Link
                    href={accountHome}
                    className="hp-btn-ghost py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("hp.nav.mySpace")}
                  </Link>
                  <button type="button" className="hp-btn-ghost py-2 text-left" onClick={() => { window.location.href = `/${locale}/sign-in`; }}>
                    {t("hp.nav.signOut")}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/${locale}/sign-in`}
                    className="hp-btn-ghost py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("hp.nav.signIn")}
                  </Link>
                  <Link
                    href={`/${locale}/sign-up`}
                    className="hp-btn hp-btn-primary w-full"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("hp.nav.start")}
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <section style={{ background: "var(--hp-wash)" }}>
        <div className="hp-wrap grid hp-grid-2 items-center gap-12 py-[76px] md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:py-20">
          <div>
            <span
              className="hp-pill"
              style={{ background: "var(--hp-green-bg)", color: "var(--hp-green-deep)" }}
            >
              {t("hp.hero.pill")}
            </span>
            <h1 className="hp-h1 mt-6">{t("hp.hero.title")}</h1>
            <p className="hp-lead mt-6">{t("hp.hero.lead")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={`/${locale}/sign-up`} className="hp-btn hp-btn-primary">
                {t("hp.hero.ctaPrimary")}
              </Link>
              <a href="#comment" className="hp-btn hp-btn-outline">
                {t("hp.hero.ctaSecondary")}
              </a>
            </div>
            <p className="hp-muted mt-5">{t("hp.hero.note")}</p>
          </div>
          <HeroPhoto alt={t("hp.hero.photoAlt")} />
        </div>
      </section>

      <section
        aria-label={t("hp.proof.aria")}
        className="hp-proof-band border-y border-[var(--hp-border)]"
        style={{ background: "var(--hp-wash)" }}
      >
        <div className="hp-wrap py-12 md:py-14">
          <p className="hp-serif max-w-xl text-[22px] leading-snug text-[var(--hp-ink)] md:text-[24px]">
            {t("hp.proof.lead")}
          </p>
          <div className="hp-proof-grid mt-9 grid gap-8 sm:grid-cols-3 sm:gap-0">
            {[
              { value: residenceCount, label: t("hp.proof.residences") },
              { value: t("hp.proof.sendValue"), label: t("hp.proof.send") },
              { value: t("hp.proof.daysValue"), label: t("hp.proof.days") },
            ].map((item, i) => (
              <div
                key={item.value}
                className={`hp-proof-item flex flex-col gap-2 sm:px-8 ${
                  i === 0 ? "sm:pl-0" : ""
                } ${i < 2 ? "sm:border-r sm:border-[var(--hp-border)]" : "sm:pr-0"}`}
              >
                <p className="hp-serif text-[34px] leading-none tracking-tight text-[var(--hp-green-deep)] md:text-[40px]">
                  {item.value}
                </p>
                <p className="hp-muted max-w-[220px] text-[14.5px] leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comment" className="scroll-mt-24 bg-white py-20 md:py-24">
        <div className="hp-wrap">
          <h2 className="hp-h2 max-w-3xl text-[var(--hp-ink)]">{t("hp.steps.title")}</h2>
          <p className="hp-body mt-4 max-w-3xl">{t("hp.steps.lead")}</p>
          <div className="hp-grid-3 mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.n} className="hp-card p-7">
                <span
                  className="hp-serif inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-[18px]"
                  style={{ background: "var(--hp-green-tint)", color: "var(--hp-green)" }}
                >
                  {step.n}
                </span>
                <h3 className="hp-h3 mt-5 text-[var(--hp-ink)]">{step.title}</h3>
                <p className="hp-body mt-3 text-[16px]">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="assistante"
        className="scroll-mt-24 py-[84px] text-white"
        style={{ background: "var(--hp-black)" }}
      >
        <div className="hp-wrap grid hp-grid-2 items-center gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <span
              className="hp-pill"
              style={{ background: "rgba(79,191,174,0.16)", color: "var(--hp-green-light)" }}
            >
              {t("hp.claire.pill")}
            </span>
            <h2 className="hp-h2 mt-6 text-white" style={{ fontSize: 40 }}>
              {t("hp.claire.title")}
            </h2>
            <p className="mt-5 text-[17.5px] leading-[1.6] text-white/85 hp-pretty">
              {t("hp.claire.lead")}
            </p>
            <ul className="mt-8 space-y-3.5">
              {claireLines.map((line) => (
                <li key={line} className="flex gap-3 text-[16.5px] leading-relaxed text-white/88">
                  <span style={{ color: "var(--hp-green-light)" }} aria-hidden>
                    :
                  </span>
                  <span className="hp-pretty">{line}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/sign-up`}
              className="hp-btn hp-btn-primary mt-9 inline-flex"
            >
              {t("hp.claire.cta")}
            </Link>
          </div>

          <ClaireHomeDemo locale={locale} />
        </div>
      </section>

      <section className="bg-white py-20 md:py-24">
        <div className="hp-wrap grid hp-grid-2 items-center gap-12 md:grid-cols-2 md:gap-16">
          <TrackingVisual alt={t("hp.saves.photoAlt")} />
          <div>
            <h2 className="hp-h2 text-[var(--hp-ink)]">{t("hp.saves.title")}</h2>
            <ul className="mt-8 space-y-5">
              {saves.map((item) => (
                <li key={item.bold} className="flex gap-3">
                  <Check />
                  <p className="hp-body text-[16.5px]">
                    <strong className="font-semibold text-[var(--hp-ink)]">{item.bold}</strong>
                    {item.rest}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--hp-wash)" }} className="py-20 md:py-24">
        <div className="mx-auto max-w-[960px] px-5 md:px-10">
          <blockquote
            className="hp-serif text-center text-[29px] font-normal leading-[1.35] text-[var(--hp-ink)]"
            style={{ fontWeight: 400, textWrap: "pretty" }}
          >
            {t("hp.quote.body")}
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full text-[14px] font-semibold"
              style={{ background: "var(--hp-green-tint)", color: "var(--hp-green-deep)" }}
            >
              SL
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[var(--hp-ink)]">{t("hp.quote.name")}</p>
              <p className="hp-muted">{t("hp.quote.meta")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="residences" className="scroll-mt-24 bg-white py-20 md:py-24">
        <div className="hp-wrap">
          <div className="hp-card grid hp-grid-2 gap-10 p-8 md:grid-cols-2 md:gap-12 md:p-11">
            <div>
              <p
                className="text-[12.5px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--hp-ink-muted)" }}
              >
                {t("hp.res.eyebrow")}
              </p>
              <h2 className="hp-h2 mt-3 text-[var(--hp-ink)]">{t("hp.res.title")}</h2>
              <p className="hp-body mt-4">{t("hp.res.body")}</p>
              <Link href={`/${locale}/sign-in`} className="hp-btn hp-btn-primary mt-7">
                {t("hp.res.cta")}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {resTiles.map((tile) => (
                <div
                  key={tile.title}
                  className="rounded-[12px] p-4"
                  style={{ background: "#F7FAF9" }}
                >
                  <p className="text-[15px] font-semibold text-[var(--hp-ink)]">{tile.title}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--hp-ink-muted)]">
                    {tile.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="questions" className="scroll-mt-24 bg-white pb-20 md:pb-24">
        <div className="mx-auto max-w-[820px] px-5 md:px-8">
          <h2 className="hp-h2 text-center text-[var(--hp-ink)]">{t("hp.faq.title")}</h2>
          <div className="mt-10 divide-y divide-[var(--hp-border)] border-y border-[var(--hp-border)]">
            {faq.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-2 py-5 text-left transition-colors hover:bg-[#F7FAF9]"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? -1 : i)}
                  >
                    <span className="text-[17px] font-semibold text-[var(--hp-ink)]">{item.q}</span>
                    <span
                      className="shrink-0 text-[22px] font-medium leading-none"
                      style={{ color: "var(--hp-ink-muted)" }}
                      aria-hidden
                    >
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open ? <p className="hp-body px-2 pb-5 text-[16px]">{item.a}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 text-center md:py-24" style={{ background: "var(--hp-black)" }}>
        <div className="hp-wrap mx-auto max-w-3xl">
          <h2 className="hp-h2 text-white" style={{ fontSize: 40 }}>
            {t("hp.cta.title")}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17.5px] leading-[1.6] text-white/85 hp-pretty">
            {t("hp.cta.lead")}
          </p>
          <Link href={`/${locale}/sign-up`} className="hp-btn hp-btn-white mt-9">
            {t("hp.cta.button")}
          </Link>
        </div>
      </section>

      <footer style={{ background: "var(--hp-black-deep)" }}>
        <div className="hp-wrap flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Logo href={`/${locale}`} size="nav" light className="!ml-0 !translate-y-0" />
            <span className="text-[14px] text-white/55">{t("hp.footer.tagline")}</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((l) => (
              <a
                key={l.href + l.label}
                href={l.href}
                className="text-[14.5px] text-white/70 no-underline transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
