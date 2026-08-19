"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { emptyCareNeeds, type CareNeeds } from "@/lib/care-needs";
import { scrubDemoNamesDeep } from "@/lib/demo-name-fix";
import { deleteDocBlob } from "@/lib/doc-blobs";
import {
  DEMO_DOCUMENT_REQUESTS,
  formatFileSize,
  migrateDocument,
  type DocCategoryId,
  type DocumentRequest,
  type VaultDocument,
} from "@/lib/document-vault";
import {
  emptyOnboardingMeta,
  emptySeniorProfile,
  seniorAge,
  seniorDisplayName,
  type OnboardingMeta,
  type SeniorProfile,
} from "@/lib/senior-profile";
import {
  emptyFavorite,
  migrateSavedFavorites,
  type FavoriteTagId,
  type SavedFavorite,
} from "@/lib/saved-communities";
import type { FamilyApplication, CommunityDecisionKind } from "@/lib/family-applications";
import {
  applyCommunityDecision,
  appendTimelineEvent,
  submitFamilyApplication,
  withdrawApplication as withdrawFamilyApp,
} from "@/lib/family-applications";
import { normalizeApplicationStatus } from "@/data/applications";
import {
  getSharedByFamilyAppId,
  markSharedWithdrawn,
  publishFamilyApplication,
} from "@/lib/admissions-bridge";
import {
  emptyResidentDossier,
  migrateResidentDossier,
  syncDossierToFamily,
  type ResidentDossier,
} from "@/lib/resident-dossier";

export type { DocCategoryId, VaultDocument, SavedFavorite, FavoriteTagId, FamilyApplication };
export type { ResidentDossier };
/** @deprecated use DocCategoryId */
export type DocCategory = DocCategoryId;

/** Legacy person shape kept for profile/apply compatibility */
export type ProfilePerson = {
  name: string;
  age: string;
  preferredName: string;
  relationship: string;
};

export type ProfileSection = {
  id: string;
  title: string;
  summary: string;
  items: string[];
};

export type FamilyData = {
  person: ProfilePerson;
  senior: SeniorProfile;
  onboarding: OnboardingMeta;
  seniorCreated: boolean;
  careNeeds: CareNeeds;
  /** Guided resident dossier wizard (fill once → multi-apply) */
  residentDossier: ResidentDossier;
  sections: ProfileSection[];
  documents: VaultDocument[];
  documentRequests: DocumentRequest[];
  savedFavorites: SavedFavorite[];
  compareIds: string[];
  applications: FamilyApplication[];
};

const SECTION_DEFS: Omit<ProfileSection, "items" | "summary">[] = [
  { id: "general", title: "General health" },
  { id: "conditions", title: "Conditions" },
  { id: "medications", title: "Medications" },
  { id: "allergies", title: "Allergies" },
  { id: "vaccinations", title: "Vaccinations" },
  { id: "mobility", title: "Mobility" },
  { id: "cognitive", title: "Cognitive assessment" },
  { id: "care", title: "Care requirements" },
  { id: "insurance", title: "Insurance" },
  { id: "emergency", title: "Emergency contacts" },
];

function personFromSenior(senior: SeniorProfile): ProfilePerson {
  return {
    name: seniorDisplayName(senior),
    age: seniorAge(senior),
    preferredName: senior.firstName,
    relationship: senior.relationship,
  };
}

function emptyFamilyData(): FamilyData {
  const senior = emptySeniorProfile();
  return {
    person: personFromSenior(senior),
    senior,
    onboarding: emptyOnboardingMeta(),
    seniorCreated: false,
    careNeeds: emptyCareNeeds(),
    residentDossier: emptyResidentDossier(),
    sections: SECTION_DEFS.map((s) => ({
      ...s,
      summary: "Nothing added yet",
      items: [],
    })),
    documents: [],
    documentRequests: [],
    savedFavorites: [],
    compareIds: [],
    applications: [],
  };
}

