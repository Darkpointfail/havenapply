"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Source_Serif_4, Public_Sans } from "next/font/google";
import { ResidencesBrowse, ResidenceFiche } from "@/components/family-space/ResidencesPage";
import { DossiersView } from "@/components/family-space/DossiersView";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import {
  askAssistant,
  assistantOpener,
  type AssistantTurn,
} from "@/data/assistant";
import {
  RESIDENCES,
  REQUIRED_DOCS,
  buildNextSteps,
  buildProfileFromSenior,
  createEmptyProfile,
  familyPatchToSenior,
  hasInProgressFamilyDossier,
  isFamilyProfileSelf,
  mapRequiredDocsFromDocuments,
  profileDisplayName,
  computeFamilyDossierCompleteness,
  type FamilyApplication,
  type FamilyDoc,
  type FamilyNextStep,
  type FamilyProfile,
  type FamilyView,
  type DossierMode,
  type Residence,
  type FamilyDossierCompleteness,
} from "@/data/family-space";
import { useAuth } from "@/lib/auth";
import { useFamilyData } from "@/lib/family-data";
import { applyFamilyPatchToDossier, wizardFieldsFromDossier } from "@/lib/family-dossier-wizard";
import { careProfileFromFamilyInputs, getMatchReadiness } from "@/lib/family-residence-match";
import {
  loadFamilyWizardDraft,
  saveFamilyWizardDraft,
} from "@/lib/family-wizard-draft";
import { buildSubmitDraft, categoryForFrDocId, storeAppToUi } from "@/lib/fr-portal-dynamic";
import { useT } from "@/lib/i18n/locale";
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

