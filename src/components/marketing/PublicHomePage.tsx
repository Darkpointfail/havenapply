"use client";

import Link from "next/link";
import { useState } from "react";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { Logo } from "@/components/brand/Logo";
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

const NAV = [
  { href: "#comment", label: "Comment ça marche" },
  { href: "#assistante", label: "L'accompagnement" },
  { href: "#residences", label: "Pour les résidences" },
  { href: "#questions", label: "Questions" },
] as const;

const FAQ = [
  {
    q: "Est-ce que le service est payant pour les familles ?",
    a: "Non. La création du dossier, l'accompagnement et l'envoi des demandes sont gratuits. Ce sont les résidences partenaires qui financent la plateforme.",
  },
  {
    q: "Qui voit les renseignements médicaux de mon proche ?",
    a: "Uniquement les résidences auxquelles vous choisissez d'envoyer le dossier, et seulement à partir du moment où vous appuyez sur « envoyer ». Vous pouvez retirer une demande en tout temps.",
  },
  {
    q: "Faut-il connaître le niveau de soins requis ?",
    a: "Non. L'accompagnatrice pose des questions concrètes sur le quotidien — déplacements, repas, médicaments, mémoire — et en déduit le profil de soins à inscrire au dossier.",
  },
  {
    q: "Et si nous avons déjà une évaluation du CLSC ?",
    a: "Vous la déposez telle quelle. Les renseignements qu'elle contient sont repris dans le dossier et transmis aux résidences avec le reste.",
  },
  {
    q: "Peut-on faire une demande pour plusieurs résidences en même temps ?",
    a: "Oui, c'est l'usage habituel. Vous sélectionnez autant de résidences que vous le souhaitez et suivez chaque réponse séparément.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Vous racontez la situation",
    body: "Une conversation avec notre accompagnatrice remplace le formulaire. Elle pose les questions, vous répondez avec vos mots.",
  },
  {
    n: "2",
    title: "Vous envoyez en un clic",
    body: "Vous comparez prix, services et disponibilités réelles, puis vous cochez les résidences retenues. Le dossier part en ligne à toutes en même temps, avec les pièces jointes.",
  },
  {
    n: "3",
    title: "Vous suivez les réponses en ligne",
    body: "Accusé de réception, position sur la liste d'attente, pièces manquantes, décision. Chaque réponse arrive dans votre espace, sans un seul appel.",
  },
] as const;

const SAVES = [
  {
    bold: "Imprimer, faxer, déposer sur place.",
    rest: " Le dossier est rempli une fois et transmis en ligne à chaque résidence.",
  },
  {
    bold: "Appeler pour savoir où ça en est.",
    rest: " Chaque changement de statut vous est notifié.",
  },
  {
    bold: "Perdre des documents.",
    rest: " Évaluations, procurations, preuves de revenus : tout est conservé au même endroit.",
  },
  {
    bold: "Deviner les prix.",
    rest: " Les coûts affichés sont ceux transmis par les résidences elles-mêmes.",
  },
] as const;

const RES_TILES = [
  {
    title: "Dossiers unifiés",
    body: "Chaque demande arrive complète, avec les pièces et le profil de soins.",
  },
  {
    title: "Liste d'attente",
    body: "Classement automatique par urgence, puis par ancienneté.",
  },
  {
    title: "Documents",
    body: "Relances cadrées et suivi des pièces manquantes au même endroit.",
  },
  {
    title: "Disponibilités",
    body: "Unités libres et délais affichés tels que transmis par votre équipe.",
  },
] as const;

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

function HeroPhoto() {
  const [url, setUrl] = useState<string | null>(null);

  return (
    <label className="block cursor-pointer">
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          height: 440,
          background: url
            ? undefined
            : "repeating-linear-gradient(135deg, #E2F3EF 0 14px, #F1F7F5 14px 28px)",
          border: "1px solid var(--hp-border)",
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="hp-muted max-w-xs">
              Photo chaleureuse : une fille adulte et sa mère âgée, ensemble, à la maison
            </p>
            <p className="text-[13px] font-medium" style={{ color: "var(--hp-green-deep)" }}>
              Déposer une image
            </p>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUrl(URL.createObjectURL(file));
        }}
      />
    </label>
  );
}

