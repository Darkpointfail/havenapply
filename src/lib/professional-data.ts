export type PatientStatus =
  | "building_profile"
  | "waiting_documents"
  | "ready_to_apply"
  | "applications_sent"
  | "assessment_scheduled"
  | "accepted"
  | "waitlisted"
  | "moved_in";

export type ApplicationStatus =
  | "preparing"
  | "submitted"
  | "under_review"
  | "need_more_info"
  | "assessment_requested"
  | "waitlisted"
  | "accepted"
  | "declined"
  | "move_in_scheduled";

export type DocCategory =
  | "identity"
  | "insurance"
  | "medication_list"
  | "discharge_summary"
  | "physician_notes"
  | "functional_assessment"
  | "care_assessment"
  | "power_of_attorney"
  | "consent_forms"
  | "financial"
  | "other";

export type ChecklistKey =
  | "identity"
  | "insurance"
  | "medical_assessment"
  | "medication_list"
  | "physician"
  | "care_needs"
  | "consent";

export type Priority = "routine" | "soon" | "urgent";

export type CareProfile = {
  diagnosis: string;
  mobility: string;
  memory: string;
  behaviour: string;
  fallRisk: string;
  continence: string;
  medicationAssistance: string;
  adls: string;
  requiredCareLevel: string;
  specialEquipment: string;
  diet: string;
  language: string;
  insurance: string;
  budget: string;
  preferredRegion: string;
  notes: string;
};

export type PatientDocument = {
  id: string;
  category: DocCategory;
  name: string;
  uploadedBy: string;
  uploadedAt: string;
  verified: boolean;
  note?: string;
  /** Local preview hint for demo uploads (file name / mime). */
  previewHint?: string;
};

export type PatientApplication = {
  id: string;
  patientId: string;
  communityId: string;
  communityName: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  nextAction: string;
  assignedStaff: string;
  lastMessage: string;
  updatedAt: string;
};

export type TimelineEvent = {
  id: string;
  at: string;
  label: string;
  detail?: string;
};

export type PatientMessage = {
  id: string;
  at: string;
  from: "professional" | "family" | "community";
  fromName: string;
  body: string;
};

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  age: number;
  hospital: string;
  unit: string;
  currentLocation: string;
  language: string;
  address?: string;
  phone?: string;
  pharmacy?: string;
  pharmacyPhone?: string;
  primaryPhysician?: string;
  physicianPhone?: string;
  allergies?: string;
  assignedProfessional: string;
  priority: Priority;
  status: PatientStatus;
  familyContact: string;
  familyRelation: string;
  emergencyContact: string;
  emergencyPhone: string;
  primaryCommunity: string | null;
  nextAction: string;
  updatedAt: string;
  checklist: Record<ChecklistKey, boolean>;
  care: CareProfile;
  documents: PatientDocument[];
  applications: PatientApplication[];
  timeline: TimelineEvent[];
  messages: PatientMessage[];
};

export type ProfessionalOrganization = {
  name: string;
  type: string;
  city: string;
  phone: string;
  units: string[];
};

export type ProfessionalProfile = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  phone: string;
};

/** Admissions / facility contacts maintained by care professionals. */
export type FacilityContact = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  notes: string;
  /** Residence ids from the communities catalog */
  facilityIds: string[];
  updatedAt: string;
};

export function contactName(c: FacilityContact) {
  return `${c.firstName} ${c.lastName}`.trim();
}

export const PATIENT_STATUS_LABEL: Record<PatientStatus, string> = {
  building_profile: "Building profile",
  waiting_documents: "Waiting for documents",
  ready_to_apply: "Ready to apply",
  applications_sent: "Applications sent",
  assessment_scheduled: "Assessment scheduled",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  moved_in: "Moved in",
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  preparing: "Preparing",
  submitted: "Submitted",
  under_review: "Under review",
  need_more_info: "Need more information",
  assessment_requested: "Assessment requested",
  waitlisted: "Waitlisted",
  accepted: "Accepted",
  declined: "Declined",
  move_in_scheduled: "Move-in scheduled",
};

