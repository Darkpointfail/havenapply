import type { CommunityApplication, CommunityProfile } from "@/lib/community-portal";

export type AgreementStatus =
  | "not_started"
  | "draft"
  | "sent"
  | "viewed"
  | "partially_signed"
  | "signed"
  | "verified";

export type PaymentStatus =
  | "not_started"
  | "request_created"
  | "sent"
  | "pending"
  | "partially_paid"
  | "paid"
  | "verified";

export type FamilyDetailsStatus =
  | "not_started"
  | "requested"
  | "family_completing"
  | "submitted"
  | "changes_requested"
  | "verified";

export type MoveInStatus =
  | "not_started"
  | "proposed"
  | "waiting_family"
  | "confirmed"
  | "rescheduled"
  | "ready";

export type TransitionStepId = "contract" | "payment" | "familyDetails" | "moveInDate";

export type TransitionTimelineEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  stepId?: TransitionStepId;
  detail?: string;
  href?: string;
};

export type TransitionEmailRecord = {
  id: string;
  at: string;
  template: string;
  to: string;
  subject: string;
  body: string;
  stepId: TransitionStepId;
  status: "queued" | "sent" | "opened" | "failed";
};

export type AgreementWork = {
  status: AgreementStatus;
  templateId: string;
  roomType: string;
  monthlyRate: string;
  moveInDate: string;
  clauses: string;
  notes: string;
  signers: string[];
  version: number;
  lastSentAt: string | null;
  signedAt: string | null;
  verifiedAt: string | null;
  uploadedSignedName: string | null;
  assignee: string;
};

export type PaymentWork = {
  status: PaymentStatus;
  amountDue: number;
  amountReceived: number;
  covers: string;
  dueDate: string;
  acceptedMethods: string[];
  methodConfirmed: string;
  payerName: string;
  billingEmail: string;
  billingNotes: string;
  paymentLink: string | null;
  receiptNote: string;
  proofName: string | null;
  lastSentAt: string | null;
  verifiedAt: string | null;
  assignee: string;
};

export type FamilyDetailsSections = {
  contacts: Record<string, string>;
  health: Record<string, string>;
  belongings: Record<string, string>;
  preferences: Record<string, string>;
  logistics: Record<string, string>;
};

export type FamilyDetailsWork = {
  status: FamilyDetailsStatus;
  sectionsRequested: (keyof FamilyDetailsSections)[];
  data: FamilyDetailsSections;
  internalNotes: string;
  correctionRequest: string;
  lastSentAt: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  assignee: string;
};

export type MoveInWork = {
  status: MoveInStatus;
  proposedDates: string[];
  confirmedDate: string;
  confirmedTime: string;
  unit: string;
  unitAvailable: boolean;
  arrivalWindow: string;
  hostStaff: string;
  notifyServices: string;
  specialNeeds: string;
  attendees: string;
  lastSentAt: string | null;
  confirmedAt: string | null;
  assignee: string;
};

export type TransitionWork = {
  agreement: AgreementWork;
  payment: PaymentWork;
  familyDetails: FamilyDetailsWork;
  moveIn: MoveInWork;
  emails: TransitionEmailRecord[];
  timeline: TransitionTimelineEntry[];
};

export const AGREEMENT_TEMPLATES = [
  { id: "al-standard", label: "Assisted living — standard residency agreement" },
  { id: "al-memory", label: "Memory care addendum + residency agreement" },
  { id: "il-lease", label: "Independent living lease" },
] as const;

export const PAYMENT_METHODS = ["Card", "ACH / wire", "Check", "Cashier’s check", "Other"] as const;

export function agreementStatusLabel(s: AgreementStatus) {
  const map: Record<AgreementStatus, string> = {
    not_started: "Not started",
    draft: "Draft created",
    sent: "Sent",
    viewed: "Viewed",
    partially_signed: "Partially signed",
    signed: "Signed",
    verified: "Verified",
  };
  return map[s];
}