function demoFamilyData(): FamilyData {
  const senior: SeniorProfile = {
    ...emptySeniorProfile(),
    filledBy: "I'm a family member or friend",
    relationship: "Father",
    seniorParticipates: "sometimes",
    hasAuthorization: "yes",
    firstName: "Paul",
    middleName: "",
    lastName: "Gilbert",
    dateOfBirth: "1947-04-12",
    gender: "Male",
    primaryLanguage: "English",
    phone: "(514) 555-0142",
    email: "",
    address: "42 Maple Avenue",
    city: "Montreal",
    state: "QC",
    zip: "H2X 1Y4",
    livingSituation: "family",
    housingTypes: ["assisted", "memory"],
    urgency: "1to3",
    searchZones: [{ id: "z1", query: "Montreal, QC", radiusMiles: 25 }],
    proximityToFamily: "Within 30 minutes of family",
    openToOtherStates: "no",
    budgetMin: "3500",
    budgetMax: "5500",
    budgetUnsure: false,
    fundingModes: ["private", "family"],
    hasHomeEquity: "yes",
    hasLtcInsurance: "no",
    hasVeteransBenefits: "no",
    medicaidMedicare: "neither",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    person: personFromSenior(senior),
    senior,
    onboarding: { stepIndex: 8, startedAt: new Date().toISOString(), lastSavedAt: new Date().toISOString() },
    seniorCreated: true,
    residentDossier: emptyResidentDossier(),
    careNeeds: {
      ...emptyCareNeeds(),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mobility: ["Uses a cane outdoors"],
      cognition: ["Mild cognitive impairment"],
      health: ["Hypertension"],
    },
    sections: [
      {
        id: "general",
        title: "General health",
        summary: "Generally stable",
        items: ["Blood type: A+", "Primary physician: Dr. Amélie Caron"],
      },
      {
        id: "conditions",
        title: "Conditions",
        summary: "2 conditions",
        items: ["Mild cognitive impairment", "Hypertension"],
      },
      {
        id: "medications",
        title: "Medications",
        summary: "2 medications",
        items: ["Amlodipine 5mg, morning", "Donepezil 5mg, evening"],
      },
      {
        id: "allergies",
        title: "Allergies",
        summary: "1 allergy",
        items: ["Penicillin, rash"],
      },
      {
        id: "vaccinations",
        title: "Vaccinations",
        summary: "Up to date",
        items: ["Influenza, Oct 2025"],
      },
      {
        id: "mobility",
        title: "Mobility",
        summary: "Uses walker outdoors",
        items: ["Walks short distances independently", "Uses walker outdoors"],
      },
      {
        id: "cognitive",
        title: "Cognitive assessment",
        summary: "Mild impairment",
        items: ["Short-term memory: mild difficulty"],
      },
      {
        id: "care",
        title: "Care requirements",
        summary: "Assistance with meds & bathing",
        items: ["Medication supervision", "Bathing assistance 3× week"],
      },
      {
        id: "insurance",
        title: "Insurance",
        summary: "Provincial coverage",
        items: ["RAMQ active"],
      },
      {
        id: "emergency",
        title: "Emergency contacts",
        summary: "1 contact",
        items: ["Alex Martin, Son, Primary"],
      },
    ],
    documents: [
      {
        id: "d-demo-1",
        name: "Medical history summary.pdf",
        category: "medical_history",
        description: "Primary care summary",
        status: "verified",
        updated: formatDate(),
        createdAt: new Date().toISOString(),
        size: "1.2 MB",
        sizeBytes: 1_200_000,
        mimeType: "application/pdf",
        expires: null,
        sharedWith: [],
        attachedToApplications: [],
        versions: 1,
        hasFile: false,
      },
      {
        id: "d-demo-2",
        name: "Insurance card front.jpg",
        category: "insurance_card",
        description: "",
        status: "uploaded",
        updated: formatDate(),
        createdAt: new Date().toISOString(),
        size: "420 KB",
        sizeBytes: 420_000,
        mimeType: "image/jpeg",
        expires: "2026-12-31",
        sharedWith: [],
        attachedToApplications: [],
        versions: 1,
        hasFile: false,
      },
      {
        id: "d-demo-3",
        name: "Photo ID.pdf",
        category: "identification",
        description: "Government photo ID",
        status: "verified",
        updated: formatDate(),
        createdAt: new Date().toISOString(),
        size: "380 KB",
        sizeBytes: 380_000,
        mimeType: "application/pdf",
        expires: null,
        sharedWith: [],
        attachedToApplications: [],
        versions: 1,
        hasFile: false,
      },
      {
        id: "d-demo-4",
        name: "Physician report H&P.pdf",
        category: "physician_report",
        description: "History & physical",
        status: "verified",
        updated: formatDate(),
        createdAt: new Date().toISOString(),
        size: "890 KB",
        sizeBytes: 890_000,
        mimeType: "application/pdf",
        expires: null,
        sharedWith: [],
        attachedToApplications: [],
        versions: 1,
        hasFile: false,
      },
      {
        id: "d-demo-5",
        name: "Current medication list.pdf",
        category: "medication_list",
        description: "",
        status: "uploaded",
        updated: formatDate(),
        createdAt: new Date().toISOString(),
        size: "210 KB",
        sizeBytes: 210_000,
        mimeType: "application/pdf",
        expires: null,
        sharedWith: [],
        attachedToApplications: [],
        versions: 1,
        hasFile: false,
      },
    ],
    documentRequests: DEMO_DOCUMENT_REQUESTS,
    savedFavorites: [
      {
        ...emptyFavorite("maple-grove", 0),
        tags: ["top_choice", "best_care_fit"],
        note: "Mom liked the courtyard on our first drive-by.",
        sharedWithFamily: true,
      },
      {
        ...emptyFavorite("orchard-house", 1),
        tags: ["affordable", "tour_scheduled"],
        note: "Tour booked for Saturday.",
      },
    ],
    compareIds: ["maple-grove", "orchard-house"],
    applications: [],
  };
}