export const DOC_CATEGORY_LABEL: Record<DocCategory, string> = {
  identity: "Identity",
  insurance: "Insurance",
  medication_list: "Medication list",
  discharge_summary: "Hospital records",
  physician_notes: "Physician documents",
  functional_assessment: "Assessments",
  care_assessment: "Care assessment",
  power_of_attorney: "Power of attorney",
  consent_forms: "Consent forms",
  financial: "Financial documents",
  other: "Other",
};

/** Document folders shown in the living dossier Documents tab. */
export const DOC_WORKSPACE_CATEGORIES: DocCategory[] = [
  "identity",
  "insurance",
  "medication_list",
  "physician_notes",
  "discharge_summary",
  "functional_assessment",
  "consent_forms",
  "financial",
  "other",
];

export const CHECKLIST_LABEL: Record<ChecklistKey, string> = {
  identity: "Identity",
  insurance: "Insurance",
  medical_assessment: "Medical assessment",
  medication_list: "Medication list",
  physician: "Physician information",
  care_needs: "Care needs",
  consent: "Consent forms",
};

export function patientName(p: Patient) {
  return `${p.firstName} ${p.lastName}`;
}

export function missingChecklist(p: Patient) {
  return (Object.keys(CHECKLIST_LABEL) as ChecklistKey[]).filter((k) => !p.checklist[k]);
}

export function isReadyToApply(p: Patient) {
  return patientDossierReadyForApply(p).ok;
}

/** 0–100 completeness for the living patient dossier cockpit. */
export function dossierCompleteness(p: Patient) {
  const checks: boolean[] = [
    Boolean(p.firstName.trim() && p.lastName.trim()),
    Boolean(p.dateOfBirth),
    Boolean(p.hospital.trim()),
    Boolean(p.unit.trim()),
    Boolean(p.language.trim()),
    Boolean(p.familyContact.trim()),
    Boolean(p.emergencyContact.trim()),
    Boolean(p.care.diagnosis.trim()),
    Boolean(p.care.mobility.trim()),
    Boolean(p.care.memory.trim()),
    Boolean(p.care.requiredCareLevel.trim()),
    Boolean(p.care.insurance.trim()),
    Boolean(p.care.preferredRegion.trim()),
    Boolean(p.primaryPhysician?.trim() || p.checklist.physician),
    Boolean(p.pharmacy?.trim()),
    Boolean(p.allergies?.trim() || p.care.diet.trim()),
    p.documents.some((d) => d.category === "identity"),
    p.documents.some((d) => d.category === "insurance"),
    p.documents.some((d) => d.category === "medication_list"),
    p.documents.some((d) => d.category === "consent_forms"),
  ];
  const done = checks.filter(Boolean).length;
  const total = checks.length;
  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
  };
}

export function dossierAiSuggestions(p: Patient): string[] {
  const tips: string[] = [];
  const completeness = dossierCompleteness(p);
  const missingDocs = missingPatientDocuments(p);
  const missingCare = missingPatientCare(p);
  const missingProfile = missingPatientProfile(p);

  tips.push(
    `The dossier is ${completeness.percent}% complete (${completeness.done} of ${completeness.total} key items).`,
  );
  if (missingDocs.length) {
    tips.push(
      `Still missing required documents: ${missingDocs.map((d) => d.label).join(", ")}.`,
    );
  }
  if (!p.primaryPhysician?.trim() && !p.checklist.physician) {
    tips.push("The treating physician has not been recorded yet.");
  }
  if (!p.pharmacy?.trim()) {
    tips.push("Pharmacy details are empty — communities often need this before move-in.");
  }
  if (missingCare.length) {
    tips.push(`Care profile gaps: ${missingCare.slice(0, 3).join(", ")}.`);
  }
  if (missingProfile.length) {
    tips.push(`Patient information gaps: ${missingProfile.join(", ")}.`);
  }
  if (completeness.percent >= 85 && missingDocs.length === 0) {
    tips.push("This dossier looks ready to generate an application package.");
  } else if (completeness.percent < 60) {
    tips.push("Focus on identity, care needs, and hard documents before matching communities.");
  }
  return tips;
}

