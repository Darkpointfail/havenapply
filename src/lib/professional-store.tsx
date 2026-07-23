"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SEED_CONTACTS,
  SEED_ORGANIZATION,
  SEED_PATIENTS,
  SEED_PROFILE,
  isReadyToApply,
  type ApplicationStatus,
  type FacilityContact,
  type Patient,
  type PatientDraft,
  type PatientMessage,
  type PatientStatus,
  type ProfessionalOrganization,
  type ProfessionalProfile,
  type ChecklistKey,
  type CareProfile,
} from "@/lib/professional-data";

export type ContactDraft = Omit<FacilityContact, "id" | "updatedAt">;

type ProfessionalContextValue = {
  patients: Patient[];
  organization: ProfessionalOrganization;
  profile: ProfessionalProfile;
  contacts: FacilityContact[];
  getPatient: (id: string) => Patient | undefined;
  addPatient: (draft: PatientDraft) => Patient;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  updatePatientCare: (id: string, care: Partial<CareProfile>) => void;
  updatePatientChecklist: (id: string, key: ChecklistKey, value: boolean) => void;
  updatePatientStatus: (id: string, status: PatientStatus) => void;
  updateOrganization: (patch: Partial<ProfessionalOrganization>) => void;
  updateProfile: (patch: Partial<ProfessionalProfile>) => void;
  addContact: (draft: ContactDraft) => FacilityContact;
  updateContact: (id: string, patch: Partial<ContactDraft>) => void;
  deleteContact: (id: string) => void;
  addMessage: (patientId: string, body: string) => void;
  submitApplication: (patientId: string, communityId: string, communityName: string) => void;
  updateApplicationStatus: (
    patientId: string,
    applicationId: string,
    status: ApplicationStatus,
  ) => void;
};

const ProfessionalContext = createContext<ProfessionalContextValue | null>(null);