export function paymentStatusLabel(s: PaymentStatus) {
  const map: Record<PaymentStatus, string> = {
    not_started: "Not started",
    request_created: "Payment request created",
    sent: "Sent",
    pending: "Payment pending",
    partially_paid: "Partially paid",
    paid: "Paid",
    verified: "Verified",
  };
  return map[s];
}

export function familyStatusLabel(s: FamilyDetailsStatus) {
  const map: Record<FamilyDetailsStatus, string> = {
    not_started: "Not started",
    requested: "Information requested",
    family_completing: "Family completing",
    submitted: "Submitted",
    changes_requested: "Changes requested",
    verified: "Verified",
  };
  return map[s];
}

export function moveInStatusLabel(s: MoveInStatus) {
  const map: Record<MoveInStatus, string> = {
    not_started: "Not started",
    proposed: "Date proposed",
    waiting_family: "Waiting for family",
    confirmed: "Confirmed",
    rescheduled: "Rescheduled",
    ready: "Ready for move-in",
  };
  return map[s];
}

export function stepCompleteFromWork(work: TransitionWork): Record<TransitionStepId, boolean> {
  return {
    contract: work.agreement.status === "verified",
    payment:
      work.payment.status === "verified" &&
      Boolean(work.payment.methodConfirmed.trim()) &&
      work.payment.amountReceived >= work.payment.amountDue &&
      work.payment.amountDue > 0,
    familyDetails: work.familyDetails.status === "verified",
    moveInDate: ["confirmed", "ready"].includes(work.moveIn.status) && Boolean(work.moveIn.confirmedDate),
  };
}

export function deriveTransitionChecklist(work: TransitionWork) {
  return stepCompleteFromWork(work);
}

export function nextTransitionAction(work: TransitionWork): { stepId: TransitionStepId; label: string } {
  const done = stepCompleteFromWork(work);
  if (!done.contract) {
    if (work.agreement.status === "not_started")
      return { stepId: "contract", label: "Generate the residency agreement" };
    if (work.agreement.status === "draft")
      return { stepId: "contract", label: "Send the residency agreement for signature" };
    if (["sent", "viewed", "partially_signed"].includes(work.agreement.status))
      return { stepId: "contract", label: "Follow up on signatures" };
    if (work.agreement.status === "signed")
      return { stepId: "contract", label: "Verify the signed residency agreement" };
    return { stepId: "contract", label: "Finish the residency agreement" };
  }
  if (!done.payment) {
    if (work.payment.status === "not_started")
      return { stepId: "payment", label: "Create the deposit payment request" };
    if (["request_created", "sent", "pending", "partially_paid"].includes(work.payment.status))
      return { stepId: "payment", label: "Collect or record the deposit payment" };
    if (work.payment.status === "paid")
      return { stepId: "payment", label: "Verify deposit and confirm payment method" };
    return { stepId: "payment", label: "Finish deposit & payment" };
  }
  if (!done.familyDetails) {
    if (work.familyDetails.status === "not_started")
      return { stepId: "familyDetails", label: "Request final family details" };
    if (["requested", "family_completing"].includes(work.familyDetails.status))
      return { stepId: "familyDetails", label: "Wait for or complete family details" };
    if (work.familyDetails.status === "submitted" || work.familyDetails.status === "changes_requested")
      return { stepId: "familyDetails", label: "Review and verify family details" };
    return { stepId: "familyDetails", label: "Finish family details" };
  }
  if (!done.moveInDate) {
    if (work.moveIn.status === "not_started")
      return { stepId: "moveInDate", label: "Propose a move-in date" };
    if (["proposed", "waiting_family", "rescheduled"].includes(work.moveIn.status))
      return { stepId: "moveInDate", label: "Confirm the move-in date with the family" };
    return { stepId: "moveInDate", label: "Mark move-in ready" };
  }
  return { stepId: "contract", label: "Close the dossier" };
}