function TrackingVisual() {
  const [url, setUrl] = useState<string | null>(null);
  return (
    <label className="block cursor-pointer">
      <div
        className="relative w-full overflow-hidden rounded-[14px]"
        style={{
          height: 400,
          background: url
            ? undefined
            : "repeating-linear-gradient(135deg, #E8EFEC 0 12px, #F7FAF9 12px 24px)",
          border: "1px solid var(--hp-border)",
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-end p-6">
            <div className="hp-card space-y-3 p-4">
              <p className="text-[13px] font-semibold" style={{ color: "var(--hp-ink-muted)" }}>
                Suivi des demandes
              </p>
              {[
                ["Résidence Les Jardins", "En évaluation"],
                ["Maison Sainte-Anne", "Documents reçus"],
                ["Villa du Ruisseau", "Visite planifiée"],
              ].map(([name, status]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5"
                  style={{ background: "#F7FAF9" }}
                >
                  <span className="text-[14.5px] font-semibold">{name}</span>
                  <span
                    className="hp-pill"
                    style={{
                      background: "var(--hp-green-tint)",
                      color: "var(--hp-green-deep)",
                      height: 26,
                      fontSize: 12.5,
                    }}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUrl(URL.createObjectURL(file));
        }}
      />
    </label>
  );
}

export function PublicHomePage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`hp ${sourceSerif.variable} ${publicSans.variable}`}>
      {/* 1. Sticky header */}
      <header className="hp-header">
        <div className="hp-wrap flex h-[68px] items-center justify-between gap-6">
          <Logo href="/" size="nav" className="!ml-0 !translate-y-0" />

          <nav className="hp-desktop-nav flex items-center gap-7">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="hp-nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hp-desktop-nav flex items-center gap-5">
            <Link href="/sign-in" className="hp-btn-ghost">
              Se connecter
            </Link>
            <Link href="/get-started" className="hp-btn hp-btn-primary">
              Commencer
            </Link>
          </div>

          <button
            type="button"
            className="hp-mobile-toggle hp-btn hp-btn-outline"
            aria-expanded={mobileOpen}
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? "Fermer" : "Menu"}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[var(--hp-border)] bg-white px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="hp-nav-link py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <Link href="/sign-in" className="hp-btn-ghost py-2" onClick={() => setMobileOpen(false)}>
                Se connecter
              </Link>
              <Link
                href="/get-started"
                className="hp-btn hp-btn-primary w-full"
                onClick={() => setMobileOpen(false)}
              >
                Commencer
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      {/* 2. Hero — wash */}
      <section style={{ background: "var(--hp-wash)" }}>
        <div className="hp-wrap grid hp-grid-2 items-center gap-12 py-[76px] md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:py-20">
          <div>
            <span
              className="hp-pill"
              style={{ background: "var(--hp-green-bg)", color: "var(--hp-green-deep)" }}
            >
              Demande d&apos;admission 100 % en ligne
            </span>
            <h1 className="hp-h1 mt-6">
              Fini les dossiers papier. Une demande, toutes les résidences.
            </h1>
            <p className="hp-lead mt-6">
              Plus de formulaires papier à imprimer, à faxer ou à déposer sur place. Vous
              remplissez le dossier une seule fois sur HavenApply et vous l&apos;envoyez en ligne
              à toutes les résidences que vous choisissez, d&apos;un même clic.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/get-started" className="hp-btn hp-btn-primary">
                Déposer ma demande en ligne
              </Link>
              <a href="#comment" className="hp-btn hp-btn-outline">
                Voir comment ça marche
              </a>
            </div>
            <p className="hp-muted mt-5">
              Gratuit pour les familles. Aucun déplacement, aucun papier, aucun engagement.
            </p>
          </div>
          <HeroPhoto />
        </div>
      </section>

      {/* 3. Proof band */}
      <section className="border-b border-[var(--hp-border)] bg-white">
        <div className="hp-wrap hp-proof flex flex-wrap items-center gap-11 py-7">
          <p className="hp-muted max-w-[220px]">
            Utilisé par les familles et les résidences du Québec
          </p>
          {[
            ["180+", "résidences partenaires"],
            ["1 envoi", "en ligne au lieu de dix formulaires papier"],
            ["11 jours", "de délai moyen jusqu'à une réponse"],
          ].map(([n, label]) => (
            <div key={n} className="flex items-baseline gap-2.5">
              <span className="hp-serif text-[24px] leading-none text-[var(--hp-ink)]">{n}</span>
              <span className="hp-muted">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Three steps */}
      <section id="comment" className="scroll-mt-24 bg-white py-20 md:py-24">
        <div className="hp-wrap">
          <h2 className="hp-h2 max-w-3xl text-[var(--hp-ink)]">
            Trois étapes, entièrement en ligne
          </h2>
          <p className="hp-body mt-4 max-w-3xl">
            Depuis votre salon, votre téléphone ou la chambre d&apos;hôpital. Vous répondez à des
            questions simples, nous nous occupons de transmettre le dossier.
          </p>
          <div className="hp-grid-3 mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((step) => (
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

      {/* 5. AI companion — black */}
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
              Accompagnement par intelligence artificielle
            </span>
            <h2 className="hp-h2 mt-6 text-white" style={{ fontSize: 40 }}>
              Vous n&apos;êtes pas seul devant le formulaire
            </h2>
            <p className="mt-5 text-[17.5px] leading-[1.6] text-white/85 hp-pretty">
              Claire vous guide par une simple discussion. Elle explique chaque question, remplit
              les champs à votre place et vous dit ce qui manque. Vous pouvez vous arrêter et
              reprendre quand vous voulez.
            </p>
            <ul className="mt-8 space-y-3.5">
              {[
                "Elle traduit le vocabulaire médical et administratif",
                "Elle repère les oublis avant que la résidence les refuse",
                "Elle suggère des résidences adaptées au budget et aux soins requis",
              ].map((line) => (
                <li key={line} className="flex gap-3 text-[16.5px] leading-relaxed text-white/88">
                  <span style={{ color: "var(--hp-green-light)" }} aria-hidden>
                    —
                  </span>
                  <span className="hp-pretty">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hp-card hp-chat-shadow overflow-hidden p-0">
            <div className="flex items-center gap-3 border-b border-[var(--hp-border)] px-5 py-4">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold"
                style={{ background: "var(--hp-green-tint)", color: "var(--hp-green-deep)" }}
              >
                C
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[var(--hp-ink)]">Claire</p>
                <p className="text-[13px] text-[var(--hp-ink-muted)]">
                  Accompagnatrice HavenApply
                </p>
              </div>
            </div>
            <div className="space-y-3.5 bg-white px-5 py-5">
              <div className="max-w-[92%]">
                <div
                  className="px-3.5 py-2.5 text-[14.5px] leading-relaxed text-[var(--hp-ink)]"
                  style={{ background: "#F3F8F6", borderRadius: "12px 12px 12px 4px" }}
                >
                  Bonjour Sophie. Parlons de votre mère. Vit-elle encore à la maison en ce moment
                  ?
                </div>
              </div>
              <div className="flex justify-end">
                <div
                  className="max-w-[88%] px-3.5 py-2.5 text-[14.5px] leading-relaxed text-white"
                  style={{ background: "var(--hp-green)", borderRadius: "12px 12px 4px 12px" }}
                >
                  Elle est à l&apos;hôpital depuis sa chute, ils veulent la transférer d&apos;ici
                  deux semaines.
                </div>
              </div>
              <div className="max-w-[94%]">
                <div
                  className="px-3.5 py-2.5 text-[14.5px] leading-relaxed text-[var(--hp-ink)]"
                  style={{ background: "#F3F8F6", borderRadius: "12px 12px 12px 4px" }}
                >
                  Compris. J&apos;ai noté « hôpital » et j&apos;ai marqué le dossier comme urgent —
                  les résidences le verront en priorité. Est-ce qu&apos;elle a besoin d&apos;aide
                  pour se déplacer ?
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {["Elle marche avec une canne", "Fauteuil roulant", "Je ne sais pas"].map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      className="rounded-[20px] border border-[var(--hp-border)] bg-white px-3 py-1.5 text-[13px] font-medium text-[var(--hp-ink-body)] transition-colors hover:bg-[var(--hp-wash)]"
                    >
                      {s}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. What online sending saves */}
      <section className="bg-white py-20 md:py-24">
        <div className="hp-wrap grid hp-grid-2 items-center gap-12 md:grid-cols-2 md:gap-16">
          <TrackingVisual />
          <div>
            <h2 className="hp-h2 text-[var(--hp-ink)]">Ce que l&apos;envoi en ligne vous épargne</h2>
            <ul className="mt-8 space-y-5">
              {SAVES.map((item) => (
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

      {/* 7. Testimonial — wash */}
      <section style={{ background: "var(--hp-wash)" }} className="py-20 md:py-24">
        <div className="mx-auto max-w-[960px] px-5 md:px-10">
          <blockquote
            className="hp-serif text-center text-[29px] font-normal leading-[1.35] text-[var(--hp-ink)]"
            style={{ fontWeight: 400, textWrap: "pretty" }}
          >
            « On nous a donné deux semaines pour trouver une place. J&apos;ai rempli le dossier un
            soir depuis la chambre d&apos;hôpital, je l&apos;ai envoyé en ligne à six résidences le
            lendemain. Trois ont répondu dans la semaine. »
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full text-[14px] font-semibold"
              style={{ background: "var(--hp-green-tint)", color: "var(--hp-green-deep)" }}
            >
              SL
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[var(--hp-ink)]">Sophie Lévesque</p>
              <p className="hp-muted">Fille de Marguerite, 84 ans — Québec</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Residences block */}
      <section id="residences" className="scroll-mt-24 bg-white py-20 md:py-24">
        <div className="hp-wrap">
          <div className="hp-card grid hp-grid-2 gap-10 p-8 md:grid-cols-2 md:gap-12 md:p-11">
            <div>
              <p
                className="text-[12.5px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--hp-ink-muted)" }}
              >
                Vous gérez une résidence
              </p>
              <h2 className="hp-h2 mt-3 text-[var(--hp-ink)]">
                Recevez des dossiers complets, pas des appels
              </h2>
              <p className="hp-body mt-4">
                La console résidence rassemble les demandes, les documents et la liste
                d&apos;attente. Chaque dossier arrive vérifié et classé par niveau d&apos;urgence.
              </p>
              <Link href="/community/console" className="hp-btn hp-btn-primary mt-7">
                Voir la console résidence
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {RES_TILES.map((tile) => (
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

      {/* 9. FAQ */}
      <section id="questions" className="scroll-mt-24 bg-white pb-20 md:pb-24">
        <div className="mx-auto max-w-[820px] px-5 md:px-8">
          <h2 className="hp-h2 text-center text-[var(--hp-ink)]">Questions fréquentes</h2>
          <div className="mt-10 divide-y divide-[var(--hp-border)] border-y border-[var(--hp-border)]">
            {FAQ.map((item, i) => {
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
                  {open ? (
                    <p className="hp-body px-2 pb-5 text-[16px]">{item.a}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. Final CTA — black */}
      <section className="py-20 text-center md:py-24" style={{ background: "var(--hp-black)" }}>
        <div className="hp-wrap mx-auto max-w-3xl">
          <h2 className="hp-h2 text-white" style={{ fontSize: 40 }}>
            Remplissez ce soir, envoyez en ligne demain matin
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17.5px] leading-[1.6] text-white/85 hp-pretty">
            Créer un compte prend deux minutes. Vous pouvez tout arrêter et reprendre plus tard,
            et rien n&apos;est transmis aux résidences sans votre accord.
          </p>
          <Link href="/get-started" className="hp-btn hp-btn-white mt-9">
            Déposer ma demande en ligne
          </Link>
        </div>
      </section>

      {/* 11. Footer — black-deep */}
      <footer style={{ background: "var(--hp-black-deep)" }}>
        <div className="hp-wrap flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Logo href="/" size="nav" light className="!ml-0 !translate-y-0" />
            <span className="text-[14px] text-white/55">
              Plateforme d&apos;admissions en résidence
            </span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { href: "#comment", label: "Comment ça marche" },
              { href: "#residences", label: "Pour les résidences" },
              { href: "#questions", label: "Questions" },
              { href: "/family/privacy", label: "Confidentialité" },
            ].map((l) => (
              <a
                key={l.href}
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