function formatDate() {
  return new Date().toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function storageKey(email: string) {
  // v4: replace legacy names (Andrea Mazurie / Margaret Chen) with Paul Gilbert
  return `haven-family-v4-${email.toLowerCase()}`;
}

function summarizeSection(items: string[]) {
  if (items.length === 0) return "Nothing added yet";
  if (items.length === 1) return "1 item";
  return `${items.length} items`;
}

function migrateFamilyData(raw: Partial<FamilyData> & { person?: ProfilePerson }): FamilyData {
  const base = emptyFamilyData();
  let senior = { ...emptySeniorProfile(), ...(raw.senior || {}) };
  if (!raw.senior && raw.person?.name) {
    const parts = raw.person.name.trim().split(/\s+/);
    senior.firstName = parts[0] || "";
    senior.lastName = parts.slice(1).join(" ") || "";
    senior.relationship = raw.person.relationship || "";
  }
  const fullName = `${senior.firstName} ${senior.lastName}`.trim();
  if (/andrea\s*mazurie/i.test(fullName) || /margaret\s*chen/i.test(fullName)) {
    senior = {
      ...senior,
      firstName: "Paul",
      lastName: "Gilbert",
      gender: senior.gender || "Male",
      relationship: senior.relationship === "Mother" ? "Father" : senior.relationship,
    };
  }
  senior = scrubDemoNamesDeep(senior);
  return {
    ...base,
    ...raw,
    senior,
    onboarding: { ...emptyOnboardingMeta(), ...(raw.onboarding || {}) },
    seniorCreated: Boolean(raw.seniorCreated),
    careNeeds: {
      ...emptyCareNeeds(),
      ...(raw.careNeeds || {}),
      medication: {
        ...emptyCareNeeds().medication,
        ...(raw.careNeeds?.medication || {}),
      },
      adls: { ...emptyCareNeeds().adls, ...(raw.careNeeds?.adls || {}) },
      preferences: {
        ...emptyCareNeeds().preferences,
        ...(raw.careNeeds?.preferences || {}),
      },
    },
    residentDossier: migrateResidentDossier(
      (raw as Partial<FamilyData>).residentDossier,
    ),
    person: scrubDemoNamesDeep(
      raw.person ? { ...base.person, ...raw.person, name: `${senior.firstName} ${senior.lastName}`.trim() } : personFromSenior(senior),
    ),
    sections: raw.sections?.length ? raw.sections : base.sections,
    documents: (raw.documents || []).map((d) => migrateDocument(d as unknown as Record<string, unknown>)),
    documentRequests: raw.documentRequests?.length
      ? raw.documentRequests
      : DEMO_DOCUMENT_REQUESTS,
    savedFavorites: migrateSavedFavorites(
      raw as Partial<{ savedFavorites: SavedFavorite[]; savedCommunityIds: string[] }>,
    ),
    compareIds: Array.isArray(raw.compareIds) ? raw.compareIds : [],
    applications: Array.isArray(raw.applications)
      ? raw.applications.map(migrateApplication)
      : [],
  };
}

function migrateApplication(raw: FamilyApplication): FamilyApplication {
  const status = normalizeApplicationStatus(String(raw.status || "draft"));
  return {
    ...raw,
    status,
    batchId: raw.batchId ?? null,
    communityDecision: raw.communityDecision ?? null,
    attachedDocumentIds: Array.isArray(raw.attachedDocumentIds) ? raw.attachedDocumentIds : [],
    specificAnswers: raw.specificAnswers || {},
    familyAccess: Array.isArray(raw.familyAccess) ? raw.familyAccess : [],
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.map((t, i) =>
          "type" in t && (t as { type?: string }).type
            ? t
            : {
                id: `mig-${raw.id}-${i}`,
                type: "status" as const,
                label: t.label,
                date: t.date,
                done: t.done,
              },
        )
      : [],
    contactName: raw.contactName || "Admissions team",
    contactRole: raw.contactRole || "Admissions",
    upcomingAppointment: raw.upcomingAppointment ?? null,
    lastUpdatedLabel: raw.lastUpdatedLabel || raw.submittedDateLabel || "",
  };
}

function attachDocsToApp(
  documents: VaultDocument[],
  submitted: FamilyApplication,
): VaultDocument[] {
  return documents.map((d) => {
    if (!submitted.attachedDocumentIds.includes(d.id)) return d;
    const key = submitted.id;
    return {
      ...d,
      attachedToApplications: d.attachedToApplications.includes(key)
        ? d.attachedToApplications
        : [...d.attachedToApplications, key],
      sharedWith: d.sharedWith.includes(submitted.residenceName)
        ? d.sharedWith
        : [...d.sharedWith, submitted.residenceName],
      updated: new Date().toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  });
}

function publishToCommunity(data: FamilyData, submitted: FamilyApplication) {
  const careNeeds = [
    ...data.careNeeds.mobility.slice(0, 2).map((m) => `Mobility: ${m}`),
    ...data.careNeeds.cognition.slice(0, 2).map((c) => `Cognition: ${c}`),
    ...data.careNeeds.health.slice(0, 2),
    data.careNeeds.completedAt ? "Care needs profile completed" : "",
  ].filter(Boolean);
  const medical = data.sections
    .filter((s) => ["conditions", "allergies", "medications"].includes(s.id))
    .flatMap((s) => s.items)
    .slice(0, 5);
  const ageNum =
    Number(seniorAge(data.senior)) || Number(data.person.age) || 0;

  publishFamilyApplication(submitted, {
    seniorName: seniorDisplayName(data.senior) || data.person.name || "Senior",
    seniorAge: ageNum,
    relationship: data.senior.relationship || data.person.relationship || "Family",
    careNeeds: careNeeds.length ? careNeeds : undefined,
    medicalHighlights: medical.length ? medical : undefined,
    seniorPhotoUrl: data.senior.photoDataUrl || data.residentDossier?.photoDataUrl || null,
    documentMeta: data.documents
      .filter((d) => submitted.attachedDocumentIds.includes(d.id))
      .map((d) => ({ id: d.id, name: d.name, category: d.category })),
  });
}

function syncAppsFromSharedBridge(apps: FamilyApplication[]): FamilyApplication[] {
  return apps.map((a) => {
    if (a.status === "draft" || a.status === "ready") return a;
    const shared = getSharedByFamilyAppId(a.id);
    if (!shared) return a;
    if (shared.withdrawn) return withdrawFamilyApp(a);
    if (shared.decisionKind && shared.decisionKind !== a.communityDecision?.kind) {
      return applyCommunityDecision(
        a,
        shared.decisionKind,
        shared.decisionNote || shared.documentRequest || shared.infoRequest || "",
      );
    }
    if (shared.status && shared.status !== a.status && shared.decisionKind) {
      return { ...a, status: shared.status };
    }
    let next = a;
    if (shared.documentRequest && shared.documentRequest !== a.requestedDocuments.join(" · ")) {
      next = {
        ...next,
        requestedDocuments: shared.documentRequest.split("·").map((s) => s.trim()).filter(Boolean),
        status: "more_info",
      };
    }
    if (shared.tourProposal && shared.tourProposal !== a.upcomingAppointment) {
      next = {
        ...next,
        upcomingAppointment: shared.tourProposal,
        status: "tour_requested",
      };
    }
    if (shared.waitlistPosition != null && shared.waitlistPosition !== a.waitingPosition) {
      next = {
        ...next,
        waitingPosition: shared.waitlistPosition,
        status: "waitlisted",
      };
    }
    return next;
  });
}

function computeCompleteness(data: FamilyData) {
  let score = 0;
  const s = data.senior;
  const personal = [s.firstName, s.lastName, s.dateOfBirth, s.city, s.state];
  score += (personal.filter(Boolean).length / personal.length) * 25;
  if (s.livingSituation) score += 10;
  if (s.housingTypes.length) score += 10;
  if (s.urgency) score += 10;
  if (s.searchZones.some((z) => z.query.trim())) score += 10;
  if (s.budgetUnsure || (s.budgetMin && s.budgetMax) || s.fundingModes.length) score += 10;
  if (data.careNeeds.completedAt) score += 10;
  else if (data.careNeeds.updatedAt) score += 5;
  const filled = data.sections.filter((sec) => sec.items.length > 0).length;
  score += (filled / data.sections.length) * 10;
  score += Math.min(5, data.documents.length * 2);
  return Math.min(100, Math.round(score));
}

type FamilyDataContextValue = {
  ready: boolean;
  data: FamilyData;
  completeness: number;
  updatePerson: (patch: Partial<ProfilePerson>) => void;
  updateSeniorDraft: (patch: Partial<SeniorProfile>) => void;
  setOnboardingStep: (stepIndex: number) => void;
  finalizeSeniorProfile: () => SeniorProfile;
  updateCareNeeds: (patch: Partial<CareNeeds> | ((prev: CareNeeds) => CareNeeds)) => void;
  markCareNeedsComplete: () => void;
  updateResidentDossier: (
    patch: Partial<ResidentDossier> | ((prev: ResidentDossier) => ResidentDossier),
  ) => void;
  /** Persist dossier and sync into senior + care needs for search/apply */
  saveResidentDossier: (dossier: ResidentDossier, opts?: { finalize?: boolean }) => void;
  addItem: (sectionId: string, text: string) => void;
  addItems: (sectionId: string, texts: string[]) => void;
  updateItem: (sectionId: string, index: number, text: string) => void;
  removeItem: (sectionId: string, index: number) => void;
  addDocument: (input: {
    name: string;
    category: DocCategoryId;
    description?: string;
    size?: string;
    sizeBytes?: number;
    mimeType?: string;
    expires?: string | null;
    hasFile?: boolean;
    status?: VaultDocument["status"];
    serverDocumentId?: string | null;
    storageFileName?: string | null;
    id?: string;
  }) => string;
  updateDocument: (id: string, patch: Partial<VaultDocument>) => void;
  replaceDocumentFile: (
    id: string,
    meta: { name: string; size: string; sizeBytes: number; mimeType: string },
  ) => void;
  removeDocument: (id: string) => void;
  toggleShare: (id: string, target: string) => void;
  toggleApplicationAttach: (id: string, applicationKey: string) => void;
  toggleSavedCommunity: (communityId: string) => void;
  updateSavedFavorite: (
    communityId: string,
    patch: Partial<Pick<SavedFavorite, "note" | "tags" | "sharedWithFamily">>,
  ) => void;
  reorderSavedFavorites: (orderedIds: string[]) => void;
  shareSavedSelection: (communityIds: string[], shared?: boolean) => void;
  toggleCompareCommunity: (communityId: string) => void;
  setCompareIds: (ids: string[]) => void;
  upsertApplication: (app: FamilyApplication) => void;
  submitApplication: (app: FamilyApplication) => FamilyApplication | null;
  submitApplicationBatch: (apps: FamilyApplication[]) => FamilyApplication[];
  setCommunityDecision: (
    applicationId: string,
    kind: CommunityDecisionKind,
    note: string,
  ) => void;
  withdrawApplication: (applicationId: string) => void;
  inviteFamilyToApplication: (applicationId: string, memberName: string) => void;
  scheduleApplicationVisit: (applicationId: string, when: string) => void;
  loadDemo: () => void;
  resetData: () => void;
};

const FamilyDataContext = createContext<FamilyDataContextValue | null>(null);

export function FamilyDataProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [data, setData] = useState<FamilyData>(emptyFamilyData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.role !== "family") {
      setData(emptyFamilyData());
      setReady(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(user.email));
      const base = raw ? migrateFamilyData(JSON.parse(raw)) : emptyFamilyData();
      const synced = {
        ...base,
        applications: syncAppsFromSharedBridge(base.applications),
      };
      setData(synced);
      if (raw && JSON.stringify(synced.applications) !== JSON.stringify(base.applications)) {
        localStorage.setItem(storageKey(user.email), JSON.stringify(synced));
      }
    } catch {
      setData(emptyFamilyData());
    }
    setReady(true);
  }, [authReady, user]);

  const persist = useCallback(
    (updater: FamilyData | ((prev: FamilyData) => FamilyData)) => {
      setData((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (user?.role === "family") {
          localStorage.setItem(storageKey(user.email), JSON.stringify(next));
        }
        return next;
      });
    },
    [user],
  );

  // Re-sync community decisions when family returns to the tab
  useEffect(() => {
    if (!authReady || !user || user.role !== "family") return;
    const onFocus = () => {
      persist((prev) => ({
        ...prev,
        applications: syncAppsFromSharedBridge(prev.applications),
      }));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authReady, user, persist]);

  const updatePerson = useCallback(
    (patch: Partial<ProfilePerson>) => {
      persist((prev) => ({ ...prev, person: { ...prev.person, ...patch } }));
    },
    [persist],
  );

  const updateSeniorDraft = useCallback(
    (patch: Partial<SeniorProfile>) => {
      persist((prev) => {
        const senior = {
          ...prev.senior,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        return {
          ...prev,
          senior,
          person: personFromSenior(senior),
          onboarding: {
            ...prev.onboarding,
            startedAt: prev.onboarding.startedAt || new Date().toISOString(),
            lastSavedAt: new Date().toISOString(),
          },
        };
      });
    },
    [persist],
  );

  const setOnboardingStep = useCallback(
    (stepIndex: number) => {
      persist((prev) => ({
        ...prev,
        onboarding: {
          ...prev.onboarding,
          stepIndex,
          startedAt: prev.onboarding.startedAt || new Date().toISOString(),
          lastSavedAt: new Date().toISOString(),
        },
      }));
    },
    [persist],
  );

  const finalizeSeniorProfile = useCallback(() => {
    let finalized = emptySeniorProfile();
    persist((prev) => {
      const now = new Date().toISOString();
      const senior = {
        ...prev.senior,
        createdAt: prev.senior.createdAt || now,
        updatedAt: now,
      };
      finalized = senior;
      return {
        ...prev,
        senior,
        person: personFromSenior(senior),
        seniorCreated: true,
        onboarding: {
          ...prev.onboarding,
          stepIndex: 8,
          lastSavedAt: now,
        },
      };
    });
    return finalized;
  }, [persist]);

  const updateCareNeeds = useCallback(
    (patch: Partial<CareNeeds> | ((prev: CareNeeds) => CareNeeds)) => {
      persist((prev) => {
        const nextCare =
          typeof patch === "function"
            ? patch(prev.careNeeds)
            : { ...prev.careNeeds, ...patch };
        return {
          ...prev,
          careNeeds: {
            ...nextCare,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },
    [persist],
  );

  const markCareNeedsComplete = useCallback(() => {
    persist((prev) => ({
      ...prev,
      careNeeds: {
        ...prev.careNeeds,
        updatedAt: new Date().toISOString(),
        completedAt: prev.careNeeds.completedAt || new Date().toISOString(),
      },
    }));
  }, [persist]);

  const updateResidentDossier = useCallback(
    (patch: Partial<ResidentDossier> | ((prev: ResidentDossier) => ResidentDossier)) => {
      persist((prev) => {
        const next =
          typeof patch === "function"
            ? patch(prev.residentDossier)
            : { ...prev.residentDossier, ...patch };
        const now = new Date().toISOString();
        return {
          ...prev,
          residentDossier: {
            ...next,
            startedAt: next.startedAt || now,
            lastSavedAt: now,
          },
        };
      });
    },
    [persist],
  );

  const saveResidentDossier = useCallback(
    (dossier: ResidentDossier, opts?: { finalize?: boolean }) => {
      persist((prev) => {
        const now = new Date().toISOString();
        const nextDossier: ResidentDossier = {
          ...dossier,
          startedAt: dossier.startedAt || now,
          lastSavedAt: now,
          completedAt: opts?.finalize ? dossier.completedAt || now : dossier.completedAt,
        };
        const { senior: seniorPatch, careNeeds } = syncDossierToFamily(nextDossier);
        const senior = {
          ...prev.senior,
          ...seniorPatch,
          createdAt: prev.senior.createdAt || now,
          updatedAt: now,
        };
        return {
          ...prev,
          residentDossier: nextDossier,
          senior,
          person: personFromSenior(senior),
          seniorCreated: opts?.finalize
            ? true
            : prev.seniorCreated || Boolean(senior.firstName && senior.lastName),
          careNeeds: {
            ...careNeeds,
            completedAt:
              careNeeds.completedAt ||
              prev.careNeeds.completedAt ||
              (opts?.finalize ? now : null),
          },
        };
      });
    },
    [persist],
  );

  const addItem = useCallback(
    (sectionId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      persist((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.includes(trimmed) ? s.items : [...s.items, trimmed],
                summary: summarizeSection(
                  s.items.includes(trimmed) ? s.items : [...s.items, trimmed],
                ),
              }
            : s,
        ),
      }));
    },
    [persist],
  );

  const addItems = useCallback(
    (sectionId: string, texts: string[]) => {
      const cleaned = texts.map((t) => t.trim()).filter(Boolean);
      if (!cleaned.length) return;
      persist((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const items = [...s.items];
          cleaned.forEach((line) => {
            if (!items.includes(line)) items.push(line);
          });
          return { ...s, items, summary: summarizeSection(items) };
        }),
      }));
    },
    [persist],
  );

  const updateItem = useCallback(
    (sectionId: string, index: number, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      persist((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const items = s.items.map((item, i) => (i === index ? trimmed : item));
          return { ...s, items, summary: summarizeSection(items) };
        }),
      }));
    },
    [persist],
  );

  const removeItem = useCallback(
    (sectionId: string, index: number) => {
      persist((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const items = s.items.filter((_, i) => i !== index);
          return { ...s, items, summary: summarizeSection(items) };
        }),
      }));
    },
    [persist],
  );

  const addDocument = useCallback(
    (input: {
      name: string;
      category: DocCategoryId;
      description?: string;
      size?: string;
      sizeBytes?: number;
      mimeType?: string;
      expires?: string | null;
      hasFile?: boolean;
      status?: VaultDocument["status"];
      serverDocumentId?: string | null;
      storageFileName?: string | null;
      id?: string;
    }) => {
      const name = input.name.trim();
      if (!name) return "";
      const id =
        input.id ||
        input.serverDocumentId ||
        `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      persist((prev) => {
        const doc: VaultDocument = {
          id,
          name,
          category: input.category,
          description: input.description?.trim() || "",
          status: input.status || "uploaded",
          updated: formatDate(),
          createdAt: new Date().toISOString(),
          size: input.size || formatFileSize(input.sizeBytes || 0),
          sizeBytes: input.sizeBytes || 0,
          mimeType: input.mimeType || "application/octet-stream",
          expires: input.expires ?? null,
          sharedWith: [],
          attachedToApplications: [],
          versions: 1,
          hasFile: Boolean(input.hasFile),
          serverDocumentId: input.serverDocumentId ?? null,
          storageFileName: input.storageFileName ?? null,
          deletedAt: null,
        };
        return { ...prev, documents: [doc, ...prev.documents] };
      });
      return id;
    },
    [persist],
  );

  const updateDocument = useCallback(
    (id: string, patch: Partial<VaultDocument>) => {
      persist((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === id
            ? {
                ...d,
                ...patch,
                updated: formatDate(),
              }
            : d,
        ),
      }));
    },
    [persist],
  );

  const replaceDocumentFile = useCallback(
    (
      id: string,
      meta: { name: string; size: string; sizeBytes: number; mimeType: string },
    ) => {
      persist((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === id
            ? {
                ...d,
                name: meta.name,
                size: meta.size,
                sizeBytes: meta.sizeBytes,
                mimeType: meta.mimeType,
                hasFile: true,
                versions: d.versions + 1,
                status: d.status === "needs_replacement" || d.status === "expired" || d.status === "rejected"
                  ? "uploaded"
                  : d.status,
                updated: formatDate(),
              }
            : d,
        ),
      }));
    },
    [persist],
  );

  const removeDocument = useCallback(
    (id: string) => {
      // Logical delete first — keep metadata tombstone; drop local blob cache.
      void deleteDocBlob(id);
      persist((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === id
            ? {
                ...d,
                deletedAt: new Date().toISOString(),
                hasFile: false,
                status: "rejected" as const,
                updated: formatDate(),
              }
            : d,
        ),
      }));
    },
    [persist],
  );

  const toggleShare = useCallback(
    (id: string, target: string) => {
      persist((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => {
          if (d.id !== id) return d;
          const has = d.sharedWith.includes(target);
          return {
            ...d,
            sharedWith: has
              ? d.sharedWith.filter((r) => r !== target)
              : [...d.sharedWith, target],
            updated: formatDate(),
          };
        }),
      }));
    },
    [persist],
  );

  const toggleApplicationAttach = useCallback(
    (id: string, applicationKey: string) => {
      persist((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => {
          if (d.id !== id) return d;
          const has = d.attachedToApplications.includes(applicationKey);
          return {
            ...d,
            attachedToApplications: has
              ? d.attachedToApplications.filter((r) => r !== applicationKey)
              : [...d.attachedToApplications, applicationKey],
            sharedWith: has
              ? d.sharedWith.filter((r) => r !== applicationKey)
              : d.sharedWith.includes(applicationKey)
                ? d.sharedWith
                : [...d.sharedWith, applicationKey],
            updated: formatDate(),
          };
        }),
      }));
    },
    [persist],
  );

  const toggleSavedCommunity = useCallback(
    (communityId: string) => {
      persist((prev) => {
        const has = prev.savedFavorites.some((f) => f.communityId === communityId);
        if (has) {
          return {
            ...prev,
            savedFavorites: prev.savedFavorites
              .filter((f) => f.communityId !== communityId)
              .map((f, i) => ({ ...f, sortOrder: i })),
            compareIds: prev.compareIds.filter((id) => id !== communityId),
          };
        }
        const nextOrder = prev.savedFavorites.length;
        return {
          ...prev,
          savedFavorites: [...prev.savedFavorites, emptyFavorite(communityId, nextOrder)],
        };
      });
    },
    [persist],
  );

  const updateSavedFavorite = useCallback(
    (
      communityId: string,
      patch: Partial<Pick<SavedFavorite, "note" | "tags" | "sharedWithFamily">>,
    ) => {
      persist((prev) => ({
        ...prev,
        savedFavorites: prev.savedFavorites.map((f) =>
          f.communityId === communityId ? { ...f, ...patch } : f,
        ),
      }));
    },
    [persist],
  );

  const reorderSavedFavorites = useCallback(
    (orderedIds: string[]) => {
      persist((prev) => {
        const map = new Map(prev.savedFavorites.map((f) => [f.communityId, f]));
        const next = orderedIds
          .map((id, i) => {
            const f = map.get(id);
            return f ? { ...f, sortOrder: i } : null;
          })
          .filter(Boolean) as SavedFavorite[];
        // keep any favorites not in orderedIds at the end
        prev.savedFavorites.forEach((f) => {
          if (!orderedIds.includes(f.communityId)) {
            next.push({ ...f, sortOrder: next.length });
          }
        });
        return { ...prev, savedFavorites: next };
      });
    },
    [persist],
  );

  const shareSavedSelection = useCallback(
    (communityIds: string[], shared = true) => {
      persist((prev) => ({
        ...prev,
        savedFavorites: prev.savedFavorites.map((f) =>
          communityIds.includes(f.communityId) ? { ...f, sharedWithFamily: shared } : f,
        ),
      }));
    },
    [persist],
  );

  const toggleCompareCommunity = useCallback(
    (communityId: string) => {
      persist((prev) => {
        const has = prev.compareIds.includes(communityId);
        let next = has
          ? prev.compareIds.filter((id) => id !== communityId)
          : [...prev.compareIds, communityId];
        if (next.length > 4) next = next.slice(-4);
        return { ...prev, compareIds: next };
      });
    },
    [persist],
  );

  const setCompareIds = useCallback(
    (ids: string[]) => {
      persist((prev) => ({ ...prev, compareIds: ids.slice(0, 4) }));
    },
    [persist],
  );

  const upsertApplication = useCallback(
    (app: FamilyApplication) => {
      persist((prev) => {
        const idx = prev.applications.findIndex((a) => a.id === app.id);
        if (idx >= 0) {
          const next = [...prev.applications];
          next[idx] = app;
          return { ...prev, applications: next };
        }
        return { ...prev, applications: [app, ...prev.applications] };
      });
    },
    [persist],
  );

  const submitApplication = useCallback(
    (app: FamilyApplication) => {
      let result: FamilyApplication | null = null;

      persist((prev) => {
        // Prevent accidental double submit for same residence (use latest state)
        const existing = prev.applications.find(
          (a) =>
            a.residenceId === app.residenceId &&
            a.id !== app.id &&
            a.status !== "draft" &&
            a.status !== "ready" &&
            normalizeApplicationStatus(a.status) !== "declined" &&
            normalizeApplicationStatus(a.status) !== "withdrawn" &&
            normalizeApplicationStatus(a.status) !== "closed",
        );
        if (existing) {
          result = null;
          return prev;
        }

        const already = prev.applications.find(
          (a) => a.id === app.id && a.status !== "draft" && a.submittedAt,
        );
        if (already) {
          result = already;
          return prev;
        }

        const submitted = submitFamilyApplication(app);
        publishToCommunity(prev, submitted);
        result = submitted;

        const others = prev.applications.filter(
          (a) =>
            a.id !== submitted.id &&
            !(a.residenceId === submitted.residenceId && a.status === "draft"),
        );
        const documents = attachDocsToApp(prev.documents, submitted);
        return {
          ...prev,
          applications: [submitted, ...others],
          documents,
        };
      });

      return result;
    },
    [persist],
  );

  const submitApplicationBatch = useCallback(
    (apps: FamilyApplication[]) => {
      const batchId = `batch-${Date.now()}`;
      const results: FamilyApplication[] = [];

      persist((prev) => {
        let applications = [...prev.applications];
        let documents = prev.documents;
        let working = prev;

        for (const app of apps) {
          const blocked = applications.find(
            (a) =>
              a.residenceId === app.residenceId &&
              a.id !== app.id &&
              a.status !== "draft" &&
              a.status !== "ready" &&
              normalizeApplicationStatus(a.status) !== "declined" &&
              normalizeApplicationStatus(a.status) !== "withdrawn",
          );
          if (blocked) continue;

          const already = applications.find(
            (a) => a.id === app.id && a.status !== "draft" && a.submittedAt,
          );
          if (already) {
            results.push(already);
            continue;
          }

          const submitted = submitFamilyApplication({ ...app, batchId });
          publishToCommunity({ ...working, applications, documents }, submitted);
          results.push(submitted);
          applications = applications.filter(
            (a) =>
              a.id !== submitted.id &&
              !(a.residenceId === submitted.residenceId && a.status === "draft"),
          );
          applications = [submitted, ...applications];
          documents = attachDocsToApp(documents, submitted);
          working = { ...working, applications, documents };
        }

        return { ...prev, applications, documents };
      });

      return results;
    },
    [persist],
  );

  const setCommunityDecision = useCallback(
    (applicationId: string, kind: CommunityDecisionKind, note: string) => {
      persist((prev) => ({
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === applicationId ? applyCommunityDecision(a, kind, note) : a,
        ),
      }));
    },
    [persist],
  );

  const withdrawApplication = useCallback(
    (applicationId: string) => {
      markSharedWithdrawn(applicationId);
      persist((prev) => ({
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === applicationId ? withdrawFamilyApp(a) : a,
        ),
      }));
    },
    [persist],
  );

  const inviteFamilyToApplication = useCallback(
    (applicationId: string, memberName: string) => {
      const name = memberName.trim();
      if (!name) return;
      persist((prev) => ({
        ...prev,
        applications: prev.applications.map((a) => {
          if (a.id !== applicationId) return a;
          if (a.familyAccess.includes(name)) return a;
          return appendTimelineEvent(
            { ...a, familyAccess: [...a.familyAccess, name] },
            {
              type: "status",
              label: "Family member invited",
              date: "",
              detail: `${name} given access to this application`,
              done: true,
            },
          );
        }),
      }));
    },
    [persist],
  );

  const scheduleApplicationVisit = useCallback(
    (applicationId: string, when: string) => {
      const slot = when.trim();
      if (!slot) return;
      persist((prev) => ({
        ...prev,
        applications: prev.applications.map((a) => {
          if (a.id !== applicationId) return a;
          return appendTimelineEvent(
            {
              ...a,
              status: "tour_requested",
              upcomingAppointment: slot,
            },
            {
              type: "appointment",
              label: "Visit scheduled",
              date: "",
              detail: slot,
              done: true,
            },
          );
        }),
      }));
    },
    [persist],
  );

  const loadDemo = useCallback(() => persist(demoFamilyData()), [persist]);
  const resetData = useCallback(() => persist(emptyFamilyData()), [persist]);

  const completeness = useMemo(() => computeCompleteness(data), [data]);

  const value = useMemo(
    () => ({
      ready,
      data,
      completeness,
      updatePerson,
      updateSeniorDraft,
      setOnboardingStep,
      finalizeSeniorProfile,
      updateCareNeeds,
      markCareNeedsComplete,
      updateResidentDossier,
      saveResidentDossier,
      addItem,
      addItems,
      updateItem,
      removeItem,
      addDocument,
      updateDocument,
      replaceDocumentFile,
      removeDocument,
      toggleShare,
      toggleApplicationAttach,
      toggleSavedCommunity,
      updateSavedFavorite,
      reorderSavedFavorites,
      shareSavedSelection,
      toggleCompareCommunity,
      setCompareIds,
      upsertApplication,
      submitApplication,
      submitApplicationBatch,
      setCommunityDecision,
      withdrawApplication,
      inviteFamilyToApplication,
      scheduleApplicationVisit,
      loadDemo,
      resetData,
    }),
    [
      ready,
      data,
      completeness,
      updatePerson,
      updateSeniorDraft,
      setOnboardingStep,
      finalizeSeniorProfile,
      updateCareNeeds,
      markCareNeedsComplete,
      updateResidentDossier,
      saveResidentDossier,
      addItem,
      addItems,
      updateItem,
      removeItem,
      addDocument,
      updateDocument,
      replaceDocumentFile,
      removeDocument,
      toggleShare,
      toggleApplicationAttach,
      toggleSavedCommunity,
      updateSavedFavorite,
      reorderSavedFavorites,
      shareSavedSelection,
      toggleCompareCommunity,
      setCompareIds,
      upsertApplication,
      submitApplication,
      submitApplicationBatch,
      setCommunityDecision,
      withdrawApplication,
      inviteFamilyToApplication,
      scheduleApplicationVisit,
      loadDemo,
      resetData,
    ],
  );

  return <FamilyDataContext.Provider value={value}>{children}</FamilyDataContext.Provider>;
}

export function useFamilyData() {
  const ctx = useContext(FamilyDataContext);
  if (!ctx) throw new Error("useFamilyData must be used within FamilyDataProvider");
  return ctx;
}