export function transitionProgressDetail(work: TransitionWork) {
  const doneMap = stepCompleteFromWork(work);
  const steps: TransitionStepId[] = ["contract", "payment", "familyDetails", "moveInDate"];
  const complete = steps.filter((s) => doneMap[s]).length;
  const waiting = steps.filter((s) => {
    if (doneMap[s]) return false;
    if (s === "contract") return ["sent", "viewed", "partially_signed"].includes(work.agreement.status);
    if (s === "payment") return ["sent", "pending", "partially_paid"].includes(work.payment.status);
    if (s === "familyDetails")
      return ["requested", "family_completing"].includes(work.familyDetails.status);
    return ["proposed", "waiting_family"].includes(work.moveIn.status);
  }).length;
  const blocked = steps.length - complete - waiting;
  const next = nextTransitionAction(work);
  const urgent: string[] = [];
  if (work.payment.dueDate && work.payment.status !== "verified") {
    const due = new Date(work.payment.dueDate).getTime();
    if (Number.isFinite(due) && due - Date.now() < 1000 * 60 * 60 * 24 * 3) {
      urgent.push("Deposit due within 3 days");
    }
  }
  if (work.agreement.status === "sent" || work.agreement.status === "viewed") {
    urgent.push("Agreement awaiting signature");
  }
  return {
    complete,
    total: steps.length,
    waiting,
    blocked: Math.max(0, blocked),
    urgent,
    next,
    percent: Math.round((complete / steps.length) * 100),
    allComplete: complete === steps.length,
  };
}

function nowIso() {
  return new Date().toISOString();
}

export function buildDefaultFamilySections(app: CommunityApplication): FamilyDetailsSections {
  return {
    contacts: {
      primaryContact: `${app.family?.name || ""} · ${app.family?.email || ""} · ${app.family?.phone || ""}`,
      emergencyContact: app.emergencyContact
        ? `${app.emergencyContact.name} · ${app.emergencyContact.phone} · ${app.emergencyContact.relationship}`
        : "",
      authorizedInfo: app.family?.name || "",
      authorizedPickup: "",
      billingContact: app.family?.name || "",
      decisionMaker: app.family?.name || "",
    },
    health: {
      pharmacy: "",
      pharmacyPhone: "",
      primaryPhysician: "",
      physicianPhone: "",
      allergies: (app.dossier?.allergies || []).map((a) => a.substance).join(", ") || "",
      medications: (app.dossier?.medications || [])
        .map((m) => `${m.name} ${m.dose}`.trim())
        .join("; "),
      medManagement: "",
      prescriptionsNeeded: "",
      arrivalMedicalNeeds: "",
    },
    belongings: {
      furniture: "",
      clothing: "",
      medicalDevices: "",
      valuables: "",
      specialEquipment: "",
      inventory: "",
      labelingNeeds: "",
    },
    preferences: {
      diet: app.dossier?.diet || "",
      foodAllergies: "",
      dailyRoutine: "",
      sleepPreferences: "",
      socialHabits: "",
      faith: "",
      interests: "",
      communicationPrefs: "",
      specialNeeds: "",
    },
    logistics: {
      presentOnMoveIn: app.family?.name || "",
      movingCompany: "",
      preferredArrivalTime: "",
      buildingAccess: "",
      parking: "",
      medicalTransport: "",
      equipmentToPrepare: "",
      specialInstructions: "",
    },
  };
}

