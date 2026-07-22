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
  SEED_ORGANIZATION,
  SEED_PATIENTS,
  isReadyToApply,
  type ApplicationStatus,
  type Patient,
  type PatientDraft,
  type PatientMessage,
  type PatientStatus,
  type ProfessionalOrganization,
} from "@/lib/professional-data";

type ProfessionalContextValue = {
  patients: Patient[];
  organization: ProfessionalOrganization;
  getPatient: (id: string) => Patient | undefined;
  addPatient: (draft: PatientDraft) => Patient;
  updatePatientStatus: (id: string, status: PatientStatus) => void;
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
  const [organization] = useState(SEED_ORGANIZATION);

  const getPatient = useCallback(
    (id: string) => patients.find((p) => p.id === id),
    [patients],
  );

  const addPatient = useCallback((draft: PatientDraft) => {
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
      assignedProfessional: "Sam Rivera",
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
  }, [organization.name]);

  const updatePatientStatus = useCallback((id: string, status: PatientStatus) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p,
      ),
    );
  }, []);

  const addMessage = useCallback((patientId: string, body: string) => {
    const msg: PatientMessage = {
      id: `msg_${Date.now().toString(36)}`,
      at: new Date().toISOString(),
      from: "professional",
      fromName: "Sam Rivera",
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
                { id: `tl_${msg.id}`, at: msg.at, label: "Message sent", detail: "To patient thread" },
              ],
            }
          : p,
      ),
    );
  }, []);

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
      getPatient,
      addPatient,
      updatePatientStatus,
      addMessage,
      submitApplication,
      updateApplicationStatus,
    }),
    [
      patients,
      organization,
      getPatient,
      addPatient,
      updatePatientStatus,
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
