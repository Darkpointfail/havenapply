"use client";

import { useEffect, useMemo, useState } from "react";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import {
  askAssistant,
  assistantOpener,
  assistantSuggestions,
  type AssistantTurn,
} from "@/data/assistant";
import {
  docsProgress,
  INITIAL_APPLICATIONS,
  PROFILE_STEPS,
  REQUIRED_DOCS,
  RESIDENCES,
  SENIOR,
  SERVICES,
  TODOS,
  UNIT_TYPES,
  USER,
  type FamilyApplication,
  type FamilyDoc,
  type FamilyView,
  type Residence,
} from "@/data/family-space";
import "./family-space.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-source-serif",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-public-sans",
  display: "swap",
});

const NAV: { id: FamilyView; label: string }[] = [
  { id: "accueil", label: "Accueil" },
  { id: "residences", label: "Résidences" },
  { id: "profil", label: "Créer le profil" },
  { id: "dossier", label: "Notre dossier" },
  { id: "demandes", label: "Mes demandes" },
  { id: "assistance", label: "Assistance" },
];

function StatusPill({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "neutral" | "terra";
}) {
  const styles =
    tone === "terra"
      ? { background: "var(--fs-terra-bg)", color: "var(--fs-terra)" }
      : tone === "neutral"
        ? { background: "var(--fs-subtle)", color: "var(--fs-ink-muted)" }
        : { background: "var(--fs-green-tint)", color: "#0A6F63" };
  return (
    <span className="fs-pill" style={styles}>
      {children}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fs-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function FamilySpace() {
  const [view, setView] = useState<FamilyView>("accueil");
  const [resId, setResId] = useState<string | null>(null);
  const [applyStep, setApplyStep] = useState(1);
  const [profileStep, setProfileStep] = useState(2); // Étape 3 sur 7 as in brief
  const [docs, setDocs] = useState<FamilyDoc[]>(REQUIRED_DOCS);
  const [applications, setApplications] =
    useState<FamilyApplication[]>(INITIAL_APPLICATIONS);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [consent, setConsent] = useState(false);
  const [claireOpen, setClaireOpen] = useState(true);
  const [chat, setChat] = useState<AssistantTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [helpChat, setHelpChat] = useState<AssistantTurn[]>([
    { from: "family", body: "Est-ce que je peux déposer une demande sans le bilan médical ?" },
    {
      from: "claire",
      body: "Oui. La demande est transmise et la résidence voit que la pièce est en attente. Sans bilan médical, l'évaluation d'autonomie ne peut pas être complétée, ce qui retarde la décision d'environ une semaine.",
    },
    { from: "family", body: "Où est-ce que je l'obtiens ?" },
    {
      from: "claire",
      body: "Auprès du médecin de famille ou du CLSC qui suit votre mère. Dès que vous l'avez, téléversez-le dans Notre dossier — toutes vos demandes en cours en profiteront.",
    },
  ]);
  const [helpInput, setHelpInput] = useState("");
  const [unitFilter, setUnitFilter] = useState<string[]>(["3½"]);
  const [serviceFilter, setServiceFilter] = useState<string[]>(["Repas", "Soins infirmiers"]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const progress = docsProgress(docs);
  const selectedRes = RESIDENCES.find((r) => r.id === resId) ?? null;

  useEffect(() => {
    setChat([{ from: "claire", body: assistantOpener(profileStep) }]);
    setChatInput("");
  }, [profileStep]);

  const go = (v: FamilyView) => {
    setView(v);
    if (v !== "fiche" && v !== "depot") setResId(null);
  };

  const openResidence = (id: string) => {
    setResId(id);
    setView("fiche");
  };

  const startApply = (id: string) => {
    setResId(id);
    setApplyStep(1);
    setSelectedUnit("");
    setConsent(false);
    setView("depot");
  };

  const uploadDoc = (id: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "reçu" as const } : d)),
    );
  };

  const sendApplication = () => {
    if (!selectedRes || !selectedUnit || !consent) return;
    const app: FamilyApplication = {
      id: `a-${Date.now()}`,
      residenceId: selectedRes.id,
      residenceName: selectedRes.name,
      city: selectedRes.city.split(",")[0] || selectedRes.city,
      unit: selectedUnit,
      depositedOn: new Date().toLocaleDateString("fr-CA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      status: "Demande reçue",
      progress: 0,
      update: "Demande reçue par la résidence.",
      updateTone: "green",
    };
    setApplications((prev) => [app, ...prev.filter((a) => a.residenceId !== selectedRes.id)]);
    setView("demandes");
  };

  const sendToClaire = async (text: string) => {
    const message = text.trim();
    if (!message) return;
    setChat((c) => [...c, { from: "family", body: message }]);
    setChatInput("");
    const reply = await askAssistant(profileStep, message);
    setChat((c) => [...c, { from: "claire", body: reply }]);
  };

  const withdrawAccess = (name: string) => {
    if (!window.confirm(`Retirer l'accès de ${name} au dossier ?`)) return;
    setApplications((prev) => prev.filter((a) => a.residenceName !== name));
  };

  const withdrawApplication = (id: string) => {
    if (!window.confirm("Retirer cette demande ? Cette action est irréversible.")) return;
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className={`fs ${sourceSerif.variable} ${publicSans.variable}`}>
      <header
        className="sticky top-0 z-40 flex h-[58px] items-center gap-4 px-5 text-white md:px-8"
        style={{ background: "var(--fs-black)" }}
      >
        <div className="flex shrink-0 items-center gap-2.5">
          <span
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-[14px] font-semibold"
            style={{ background: "var(--fs-green)" }}
            aria-hidden
          >
            H
          </span>
          <span className="fs-serif text-[19px]">HavenApply</span>
        </div>

        <nav className="fs-nav-scroll min-w-0 flex-1">
          {NAV.map((item) => {
            const active =
              view === item.id ||
              (item.id === "residences" && (view === "fiche" || view === "depot"));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className="shrink-0 rounded-[7px] px-3 py-2 text-[14px] transition-colors"
                style={{
                  background: active ? "var(--fs-black-soft)" : "transparent",
                  color: active ? "#fff" : "#C5D2CD",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 border-l border-white/15 pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-[13.5px] font-semibold leading-tight">{USER.fullName}</p>
            <p className="text-[12px] leading-tight" style={{ color: "#8E9B96" }}>
              Dossier de {SENIOR.fullName}
            </p>
          </div>
          <span
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[12px] font-semibold"
            style={{ background: "var(--fs-black-soft)", color: "#E2F3EF" }}
          >
            {USER.initials}
          </span>
        </div>
      </header>

      <div className="fs-wrap">
        {view === "accueil" && (
          <Accueil
            progress={progress}
            applications={applications}
            onComplete={() => go("dossier")}
            onSearch={() => go("residences")}
            onOpenApp={() => go("demandes")}
          />
        )}
        {view === "residences" && (
          <Residences
            unitFilter={unitFilter}
            setUnitFilter={setUnitFilter}
            serviceFilter={serviceFilter}
            setServiceFilter={setServiceFilter}
            onOpen={openResidence}
            onApply={startApply}
          />
        )}
        {view === "fiche" && selectedRes && (
          <Fiche
            residence={selectedRes}
            onBack={() => go("residences")}
            onApply={() => startApply(selectedRes.id)}
          />
        )}
        {view === "depot" && selectedRes && (
          <Depot
            residence={selectedRes}
            step={applyStep}
            setStep={setApplyStep}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            docs={docs}
            consent={consent}
            setConsent={setConsent}
            onBack={() => openResidence(selectedRes.id)}
            onSend={sendApplication}
          />
        )}
        {view === "profil" && (
          <Profil
            step={profileStep}
            setStep={setProfileStep}
            claireOpen={claireOpen}
            setClaireOpen={setClaireOpen}
            chat={chat}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSend={() => sendToClaire(chatInput)}
            onSuggest={sendToClaire}
          />
        )}
        {view === "dossier" && (
          <Dossier
            docs={docs}
            progress={progress}
            photoUrl={photoUrl}
            onPhoto={(f) => f && setPhotoUrl(URL.createObjectURL(f))}
            onUpload={uploadDoc}
            applications={applications}
            onWithdrawAccess={withdrawAccess}
            onEdit={() => go("profil")}
          />
        )}
        {view === "demandes" && (
          <Demandes
            applications={applications}
            onWithdraw={withdrawApplication}
            onWrite={() => go("assistance")}
            onViewDossier={() => go("dossier")}
          />
        )}
        {view === "assistance" && (
          <Assistance
            chat={helpChat}
            input={helpInput}
            setInput={setHelpInput}
            onSend={() => {
              if (!helpInput.trim()) return;
              setHelpChat((c) => [
                ...c,
                { from: "family", body: helpInput.trim() },
                {
                  from: "claire",
                  body: "Merci. Un conseiller pourra préciser si besoin — en attendant, vérifiez Notre dossier pour les pièces manquantes.",
                },
              ]);
              setHelpInput("");
            }}
          />
        )}
      </div>
    </div>
  );
}

function Accueil({
  progress,
  applications,
  onComplete,
  onSearch,
  onOpenApp,
}: {
  progress: ReturnType<typeof docsProgress>;
  applications: FamilyApplication[];
  onComplete: () => void;
  onSearch: () => void;
  onOpenApp: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="fs-grid-main grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="fs-card p-7">
          <h1 className="fs-serif text-[34px] leading-tight">Bonjour {USER.firstName}</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            Le dossier de votre mère est prêt pour toutes vos demandes. Deux pièces restent à
            ajouter avant que les résidences puissent l&apos;évaluer.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="fs-btn fs-btn-primary" onClick={onComplete}>
              Compléter le dossier
            </button>
            <button type="button" className="fs-btn fs-btn-outline" onClick={onSearch}>
              Chercher une résidence
            </button>
          </div>
        </div>
        <div className="fs-card p-6" style={{ background: "var(--fs-subtle)" }}>
          <p className="fs-label">Dossier complété</p>
          <p className="fs-serif mt-3 text-[42px] leading-none">{progress.percent} %</p>
          <p className="mt-2 text-[13.5px] text-[var(--fs-ink-muted)]">
            {progress.received} pièces sur {progress.total}
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress.percent}%`, background: "var(--fs-green)" }}
            />
          </div>
          <p className="mt-4 text-[14.5px] text-[var(--fs-ink-body)]">
            Prochaine action : ajouter {progress.next ?? "les dernières précisions"}.
          </p>
        </div>
      </div>

      <div>
        <h2 className="fs-serif text-[22px]">Vos demandes en cours</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {applications.slice(0, 3).map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={onOpenApp}
              className="fs-card p-5 text-left transition-colors hover:bg-[var(--fs-hover)]"
            >
              <StatusPill
                tone={
                  app.status === "Liste d'attente"
                    ? "neutral"
                    : app.status === "Visite planifiée"
                      ? "green"
                      : "green"
                }
              >
                {app.status}
              </StatusPill>
              <p className="fs-serif mt-3 text-[19px] leading-snug">{app.residenceName}</p>
              <p className="mt-1 text-[13.5px] text-[var(--fs-ink-muted)]">
                {app.city} · {app.unit}
              </p>
              <p className="mt-3 text-[14px] text-[var(--fs-ink-body)]">{app.update}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="fs-grid-main grid gap-5 lg:grid-cols-2">
        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">Prochaine visite</h3>
          <div className="mt-4 flex gap-4">
            <div
              className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center rounded-[10px] text-center"
              style={{ background: "var(--fs-subtle)" }}
            >
              <span className="fs-label">Septembre</span>
              <span className="fs-serif text-[28px] leading-none">3</span>
              <span className="mt-1 text-[13px] text-[var(--fs-ink-muted)]">14 h 00</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{RESIDENCES[0].name}</p>
              <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                {RESIDENCES[0].unitType} · Sainte-Foy
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="fs-btn fs-btn-outline">
                  Déplacer
                </button>
                <button type="button" className="fs-btn fs-btn-outline">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">À faire</h3>
          <ul className="mt-4 divide-y divide-[var(--fs-border-faint)]">
            {TODOS.map((t) => (
              <li key={t.label} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background:
                        t.tone === "terra"
                          ? "var(--fs-terra)"
                          : t.tone === "green"
                            ? "var(--fs-green)"
                            : "var(--fs-border)",
                    }}
                  />
                  <span className="text-[14.5px]">{t.label}</span>
                </div>
                <span className="text-[13px] text-[var(--fs-ink-muted)]">{t.owner}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Residences({
  unitFilter,
  setUnitFilter,
  serviceFilter,
  setServiceFilter,
  onOpen,
  onApply,
}: {
  unitFilter: string[];
  setUnitFilter: (v: string[]) => void;
  serviceFilter: string[];
  setServiceFilter: (v: string[]) => void;
  onOpen: (id: string) => void;
  onApply: (id: string) => void;
}) {
  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  return (
    <div className="fs-grid-search grid gap-6 lg:grid-cols-[290px_1fr]">
      <aside className="fs-card sticky top-[74px] h-fit p-5">
        <p className="fs-label">Critères</p>
        <div className="mt-4 space-y-5">
          <Field label="Secteur">
            <input className="fs-input" defaultValue="Québec et Lévis" />
          </Field>
          <div>
            <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Type d&apos;unité</p>
            <div className="flex flex-wrap gap-2">
              {UNIT_TYPES.map((u) => {
                const on = unitFilter.includes(u);
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => toggle(unitFilter, u, setUnitFilter)}
                    className="fs-pill"
                    style={{
                      background: on ? "var(--fs-green-tint)" : "var(--fs-subtle)",
                      color: on ? "#0A6F63" : "var(--fs-ink-muted)",
                      borderColor: on ? "transparent" : "var(--fs-border)",
                      cursor: "pointer",
                    }}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Budget mensuel</p>
            <p className="text-[14.5px] font-medium">jusqu&apos;à 3 700 $</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--fs-subtle)]">
              <div className="h-full w-[62%] rounded-full bg-[var(--fs-green)]" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Services requis</p>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => {
                const on = serviceFilter.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(serviceFilter, s, setServiceFilter)}
                    className="fs-pill"
                    style={{
                      background: on ? "var(--fs-green-tint)" : "var(--fs-subtle)",
                      color: on ? "#0A6F63" : "var(--fs-ink-muted)",
                      borderColor: on ? "transparent" : "var(--fs-border)",
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--fs-ink-muted)]">
            Votre dossier est déjà prêt : déposer une demande prend moins d&apos;une minute par
            résidence.
          </p>
        </div>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14.5px] text-[var(--fs-ink-muted)]">
            3 résidences correspondent à vos critères
          </p>
          <p className="text-[14px] font-medium">Trier par disponibilité</p>
        </div>
        <div className="space-y-4">
          {RESIDENCES.map((r) => (
            <article
              key={r.id}
              className="fs-card grid overflow-hidden md:grid-cols-[300px_1fr]"
            >
              <div
                className="min-h-[180px]"
                style={{
                  background:
                    "repeating-linear-gradient(135deg, #E2F3EF 0 12px, #F7FAF9 12px 24px)",
                }}
              />
              <div className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="fs-serif text-[23px] leading-tight">{r.name}</h3>
                    <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                      {r.city} · {r.units} unités
                    </p>
                  </div>
                  <StatusPill tone={r.badgeTone === "green" ? "green" : "neutral"}>
                    {r.badge}
                  </StatusPill>
                </div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
                  {r.description}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[10px] bg-[var(--fs-subtle)] px-3 py-2.5">
                    <p className="text-[13px] text-[var(--fs-ink-muted)]">{r.unitType}</p>
                    <p className="fs-serif mt-0.5 text-[18px]">{r.price}</p>
                  </div>
                  <div className="rounded-[10px] bg-[var(--fs-subtle)] px-3 py-2.5">
                    <p className="text-[13px] text-[var(--fs-ink-muted)]">Délai</p>
                    <p className="mt-0.5 text-[15px] font-semibold">{r.response}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="fs-btn fs-btn-primary"
                    onClick={() => onApply(r.id)}
                  >
                    Déposer une demande
                  </button>
                  <button
                    type="button"
                    className="fs-btn fs-btn-outline"
                    onClick={() => onOpen(r.id)}
                  >
                    Voir la résidence
                  </button>
                  <button type="button" className="fs-btn fs-btn-outline">
                    Comparer
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fiche({
  residence,
  onBack,
  onApply,
}: {
  residence: Residence;
  onBack: () => void;
  onApply: () => void;
}) {
  const units = useMemo(
    () => [
      {
        type: residence.unitType,
        area: residence.area,
        price: residence.price,
        avail: residence.availability,
        tone: residence.availabilityTone,
      },
      { type: "2½", area: "480 pi²", price: "2 850 $/mois", avail: "Complet", tone: "terra" as const },
      { type: "1½", area: "320 pi²", price: "2 200 $/mois", avail: "2 libres", tone: "green" as const },
    ],
    [residence],
  );

  return (
    <div className="flex flex-col gap-4">
      <button type="button" className="fs-btn-ghost w-fit" onClick={onBack}>
        ← Retour aux résultats
      </button>
      <div className="fs-card overflow-hidden">
        <div
          className="h-[320px] w-full"
          style={{
            background:
              "repeating-linear-gradient(135deg, #E2F3EF 0 14px, #F1F7F5 14px 28px)",
          }}
        />
        <div className="p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="fs-serif text-[30px] leading-tight">{residence.name}</h1>
              <p className="mt-2 text-[14.5px] text-[var(--fs-ink-muted)]">
                {residence.city} · {residence.units} unités · {residence.response}
              </p>
            </div>
            <StatusPill tone={residence.badgeTone === "green" ? "green" : "neutral"}>
              {residence.badge}
            </StatusPill>
          </div>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            {residence.description}
          </p>

          <div className="fs-grid-main mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="overflow-hidden rounded-[12px] border border-[var(--fs-border)]">
              <div className="bg-[var(--fs-subtle)] px-4 py-3">
                <p className="fs-serif text-[19px]">Types d&apos;unités et prix indicatifs</p>
              </div>
              <div
                className="grid gap-3 border-b border-[var(--fs-border)] bg-[var(--fs-subtle)] px-4 py-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[var(--fs-ink-muted)]"
                style={{ gridTemplateColumns: "1.2fr 1fr 1.1fr 1fr" }}
              >
                <span>Type</span>
                <span>Superficie</span>
                <span>Prix indicatif</span>
                <span>Disponibilité</span>
              </div>
              {units.map((u) => (
                <div
                  key={u.type}
                  className="grid gap-3 border-b border-[var(--fs-border-faint)] px-4 py-3 last:border-0"
                  style={{ gridTemplateColumns: "1.2fr 1fr 1.1fr 1fr" }}
                >
                  <span className="font-semibold">{u.type}</span>
                  <span className="text-[var(--fs-ink-muted)]">{u.area}</span>
                  <span>{u.price}</span>
                  <span
                    style={{
                      color: u.tone === "terra" ? "var(--fs-terra)" : "var(--fs-success)",
                      fontWeight: 600,
                    }}
                  >
                    {u.avail}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="fs-label mb-3">Services inclus</p>
                <div className="flex flex-wrap gap-2">
                  {residence.services.map((s) => (
                    <span
                      key={s}
                      className="fs-pill"
                      style={{
                        background: "var(--fs-subtle)",
                        borderColor: "var(--fs-border)",
                        color: "var(--fs-ink)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[12px] p-5" style={{ background: "var(--fs-subtle)" }}>
                <p className="text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
                  Votre dossier est déjà constitué. Le déposer auprès de cette résidence prend
                  moins d&apos;une minute.
                </p>
                <button type="button" className="fs-btn fs-btn-primary mt-4 w-full" onClick={onApply}>
                  Déposer une demande
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Depot({
  residence,
  step,
  setStep,
  selectedUnit,
  setSelectedUnit,
  docs,
  consent,
  setConsent,
  onBack,
  onSend,
}: {
  residence: Residence;
  step: number;
  setStep: (n: number) => void;
  selectedUnit: string;
  setSelectedUnit: (v: string) => void;
  docs: FamilyDoc[];
  consent: boolean;
  setConsent: (v: boolean) => void;
  onBack: () => void;
  onSend: () => void;
}) {
  const missing = docs.filter((d) => d.status === "en attente");
  const options = [
    {
      type: residence.unitType,
      price: residence.price,
      avail: residence.availability,
    },
    { type: "2½", price: "2 850 $/mois", avail: "Complet" },
    { type: "1½", price: "2 200 $/mois", avail: "2 libres" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <button type="button" className="fs-btn-ghost" onClick={onBack}>
        ← Retour à la résidence
      </button>
      <div className="fs-card mt-4 p-7">
        <div className="flex items-center justify-between gap-3">
          <h1 className="fs-serif text-[28px]">Dépôt d&apos;une demande</h1>
          <p className="text-[14px] text-[var(--fs-ink-muted)]">Étape {step} sur 3</p>
        </div>
        <p className="mt-2 text-[14.5px] text-[var(--fs-ink-muted)]">{residence.name}</p>

        {step === 1 && (
          <div className="mt-6 space-y-3">
            <h2 className="fs-serif text-[20px]">Choix de l&apos;unité</h2>
            {options.map((o) => {
              const on = selectedUnit === o.type;
              return (
                <button
                  key={o.type}
                  type="button"
                  onClick={() => setSelectedUnit(o.type)}
                  className="flex w-full items-center justify-between rounded-[10px] border px-4 py-4 text-left"
                  style={{
                    borderColor: on ? "var(--fs-green)" : "var(--fs-border)",
                    background: on ? "var(--fs-green-tint)" : "var(--fs-surface)",
                  }}
                >
                  <div>
                    <p className="font-semibold">{o.type}</p>
                    <p className="text-[13.5px] text-[var(--fs-ink-muted)]">{o.avail}</p>
                  </div>
                  <p className="fs-serif text-[18px]">{o.price}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="mt-6">
            <h2 className="fs-serif text-[20px]">Vérification du dossier</h2>
            <p className="mt-2 text-[14.5px] text-[var(--fs-ink-body)]">
              Les renseignements et pièces suivants seront transmis à {residence.name}.
            </p>
            <ul className="mt-4 divide-y divide-[var(--fs-border-faint)]">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-3">
                  <span>{d.name}</span>
                  <span
                    style={{
                      color: d.status === "reçu" ? "var(--fs-success)" : "var(--fs-terra)",
                      fontWeight: 600,
                      fontSize: 13.5,
                    }}
                  >
                    {d.status === "reçu" ? "Reçu" : "En attente"}
                  </span>
                </li>
              ))}
            </ul>
            {missing.length > 0 ? (
              <p
                className="mt-4 rounded-[10px] px-4 py-3 text-[14px]"
                style={{ background: "var(--fs-terra-bg)", color: "var(--fs-terra)" }}
              >
                Attention : {missing.length} pièce{missing.length > 1 ? "s" : ""} manquante
                {missing.length > 1 ? "s" : ""}. La résidence pourra quand même ouvrir le dossier.
              </p>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <h2 className="fs-serif text-[20px]">Confirmation d&apos;envoi</h2>
            <dl className="space-y-2 text-[14.5px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--fs-ink-muted)]">Résidence</dt>
                <dd className="font-medium">{residence.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--fs-ink-muted)]">Unité</dt>
                <dd className="font-medium">{selectedUnit}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--fs-ink-muted)]">Emménagement souhaité</dt>
                <dd className="font-medium">{SENIOR.emmenagement}</dd>
              </div>
            </dl>
            <label className="flex items-start gap-3 rounded-[10px] bg-[var(--fs-subtle)] p-4 text-[14.5px]">
              <input
                type="checkbox"
                className="mt-1"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Je consens au partage du dossier de {SENIOR.fullName} avec cette résidence, y
                compris les pièces jointes.
              </span>
            </label>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--fs-border)] pt-5">
          <button
            type="button"
            className="fs-btn fs-btn-outline"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
          >
            Précédent
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="fs-btn fs-btn-primary"
              disabled={step === 1 && !selectedUnit}
              onClick={() => setStep(step + 1)}
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              className="fs-btn fs-btn-primary"
              disabled={!consent || !selectedUnit}
              onClick={onSend}
            >
              Envoyer la demande
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Profil({
  step,
  setStep,
  claireOpen,
  setClaireOpen,
  chat,
  chatInput,
  setChatInput,
  onSend,
  onSuggest,
}: {
  step: number;
  setStep: (n: number) => void;
  claireOpen: boolean;
  setClaireOpen: (v: boolean) => void;
  chat: AssistantTurn[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  onSuggest: (t: string) => void;
}) {
  const suggestions = assistantSuggestions(step);

  return (
    <div className="flex flex-col gap-5">
      <div className="fs-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="fs-serif text-[28px]">Création du profil d&apos;admission</h1>
            <p className="mt-2 max-w-2xl text-[14.5px] text-[var(--fs-ink-body)]">
              Les renseignements saisis ici forment le dossier transmis aux résidences. Vous
              pouvez interrompre et reprendre en tout temps.
            </p>
          </div>
          <p className="text-[14px] font-medium text-[var(--fs-ink-muted)]">
            Étape {step + 1} sur 7
          </p>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--fs-subtle)]">
          <div
            className="h-full rounded-full bg-[var(--fs-green)]"
            style={{ width: `${((step + 1) / 7) * 100}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROFILE_STEPS.map((label, i) => {
            const on = i === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className="fs-pill"
                style={{
                  background: on ? "var(--fs-black)" : "var(--fs-subtle)",
                  color: on ? "#fff" : "var(--fs-ink-muted)",
                  cursor: "pointer",
                }}
              >
                {i + 1}. {label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`fs-grid-main grid gap-5 ${claireOpen ? "lg:grid-cols-[1fr_372px]" : ""}`}
      >
        <div className="fs-card p-6">
          <ProfileStepFields step={step} />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--fs-border)] pt-5">
            <button
              type="button"
              className="fs-btn fs-btn-outline"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Précédent
            </button>
            <p className="text-[13.5px] text-[var(--fs-ink-muted)]">
              {PROFILE_STEPS[step]}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="fs-btn fs-btn-outline">
                Enregistrer et reprendre plus tard
              </button>
              <button
                type="button"
                className="fs-btn fs-btn-primary"
                disabled={step === 6}
                onClick={() => setStep(Math.min(6, step + 1))}
              >
                Suivant
              </button>
            </div>
          </div>
          <button
            type="button"
            className="fs-btn-ghost mt-4 text-[13px]"
            onClick={() => setClaireOpen(!claireOpen)}
          >
            {claireOpen ? "Remplir moi-même" : "Reprendre avec Claire"}
          </button>
        </div>

        {claireOpen ? (
          <aside className="fs-claire-sticky sticky top-[74px] h-fit">
            <div className="fs-card overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3.5 text-white"
                style={{ background: "var(--fs-black)" }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold"
                  style={{ background: "var(--fs-black-soft)" }}
                >
                  C
                </span>
                <div>
                  <p className="text-[14px] font-semibold">Claire, votre accompagnatrice</p>
                  <p className="text-[12px] text-[#8E9B96]">Elle remplit le formulaire avec vous</p>
                </div>
              </div>
              <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
                {chat.map((m, i) => (
                  <div
                    key={`${i}-${m.body.slice(0, 12)}`}
                    className={`flex ${m.from === "family" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[90%] px-3 py-2 text-[14px] leading-relaxed"
                      style={
                        m.from === "family"
                          ? {
                              background: "var(--fs-green)",
                              color: "#fff",
                              borderRadius: "12px 12px 4px 12px",
                            }
                          : {
                              background: "var(--fs-hover)",
                              borderRadius: "12px 12px 12px 4px",
                            }
                      }
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-[var(--fs-border)] p-3">
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSuggest(s)}
                      className="rounded-[20px] border border-[var(--fs-border)] bg-white px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-[var(--fs-hover)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="fs-input"
                    placeholder="Répondre à Claire…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSend();
                    }}
                  />
                  <button type="button" className="fs-btn fs-btn-primary" onClick={onSend}>
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function ProfileStepFields({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Nom", "Lévesque"],
          ["Prénom", "Marguerite"],
          ["Second prénom", ""],
          ["Prénom d'usage", "Marguerite"],
          ["Date de naissance", "12 mars 1942"],
          ["Numéro d'assurance sociale", ""],
          ["Sexe", "Féminin"],
          ["Affiliation religieuse (facultatif)", ""],
        ].map(([label, value]) => (
          <Field key={label} label={label}>
            <input className="fs-input" defaultValue={value} />
          </Field>
        ))}
        <div className="sm:col-span-2">
          <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">État civil</p>
          <div className="flex flex-wrap gap-4 text-[14.5px]">
            {["Célibataire", "Mariée", "Veuve", "Divorcée"].map((s) => (
              <label key={s} className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={s === "Veuve"} />
                {s}
              </label>
            ))}
          </div>
        </div>
        {[
          ["Adresse actuelle", "1840 rue des Érables"],
          ["Ville", "Québec"],
          ["Province", "Québec"],
          ["Code postal", "G1V 2M4"],
        ].map(([label, value]) => (
          <Field key={label} label={label}>
            <input className="fs-input" defaultValue={value} />
          </Field>
        ))}
        <div className="sm:col-span-2">
          <p className="mb-2 text-[13px] text-[var(--fs-ink-muted)]">Lieu actuel</p>
          <div className="flex flex-wrap gap-4 text-[14.5px]">
            {["Domicile", "Hôpital", "Résidence avec services", "Autre"].map((s) => (
              <label key={s} className="flex items-center gap-2">
                <input type="radio" name="lieu" defaultChecked={s === "Hôpital"} />
                {s}
              </label>
            ))}
          </div>
        </div>
        {[
          ["Maison funéraire préférée", ""],
          ["Ville", ""],
          ["Téléphone", ""],
        ].map(([label, value]) => (
          <Field key={label} label={label}>
            <input className="fs-input" defaultValue={value} />
          </Field>
        ))}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        {["Contact principal", "Personne responsable (garant financier)", "Contact secondaire"].map(
          (section) => (
            <div key={section}>
              <h3 className="fs-serif mb-3 text-[19px]">{section}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {["Nom", "Lien", "Adresse", "Cellulaire", "Téléphone", "Courriel"].map((f) => (
                  <Field key={`${section}-${f}`} label={f}>
                    <input
                      className="fs-input"
                      defaultValue={
                        section === "Contact principal" && f === "Nom"
                          ? "Sophie Lévesque"
                          : section === "Contact principal" && f === "Lien"
                            ? "Fille"
                            : ""
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          ),
        )}
        <div>
          <h3 className="fs-serif mb-3 text-[19px]">Médecin traitant et pharmacie</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {["Médecin traitant", "Téléphone médecin", "Pharmacie", "Téléphone pharmacie"].map(
              (f) => (
                <Field key={f} label={f}>
                  <input className="fs-input" />
                </Field>
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          "Mandat de protection",
          "Procuration",
          "Curatelle",
          "Directives médicales anticipées",
          "Nom du mandataire",
        ].map((f) => (
          <Field key={f} label={f}>
            <input className="fs-input" />
          </Field>
        ))}
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          "Assurance maladie",
          "Assurance privée",
          "Numéro de police",
          "Assurance vie",
          "Préarrangements funéraires",
        ].map((f) => (
          <Field key={f} label={f}>
            <input className="fs-input" defaultValue={f === "Assurance maladie" ? "RAMQ" : ""} />
          </Field>
        ))}
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Revenus mensuels", ""],
          ["Sources", ""],
          ["Garant financier", "Sophie Lévesque"],
          ["Mode de paiement", ""],
          ["Crédit d'impôt pour maintien à domicile", ""],
        ].map(([f, v]) => (
          <Field key={f} label={f}>
            <input className="fs-input" defaultValue={v} />
          </Field>
        ))}
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Autonomie", SENIOR.autonomie],
          ["Mobilité", "Marche avec une canne"],
          ["Aide — repas", ""],
          ["Aide — hygiène", ""],
          ["Aide — habillage", ""],
          ["Aide — médication", "Oui"],
          ["Diagnostics", ""],
          ["Allergies", ""],
          ["Médication", ""],
          ["Mémoire et orientation", ""],
          ["Comportements à signaler", ""],
          ["Régime alimentaire", ""],
        ].map(([f, v]) => (
          <Field key={f} label={f}>
            <input className="fs-input" defaultValue={v} />
          </Field>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[14.5px] text-[var(--fs-ink-body)]">
        Récapitulatif du dossier de {SENIOR.fullName}. Vérifiez les renseignements avant de
        signer.
      </p>
      <label className="flex items-start gap-3 rounded-[10px] bg-[var(--fs-subtle)] p-4">
        <input type="checkbox" className="mt-1" />
        <span className="text-[14.5px]">
          Je consens au partage du dossier avec les résidences choisies.
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Signature du demandeur ou du mandataire">
          <input className="fs-input" placeholder="Nom complet" />
        </Field>
        <Field label="Date">
          <input className="fs-input" defaultValue="28 août 2026" />
        </Field>
      </div>
    </div>
  );
}

function Dossier({
  docs,
  progress,
  photoUrl,
  onPhoto,
  onUpload,
  applications,
  onWithdrawAccess,
  onEdit,
}: {
  docs: FamilyDoc[];
  progress: ReturnType<typeof docsProgress>;
  photoUrl: string | null;
  onPhoto: (f: File | null) => void;
  onUpload: (id: string) => void;
  applications: FamilyApplication[];
  onWithdrawAccess: (name: string) => void;
  onEdit: () => void;
}) {
  return (
    <div className="fs-grid-main grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-5">
        <div className="fs-card p-6">
          <div className="flex flex-wrap gap-5">
            <label className="cursor-pointer">
              <div
                className="overflow-hidden rounded-lg bg-[var(--fs-subtle)]"
                style={{ width: 132, height: 158 }}
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-center text-[12px] text-[var(--fs-ink-faint)]">
                    Ajouter une photo
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
              />
              <p className="mt-2 max-w-[132px] text-[12px] text-[var(--fs-ink-faint)]">
                Visible par les résidences
              </p>
            </label>
            <div className="min-w-0 flex-1">
              <h1 className="fs-serif text-[28px] leading-tight">{SENIOR.fullName}</h1>
              <p className="mt-2 text-[14.5px] text-[var(--fs-ink-muted)]">
                {SENIOR.age} ans · {SENIOR.city} · dossier créé le {SENIOR.dossierCreated}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ["Niveau d'autonomie", SENIOR.autonomie],
                  ["Services souhaités", SENIOR.services],
                  ["Budget mensuel", SENIOR.budget],
                  ["Emménagement souhaité", SENIOR.emmenagement],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="fs-label">{l}</p>
                    <p className="mt-1 text-[15px] font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <button type="button" className="fs-btn fs-btn-outline mt-5" onClick={onEdit}>
                Modifier les renseignements
              </button>
            </div>
          </div>
        </div>

        <div className="fs-card p-6">
          <h2 className="fs-serif text-[22px]">Documents</h2>
          <p className="mt-1 text-[13.5px] text-[var(--fs-ink-muted)]">
            {progress.received} pièces sur {progress.total} · les mêmes pièces servent à toutes
            vos demandes
          </p>
          <ul className="mt-5 divide-y divide-[var(--fs-border-faint)]">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background:
                        d.status === "reçu" ? "var(--fs-success)" : "var(--fs-terra)",
                    }}
                  />
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-[13px] text-[var(--fs-ink-muted)]">{d.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-[13.5px] font-semibold"
                    style={{
                      color: d.status === "reçu" ? "var(--fs-success)" : "var(--fs-terra)",
                    }}
                  >
                    {d.status === "reçu" ? "Reçu" : "En attente"}
                  </span>
                  <button
                    type="button"
                    className="fs-btn fs-btn-outline"
                    onClick={() => onUpload(d.id)}
                  >
                    {d.status === "reçu" ? "Remplacer" : "Téléverser"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="fs-card p-6 text-white" style={{ background: "var(--fs-black)" }}>
          <p className="fs-label" style={{ color: "#8E9B96" }}>
            Avancement du dossier
          </p>
          <p className="fs-serif mt-3 text-[44px] leading-none">{progress.percent} %</p>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${progress.percent}%`, background: "var(--fs-green-light)" }}
            />
          </div>
          <p className="mt-4 text-[14px] text-[#C5D2CD]">
            {progress.next
              ? `Prochaine pièce à fournir : ${progress.next}.`
              : "Toutes les pièces exigées sont reçues."}
          </p>
        </div>

        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">Qui voit ce dossier</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
            Seules les résidences auprès desquelles vous déposez une demande y ont accès. Vous
            pouvez retirer un accès en tout temps.
          </p>
          <ul className="mt-4 divide-y divide-[var(--fs-border-faint)]">
            {applications.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-[14.5px] font-medium">{a.residenceName}</span>
                <button
                  type="button"
                  className="text-[13.5px] font-semibold text-[var(--fs-ink-muted)] hover:text-[var(--fs-terra)]"
                  onClick={() => onWithdrawAccess(a.residenceName)}
                >
                  Retirer l&apos;accès
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Demandes({
  applications,
  onWithdraw,
  onWrite,
  onViewDossier,
}: {
  applications: FamilyApplication[];
  onWithdraw: (id: string) => void;
  onWrite: () => void;
  onViewDossier: () => void;
}) {
  const segments = ["Demande reçue", "Dossier vérifié", "Visite", "Décision"];

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <article key={app.id} className="fs-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="fs-serif text-[22px]">{app.residenceName}</h2>
              <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                {app.city} · {app.unit} · demande déposée le {app.depositedOn}
              </p>
            </div>
            <StatusPill
              tone={app.status === "Liste d'attente" ? "neutral" : "green"}
            >
              {app.status}
            </StatusPill>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {segments.map((label, i) => {
              const done = i <= app.progress;
              return (
                <div key={label}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: done ? "var(--fs-green)" : "var(--fs-border)",
                    }}
                  />
                  <p className="mt-2 text-[12.5px] text-[var(--fs-ink-muted)]">{label}</p>
                </div>
              );
            })}
          </div>

          <div
            className="mt-5 rounded-[10px] px-4 py-3 text-[14.5px]"
            style={{
              background:
                app.updateTone === "terra"
                  ? "var(--fs-terra-bg)"
                  : app.updateTone === "neutral"
                    ? "var(--fs-subtle)"
                    : "var(--fs-green-tint)",
              color:
                app.updateTone === "terra"
                  ? "var(--fs-terra)"
                  : app.updateTone === "neutral"
                    ? "var(--fs-ink-body)"
                    : "#0A6F63",
            }}
          >
            {app.update}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="fs-btn fs-btn-outline" onClick={onWrite}>
              Écrire à la résidence
            </button>
            <button type="button" className="fs-btn fs-btn-outline" onClick={onViewDossier}>
              Voir le dossier transmis
            </button>
            <button
              type="button"
              className="fs-btn fs-btn-outline"
              style={{ color: "var(--fs-terra)" }}
              onClick={() => onWithdraw(app.id)}
            >
              Retirer la demande
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Assistance({
  chat,
  input,
  setInput,
  onSend,
}: {
  chat: AssistantTurn[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
}) {
  const faqs = [
    "RPA ou CHSLD : quelle différence ?",
    "Combien de demandes simultanées ?",
    "Crédit d'impôt pour maintien à domicile",
    "Comment préparer une visite ?",
  ];

  return (
    <div className="fs-grid-main grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="fs-card flex min-h-[480px] flex-col p-5">
        <h2 className="fs-serif text-[22px]">Assistance</h2>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {chat.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from === "family" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[85%] px-3.5 py-2.5 text-[14.5px] leading-relaxed"
                style={
                  m.from === "family"
                    ? {
                        background: "var(--fs-black)",
                        color: "#E8F0ED",
                        borderRadius: "12px 12px 4px 12px",
                      }
                    : {
                        background: "var(--fs-subtle)",
                        border: "1px solid var(--fs-border)",
                        borderRadius: "12px 12px 12px 4px",
                      }
                }
              >
                {m.body}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="fs-input"
            placeholder="Poser une question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
          />
          <button type="button" className="fs-btn fs-btn-primary" onClick={onSend}>
            Envoyer
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">Questions fréquentes</h3>
          <ul className="mt-4 divide-y divide-[var(--fs-border-faint)]">
            {faqs.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  className="w-full py-3 text-left text-[14.5px] font-medium hover:text-[var(--fs-green)]"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">Parler à une personne</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
            Un conseiller peut vous accompagner par téléphone du lundi au vendredi, de 8 h à
            18 h.
          </p>
          <button type="button" className="fs-btn fs-btn-primary mt-4 w-full">
            Demander un appel
          </button>
        </div>
      </div>
    </div>
  );
}