/** Documents required before a care professional can submit an application. */
export const PROFESSIONAL_HARD_DOCS: { category: DocCategory; label: string }[] = [
  { category: "identity", label: "Identity document" },
  { category: "insurance", label: "Insurance card / coverage" },
  { category: "medication_list", label: "Medication list" },
  { category: "consent_forms", label: "Consent forms" },
];

export function missingPatientDocuments(p: Patient) {
  const present = new Set(p.documents.map((d) => d.category));
  return PROFESSIONAL_HARD_DOCS.filter((req) => !present.has(req.category));
}

export function missingPatientProfile(p: Patient): string[] {
  const missing: string[] = [];
  if (!p.firstName.trim() || !p.lastName.trim()) missing.push("Patient full name");
  if (!p.dateOfBirth) missing.push("Date of birth");
  if (!p.familyContact.trim() && !p.emergencyContact.trim()) {
    missing.push("Family or emergency contact");
  }
  return missing;
}

export function missingPatientCare(p: Patient): string[] {
  const missing: string[] = [];
  if (!p.care.diagnosis.trim()) missing.push("Primary diagnosis");
  if (!p.care.requiredCareLevel.trim()) missing.push("Required care level");
  if (!p.care.mobility.trim()) missing.push("Mobility");
  if (!p.care.insurance.trim()) missing.push("Insurance / payer");
  if (!p.care.preferredRegion.trim()) missing.push("Preferred region");
  return missing;
}

/**
 * Full gate before a care professional can transmit a dossier to a community.
 * Requires profile, care needs, checklist, and required documents.
 */
export function patientDossierReadyForApply(p: Patient): {
  ok: boolean;
  reasons: string[];
  missingChecklist: ChecklistKey[];
  missingDocs: { category: DocCategory; label: string }[];
  missingProfile: string[];
  missingCare: string[];
} {
  const checklistMissing = missingChecklist(p);
  const missingDocs = missingPatientDocuments(p);
  const missingProfile = missingPatientProfile(p);
  const missingCare = missingPatientCare(p);
  const reasons: string[] = [];

  if (missingProfile.length) {
    reasons.push("Complete the patient profile fields.");
  }
  if (missingCare.length) {
    reasons.push("Complete care needs that will be shared with the community.");
  }
  if (checklistMissing.length) {
    reasons.push("Mark all required checklist items as complete.");
  }
  if (missingDocs.length) {
    reasons.push("Upload the required documents that will be transmitted.");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    missingChecklist: checklistMissing,
    missingDocs,
    missingProfile,
    missingCare,
  };
}

export function statusTone(
  status: PatientStatus | ApplicationStatus,
): "neutral" | "brand" | "success" | "warn" | "accent" | "info" {
  switch (status) {
    case "ready_to_apply":
    case "accepted":
    case "moved_in":
    case "move_in_scheduled":
      return "success";
    case "waiting_documents":
    case "need_more_info":
    case "assessment_requested":
    case "assessment_scheduled":
      return "warn";
    case "applications_sent":
    case "under_review":
    case "submitted":
      return "brand";
    case "waitlisted":
      return "info";
    case "declined":
      return "accent";
    default:
      return "neutral";
  }
}

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
const hoursAgo = (n: number) => new Date(now - n * 3600000).toISOString();

function emptyCare(partial?: Partial<CareProfile>): CareProfile {
  return {
    diagnosis: "",
    mobility: "",
    memory: "",
    behaviour: "",
    fallRisk: "",
    continence: "",
    medicationAssistance: "",
    adls: "",
    requiredCareLevel: "",
    specialEquipment: "",
    diet: "",
    language: "English",
    insurance: "",
    budget: "",
    preferredRegion: "",
    notes: "",
    ...partial,
  };
}

export const SEED_ORGANIZATION: ProfessionalOrganization = {
  name: "City General Hospital",
  type: "Hospital · Case management",
  city: "Austin, TX",
  phone: "(512) 555-0140",
  units: ["Med-Surg 4B", "Rehab 2A", "Geriatrics", "ED Observation"],
};