function ageFromDob(dob: string) {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function ProfessionalProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(SEED_PATIENTS);
  const [organization, setOrganization] = useState(SEED_ORGANIZATION);
  const [profile, setProfile] = useState(SEED_PROFILE);
  const [contacts, setContacts] = useState<FacilityContact[]>(SEED_CONTACTS);

  const getPatient = useCallback(
    (id: string) => patients.find((p) => p.id === id),
    [patients],
  );

  const addPatient = useCallback(
    (draft: PatientDraft) => {
      const id = `pt_${Date.now().toString(36)}`;
      const now = new Date().toISOString();
      const patient: Patient = {
        id,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        dateOfBirth: draft.dateOfBirth,
        gender: draft.gender,
        age: ageFromDob(draft.dateOfBirth),
        hospital: draft.hospital || organization.name,
        unit: draft.unit || "",
        currentLocation: draft.currentLocation,
        language: draft.language || "English",
        assignedProfessional: `${profile.firstName} ${profile.lastName}`.trim(),
        priority: "routine",
        status: "building_profile",
        familyContact: draft.familyContact,
        familyRelation: draft.familyRelation,
        emergencyContact: draft.emergencyContact,
        emergencyPhone: draft.emergencyPhone,
        primaryCommunity: null,
        nextAction: "Complete care profile and upload documents",
        updatedAt: now,
        checklist: {
          identity: false,
          insurance: Boolean(draft.care.insurance),
          medical_assessment: Boolean(draft.care.diagnosis),
          medication_list: false,
          physician: false,
          care_needs: Boolean(draft.care.requiredCareLevel),
          consent: false,
        },
        care: {
          diagnosis: draft.care.diagnosis || "",
          mobility: draft.care.mobility || "",
          memory: draft.care.memory || "",
          behaviour: draft.care.behaviour || "",
          fallRisk: draft.care.fallRisk || "",
          continence: draft.care.continence || "",
          medicationAssistance: draft.care.medicationAssistance || "",
          adls: draft.care.adls || "",
          requiredCareLevel: draft.care.requiredCareLevel || "",
          specialEquipment: draft.care.specialEquipment || "",
          diet: draft.care.diet || "",
          language: draft.language || "English",
          insurance: draft.care.insurance || "",
          budget: draft.care.budget || "",
          preferredRegion: draft.care.preferredRegion || "",
          notes: draft.care.notes || "",
        },
        documents: [],
        applications: [],
        timeline: [{ id: `tl_${id}`, at: now, label: "Patient created", detail: "Intake started" }],
        messages: [],
      };
      if (isReadyToApply(patient)) {
        patient.status = "ready_to_apply";
        patient.nextAction = "Submit to communities";
      }
      setPatients((prev) => [patient, ...prev]);
      return patient;
    },
    [organization.name, profile.firstName, profile.lastName],
  );

  const updatePatient = useCallback((id: string, patch: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = {
          ...p,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        if (patch.dateOfBirth) next.age = ageFromDob(patch.dateOfBirth);
        if (isReadyToApply(next) && next.status === "building_profile") {
          next.status = "ready_to_apply";
          next.nextAction = "Submit to communities";
        }
        return next;
      }),
    );
  }, []);

  const updatePatientCare = useCallback((id: string, care: Partial<CareProfile>) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              care: { ...p.care, ...care },
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
  }, []);

  const updatePatientChecklist = useCallback((id: string, key: ChecklistKey, value: boolean) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const checklist = { ...p.checklist, [key]: value };
        const next = { ...p, checklist, updatedAt: new Date().toISOString() };
        if (isReadyToApply(next) && ["building_profile", "waiting_documents"].includes(next.status)) {
          next.status = "ready_to_apply";
          next.nextAction = "Submit to communities";
        } else if (!isReadyToApply(next) && next.status === "ready_to_apply") {
          next.status = "waiting_documents";
          next.nextAction = "Complete missing checklist items";
        }
        return next;
      }),
    );
  }, []);

  const updatePatientStatus = useCallback((id: string, status: PatientStatus) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p,
      ),
    );
  }, []);

  const updateOrganization = useCallback((patch: Partial<ProfessionalOrganization>) => {
    setOrganization((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateProfile = useCallback((patch: Partial<ProfessionalProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const addContact = useCallback((draft: ContactDraft) => {
    const contact: FacilityContact = {
      id: `ct_${Date.now().toString(36)}`,
      ...draft,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      updatedAt: new Date().toISOString(),
    };
    setContacts((prev) => [contact, ...prev]);
    return contact;
  }, []);

  const updateContact = useCallback((id: string, patch: Partial<ContactDraft>) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    );
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addMessage = useCallback(
    (patientId: string, body: string) => {
      const msg: PatientMessage = {
        id: `msg_${Date.now().toString(36)}`,
        at: new Date().toISOString(),
        from: "professional",
        fromName: `${profile.firstName} ${profile.lastName}`.trim(),
        body: body.trim(),
      };
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patientId
            ? {
                ...p,
                messages: [...p.messages, msg],
                updatedAt: msg.at,
                timeline: [
                  ...p.timeline,
                  {
                    id: `tl_${msg.id}`,
                    at: msg.at,
                    label: "Message sent",
                    detail: "To patient thread",
                  },
                ],
              }
            : p,
        ),
      );
    },
    [profile.firstName, profile.lastName],
  );

  const submitApplication = useCallback(
    (patientId: string, communityId: string, communityName: string) => {
      const now = new Date().toISOString();
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          const app = {
            id: `app_${Date.now().toString(36)}`,
            patientId,
            communityId,
            communityName,
            status: "submitted" as const,
            submittedAt: now,
            nextAction: "Awaiting community review",
            assignedStaff: "Unassigned",
            lastMessage: "Submitted via HavenApply",
            updatedAt: now,
          };
          return {
            ...p,
            status: "applications_sent" as const,
            primaryCommunity: p.primaryCommunity || communityName,
            nextAction: "Track community responses",
            updatedAt: now,
            applications: [...p.applications, app],
            timeline: [
              ...p.timeline,
              {
                id: `tl_${app.id}`,
                at: now,
                label: "Application submitted",
                detail: communityName,
              },
            ],
          };
        }),
      );
    },
    [],
  );

  const updateApplicationStatus = useCallback(
    (patientId: string, applicationId: string, status: ApplicationStatus) => {
      const now = new Date().toISOString();
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patientId) return p;
          return {
            ...p,
            updatedAt: now,
            applications: p.applications.map((a) =>
              a.id === applicationId ? { ...a, status, updatedAt: now } : a,
            ),
          };
        }),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      patients,
      organization,
      profile,
      contacts,
      getPatient,
      addPatient,
      updatePatient,
      updatePatientCare,
      updatePatientChecklist,
      updatePatientStatus,
      updateOrganization,
      updateProfile,
      addContact,
      updateContact,
      deleteContact,
      addMessage,
      submitApplication,
      updateApplicationStatus,
    }),
    [
      patients,
      organization,
      profile,
      contacts,
      getPatient,
      addPatient,
      updatePatient,
      updatePatientCare,
      updatePatientChecklist,
      updatePatientStatus,
      updateOrganization,
      updateProfile,
      addContact,
      updateContact,
      deleteContact,
      addMessage,
      submitApplication,
      updateApplicationStatus,
    ],
  );

  return (
    <ProfessionalContext.Provider value={value}>{children}</ProfessionalContext.Provider>
  );
}

export function useProfessional() {
  const ctx = useContext(ProfessionalContext);
  if (!ctx) throw new Error("useProfessional must be used within ProfessionalProvider");
  return ctx;
}
