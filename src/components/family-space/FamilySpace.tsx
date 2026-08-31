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

const APP_STATUS_EN: Record<string, string> = {
  "Demande reçue": "Application received",
  "Dossier vérifié": "File verified",
  "Visite planifiée": "Visit scheduled",
  "Liste d'attente": "Waitlist",
  "Décision attendue": "Awaiting decision",
};

function appStatusLabel(status: string) {
  return APP_STATUS_EN[status] || status;
}

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
      body: t(
        "Hello. I can help with your file, your documents, or your applications. Ask your question.",
      ),
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
      personRef: data.personRef,
      dossierRef: data.dossierRef,
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
        ownerLabel: displayUser.firstName || t("You"),
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
      t,
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
      ? t("{count} active files", { count: profiles.length })
      : activeProfile
        ? t("File for {name}", { name: profileDisplayName(activeProfile) })
        : t("No file");

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
    const draft = createEmptyProfile(id, {
      personRef: data.personRef,
      dossierRef: data.dossierRef,
    });
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
        createEmptyProfile(activeProfileId || "p-senior", {
          personRef: data.personRef,
          dossierRef: data.dossierRef,
        });
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
          window.alert(saveError ? t(saveError) : t("The file could not be uploaded."));
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
      window.alert(
        t("An application is already active for this residence. See My requests."),
      );
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
      if (
        m.includes("moi-même") ||
        m.includes("moi-meme") ||
        m.includes("pour moi") ||
        m.includes("for myself") ||
        m.includes("myself")
      ) {
        patchActive({
          profileSubject: "self",
          rel: "Moi-même",
          prenom: activeProfile?.prenom || displayUser.firstName || "",
          nom: activeProfile?.nom || "",
        });
      } else if (
        m.includes("proche") ||
        m.includes("parent") ||
        m.includes("loved one") ||
        m.includes("for a loved")
      ) {
        patchActive({ profileSubject: "proche" });
      }
      if (m.includes("hôpital") || m.includes("hopital") || m.includes("hospital")) {
        patchActive({ meta: "Urgent file · hospital" });
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
    if (!window.confirm(t("Withdraw this application? This cannot be undone."))) return;
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
                        {t("Contact profile")}
                      </p>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#9AABA4]">
                        {t(
                          "This information is linked to your family account as the primary contact.",
                        )}
                      </p>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">{t("First name")}</span>
                      <input
                        className="fs-account-input"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">{t("Last name")}</span>
                      <input
                        className="fs-account-input"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">{t("Email")}</span>
                      <input
                        className="fs-account-input"
                        value={displayUser.email}
                        disabled
                        readOnly
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] text-[#9AABA4]">{t("Phone")}</span>
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
                        {t("Relationship with the loved one")}
                      </span>
                      <select
                        className="fs-account-input"
                        value={editRelationship}
                        onChange={(e) => setEditRelationship(e.target.value)}
                      >
                        {["Fille", "Fils", "Conjoint", "Conjointe", "Autre proche", "Moi-même"].map(
                          (opt) => (
                            <option key={opt} value={opt}>
                              {t(
                                (
                                  {
                                    Fille: "Daughter",
                                    Fils: "Son",
                                    Conjoint: "Male spouse",
                                    Conjointe: "Female spouse",
                                    "Autre proche": "Another loved one",
                                    "Moi-même": "Myself",
                                  } as Record<string, string>
                                )[opt] ?? opt,
                              )}
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
                        {t("Cancel")}
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-[8px] px-3 py-2 text-[13.5px] font-semibold text-white"
                        style={{ background: "var(--fs-green)" }}
                        onClick={saveAccountEdit}
                      >
                        {t("Save")}
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
                          {t("Contact · {relationship}", {
                            relationship: t(
                              (
                                {
                                  Fille: "Daughter",
                                  Fils: "Son",
                                  Conjoint: "Male spouse",
                                  Conjointe: "Female spouse",
                                  "Autre proche": "Another loved one",
                                  "Moi-même": "Myself",
                                  Famille: "Family",
                                } as Record<string, string>
                              )[data.senior.relationship] ?? data.senior.relationship,
                            ),
                          })}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-account-menu-item"
                      onClick={startAccountEdit}
                    >
                      {t("My profile")}
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
                      {t("Settings")}
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
                      {t("Privacy and data")}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-account-menu-item"
                      onClick={handleSignOut}
                    >
                      {t("Sign out")}
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
              activeProfile ? profileDisplayName(activeProfile) : t("your loved one")
            }
            moveLabel={activeProfile?.move || t("To be determined")}
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
                  body: t(
                    "Thank you. An advisor can clarify if needed — in the meantime, check missing documents in Files.",
                  ),
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
  const t = useT();
  const nextVisit = applications.find((a) => a.visit || a.status === "Visite planifiée");
  const displayPercent = hasDossier ? dossierCompleteness.percent : 0;
  const rawNext = hasDossier
    ? dossierCompleteness.next
    : "Create a file (for yourself or a loved one)";
  const nextActionLabel = rawNext ? t(rawNext) : null;
  const soften = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;
  const intro = !hasDossier
    ? t(
        "Create a file: for yourself or a loved one, so you can apply to partner residences.",
      )
    : dossierCompleteness.next
      ? t("Continue your file. Next action: {action}.", {
          action: soften(t(dossierCompleteness.next)),
        })
      : t("Your file is up to date. You can search for a residence or follow your open applications.");

  const dossierCta =
    hasProfile || hasDossier ? t("Complete the file") : t("Create a file");

  return (
    <div className="flex flex-col gap-6">
      <div className="fs-grid-main grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="fs-card p-7">
          <h1 className="fs-serif text-[34px] leading-tight">
            {firstName.trim()
              ? t("Hello {name}", { name: firstName.trim() })
              : t("Hello")}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
            {intro}
          </p>
          {saveStatus === "saving" ? (
            <p className="mt-3 text-[13px] text-[var(--fs-ink-muted)]">{t("Saving…")}</p>
          ) : null}
          {saveStatus === "error" && saveError ? (
            <p className="mt-3 text-[13px] text-[#b4533a]" role="alert">
              {t(saveError)}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="fs-btn fs-btn-primary" onClick={onOpenDossier}>
              {dossierCta}
            </button>
            <button type="button" className="fs-btn fs-btn-outline" onClick={onSearch}>
              {t("Find a residence")}
            </button>
          </div>
        </div>
        <div className="fs-card p-6" style={{ background: "var(--fs-subtle)" }}>
          <p className="fs-label">{t("File progress")}</p>
          <p className="fs-serif mt-3 text-[42px] leading-none">{displayPercent} %</p>
          <p className="mt-2 text-[13.5px] text-[var(--fs-ink-muted)]">
            {hasDossier
              ? t("{fieldsDone} of {fieldsTotal} sections · {docsReceived} of {docsTotal} documents", {
                  fieldsDone: dossierCompleteness.fieldsDone,
                  fieldsTotal: dossierCompleteness.fieldsTotal,
                  docsReceived: dossierCompleteness.docsReceived,
                  docsTotal: dossierCompleteness.docsTotal,
                })
              : t("0 sections · 0 of {docsTotal} documents", {
                  docsTotal: dossierCompleteness.docsTotal,
                })}
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full"
              style={{ width: `${displayPercent}%`, background: "var(--fs-green)" }}
            />
          </div>
          <p className="mt-4 text-[14.5px] text-[var(--fs-ink-body)]">
            {t("Next action: {action}.", {
              action: nextActionLabel ? soften(nextActionLabel) : t("none"),
            })}
          </p>
        </div>
      </div>

      <div>
        <h2 className="fs-serif text-[22px]">{t("Your open applications")}</h2>
        {applications.length === 0 ? (
          <div className="fs-card mt-4 p-8 text-center">
            <h3 className="fs-serif text-[20px]">
              {t("To apply, please complete your file first")}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] text-[var(--fs-ink-body)]">
              {t(
                "Once your file is ready, you can apply to a residence and track progress here.",
              )}
            </p>
            <button type="button" className="fs-btn fs-btn-primary mt-5" onClick={onOpenDossier}>
              {dossierCta}
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
                  {t(appStatusLabel(app.status))}
                </StatusPill>
                <p className="fs-serif mt-3 text-[19px] leading-snug">{app.residenceName}</p>
                <p className="mt-1 text-[13.5px] text-[var(--fs-ink-muted)]">
                  {app.city} · {t(app.unit)}
                </p>
                {app.publicRef ? (
                  <p className="mt-2 font-mono text-[12.5px] tracking-wide text-[var(--fs-ink-muted)]">
                    {app.publicRef}
                  </p>
                ) : null}
                <p className="mt-3 text-[14px] text-[var(--fs-ink-body)]">{t(app.update)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fs-grid-main grid gap-5 lg:grid-cols-2">
        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">{t("Next visit")}</h3>
          {nextVisit ? (
            <div className="mt-4 flex gap-4">
              <div
                className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center rounded-[10px] text-center"
                style={{ background: "var(--fs-subtle)" }}
              >
                <span className="fs-label">
                  {(nextVisit.visit?.dateLabel || t("Visit")).split(" ")[0]?.toUpperCase() ||
                    t("Visit").toUpperCase()}
                </span>
                <span className="fs-serif text-[22px] leading-none px-1">
                  {nextVisit.visit?.dateLabel
                    ? t(nextVisit.visit.dateLabel)
                    : t("Upcoming")}
                </span>
                <span className="mt-1 text-[13px] text-[var(--fs-ink-muted)]">
                  {nextVisit.visit?.timeLabel ? t(nextVisit.visit.timeLabel) : "-"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{nextVisit.residenceName}</p>
                <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                  {t(nextVisit.unit)} · {nextVisit.city}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="fs-btn fs-btn-outline" onClick={onOpenApp}>
                    {t("View application")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="mt-4 rounded-[10px] px-4 py-5 text-[14.5px] text-[var(--fs-ink-muted)]"
              style={{ background: "var(--fs-subtle)" }}
            >
              {t(
                "No visit scheduled. Confirmed appointments from residences will appear here.",
              )}
            </div>
          )}
        </div>

        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">{t("Next steps")}</h3>
          <ul className="mt-4 divide-y divide-[var(--fs-border-faint)]">
            {nextSteps.map((step) => (
              <li key={step.label} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background:
                        step.tone === "terra"
                          ? "var(--fs-terra)"
                          : step.tone === "green"
                            ? "var(--fs-green)"
                            : "var(--fs-border)",
                    }}
                  />
                  <span className="text-[14.5px]">{t(step.label)}</span>
                </div>
                <span className="text-[13px] text-[var(--fs-ink-muted)]">{step.owner}</span>
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
  const t = useT();
  const missing = docs.filter((d) => d.status === "en attente");
  const options = [
    {
      type: residence.unitType,
      price: residence.price,
      avail: residence.availability,
    },
    { type: "2½", price: "$2,850/month", avail: t("Full") },
    { type: "1½", price: "$2,200/month", avail: t("2 available") },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <button type="button" className="fs-btn-ghost" onClick={onBack}>
        ← {t("Back to the residence")}
      </button>
      <div className="fs-card mt-4 p-7">
        <div className="flex items-center justify-between gap-3">
          <h1 className="fs-serif text-[28px]">{t("Submit an application")}</h1>
          <p className="text-[14px] text-[var(--fs-ink-muted)]">
            {t("Step {step} of 3", { step })}
          </p>
        </div>
        <p className="mt-2 text-[14.5px] text-[var(--fs-ink-muted)]">{residence.name}</p>

        {step === 1 && (
          <div className="mt-6 space-y-3">
            <h2 className="fs-serif text-[20px]">{t("Choose a unit")}</h2>
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
                    <p className="font-semibold">{t(o.type)}</p>
                    <p className="text-[13.5px] text-[var(--fs-ink-muted)]">{t(o.avail)}</p>
                  </div>
                  <p className="fs-serif text-[18px]">{t(o.price)}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="mt-6">
            <h2 className="fs-serif text-[20px]">{t("Review the file")}</h2>
            <p className="mt-2 text-[14.5px] text-[var(--fs-ink-body)]">
              {t("The following information and documents will be sent to {name}.", {
                name: residence.name,
              })}
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
                    {d.status === "reçu" ? t("Received") : t("Pending")}
                  </span>
                </li>
              ))}
            </ul>
            {missing.length > 0 ? (
              <p
                className="mt-4 rounded-[10px] px-4 py-3 text-[14px]"
                style={{ background: "var(--fs-terra-bg)", color: "var(--fs-terra)" }}
              >
                {t(
                  "Note: {count} document(s) still missing. The residence can still open the file.",
                  { count: missing.length },
                )}
              </p>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <h2 className="fs-serif text-[20px]">{t("Confirm and send")}</h2>
            <dl className="space-y-2 text-[14.5px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--fs-ink-muted)]">{t("Residence")}</dt>
                <dd className="font-medium">{residence.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--fs-ink-muted)]">{t("Unit")}</dt>
                <dd className="font-medium">{selectedUnit}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--fs-ink-muted)]">{t("Desired move-in")}</dt>
                <dd className="font-medium">{t(moveLabel)}</dd>
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
                {t(
                  "I consent to sharing {name}'s file with this residence, including attached documents.",
                  { name: seniorName },
                )}
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
            {t("Previous")}
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="fs-btn fs-btn-primary"
              disabled={step === 1 && !selectedUnit}
              onClick={() => setStep(step + 1)}
            >
              {t("Next")}
            </button>
          ) : (
            <button
              type="button"
              className="fs-btn fs-btn-primary"
              disabled={!consent || !selectedUnit}
              onClick={onSend}
            >
              {t("Send the application")}
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
  const t = useT();
  const segments = [
    t("Application received"),
    t("File verified"),
    t("Visit"),
    t("Decision"),
  ];
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
            <h1 className="fs-serif text-[28px] leading-tight md:text-[32px]">
              {t("My requests")}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--fs-ink-body)]">
              {t(
                "Track every application sent for your loved one, and find visits already scheduled with residences here.",
              )}
            </p>
          </div>
          <button type="button" className="fs-btn fs-btn-primary" onClick={onSearch}>
            {t("New application")}
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [t("Active applications"), String(byStatus.active)],
            [t("Scheduled visits"), String(byStatus.visits)],
            [t("Waitlists"), String(byStatus.waiting)],
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
          <h2 className="fs-serif text-[22px]">{t("Application progress")}</h2>
        </div>

        {applications.length === 0 ? (
          <div className="fs-card p-8 text-center">
            <h3 className="fs-serif text-[22px]">{t("No applications yet")}</h3>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-[var(--fs-ink-body)]">
              {t(
                "When you send a file to a residence, its status and next steps will appear here.",
              )}
            </p>
            <button type="button" className="fs-btn fs-btn-primary mt-6" onClick={onSearch}>
              {t("Search for a residence")}
            </button>
          </div>
        ) : (
          applications.map((app) => (
            <article key={app.id} className="fs-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="fs-serif text-[22px]">{app.residenceName}</h3>
                  <p className="mt-1 text-[14px] text-[var(--fs-ink-muted)]">
                    {app.city} · {t(app.unit)} · {t("submitted on")} {t(app.depositedOn)}
                  </p>
                  {app.publicRef ? (
                    <p className="mt-1.5 font-mono text-[13px] tracking-wide text-[var(--fs-ink-muted)]">
                      {t("Ref.")} {app.publicRef}
                    </p>
                  ) : null}
                </div>
                <StatusPill tone={app.status === "Liste d'attente" ? "neutral" : "green"}>
                  {t(appStatusLabel(app.status))}
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
                {t(app.update)}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="fs-btn fs-btn-outline" onClick={onWrite}>
                  {t("Message the residence")}
                </button>
                <button type="button" className="fs-btn fs-btn-outline" onClick={onViewDossier}>
                  {t("View the file sent")}
                </button>
                <button
                  type="button"
                  className="fs-btn fs-btn-outline"
                  style={{ color: "var(--fs-terra)" }}
                  onClick={() => onWithdraw(app.id)}
                >
                  {t("Withdraw application")}
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="fs-serif text-[22px]">{t("Visit schedule")}</h2>
        {visits.length === 0 ? (
          <div className="fs-card p-6">
            <p className="text-[15px] text-[var(--fs-ink-body)]">
              {t(
                "No visits scheduled yet. As soon as a residence proposes a time slot, it will appear here.",
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visits.map((app) => {
              const visit = app.visit ?? {
                dateLabel: t("Date to confirm"),
                timeLabel: "",
                place: `${app.residenceName} · ${app.city}`,
              };
              const [dayToken, ...monthParts] = visit.dateLabel.split(" ");
              const day = /^\d+$/.test(dayToken) ? dayToken : "—";
              const month = monthParts[0] || t("Visit");
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
                      <StatusPill tone="green">{t("Visit scheduled")}</StatusPill>
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
                          {t("Contact the residence")}
                        </button>
                        <button
                          type="button"
                          className="fs-btn fs-btn-outline"
                          onClick={onViewDossier}
                        >
                          {t("Prepare the file")}
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
  const t = useT();
  const faqs = [
    {
      q: t("RPA or CHSLD: what’s the difference?"),
      a: t(
        "An RPA offers housing with services. A CHSLD welcomes people who need more substantial daily care.",
      ),
    },
    {
      q: t("How many applications at once?"),
      a: t(
        "As many as you need. The same file can be submitted to several residences without filling it out again.",
      ),
    },
    {
      q: t("Home-support tax credit"),
      a: t(
        "Some expenses related to staying at home or living in a residence may qualify for a credit. Check with Revenu Québec.",
      ),
    },
    {
      q: t("How do I prepare for a visit?"),
      a: t(
        "Bring the medication list, your questions about care, and time to see a sample unit and common areas.",
      ),
    },
  ];

  return (
    <div className="fs-grid-main grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="fs-card flex min-h-[480px] flex-col p-5">
        <h2 className="fs-serif text-[22px]">{t("Assistance")}</h2>
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
            placeholder={t("Ask a question…")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
          />
          <button type="button" className="fs-btn fs-btn-primary" onClick={onSend}>
            {t("Send")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="fs-card p-6">
          <h3 className="fs-serif text-[19px]">{t("Frequently asked questions")}</h3>
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
          <h3 className="fs-serif text-[19px]">{t("Talk to someone")}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--fs-ink-body)]">
            {t(
              "An advisor can help you by phone Monday to Friday, 8 a.m. to 6 p.m.",
            )}
          </p>
          <button
            type="button"
            className="fs-btn fs-btn-primary mt-4 w-full"
            onClick={() =>
              window.alert(
                t(
                  "Your call request has been noted. An advisor will reach you during opening hours.",
                ),
              )
            }
          >
            {t("Request a call")}
          </button>
        </div>
      </div>
    </div>
  );
}