export const SEED_PROFILE: ProfessionalProfile = {
  firstName: "Sam",
  lastName: "Rivera",
  email: "demo.care@havenapply.local",
  jobTitle: "Discharge Planner",
  phone: "(512) 555-0101",
};

export const SEED_CONTACTS: FacilityContact[] = [
  {
    id: "ct_jordan",
    firstName: "Jordan",
    lastName: "Lee",
    jobTitle: "Director of Admissions",
    email: "jordan.lee@maplegrove.example",
    phone: "(512) 555-2201",
    notes: "Best reached mornings. Prefers complete med lists upfront.",
    facilityIds: ["maple-grove"],
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "ct_priya",
    firstName: "Priya",
    lastName: "Shah",
    jobTitle: "Memory Care Admissions",
    email: "priya.shah@cedar.example",
    phone: "(512) 555-3310",
    notes: "Handles clinical review for memory-care referrals.",
    facilityIds: ["cedar-memory"],
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "ct_thomas",
    firstName: "Thomas",
    lastName: "Berger",
    jobTitle: "Admissions Nurse",
    email: "t.berger@lakeside.example",
    phone: "(214) 555-4488",
    notes: "Schedules nursing assessments for Lakeside.",
    facilityIds: ["lakeside-haven"],
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const SEED_PATIENTS: Patient[] = [
  {
    id: "pt_margaret",
    firstName: "Margaret",
    lastName: "Chen",
    dateOfBirth: "1941-03-12",
    gender: "Female",
    age: 85,
    hospital: "City General Hospital",
    unit: "Med-Surg 4B",
    currentLocation: "City General · Med-Surg 4B",
    language: "English",
    address: "214 Oak Street, Austin, TX",
    phone: "(512) 555-0142",
    pharmacy: "HEB Pharmacy · Lamar",
    pharmacyPhone: "(512) 555-0190",
    primaryPhysician: "Dr. Anita Shah",
    physicianPhone: "(512) 555-0177",
    allergies: "Penicillin",
    assignedProfessional: "Sam Rivera",
    priority: "urgent",
    status: "waiting_documents",
    familyContact: "Lisa Chen",
    familyRelation: "Daughter",
    emergencyContact: "Lisa Chen",
    emergencyPhone: "(512) 555-0188",
    primaryCommunity: "Maple Grove Residence",
    nextAction: "Request medication list from pharmacy",
    updatedAt: hoursAgo(3),
    checklist: {
      identity: true,
      insurance: true,
      medical_assessment: true,
      medication_list: false,
      physician: true,
      care_needs: true,
      consent: false,
    },
    care: emptyCare({
      diagnosis: "Heart failure, mild cognitive impairment",
      mobility: "Walker for distances",
      memory: "Mild short-term forgetfulness",
      behaviour: "Calm, cooperative",
      fallRisk: "Moderate",
      continence: "Independent",
      medicationAssistance: "Needs setup and reminders",
      adls: "Standby assist for bathing",
      requiredCareLevel: "Assisted living",
      specialEquipment: "Walker",
      diet: "Low sodium",
      insurance: "Medicare + supplemental",
      budget: "$4,000–$5,000 / month",
      preferredRegion: "North Austin",
      notes: "Daughter prefers community with memory support available later.",
    }),
    documents: [
      {
        id: "d1",
        category: "identity",
        name: "Photo ID.pdf",
        uploadedBy: "Sam Rivera",
        uploadedAt: daysAgo(2),
        verified: true,
      },
      {
        id: "d2",
        category: "insurance",
        name: "Medicare card.jpg",
        uploadedBy: "Lisa Chen",
        uploadedAt: daysAgo(1),
        verified: true,
      },
      {
        id: "d3",
        category: "discharge_summary",
        name: "Discharge draft.pdf",
        uploadedBy: "Sam Rivera",
        uploadedAt: hoursAgo(5),
        verified: false,
      },
    ],
    applications: [
      {
        id: "app_m1",
        patientId: "pt_margaret",
        communityId: "maple-grove",
        communityName: "Maple Grove Residence",
        status: "need_more_info",
        submittedAt: daysAgo(1),
        nextAction: "Upload medication list",
        assignedStaff: "Jordan Lee",
        lastMessage: "Please send the current medication list.",
        updatedAt: hoursAgo(4),
      },
    ],
    timeline: [
      { id: "t1", at: daysAgo(3), label: "Patient created", detail: "Added by Sam Rivera" },
      { id: "t2", at: daysAgo(2), label: "Documents uploaded", detail: "Identity and insurance" },
      { id: "t3", at: daysAgo(1), label: "Application submitted", detail: "Maple Grove Residence" },
      {
        id: "t4",
        at: hoursAgo(4),
        label: "Community requested information",
        detail: "Medication list needed",
      },
    ],
    messages: [
      {
        id: "m1",
        at: hoursAgo(4),
        from: "community",
        fromName: "Jordan Lee · Maple Grove",
        body: "Thank you for Margaret’s application. Could you share her current medication list?",
      },
      {
        id: "m2",
        at: hoursAgo(3),
        from: "professional",
        fromName: "Sam Rivera",
        body: "Absolutely, I’m requesting it from pharmacy now and will upload today.",
      },
    ],
  },
  {
    id: "pt_robert",
    firstName: "Robert",
    lastName: "Hayes",
    dateOfBirth: "1938-11-02",
    gender: "Male",
    age: 87,
    hospital: "City General Hospital",
    unit: "Rehab 2A",
    currentLocation: "City General · Rehab 2A",
    language: "English",
    assignedProfessional: "Sam Rivera",
    priority: "soon",
    status: "ready_to_apply",
    familyContact: "Daniel Hayes",
    familyRelation: "Son",
    emergencyContact: "Daniel Hayes",
    emergencyPhone: "(512) 555-0112",
    primaryCommunity: null,
    nextAction: "Submit to shortlisted communities",
    updatedAt: hoursAgo(8),
    checklist: {
      identity: true,
      insurance: true,
      medical_assessment: true,
      medication_list: true,
      physician: true,
      care_needs: true,
      consent: true,
    },
    care: emptyCare({
      diagnosis: "Post-hip fracture rehab",
      mobility: "Wheelchair → walker progression",
      memory: "Intact",
      behaviour: "Motivated in therapy",
      fallRisk: "High until gait improves",
      continence: "Independent",
      medicationAssistance: "Setup only",
      adls: "Standby for transfers",
      requiredCareLevel: "Assisted living with rehab support",
      specialEquipment: "Wheelchair, walker",
      diet: "Regular",
      insurance: "Medicare Advantage",
      budget: "Up to $4,200 / month",
      preferredRegion: "Central Austin",
    }),
    documents: [
      {
        id: "d4",
        category: "identity",
        name: "Driver license.pdf",
        uploadedBy: "Daniel Hayes",
        uploadedAt: daysAgo(4),
        verified: true,
      },
      {
        id: "d4b",
        category: "insurance",
        name: "Medicare Advantage card.pdf",
        uploadedBy: "Daniel Hayes",
        uploadedAt: daysAgo(3),
        verified: true,
      },
      {
        id: "d5",
        category: "medication_list",
        name: "Med list.pdf",
        uploadedBy: "Sam Rivera",
        uploadedAt: daysAgo(2),
        verified: true,
      },
      {
        id: "d6",
        category: "functional_assessment",
        name: "PT OT notes.pdf",
        uploadedBy: "Sam Rivera",
        uploadedAt: daysAgo(1),
        verified: true,
      },
      {
        id: "d7",
        category: "consent_forms",
        name: "Release of information.pdf",
        uploadedBy: "Daniel Hayes",
        uploadedAt: daysAgo(1),
        verified: true,
      },
    ],
    applications: [],
    timeline: [
      { id: "t5", at: daysAgo(5), label: "Patient created" },
      { id: "t6", at: daysAgo(1), label: "Checklist complete", detail: "Ready to apply" },
    ],
    messages: [
      {
        id: "m3",
        at: hoursAgo(10),
        from: "family",
        fromName: "Daniel Hayes",
        body: "Dad is ready whenever you are. We liked Lakeside and Sunrise from the tour notes.",
      },
    ],
  },
  {
    id: "pt_eleanor",
    firstName: "Eleanor",
    lastName: "Brooks",
    dateOfBirth: "1945-07-21",
    gender: "Female",
    age: 80,
    hospital: "City General Hospital",
    unit: "Geriatrics",
    currentLocation: "City General · Geriatrics",
    language: "English",
    assignedProfessional: "Sam Rivera",
    priority: "routine",
    status: "applications_sent",
    familyContact: "Nina Brooks",
    familyRelation: "Daughter",
    emergencyContact: "Nina Brooks",
    emergencyPhone: "(512) 555-0199",
    primaryCommunity: "Cedar Memory Care",
    nextAction: "Wait for Cedar review",
    updatedAt: daysAgo(1),
    checklist: {
      identity: true,
      insurance: true,
      medical_assessment: true,
      medication_list: true,
      physician: true,
      care_needs: true,
      consent: true,
    },
    care: emptyCare({
      diagnosis: "Alzheimer’s disease, moderate",
      mobility: "Independent with supervision outdoors",
      memory: "Moderate impairment",
      behaviour: "Sun-downing evenings",
      fallRisk: "Low–moderate",
      continence: "Occasional assist",
      medicationAssistance: "Full administration",
      adls: "Cueing for dressing and hygiene",
      requiredCareLevel: "Memory care",
      specialEquipment: "None",
      diet: "Regular, finger foods preferred",
      insurance: "Long-term care policy + Medicare",
      budget: "$6,000–$7,000 / month",
      preferredRegion: "Northwest Austin",
    }),
    documents: [
      {
        id: "d8",
        category: "care_assessment",
        name: "Geriatric assessment.pdf",
        uploadedBy: "Sam Rivera",
        uploadedAt: daysAgo(6),
        verified: true,
      },
      {
        id: "d9",
        category: "consent_forms",
        name: "Family consent.pdf",
        uploadedBy: "Nina Brooks",
        uploadedAt: daysAgo(5),
        verified: true,
      },
    ],
    applications: [
      {
        id: "app_e1",
        patientId: "pt_eleanor",
        communityId: "cedar-memory",
        communityName: "Cedar Memory Care",
        status: "under_review",
        submittedAt: daysAgo(2),
        nextAction: "Awaiting admissions review",
        assignedStaff: "Priya Shah",
        lastMessage: "Application received — review in progress.",
        updatedAt: daysAgo(1),
      },
      {
        id: "app_e2",
        patientId: "pt_eleanor",
        communityId: "hillcrest-manor",
        communityName: "Hillcrest Manor",
        status: "submitted",
        submittedAt: daysAgo(2),
        nextAction: "Awaiting acknowledgement",
        assignedStaff: "Unassigned",
        lastMessage: "Submitted via HavenApply",
        updatedAt: daysAgo(2),
      },
    ],
    timeline: [
      { id: "t7", at: daysAgo(7), label: "Patient created" },
      { id: "t8", at: daysAgo(2), label: "Applications submitted", detail: "Cedar · Hillcrest" },
    ],
    messages: [
      {
        id: "m4",
        at: daysAgo(1),
        from: "community",
        fromName: "Priya Shah · Cedar Memory",
        body: "We’ve started Eleanor’s clinical review and will confirm a family call this week.",
      },
    ],
  },
  {
    id: "pt_james",
    firstName: "James",
    lastName: "Ortiz",
    dateOfBirth: "1949-01-30",
    gender: "Male",
    age: 77,
    hospital: "City General Hospital",
    unit: "ED Observation",
    currentLocation: "City General · ED Observation",
    language: "Spanish / English",
    assignedProfessional: "Sam Rivera",
    priority: "urgent",
    status: "assessment_scheduled",
    familyContact: "Maria Ortiz",
    familyRelation: "Wife",
    emergencyContact: "Maria Ortiz",
    emergencyPhone: "(512) 555-0166",
    primaryCommunity: "Lakeside Haven",
    nextAction: "Prepare family for tomorrow’s assessment",
    updatedAt: hoursAgo(2),
    checklist: {
      identity: true,
      insurance: true,
      medical_assessment: true,
      medication_list: true,
      physician: true,
      care_needs: true,
      consent: true,
    },
    care: emptyCare({
      diagnosis: "COPD exacerbation, diabetes",
      mobility: "Independent short distances",
      memory: "Intact",
      behaviour: "Anxious about discharge timing",
      fallRisk: "Low",
      continence: "Independent",
      medicationAssistance: "Reminders preferred",
      adls: "Independent",
      requiredCareLevel: "Assisted living",
      specialEquipment: "Oxygen concentrator",
      diet: "Diabetic",
      language: "Spanish / English",
      insurance: "Medicaid pending + Medicare",
      budget: "Needs Medicaid-friendly option",
      preferredRegion: "East Austin",
    }),
    documents: [
      {
        id: "d10",
        category: "physician_notes",
        name: "Pulmonology note.pdf",
        uploadedBy: "Sam Rivera",
        uploadedAt: daysAgo(1),
        verified: true,
      },
    ],
    applications: [
      {
        id: "app_j1",
        patientId: "pt_james",
        communityId: "lakeside-haven",
        communityName: "Lakeside Haven",
        status: "assessment_requested",
        submittedAt: daysAgo(3),
        nextAction: "Assessment tomorrow 10:00",
        assignedStaff: "Thomas Berger",
        lastMessage: "Nurse assessment scheduled for tomorrow morning.",
        updatedAt: hoursAgo(2),
      },
    ],
    timeline: [
      { id: "t9", at: daysAgo(4), label: "Patient created" },
      { id: "t10", at: daysAgo(3), label: "Application submitted", detail: "Lakeside Haven" },
      {
        id: "t11",
        at: hoursAgo(2),
        label: "Assessment scheduled",
        detail: "Tomorrow 10:00 with Lakeside nursing",
      },
    ],
    messages: [
      {
        id: "m5",
        at: hoursAgo(2),
        from: "community",
        fromName: "Thomas Berger · Lakeside",
        body: "Assessment confirmed for tomorrow at 10:00. Please have oxygen orders available.",
      },
    ],
  },
  {
    id: "pt_helen",
    firstName: "Helen",
    lastName: "Nguyen",
    dateOfBirth: "1943-09-08",
    gender: "Female",
    age: 82,
    hospital: "City General Hospital",
    unit: "Med-Surg 4B",
    currentLocation: "City General · Med-Surg 4B",
    language: "English",
    assignedProfessional: "Sam Rivera",
    priority: "routine",
    status: "building_profile",
    familyContact: "Kevin Nguyen",
    familyRelation: "Son",
    emergencyContact: "Kevin Nguyen",
    emergencyPhone: "(512) 555-0177",
    primaryCommunity: null,
    nextAction: "Complete care needs and insurance fields",
    updatedAt: hoursAgo(1),
    checklist: {
      identity: true,
      insurance: false,
      medical_assessment: false,
      medication_list: false,
      physician: false,
      care_needs: false,
      consent: false,
    },
    care: emptyCare({
      diagnosis: "Pending full assessment",
      language: "English",
      preferredRegion: "South Austin",
    }),
    documents: [
      {
        id: "d11",
        category: "identity",
        name: "Passport scan.pdf",
        uploadedBy: "Kevin Nguyen",
        uploadedAt: hoursAgo(6),
        verified: false,
      },
    ],
    applications: [],
    timeline: [
      { id: "t12", at: hoursAgo(6), label: "Patient created", detail: "Intake started" },
      { id: "t13", at: hoursAgo(6), label: "Documents uploaded", detail: "Identity" },
    ],
    messages: [],
  },
];

export function allApplications(patients: Patient[]) {
  return patients.flatMap((p) => p.applications.map((a) => ({ ...a, patient: p })));
}

export type PatientDraft = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  currentLocation: string;
  language: string;
  emergencyContact: string;
  emergencyPhone: string;
  familyContact: string;
  familyRelation: string;
  hospital: string;
  unit: string;
  care: Partial<CareProfile>;
};