export function createEmptyTransitionWork(
  app: CommunityApplication,
  profile?: CommunityProfile | null,
): TransitionWork {
  const room = profile?.roomTypes?.[0];
  return {
    agreement: {
      status: "not_started",
      templateId: "al-standard",
      roomType: room?.name || app.careType || "Assisted living suite",
      monthlyRate: room?.price != null ? String(room.price) : "",
      moveInDate: app.moveInConfirmed || app.moveInRequested || "",
      clauses: "",
      notes: "",
      signers: [app.family?.name || "Primary family contact"].filter(Boolean),
      version: 0,
      lastSentAt: null,
      signedAt: null,
      verifiedAt: null,
      uploadedSignedName: null,
      assignee: app.assigneeName || "Admissions",
    },
    payment: {
      status: "not_started",
      amountDue: 2500,
      amountReceived: 0,
      covers: "Community deposit · holds the suite through move-in",
      dueDate: "",
      acceptedMethods: ["Card", "ACH / wire", "Check"],
      methodConfirmed: app.paymentMethod || "",
      payerName: app.family?.name || "",
      billingEmail: app.family?.email || "",
      billingNotes: "",
      paymentLink: null,
      receiptNote: "",
      proofName: null,
      lastSentAt: null,
      verifiedAt: null,
      assignee: app.assigneeName || "Admissions",
    },
    familyDetails: {
      status: "not_started",
      sectionsRequested: ["contacts", "health", "belongings", "preferences", "logistics"],
      data: buildDefaultFamilySections(app),
      internalNotes: "",
      correctionRequest: "",
      lastSentAt: null,
      submittedAt: null,
      verifiedAt: null,
      assignee: app.assigneeName || "Admissions",
    },
    moveIn: {
      status: "not_started",
      proposedDates: app.moveInRequested ? [app.moveInRequested.slice(0, 10)] : [],
      confirmedDate: app.moveInConfirmed || "",
      confirmedTime: "10:00",
      unit: room?.name || "",
      unitAvailable: true,
      arrivalWindow: "90 minutes",
      hostStaff: app.assigneeName || "Director of Admissions",
      notifyServices: "Nursing · Dining · Housekeeping",
      specialNeeds: "",
      attendees: app.family?.name || "",
      lastSentAt: null,
      confirmedAt: null,
      assignee: app.assigneeName || "Admissions",
    },
    emails: [],
    timeline: [
      {
        id: `tl-${Date.now()}`,
        at: nowIso(),
        actor: "System",
        action: "Transition workspace opened",
        detail: "Accepted candidate ready for move-in prep",
      },
    ],
  };
}

/** Merge defaults for older apps that only have the boolean checklist. */
export function ensureTransitionWork(
  app: CommunityApplication,
  profile?: CommunityProfile | null,
): TransitionWork {
  const base = createEmptyTransitionWork(app, profile);
  const existing = app.transitionWork;
  if (!existing) {
    // Honor prior boolean checklist progress for Helen-style seeds
    const checks = app.transitionChecklist || {};
    if (checks.contract) {
      base.agreement.status = "verified";
      base.agreement.version = 1;
      base.agreement.signedAt = app.lastUpdated;
      base.agreement.verifiedAt = app.lastUpdated;
    }
    if (checks.payment) {
      base.payment.status = "verified";
      base.payment.amountReceived = base.payment.amountDue;
      base.payment.verifiedAt = app.lastUpdated;
    }
    if (checks.familyDetails) {
      base.familyDetails.status = "verified";
      base.familyDetails.verifiedAt = app.lastUpdated;
    }
    if (checks.moveInDate) {
      base.moveIn.status = "confirmed";
      base.moveIn.confirmedDate = app.moveInConfirmed || app.moveInRequested || "";
      base.moveIn.confirmedAt = app.lastUpdated;
    }
    return base;
  }
  return {
    agreement: { ...base.agreement, ...existing.agreement },
    payment: { ...base.payment, ...existing.payment },
    familyDetails: {
      ...base.familyDetails,
      ...existing.familyDetails,
      data: {
        contacts: { ...base.familyDetails.data.contacts, ...existing.familyDetails?.data?.contacts },
        health: { ...base.familyDetails.data.health, ...existing.familyDetails?.data?.health },
        belongings: {
          ...base.familyDetails.data.belongings,
          ...existing.familyDetails?.data?.belongings,
        },
        preferences: {
          ...base.familyDetails.data.preferences,
          ...existing.familyDetails?.data?.preferences,
        },
        logistics: {
          ...base.familyDetails.data.logistics,
          ...existing.familyDetails?.data?.logistics,
        },
      },
      sectionsRequested:
        existing.familyDetails?.sectionsRequested || base.familyDetails.sectionsRequested,
    },
    moveIn: { ...base.moveIn, ...existing.moveIn },
    emails: existing.emails || [],
    timeline: existing.timeline?.length ? existing.timeline : base.timeline,
  };
}

