"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { Logo } from "@/components/brand/Logo";
import { ResidencesBrowse, ResidenceFiche } from "@/components/family-space/ResidencesPage";
import {
  askAssistant,
  assistantOpener,
  assistantSuggestions,
  type AssistantTurn,
} from "@/data/assistant";
import {
  PROFILE_STEPS,
  RESIDENCES,
  SENIOR,
  TODOS,
  USER,
  INITIAL_APPLICATIONS,
  type FamilyApplication,
  type FamilyDoc,
  type FamilyView,
  type DossierPanel,
  type Residence,
} from "@/data/family-space";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import { putDocBlob } from "@/lib/doc-blobs";
import {
  buildSubmitDraft,
  categoryForFrDocId,
  docsFromVault,
  docsProgressFromVault,
  storeAppToUi,
} from "@/lib/fr-portal-dynamic";
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
  { id: "dossier", label: "Dossier" },
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateProfile, signOut } = useAuth();
  const {
    ready: familyReady,
    data,
    addDocument,
    replaceDocumentFile,
    submitApplication,
    withdrawApplication,
    updateSeniorDraft,
    finalizeSeniorProfile,
  } = useFamilyData();

  const [view, setView] = useState<FamilyView>("accueil");
  const [dossierPanel, setDossierPanel] = useState<DossierPanel>("manage");
  const [resId, setResId] = useState<string | null>(null);
  const [applyStep, setApplyStep] = useState(1);
  const [profileStep, setProfileStep] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [consent, setConsent] = useState(false);
  const [claireOpen, setClaireOpen] = useState(true);
  const [chatFirst, setChatFirst] = useState(false);
  const [claireTyping, setClaireTyping] = useState(false);
  const [chat, setChat] = useState<AssistantTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const claireBootstrapped = useRef(false);
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [ficheFocus, setFicheFocus] = useState<"match" | "full">("full");

  useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const handleSignOut = () => {
    setAccountOpen(false);
    signOut();
    router.replace("/sign-in?signedOut=1");
  };

  const openClaireChat = (opts?: { replaceUrl?: boolean }) => {
    setDossierPanel("create");
    setView("dossier");
    setClaireOpen(true);
    setChatFirst(true);
    setProfileStep((s) => s);
    setChat((prev) =>
      prev.length ? prev : [{ from: "claire", body: assistantOpener(profileStep) }],
    );
    setResId(null);
    if (opts?.replaceUrl !== false) {
      router.replace("/family/dashboard?claire=1", { scroll: false });
    }
    window.setTimeout(() => chatInputRef.current?.focus(), 80);
  };

  useEffect(() => {
    if (claireBootstrapped.current) return;
    const wantsClaire =
      searchParams.get("claire") === "1" ||
      searchParams.get("with") === "claire" ||
      searchParams.get("view") === "profil";
    if (!wantsClaire) return;
    claireBootstrapped.current = true;
    openClaireChat({ replaceUrl: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, claireTyping, view, claireOpen]);

  const displayUser = {
    firstName: user?.firstName || USER.firstName,
    fullName: user?.name || USER.fullName,
    email: user?.email || "",
    initials:
      user?.firstName && user?.lastName
        ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
        : USER.initials,
  };

  const displaySenior = {
    ...SENIOR,
    firstName: data.senior.firstName || SENIOR.firstName,
    lastName: data.senior.lastName || SENIOR.lastName,
    fullName:
      [data.senior.firstName, data.senior.lastName].filter(Boolean).join(" ") || SENIOR.fullName,
  };

  const docs = useMemo(() => docsFromVault(data.documents), [data.documents]);
  const progress = docsProgressFromVault(data.documents);
  const liveApplications = useMemo(() => {
    return data.applications
      .map(storeAppToUi)
      .filter((a): a is FamilyApplication => Boolean(a));
  }, [data.applications]);
  const hasLiveApplications = liveApplications.length > 0;
  const applications = hasLiveApplications ? liveApplications : INITIAL_APPLICATIONS;

  const selectedRes = RESIDENCES.find((r) => r.id === resId) ?? null;
  const hasDossier = Boolean(
    data.seniorCreated || data.senior.firstName || user?.onboardingCompleted,
  );

  useEffect(() => {
    if (!familyReady || !user || user.role !== "family" || seeded) return;
    if (!data.senior.firstName) {
      updateSeniorDraft({
        filledBy: "I'm a family member or friend",
        relationship: "Daughter",
        firstName: "Marguerite",
        lastName: "Lévesque",
        dateOfBirth: "1942-03-12",
        gender: "Female",
        city: "Sillery",
        state: "QC",
      });
      if (user.firstName === "Alex" || !user.firstName) {
        updateProfile({
          firstName: "Sophie",
          lastName: "Lévesque",
          jobTitle: user.jobTitle,
        });
      }
    }
    setSeeded(true);
  }, [familyReady, user, seeded, data.senior.firstName, updateSeniorDraft, updateProfile]);

  useEffect(() => {
    setChat([{ from: "claire", body: assistantOpener(profileStep) }]);
    setChatInput("");
    setClaireTyping(false);
  }, [profileStep]);

  const go = (v: FamilyView) => {
    if (v === "dossier") {
      openDossier();
      return;
    }
    setView(v);
    if (v !== "fiche" && v !== "depot") setResId(null);
    setChatFirst(false);
  };

  const openDossier = (panel?: DossierPanel) => {
    const next =
      panel ??
      (hasDossier ? "manage" : "create");
    setDossierPanel(next);
    if (next === "create") {
      setProfileStep(0);
      setClaireOpen(true);
    }
    if (next === "edit") {
      setClaireOpen(false);
    }
    setView("dossier");
    setResId(null);
  };

  const finishDossierForm = () => {
    finalizeSeniorProfile();
    setDossierPanel("manage");
    setView("dossier");
  };

  const openResidence = (id: string, focus: "match" | "full" = "full") => {
    setResId(id);
    setFicheFocus(focus);
    setView("fiche");
  };

  const startApply = (id: string) => {
    setResId(id);
    setApplyStep(1);
    setSelectedUnit("");
    setConsent(false);
    setView("depot");
  };

  const uploadDoc = async (id: string, file?: File | null) => {
    const category = categoryForFrDocId(id);
    const label = docs.find((d) => d.id === id)?.name || "Document";
    const existing = data.documents.find((d) => d.category === category);
    if (existing) {
      if (file) {
        await putDocBlob(existing.id, file);
        replaceDocumentFile(existing.id, {
          name: file.name || label,
          size: `${Math.round(file.size / 1024)} Ko`,
          sizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
        });
      } else {
        replaceDocumentFile(existing.id, {
          name: existing.name || label,
          size: existing.size || "1 Ko",
          sizeBytes: existing.sizeBytes || 1024,
          mimeType: existing.mimeType || "application/pdf",
        });
      }
      return;
    }
    const docId = addDocument({
      name: file?.name || label,
      category,
      description: docs.find((d) => d.id === id)?.detail,
      hasFile: Boolean(file),
      size: file ? `${Math.round(file.size / 1024)} Ko` : "1 Ko",
      sizeBytes: file?.size || 1024,
      mimeType: file?.type || "application/pdf",
      status: "uploaded",
    });
    if (file && docId) await putDocBlob(docId, file);
  };

  const sendApplication = () => {
    if (!selectedRes || !selectedUnit || !consent) return;
    const draft = buildSubmitDraft({
      residenceId: selectedRes.id,
      residenceName: selectedRes.name,
      unit: selectedUnit,
      userName: displayUser.fullName,
      userEmail: user?.email || "famille@havenapply.local",
      documentIds: data.documents
        .filter((d) => d.hasFile || d.status === "uploaded" || d.status === "verified")
        .map((d) => d.id),
    });
    if (!draft) return;
    const saved = submitApplication(draft);
    if (!saved) {
      window.alert("Une demande est déjà active pour cette résidence. Consultez Mes demandes.");
      setView("demandes");
      return;
    }
    setView("demandes");
  };

  const sendToClaire = async (text: string) => {
    const message = text.trim();
    if (!message || claireTyping) return;
    setChat((c) => [...c, { from: "family", body: message }]);
    setChatInput("");
    setClaireTyping(true);
    const reply = await askAssistant(profileStep, message);
    setChat((c) => [...c, { from: "claire", body: reply }]);
    setClaireTyping(false);
    window.setTimeout(() => chatInputRef.current?.focus(), 40);
    const m = message.toLowerCase();
    if (profileStep === 0) {
      if (m.includes("hôpital") || m.includes("hopital")) {
        updateSeniorDraft({ livingSituation: "hospital" });
      }
      if (m.includes("marguerite")) {
        updateSeniorDraft({ firstName: "Marguerite", lastName: "Lévesque" });
      }
    }
    if (profileStep === 5 && (m.includes("canne") || m.includes("fauteuil"))) {
      updateSeniorDraft({
        livingSituationOther: m.includes("fauteuil") ? "Fauteuil roulant" : "Marche avec canne",
      });
    }
    if (profileStep === 6) finishDossierForm();
  };

  const withdrawAccess = (name: string) => {
    if (!window.confirm(`Retirer l'accès de ${name} au dossier ?`)) return;
    const app = applications.find((a) => a.residenceName === name);
    if (app) withdrawApplication(app.id);
  };

  const withdrawApp = (id: string) => {
    if (!window.confirm("Retirer cette demande ? Cette action est irréversible.")) return;
    withdrawApplication(id);
  };

  return (
    <div className={`fs ${sourceSerif.variable} ${publicSans.variable}`}>
      <header className="fs-header sticky top-0 z-40 text-white">
        <div className="fs-header-inner">
          <div className="flex shrink-0 items-center gap-3">
            <Logo
              href="/family/dashboard"
              size="nav"
              light
              className="!ml-0 !translate-y-0"
            />
            <span className="fs-header-eyebrow hidden lg:inline">Espace famille</span>
          </div>

          <nav className="fs-nav-scroll fs-header-nav min-w-0 flex-1" aria-label="Navigation principale">
            {NAV.map((item) => {
              const active =
                view === item.id ||
                (item.id === "residences" && (view === "fiche" || view === "depot"));
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className={`fs-nav-item shrink-0 ${active ? "fs-nav-item-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div ref={accountRef} className="fs-header-account relative ml-auto shrink-0">
            <button
              type="button"
              className="fs-account-trigger"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => setAccountOpen((v) => !v)}
            >
              <span
                className="fs-account-avatar"
                aria-hidden
              >
                {displayUser.initials}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-[13.5px] font-semibold leading-tight text-white">
                  {displayUser.fullName}
                </span>
                <span className="mt-0.5 block truncate text-[12px] leading-tight text-[#9AABA4]">
                  Dossier de {displaySenior.fullName}
                </span>
              </span>
              <svg
                className={`fs-account-chevron hidden sm:block ${accountOpen ? "fs-account-chevron-open" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2.5 4.5L6 8l3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {accountOpen ? (
              <div role="menu" className="fs-account-menu">
                <div className="border-b border-white/10 px-3.5 py-3">
                  <p className="truncate text-[13.5px] font-semibold text-white">
                    {displayUser.fullName}
                  </p>
                  {displayUser.email ? (
                    <p className="mt-1 truncate text-[12px] text-[#9AABA4]">{displayUser.email}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="fs-account-menu-item"
                  onClick={handleSignOut}
                >
                  Se déconnecter
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="fs-wrap">
        {view === "accueil" && (
          <Accueil
            firstName={displayUser.firstName}
            progress={progress}
            applications={applications}
            hasDossier={hasDossier}
            onOpenDossier={() => openDossier()}
            onCreateDossier={() => openDossier("create")}
            onClaire={openClaireChat}
            onSearch={() => go("residences")}
            onOpenApp={() => go("demandes")}
          />
        )}
        {view === "residences" && (
          <ResidencesBrowse onOpen={openResidence} onApply={startApply} />
        )}
        {view === "fiche" && selectedRes && (
          <ResidenceFiche
            residence={selectedRes}
            focus={ficheFocus}
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
        {view === "dossier" && dossierPanel !== "manage" && (
          <Profil
            mode={dossierPanel === "edit" ? "edit" : "create"}
            step={profileStep}
            setStep={setProfileStep}
            claireOpen={claireOpen}
            setClaireOpen={setClaireOpen}
            chatFirst={chatFirst}
            setChatFirst={setChatFirst}
            claireTyping={claireTyping}
            chat={chat}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatInputRef={chatInputRef}
            chatEndRef={chatEndRef}
            onSend={() => sendToClaire(chatInput)}
            onSuggest={sendToClaire}
            onDone={finishDossierForm}
            onBackToManage={hasDossier ? () => openDossier("manage") : undefined}
          />
        )}
        {view === "dossier" && dossierPanel === "manage" && (
          <Dossier
            seniorName={displaySenior.fullName}
            docs={docs}
            progress={progress}
            photoUrl={photoUrl || data.senior.photoDataUrl || null}
            onPhoto={(f) => f && setPhotoUrl(URL.createObjectURL(f))}
            onUpload={uploadDoc}
            applications={applications}
            onWithdrawAccess={withdrawAccess}
            onEdit={() => openDossier("edit")}
            onCreateNew={() => {
              if (
                window.confirm(
                  "Créer un nouveau dossier ? Vous pourrez toujours revenir modifier le dossier actuel.",
                )
              ) {
                openDossier("create");
              }
            }}
          />
        )}
        {view === "demandes" && (
          <Demandes
            applications={applications}
            isDemo={!hasLiveApplications}
            onWithdraw={withdrawApp}
            onWrite={() => go("assistance")}
            onViewDossier={() => openDossier("manage")}
            onSearch={() => go("residences")}
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
  firstName,
  progress,
  applications,
  hasDossier,
  onOpenDossier,
  onCreateDossier,
  onClaire,
  onSearch,
  onOpenApp,
}: {
  firstName: string;
  progress: { received: number; total: number; percent: number; next: string | null };
  applications: FamilyApplication[];
  hasDossier: boolean;
  onOpenDossier: () => void;
  onCreateDossier: () => void;
  onClaire: () => void;
  onSearch: () => void;
  onOpenApp: () => void;
}) {
  const nextVisit = applications.find((a) => a.visit || a.status === "Visite planifiée");
  const visit = nextVisit?.visit;

  return (
    <div className="flex flex-col gap-6">
      <div className="fs-grid-main grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="fs-card p-7">
          <h1 className="fs-serif text-[34px] leading-tight">Bonjour {firstName}</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            {hasDossier
              ? "Votre dossier d'admission est prêt pour toutes vos demandes. Complétez les pièces manquantes, modifiez les renseignements, ou créez un nouveau dossier."
              : "Créez le dossier d'admission avec Claire, votre accompagnatrice. Ensuite vous pourrez le gérer, le modifier, et l'envoyer aux résidences choisies."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hasDossier ? (
              <>
                <button type="button" className="fs-btn fs-btn-primary" onClick={onOpenDossier}>
                  Gérer le dossier
                </button>
                <button type="button" className="fs-btn fs-btn-outline" onClick={onCreateDossier}>
                  Nouveau dossier
                </button>
              </>
            ) : (
              <>
                <button type="button" className="fs-btn fs-btn-primary" onClick={onClaire}>
                  Créer le dossier avec Claire
                </button>
                <button type="button" className="fs-btn fs-btn-outline" onClick={onOpenDossier}>
                  Remplir le formulaire
                </button>
              </>
            )}
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
          {nextVisit && visit ? (
            <div className="mt-4 flex gap-4">
              <div
                className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center rounded-[10px] text-center"
                style={{ background: "var(--fs-subtle)" }}
              >
                <span className="fs-label">
                  {visit.dateLabel.split(" ")[1] || "Visite"}
                </span>
                <span className="fs-serif text-[28px] leading-none">
                  {visit.dateLabel.split(" ")[0] || "—"}
                </span>
                {visit.timeLabel ? (
                  <span className="mt-1 text-[13px] text-[var(--fs-ink-muted)]">
                    {visit.timeLabel}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{nextVisit.residenceName}</p>
                <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                  {nextVisit.unit} · {nextVisit.city}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="fs-btn fs-btn-outline" onClick={onOpenApp}>
                    Voir le planning
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[14.5px] text-[var(--fs-ink-body)]">
              Aucune visite planifiée pour le moment. Les créneaux confirmés par les résidences
              apparaîtront ici.
            </p>
          )}
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
  mode,
  step,
  setStep,
  claireOpen,
  setClaireOpen,
  chatFirst,
  setChatFirst,
  claireTyping,
  chat,
  chatInput,
  setChatInput,
  chatInputRef,
  chatEndRef,
  onSend,
  onSuggest,
  onDone,
  onBackToManage,
}: {
  mode: "create" | "edit";
  step: number;
  setStep: (n: number) => void;
  claireOpen: boolean;
  setClaireOpen: (v: boolean) => void;
  chatFirst: boolean;
  setChatFirst: (v: boolean) => void;
  claireTyping: boolean;
  chat: AssistantTurn[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatInputRef: RefObject<HTMLInputElement | null>;
  chatEndRef: RefObject<HTMLDivElement | null>;
  onSend: () => void;
  onSuggest: (t: string) => void;
  onDone: () => void;
  onBackToManage?: () => void;
}) {
  const suggestions = assistantSuggestions(step);
  const isLast = step >= PROFILE_STEPS.length - 1;

  const clairePanel = (
    <div
      className={`fs-card flex overflow-hidden ${chatFirst ? "min-h-[min(72vh,720px)] flex-col" : ""}`}
    >
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
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Claire, votre accompagnatrice</p>
          <p className="text-[12px] text-[#8E9B96]">
            {claireTyping
              ? "Claire écrit…"
              : "Discussion en direct — elle remplit le dossier avec vous"}
          </p>
        </div>
        {chatFirst ? (
          <button
            type="button"
            className="shrink-0 rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-medium text-white/85 hover:bg-white/10"
            onClick={() => setChatFirst(false)}
          >
            Voir le formulaire
          </button>
        ) : null}
      </div>
      <div
        className={`space-y-3 overflow-y-auto p-4 ${chatFirst ? "min-h-0 flex-1" : "max-h-[360px]"}`}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
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
        {claireTyping ? (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 text-[13px] text-[var(--fs-ink-muted)]"
              style={{ background: "var(--fs-hover)", borderRadius: "12px 12px 12px 4px" }}
            >
              Claire écrit…
            </div>
          </div>
        ) : null}
        <div ref={chatEndRef} />
      </div>
      <div className="space-y-2 border-t border-[var(--fs-border)] p-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={claireTyping}
              onClick={() => onSuggest(s)}
              className="rounded-[20px] border border-[var(--fs-border)] bg-white px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-[var(--fs-hover)] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <input
            ref={chatInputRef}
            className="fs-input"
            placeholder="Répondre à Claire…"
            value={chatInput}
            disabled={claireTyping}
            onChange={(e) => setChatInput(e.target.value)}
            aria-label="Message à Claire"
          />
          <button
            type="submit"
            className="fs-btn fs-btn-primary"
            disabled={claireTyping || !chatInput.trim()}
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="fs-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="fs-serif text-[28px]">
              {mode === "edit" ? "Modifier le dossier" : "Créer le dossier d'admission"}
            </h1>
            <p className="mt-2 max-w-2xl text-[14.5px] text-[var(--fs-ink-body)]">
              {mode === "edit"
                ? "Mettez à jour les renseignements du dossier. Les changements s'appliquent à toutes vos demandes."
                : chatFirst
                  ? "Discutez avec Claire. Elle pose les questions et remplit le dossier à partir de vos réponses."
                  : "Les renseignements saisis ici forment le dossier transmis aux résidences. Une fois créé, vous le gérez au même endroit."}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-[14px] font-medium text-[var(--fs-ink-muted)]">
              Étape {step + 1} sur {PROFILE_STEPS.length}
            </p>
            {onBackToManage ? (
              <button type="button" className="fs-btn fs-btn-outline" onClick={onBackToManage}>
                Retour au dossier
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--fs-subtle)]">
          <div
            className="h-full rounded-full bg-[var(--fs-green)]"
            style={{ width: `${((step + 1) / PROFILE_STEPS.length) * 100}%` }}
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

      {chatFirst && claireOpen ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="fs-claire-sticky sticky top-[74px] h-fit">{clairePanel}</div>
          <div className="fs-card p-5">
            <p className="fs-label">Aperçu du formulaire</p>
            <p className="mt-2 text-[14px] text-[var(--fs-ink-body)]">
              Claire met à jour ces champs pendant la conversation. Vous pouvez aussi les
              modifier directement.
            </p>
            <div className="mt-4">
              <ProfileStepFields step={step} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--fs-border)] pt-4">
              <button
                type="button"
                className="fs-btn fs-btn-outline"
                onClick={() => setChatFirst(false)}
              >
                Remplir moi-même
              </button>
              <button type="button" className="fs-btn fs-btn-outline" onClick={onDone}>
                Enregistrer et reprendre plus tard
              </button>
              <button
                type="button"
                className="fs-btn fs-btn-primary"
                onClick={() => {
                  if (isLast) {
                    onDone();
                    return;
                  }
                  setStep(Math.min(PROFILE_STEPS.length - 1, step + 1));
                }}
              >
                {isLast
                  ? mode === "edit"
                    ? "Enregistrer le dossier"
                    : "Terminer et gérer le dossier"
                  : "Étape suivante"}
              </button>
            </div>
          </div>
        </div>
      ) : (
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
              <p className="text-[13.5px] text-[var(--fs-ink-muted)]">{PROFILE_STEPS[step]}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="fs-btn fs-btn-outline" onClick={onDone}>
                  Enregistrer et reprendre plus tard
                </button>
                <button
                  type="button"
                  className="fs-btn fs-btn-primary"
                  onClick={() => {
                    if (!claireOpen) {
                      setClaireOpen(true);
                      setChatFirst(true);
                      return;
                    }
                    if (isLast) {
                      onDone();
                      return;
                    }
                    setStep(Math.min(PROFILE_STEPS.length - 1, step + 1));
                  }}
                >
                  {!claireOpen
                    ? "Créer le dossier avec Claire"
                    : isLast
                      ? mode === "edit"
                        ? "Enregistrer le dossier"
                        : "Terminer et gérer le dossier"
                      : "Suivant"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="fs-btn fs-btn-outline self-start"
              onClick={() => {
                if (claireOpen) {
                  setClaireOpen(false);
                  setChatFirst(false);
                } else {
                  setClaireOpen(true);
                  setChatFirst(true);
                }
              }}
            >
              {claireOpen ? "Remplir moi-même" : "Créer le dossier avec Claire"}
            </button>
            {claireOpen ? (
              <aside className="fs-claire-sticky sticky top-[74px] h-fit">{clairePanel}</aside>
            ) : null}
          </div>
        </div>
      )}
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
  seniorName,
  docs,
  progress,
  photoUrl,
  onPhoto,
  onUpload,
  applications,
  onWithdrawAccess,
  onEdit,
  onCreateNew,
}: {
  seniorName: string;
  docs: import("@/data/family-space").FamilyDoc[];
  progress: { received: number; total: number; percent: number; next: string | null };
  photoUrl: string | null;
  onPhoto: (f: File | null) => void;
  onUpload: (id: string, file?: File | null) => void;
  applications: FamilyApplication[];
  onWithdrawAccess: (name: string) => void;
  onEdit: () => void;
  onCreateNew: () => void;
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
              <h1 className="fs-serif text-[28px] leading-tight">{seniorName}</h1>
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
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="fs-btn fs-btn-outline" onClick={onEdit}>
                  Modifier le dossier
                </button>
                <button type="button" className="fs-btn fs-btn-outline" onClick={onCreateNew}>
                  Nouveau dossier
                </button>
              </div>
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
                  <label className="fs-btn fs-btn-outline cursor-pointer">
                    {d.status === "reçu" ? "Remplacer" : "Téléverser"}
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                      onChange={(e) => onUpload(d.id, e.target.files?.[0] ?? null)}
                    />
                  </label>
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
  isDemo,
  onWithdraw,
  onWrite,
  onViewDossier,
  onSearch,
}: {
  applications: FamilyApplication[];
  isDemo?: boolean;
  onWithdraw: (id: string) => void;
  onWrite: () => void;
  onViewDossier: () => void;
  onSearch: () => void;
}) {
  const segments = ["Demande reçue", "Dossier vérifié", "Visite", "Décision"];
  const visits = applications.filter(
    (app) => app.visit || app.status === "Visite planifiée",
  );
  const byStatus = {
    active: applications.length,
    visits: visits.length,
    waiting: applications.filter((a) => a.status === "Liste d'attente").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="fs-card p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="fs-serif text-[28px] leading-tight md:text-[32px]">Mes demandes</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
              Suivez l&apos;évolution de chaque demande envoyée pour votre proche, et retrouvez
              ici les visites déjà planifiées avec les résidences.
            </p>
          </div>
          <button type="button" className="fs-btn fs-btn-primary" onClick={onSearch}>
            Nouvelle demande
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Demandes actives", String(byStatus.active)],
            ["Visites planifiées", String(byStatus.visits)],
            ["Listes d'attente", String(byStatus.waiting)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[12px] px-4 py-3"
              style={{ background: "var(--fs-subtle)" }}
            >
              <p className="fs-label">{label}</p>
              <p className="fs-serif mt-1 text-[28px] leading-none text-[var(--fs-ink)]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="fs-serif text-[22px]">Évolution des demandes</h2>
          {isDemo ? (
            <p className="text-[13px] text-[var(--fs-ink-muted)]">
              Exemple de suivi — vos envois réels apparaîtront ici
            </p>
          ) : null}
        </div>

        {applications.length === 0 ? (
          <div className="fs-card p-8 text-center">
            <h3 className="fs-serif text-[22px]">Aucune demande pour le moment</h3>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-[var(--fs-ink-body)]">
              Quand vous enverrez un dossier à une résidence, son statut et ses prochaines
              étapes s&apos;afficheront ici.
            </p>
            <button type="button" className="fs-btn fs-btn-primary mt-6" onClick={onSearch}>
              Chercher une résidence
            </button>
          </div>
        ) : (
          applications.map((app) => (
            <article key={app.id} className="fs-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="fs-serif text-[22px]">{app.residenceName}</h3>
                  <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                    {app.city} · {app.unit} · déposée le {app.depositedOn}
                  </p>
                </div>
                <StatusPill tone={app.status === "Liste d'attente" ? "neutral" : "green"}>
                  {app.status}
                </StatusPill>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                {segments.map((label, i) => {
                  const done = i <= app.progress;
                  const current = i === app.progress;
                  return (
                    <div key={label}>
                      <div
                        className="h-2 rounded-full"
                        style={{
                          background: done ? "var(--fs-green)" : "var(--fs-border)",
                        }}
                      />
                      <p
                        className="mt-2 text-[12.5px]"
                        style={{
                          color: current ? "var(--fs-ink)" : "var(--fs-ink-muted)",
                          fontWeight: current ? 600 : 400,
                        }}
                      >
                        {label}
                      </p>
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
                {!isDemo ? (
                  <button
                    type="button"
                    className="fs-btn fs-btn-outline"
                    style={{ color: "var(--fs-terra)" }}
                    onClick={() => onWithdraw(app.id)}
                  >
                    Retirer la demande
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="fs-serif text-[22px]">Planning des visites</h2>
        {visits.length === 0 ? (
          <div className="fs-card p-6">
            <p className="text-[15px] text-[var(--fs-ink-body)]">
              Aucune visite n&apos;est encore organisée. Dès qu&apos;une résidence propose un
              créneau, il apparaîtra dans ce planning.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visits.map((app) => {
              const visit = app.visit ?? {
                dateLabel: "Date à confirmer",
                timeLabel: "",
                place: `${app.residenceName} · ${app.city}`,
              };
              const [dayToken, ...monthParts] = visit.dateLabel.split(" ");
              const day = /^\d+$/.test(dayToken) ? dayToken : "—";
              const month = monthParts[0] || "Visite";
              return (
                <article key={`visit-${app.id}`} className="fs-card p-5">
                  <div className="flex gap-4">
                    <div
                      className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center rounded-[12px] text-center"
                      style={{ background: "var(--fs-green-tint)", color: "#0A6F63" }}
                    >
                      <span className="fs-label" style={{ color: "inherit" }}>
                        {month}
                      </span>
                      <span className="fs-serif text-[28px] leading-none">{day}</span>
                      {visit.timeLabel ? (
                        <span className="mt-1 text-[12.5px] font-medium">{visit.timeLabel}</span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <StatusPill tone="green">Visite planifiée</StatusPill>
                      <p className="fs-serif mt-3 text-[18px] leading-snug">{app.residenceName}</p>
                      <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                        {visit.place || `${app.city} · ${app.unit}`}
                      </p>
                      <p className="mt-3 text-[14px] text-[var(--fs-ink-body)]">
                        {visit.dateLabel}
                        {visit.timeLabel ? ` · ${visit.timeLabel}` : ""}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" className="fs-btn fs-btn-outline" onClick={onWrite}>
                          Contacter la résidence
                        </button>
                        <button
                          type="button"
                          className="fs-btn fs-btn-outline"
                          onClick={onViewDossier}
                        >
                          Préparer le dossier
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
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