const NAV: { id: FamilyView; labelKey: string }[] = [
  { id: "accueil", labelKey: "Home" },
  { id: "residences", labelKey: "Residences" },
  { id: "dossier", labelKey: "Files" },
  { id: "demandes", labelKey: "My requests" },
  { id: "assistance", labelKey: "Assistance" },
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

export function FamilySpace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const { user, updateProfile, signOut } = useAuth();
  const {
    data,
    submitApplication,
    withdrawApplication,
    updateSeniorDraft,
    updateResidentDossier,
    saveResidentDossier,
    saveStatus,
    saveError,
    uploadVaultDocument,
    deleteVaultDocument,
  } = useFamilyData();
  const [view, setView] = useState<FamilyView>("accueil");
  const [mode, setMode] = useState<DossierMode>("overview");
  const [localDraft, setLocalDraft] = useState<FamilyProfile | null>(() => loadFamilyWizardDraft());
  const [activeProfileId, setActiveProfileId] = useState("");
  const [resId, setResId] = useState<string | null>(null);
  const [applyStep, setApplyStep] = useState(1);
  const [profileStep, setProfileStep] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [consent, setConsent] = useState(false);
  const [claireOpen, setClaireOpen] = useState(false);
  const [claireTyping, setClaireTyping] = useState(false);
  const [chat, setChat] = useState<AssistantTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountEditing, setAccountEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const accountRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const claireBootstrapped = useRef(false);
  const dossierSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dossierDraftRef = useRef(data.residentDossier);

  useEffect(() => {
    dossierDraftRef.current = data.residentDossier;
  }, [data.residentDossier]);
  const [helpChat, setHelpChat] = useState<AssistantTurn[]>([
    {
      from: "claire",
      body: "Bonjour. Je peux vous aider avec votre dossier, vos documents ou vos demandes. Posez votre question.",
    },
  ]);
  const [helpInput, setHelpInput] = useState("");
  const [ficheFocus, setFicheFocus] = useState<"match" | "full">("full");

  useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
        setAccountEditing(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAccountOpen(false);
        setAccountEditing(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const startAccountEdit = () => {
    setEditFirstName(user?.firstName || "");
    setEditLastName(user?.lastName || "");
    setEditPhone(user?.phone || "");
    setEditRelationship(data.senior.relationship || "Fille");
    setAccountEditing(true);
  };

  const saveAccountEdit = () => {
    const first = editFirstName.trim() || user?.firstName || "";
    updateProfile({
      firstName: first,
      lastName: editLastName.trim(),
      phone: editPhone.trim(),
    });
    updateSeniorDraft({
      relationship: editRelationship.trim() || data.senior.relationship || "Famille",
    });
    setAccountEditing(false);
    setAccountOpen(false);
  };

  const handleSignOut = () => {
    setAccountOpen(false);
    setAccountEditing(false);
    signOut();
    router.replace("/sign-in?signedOut=1");
  };

  const openClaireChat = (opts?: { replaceUrl?: boolean }) => {
    setView("dossier");
    setMode("edition");
    setClaireOpen(true);
    setProfileStep(0);
    setChat([
      {
        from: "claire",
        body: assistantOpener(0, {
          forSelf: activeProfile ? isFamilyProfileSelf(activeProfile) : false,
        }),
      },
    ]);
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
    const raw = (searchParams.get("view") || "").toLowerCase();
    if (!raw || raw === "profil") return;
    const map: Record<string, FamilyView> = {
      accueil: "accueil",
      residences: "residences",
      residence: "residences",
      fiche: "fiche",
      dossier: "dossier",
      dossiers: "dossier",
      demandes: "demandes",
      applications: "demandes",
      assistance: "assistance",
      messages: "assistance",
    };
    const next = map[raw];
    if (!next) return;
    setView(next);
    if (next === "dossier") {
      setMode("overview");
      setClaireOpen(false);
    }
  }, [searchParams]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, claireTyping, view, claireOpen]);

  const displayUser = useMemo(() => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName =
      user?.name?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      "";
    const initials =
      firstName && lastName
        ? `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
        : firstName
          ? firstName[0]!.toUpperCase()
          : "?";
    return {
      firstName,
      fullName,
      email: user?.email || "",
      initials,
    };
  }, [user]);

  const liveDocs = useMemo(
    () => mapRequiredDocsFromDocuments(data.documents),
    [data.documents],
  );

  const liveApplications = useMemo(() => {
    return data.applications
      .map(storeAppToUi)
      .filter((a): a is FamilyApplication => Boolean(a));
  }, [data.applications]);
  const applications = liveApplications;

  const accessesFromApps = useMemo(
    () =>
      applications.map((a) => ({
        residenceId: a.residenceId,
        residenceName: a.residenceName,
        city: a.city,
      })),
    [applications],
  );

  const profiles = useMemo(() => {
    const inProgress = hasInProgressFamilyDossier(data.senior, data.residentDossier);
    const fromSenior = buildProfileFromSenior(data.senior, liveDocs, accessesFromApps, {
      allowIncomplete: inProgress || Boolean(localDraft),
    });
    if (fromSenior) {
      const fromDossier = wizardFieldsFromDossier(data.residentDossier);
      const hydrated: FamilyProfile = {
        ...fromSenior,
        ...fromDossier,
        autonomie: data.residentDossier.autonomyLevel?.trim() || fromSenior.autonomie,
        autonomyScore: fromDossier.autonomyScore ?? fromSenior.autonomyScore,
      };
      if (localDraft && localDraft.id === hydrated.id) {
        const merged: FamilyProfile = {
          ...hydrated,
          ...localDraft,
          prenom: localDraft.prenom || hydrated.prenom,
          nom: localDraft.nom || hydrated.nom,
          docs: liveDocs.length ? liveDocs : localDraft.docs,
          accesses: accessesFromApps.length ? accessesFromApps : localDraft.accesses,
          draft: localDraft.draft && !(data.senior.firstName && data.senior.lastName),
          searchSector: localDraft.searchSector?.trim() || hydrated.searchSector,
          searchRadiusKm: localDraft.searchRadiusKm ?? hydrated.searchRadiusKm,
          searchBudgetMax: localDraft.searchBudgetMax ?? hydrated.searchBudgetMax,
          searchSize:
            localDraft.searchSize && localDraft.searchSize !== "any"
              ? localDraft.searchSize
              : hydrated.searchSize || "any",
          searchMinRating: localDraft.searchMinRating ?? hydrated.searchMinRating,
          priorityCare: localDraft.priorityCare ?? hydrated.priorityCare,
          priorityGeo: localDraft.priorityGeo ?? hydrated.priorityGeo,
          priorityBudget: localDraft.priorityBudget ?? hydrated.priorityBudget,
          prioritySize: localDraft.prioritySize ?? hydrated.prioritySize,
          priorityRating: localDraft.priorityRating ?? hydrated.priorityRating,
          autonomyScore: localDraft.autonomyScore ?? hydrated.autonomyScore,
          autonomie:
            localDraft.autonomie && localDraft.autonomie !== "À préciser"
              ? localDraft.autonomie
              : hydrated.autonomie,
        };
        return [merged];
      }
      return [hydrated];
    }
    if (localDraft) {
      return [{ ...localDraft, docs: liveDocs.length ? liveDocs : localDraft.docs }];
    }
    return [];
  }, [data.senior, data.residentDossier, liveDocs, accessesFromApps, localDraft]);

  useEffect(() => {
    if (data.senior.firstName?.trim() && data.senior.lastName?.trim()) {
      setLocalDraft((prev) => (prev?.draft ? { ...prev, draft: false } : prev));
    }
  }, [data.senior.firstName, data.senior.lastName]);

  // Keep wizard draft durable across leave/refresh
  useEffect(() => {
    if (!localDraft) return;
    saveFamilyWizardDraft(localDraft);
  }, [localDraft]);

  useEffect(() => {
    if (!profiles.length) {
      setActiveProfileId("");
      return;
    }
    if (!profiles.some((p) => p.id === activeProfileId)) {
      setActiveProfileId(profiles[0]!.id);
    }
  }, [profiles, activeProfileId]);

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  useEffect(() => {
    if (
      activeProfile &&
      !activeProfile.draft &&
      activeProfile.prenom.trim() &&
      activeProfile.nom.trim()
    ) {
      saveFamilyWizardDraft({ ...activeProfile, draft: false });
    }
  }, [activeProfile]);

  const dossierCompleteness = useMemo(
    () => computeFamilyDossierCompleteness(activeProfile),
    [activeProfile],
  );

  const nextSteps = useMemo(
    () =>
      buildNextSteps({
        hasSeniorProfile: profiles.length > 0 && !activeProfile?.draft,
        docs: activeProfile?.docs ?? liveDocs,
        applicationsCount: applications.length,
        ownerLabel: displayUser.firstName || "Vous",
        forSelf: activeProfile ? isFamilyProfileSelf(activeProfile) : false,
        fieldNext: dossierCompleteness.next,
      }),
    [
      profiles.length,
      activeProfile,
      liveDocs,
      applications.length,
      displayUser.firstName,
      dossierCompleteness.next,
    ],
  );

  const selectedRes = RESIDENCES.find((r) => r.id === resId) ?? null;

  const careProfile = useMemo(
    () =>
      careProfileFromFamilyInputs({
        ville: activeProfile?.ville || data.senior.city,
        budget: activeProfile?.budget,
        budgetMax: data.senior.budgetMax,
        autonomie: activeProfile?.autonomie,
        autonomyScore: activeProfile?.autonomyScore,
        aideHygiene: activeProfile?.aideHygiene,
        aideMedication: activeProfile?.aideMedication,
        mobilite: activeProfile?.mobilite,
        services: activeProfile?.services,
        searchZones: data.senior.searchZones,
        searchCriteria: activeProfile
          ? {
              sector: activeProfile.searchSector,
              radiusKm: activeProfile.searchRadiusKm ?? Number.POSITIVE_INFINITY,
              budgetMax: activeProfile.searchBudgetMax,
              size: activeProfile.searchSize,
              minGoogleRating: activeProfile.searchMinRating,
              priorities: {
                care: activeProfile.priorityCare,
                geo: activeProfile.priorityGeo,
                budget: activeProfile.priorityBudget,
                size: activeProfile.prioritySize,
                rating: activeProfile.priorityRating,
              },
            }
          : null,
        draft: false,
      }),
    [activeProfile, data.senior],
  );

  const matchReadiness = useMemo(() => getMatchReadiness(careProfile), [careProfile]);

  const headerDossierCaption =
    profiles.length > 1
      ? `${profiles.length} dossiers actifs`
      : activeProfile
        ? `Dossier de ${profileDisplayName(activeProfile)}`
        : "Aucun dossier";

  useEffect(() => {
    if (!claireOpen) return;
    setChat([
      {
        from: "claire",
        body: assistantOpener(profileStep, {
          forSelf: activeProfile ? isFamilyProfileSelf(activeProfile) : false,
        }),
      },
    ]);
    setChatInput("");
    setClaireTyping(false);
  }, [profileStep, claireOpen, activeProfile]);

  const go = (v: FamilyView) => {
    setView(v);
    if (v === "dossier") {
      setMode("overview");
      setClaireOpen(false);
    }
    if (v !== "fiche" && v !== "depot") setResId(null);
  };

  const openDossier = (nextMode: DossierMode = "overview") => {
    setMode(nextMode);
    setView("dossier");
    setResId(null);
    if (nextMode === "edition") {
      setProfileStep(0);
      setClaireOpen(false);
    }
  };

  const createProfile = () => {
    if (profiles.some((p) => !p.draft)) {
      setMode("edition");
      setProfileStep(0);
      setClaireOpen(false);
      setView("dossier");
      return;
    }
    const id = "p-senior";
    const draft = createEmptyProfile(id);
    setLocalDraft(draft);
    saveFamilyWizardDraft(draft);
    setActiveProfileId(id);
    const now = new Date().toISOString();
    updateResidentDossier({ startedAt: data.residentDossier.startedAt || now });
    dossierDraftRef.current = {
      ...dossierDraftRef.current,
      startedAt: dossierDraftRef.current.startedAt || now,
    };
    saveResidentDossier(dossierDraftRef.current);
    setMode("edition");
    setProfileStep(0);
    setClaireOpen(false);
    setView("dossier");
  };

  const patchActive = (patch: Partial<FamilyProfile>) => {
    setLocalDraft((prev) => {
      if (prev && prev.id === activeProfileId) {
        return { ...prev, ...patch };
      }
      // Keep an overlay draft so wizard fields remain editable before/after senior hydrate.
      const base =
        profiles.find((p) => p.id === activeProfileId) ??
        createEmptyProfile(activeProfileId || "p-senior");
      return { ...base, ...patch, id: activeProfileId || base.id };
    });

    const seniorPatch = familyPatchToSenior(patch);
    if (
      seniorPatch.zip != null &&
      String(seniorPatch.zip).trim() &&
      !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(String(seniorPatch.zip).trim())
    ) {
      delete seniorPatch.zip;
    }
    if (Object.keys(seniorPatch).length > 0) {
      updateSeniorDraft(seniorPatch);
    }

    const nextDossier = applyFamilyPatchToDossier(dossierDraftRef.current, patch);
    dossierDraftRef.current = nextDossier;
    updateResidentDossier(nextDossier);
    if (dossierSaveTimer.current) clearTimeout(dossierSaveTimer.current);
    dossierSaveTimer.current = setTimeout(() => {
      saveResidentDossier(dossierDraftRef.current);
    }, 450);
  };

  const selectProfile = (id: string) => {
    setActiveProfileId(id);
    setMode("overview");
    setProfileStep(0);
    setClaireOpen(false);
  };

  const uploadProfileDoc = (docId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void uploadVaultDocument({
        file,
        category: categoryForFrDocId(docId),
        description: REQUIRED_DOCS.find((d) => d.id === docId)?.detail || "",
      }).then((ok) => {
        if (!ok) {
          window.alert(saveError || "Le fichier n'a pas pu être téléversé.");
        }
      });
    };
    input.click();
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
    const reply = await askAssistant(profileStep, message, {
      forSelf: activeProfile ? isFamilyProfileSelf(activeProfile) : false,
    });
    setChat((c) => [...c, { from: "claire", body: reply }]);
    setClaireTyping(false);
    window.setTimeout(() => chatInputRef.current?.focus(), 40);
    const m = message.toLowerCase();
    if (profileStep === 0) {
      if (m.includes("moi-même") || m.includes("moi-meme") || m.includes("pour moi")) {
        patchActive({
          profileSubject: "self",
          rel: "Moi-même",
          prenom: activeProfile?.prenom || displayUser.firstName || "",
          nom: activeProfile?.nom || "",
        });
      } else if (m.includes("proche") || m.includes("parent")) {
        patchActive({ profileSubject: "proche" });
      }
      if (m.includes("hôpital") || m.includes("hopital")) {
        patchActive({ meta: "Dossier urgent · hôpital" });
      }
    }
  };

  const withdrawAccess = (residenceId: string) => {
    const app = data.applications.find(
      (a) => a.residenceId === residenceId && a.status !== "draft" && a.status !== "withdrawn",
    );
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
          <a href="/family/dashboard" className="fs-brand" aria-label={t("HavenApply home")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/favicon-48-v6.png"
              alt=""
              width={40}
              height={40}
              className="fs-brand-mark"
            />
            <span className="fs-brand-name">HavenApply</span>
          </a>

          <nav className="fs-nav-scroll fs-header-nav" aria-label={t("Navigation menu")}>
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
                  {t(item.labelKey)}
                </button>
              );
            })}
          </nav>

          <div className="fs-header-tools flex shrink-0 items-center gap-2">
            <LanguageSwitcher
              compact
              className="!border-white/20 !bg-white/10 !text-white [&_button]:!text-white/75 [&_button[aria-pressed=true]]:!bg-white/20 [&_button[aria-pressed=true]]:!text-white"
            />
          <div ref={accountRef} className="fs-header-account relative shrink-0">
            <button
              type="button"
              className="fs-account-trigger"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => {
                setAccountOpen((v) => !v);
                setAccountEditing(false);
              }}
            >
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-[15px] font-semibold leading-tight text-white">
                  {displayUser.fullName}
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] leading-tight text-[#9AABA4]">
                  {headerDossierCaption}
                </span>
              </span>
              <span className="fs-account-avatar" aria-hidden>
                {displayUser.initials}
              </span>
            </button>
            {accountOpen ? (
              <div role="menu" className="fs-account-menu">
                {accountEditing ? (
                  <div className="space-y-3 p-3.5">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#9AABA4]">
                        Profil contact
                      </p>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9AABA4]">
                        Ces renseignements sont associés à votre compte famille
                        comme contact principal.
                      </p>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">Prénom</span>
                      <input
                        className="fs-account-input"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">Nom</span>
                      <input
                        className="fs-account-input"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">Courriel</span>
                      <input
                        className="fs-account-input"
                        value={displayUser.email}
                        disabled
                        readOnly
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">Téléphone</span>
                      <input
                        className="fs-account-input"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="418 555-0198"
                        autoComplete="tel"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">
                        Lien avec le proche
                      </span>
                      <select
                        className="fs-account-input"
                        value={editRelationship}
                        onChange={(e) => setEditRelationship(e.target.value)}
                      >
                        {["Fille", "Fils", "Conjoint", "Conjointe", "Autre proche", "Moi-même"].map(
                          (opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        className="fs-account-menu-item flex-1 !py-2 text-center text-white/85"
                        onClick={() => setAccountEditing(false)}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-[8px] px-3 py-2 text-[13.5px] font-semibold text-white"
                        style={{ background: "var(--fs-green)" }}
                        onClick={saveAccountEdit}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-white/10 px-3.5 py-3">
                      <p className="truncate text-[13.5px] font-semibold text-white">
                        {displayUser.fullName}
                      </p>
                      {displayUser.email ? (
                        <p className="mt-1 truncate text-[12px] text-[#9AABA4]">
                          {displayUser.email}
                        </p>
                      ) : null}
                      {user?.phone ? (
                        <p className="mt-1 truncate text-[12px] text-[#9AABA4]">{user.phone}</p>
                      ) : null}
                      {data.senior.relationship ? (
                        <p className="mt-1 text-[12px] text-[#9AABA4]">
                          Contact · {data.senior.relationship}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-account-menu-item"
                      onClick={startAccountEdit}
                    >
                      Mon profil
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-account-menu-item"
                      onClick={() => {
                        setAccountOpen(false);
                        router.push("/family/settings");
                      }}
                    >
                      Paramètres
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-account-menu-item"
                      onClick={() => {
                        setAccountOpen(false);
                        router.push("/family/privacy");
                      }}
                    >
                      Confidentialité et données
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-account-menu-item"
                      onClick={handleSignOut}
                    >
                      Se déconnecter
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
          </div>
        </div>
      </header>

      <div className="fs-wrap">
        {view === "accueil" && (
          <Accueil
            firstName={displayUser.firstName}
            dossierCompleteness={dossierCompleteness}
            saveStatus={saveStatus}
            saveError={saveError}
            applications={applications}
            nextSteps={nextSteps}
            hasProfile={Boolean(activeProfile && !activeProfile.draft)}
            hasDossier={Boolean(activeProfile)}
            onOpenDossier={() => (profiles.length ? openDossier("edition") : createProfile())}
            onSearch={() => go("residences")}
            onOpenApp={() => go("demandes")}
          />
        )}
        {view === "residences" && (
          <ResidencesBrowse
            careProfile={careProfile}
            matchReady={matchReadiness.ready}
            matchMissing={matchReadiness.missing}
            onOpen={openResidence}
            onApply={startApply}
            onCompleteDossier={() => openDossier("edition")}
          />
        )}
        {view === "fiche" && selectedRes && (
          <ResidenceFiche
            residence={selectedRes}
            careProfile={careProfile}
            matchReady={matchReadiness.ready}
            matchMissing={matchReadiness.missing}
            focus={ficheFocus}
            onBack={() => go("residences")}
            onApply={() => startApply(selectedRes.id)}
            onCompleteDossier={() => openDossier("edition")}
          />
        )}
        {view === "depot" && selectedRes && (
          <Depot
            residence={selectedRes}
            step={applyStep}
            setStep={setApplyStep}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            docs={activeProfile?.docs ?? liveDocs}
            seniorName={
              activeProfile ? profileDisplayName(activeProfile) : "votre proche"
            }
            moveLabel={activeProfile?.move || "À préciser"}
            consent={consent}
            setConsent={setConsent}
            onBack={() => openResidence(selectedRes.id)}
            onSend={sendApplication}
          />
        )}
        {view === "dossier" && (
          <DossiersView
            profiles={profiles}
            activeProfileId={activeProfileId}
            mode={mode}
            profileStep={profileStep}
            claireOpen={claireOpen}
            chat={chat}
            chatInput={chatInput}
            claireTyping={claireTyping}
            onSelectProfile={selectProfile}
            onCreateProfile={createProfile}
            onSetMode={setMode}
            onSetStep={setProfileStep}
            onPatchActive={patchActive}
            onUploadDoc={uploadProfileDoc}
            onWithdrawAccess={withdrawAccess}
            onToggleClaire={() => {
              setClaireOpen((v) => {
                const next = !v;
                if (next && chat.length === 0) {
                  setChat([
                    {
                      from: "claire",
                      body: assistantOpener(profileStep, {
                        forSelf: activeProfile ? isFamilyProfileSelf(activeProfile) : false,
                      }),
                    },
                  ]);
                }
                return next;
              });
            }}
            onChatInput={setChatInput}
            onSendChat={() => sendToClaire(chatInput)}
            onSuggest={sendToClaire}
            accountUser={{
              firstName: user?.firstName || displayUser.firstName || "",
              lastName: user?.lastName || "",
              email: displayUser.email,
            }}
          />
        )}
        {view === "demandes" && (
          <Demandes
            applications={applications}
            onWithdraw={withdrawApp}
            onWrite={() => go("assistance")}
            onViewDossier={() => openDossier("overview")}
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
                  body: "Merci. Un conseiller pourra préciser si besoin — en attendant, vérifiez les pièces manquantes dans Dossiers.",
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
  dossierCompleteness,
  saveStatus,
  saveError,
  applications,
  nextSteps,
  hasProfile,
  hasDossier,
  onOpenDossier,
  onSearch,
  onOpenApp,
}: {
  firstName: string;
  dossierCompleteness: FamilyDossierCompleteness;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  applications: FamilyApplication[];
  nextSteps: FamilyNextStep[];
  hasProfile: boolean;
  hasDossier: boolean;
  onOpenDossier: () => void;
  onSearch: () => void;
  onOpenApp: () => void;
}) {
  const nextVisit = applications.find((a) => a.visit || a.status === "Visite planifiée");
  const displayPercent = hasDossier ? dossierCompleteness.percent : 0;
  const nextAction = hasDossier
    ? dossierCompleteness.next
    : "Créer un dossier (pour vous ou un proche)";
  const intro = !hasDossier
    ? "Créez un dossier — pour vous-même ou pour un proche — afin de déposer des demandes auprès des résidences partenaires."
    : dossierCompleteness.next
      ? `Poursuivez votre dossier. Prochaine action : ${dossierCompleteness.next.charAt(0).toLowerCase()}${dossierCompleteness.next.slice(1)}.`
      : "Votre dossier est à jour. Vous pouvez chercher une résidence ou suivre vos demandes en cours.";

  return (
    <div className="flex flex-col gap-6">
      <div className="fs-grid-main grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="fs-card p-7">
          <h1 className="fs-serif text-[34px] leading-tight">
            {firstName.trim() ? `Bonjour ${firstName.trim()}` : "Bonjour"}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            {intro}
          </p>
          {saveStatus === "saving" ? (
            <p className="mt-3 text-[13px] text-[var(--fs-ink-muted)]">Sauvegarde en cours…</p>
          ) : null}
          {saveStatus === "error" && saveError ? (
            <p className="mt-3 text-[13px] text-[#b4533a]" role="alert">
              {saveError}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="fs-btn fs-btn-primary" onClick={onOpenDossier}>
              {hasProfile || hasDossier ? "Compléter le dossier" : "Créer un dossier"}
            </button>
            <button type="button" className="fs-btn fs-btn-outline" onClick={onSearch}>
              Chercher une résidence
            </button>
          </div>
        </div>
        <div className="fs-card p-6" style={{ background: "var(--fs-subtle)" }}>
          <p className="fs-label">Dossier complété</p>
          <p className="fs-serif mt-3 text-[42px] leading-none">{displayPercent} %</p>
          <p className="mt-2 text-[13.5px] text-[var(--fs-ink-muted)]">
            {hasDossier
              ? `${dossierCompleteness.fieldsDone} sections sur ${dossierCompleteness.fieldsTotal} · ${dossierCompleteness.docsReceived} pièces sur ${dossierCompleteness.docsTotal}`
              : `0 sections · 0 pièces sur ${dossierCompleteness.docsTotal}`}
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full"
              style={{ width: `${displayPercent}%`, background: "var(--fs-green)" }}
            />
          </div>
          <p className="mt-4 text-[14.5px] text-[var(--fs-ink-body)]">
            Prochaine action :{" "}
            {nextAction
              ? `${nextAction.charAt(0).toLowerCase()}${nextAction.slice(1)}`
              : "aucune"}
            .
          </p>
        </div>
      </div>

      <div>
        <h2 className="fs-serif text-[22px]">Vos demandes en cours</h2>
        {applications.length === 0 ? (
          <div className="fs-card mt-4 p-8 text-center">
            <h3 className="fs-serif text-[20px]">
              Pour pouvoir appliquer, merci de compléter votre dossier
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] text-[var(--fs-ink-body)]">
              Une fois votre dossier prêt, vous pourrez déposer une demande auprès d&apos;une
              résidence et suivre son avancement ici.
            </p>
            <button type="button" className="fs-btn fs-btn-primary mt-5" onClick={onOpenDossier}>
              {hasProfile || hasDossier ? "Compléter le dossier" : "Créer un dossier"}
            </button>
          </div>
        ) : (
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
        )}
      </div>

      <div className="fs-grid-main grid gap-5 lg:grid-cols-2">
        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">Prochaine visite</h3>
          {nextVisit ? (
            <div className="mt-4 flex gap-4">
              <div
                className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center rounded-[10px] text-center"
                style={{ background: "var(--fs-subtle)" }}
              >
                <span className="fs-label">
                  {(nextVisit.visit?.dateLabel || "Visite").split(" ")[0]?.toUpperCase() || "VISITE"}
                </span>
                <span className="fs-serif text-[22px] leading-none px-1">
                  {nextVisit.visit?.dateLabel || "À venir"}
                </span>
                <span className="mt-1 text-[13px] text-[var(--fs-ink-muted)]">
                  {nextVisit.visit?.timeLabel || "—"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{nextVisit.residenceName}</p>
                <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                  {nextVisit.unit} · {nextVisit.city}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="fs-btn fs-btn-outline" onClick={onOpenApp}>
                    Voir la demande
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[10px] px-4 py-5 text-[14.5px] text-[var(--fs-ink-muted)]" style={{ background: "var(--fs-subtle)" }}>
              Aucune visite planifiée. Les rendez-vous confirmés par les résidences apparaîtront ici.
            </div>
          )}
        </div>

        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">Prochaines étapes</h3>
          <ul className="mt-4 divide-y divide-[var(--fs-border-faint)]">
            {nextSteps.map((t) => (
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
  seniorName,
  moveLabel,
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
  seniorName: string;
  moveLabel: string;
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
                <dd className="font-medium">{moveLabel}</dd>
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
                Je consens au partage du dossier de {seniorName} avec cette résidence, y
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

function Demandes({
  applications,
  onWithdraw,
  onWrite,
  onViewDossier,
  onSearch,
}: {
  applications: FamilyApplication[];
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
    {
      q: "RPA ou CHSLD : quelle différence ?",
      a: "Une RPA offre de l'hébergement avec services. Un CHSLD accueille des personnes qui ont besoin de soins plus importants au quotidien.",
    },
    {
      q: "Combien de demandes simultanées ?",
      a: "Autant que nécessaire. Un même dossier peut être déposé auprès de plusieurs résidences sans le remplir à nouveau.",
    },
    {
      q: "Crédit d'impôt pour maintien à domicile",
      a: "Certaines dépenses liées au maintien à domicile ou à la résidence peuvent ouvrir droit à un crédit. Vérifiez auprès de Revenu Québec.",
    },
    {
      q: "Comment préparer une visite ?",
      a: "Prévoyez la liste de médicaments, vos questions sur les soins, et un moment pour voir une unité type et les espaces communs.",
    },
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
            {faqs.map((item) => (
              <li key={item.q}>
                <button
                  type="button"
                  className="w-full py-3 text-left text-[14.5px] font-medium hover:text-[var(--fs-green)]"
                  onClick={() => setInput(item.q)}
                >
                  {item.q}
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
          <button
            type="button"
            className="fs-btn fs-btn-primary mt-4 w-full"
            onClick={() =>
              window.alert(
                "Votre demande d'appel a été notée. Un conseiller vous rejoindra durant les heures d'ouverture.",
              )
            }
          >
            Demander un appel
          </button>
        </div>
      </div>
    </div>
  );
}