export function emailTemplates() {
  return {
    agreement_send: {
      subject: "Please review and sign the residency agreement",
      body: "We’re pleased to move forward. Please review the residency agreement and complete your electronic signature at your earliest convenience. Reply in HavenApply if you have questions.",
    },
    agreement_reminder: {
      subject: "Reminder: residency agreement awaiting your signature",
      body: "This is a friendly reminder that the residency agreement is still awaiting signature. We’re happy to walk through any questions.",
    },
    deposit_request: {
      subject: "Deposit payment request for your upcoming move-in",
      body: "To hold the suite, please complete the deposit using the secure payment link. You’ll receive a receipt as soon as payment is confirmed.",
    },
    deposit_reminder: {
      subject: "Reminder: deposit payment still outstanding",
      body: "We’re holding the suite and wanted to remind you that the deposit is still outstanding. Use the secure link in HavenApply or contact admissions for other payment options.",
    },
    family_details_request: {
      subject: "Final details needed before move-in",
      body: "Please complete the remaining move-in details (contacts, pharmacy, belongings, preferences, and logistics) so we can prepare a smooth arrival day.",
    },
    family_details_correction: {
      subject: "A few details need a quick update",
      body: "Thank you for submitting. We need a small correction before we can finalize preparations. Please update the highlighted items in HavenApply.",
    },
    movein_propose: {
      subject: "Proposed move-in date for your review",
      body: "We’ve proposed a move-in date and time. Please confirm if this works, or suggest an alternative that fits your family.",
    },
    movein_confirm: {
      subject: "Move-in confirmed — see you soon",
      body: "Your move-in date and time are confirmed. We’ll send a reminder before arrival day with parking and welcome details.",
    },
    movein_reminder: {
      subject: "Reminder: move-in is coming up",
      body: "We’re looking forward to welcoming you. Here’s a quick reminder of the confirmed move-in date, arrival window, and who will greet you.",
    },
  } as const;
}

export type EmailTemplateId = keyof ReturnType<typeof emailTemplates>;

export function buildAgreementPreviewHtml(
  app: CommunityApplication,
  work: AgreementWork,
  communityName: string,
) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Residency Agreement</title>
  <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#1a1a1a;line-height:1.5}
  h1{font-size:22px} h2{font-size:16px;margin-top:28px} .meta{color:#555;font-size:14px}</style></head><body>
  <h1>Residency Agreement</h1>
  <p class="meta">${communityName} · Template ${work.templateId} · Version ${work.version || 1}</p>
  <h2>Resident</h2>
  <p>${app.seniorName}, age ${app.seniorAge}</p>
  <h2>Primary family contact</h2>
  <p>${app.family?.name || "—"} · ${app.family?.email || "—"} · ${app.family?.phone || "—"}</p>
  <h2>Suite & rate</h2>
  <p>${work.roomType || "—"} · Monthly rate: ${work.monthlyRate ? `$${work.monthlyRate}` : "TBD"}</p>
  <h2>Anticipated move-in</h2>
  <p>${work.moveInDate || "Flexible / to be confirmed"}</p>
  <h2>Additional clauses</h2>
  <p>${work.clauses || "None"}</p>
  <h2>Notes</h2>
  <p>${work.notes || "None"}</p>
  <h2>Signers</h2>
  <p>${work.signers.join(", ") || "—"}</p>
  <p class="meta">Generated in HavenApply for admissions transition.</p>
  </body></html>`;
}

export function downloadHtmlAsFile(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
