import {
  APPLICATION_STATUS_LABEL,
  CHECKLIST_LABEL,
  patientDossierReadyForApply,
  patientName,
  type Patient,
} from "@/lib/professional-data";

export type ProfessionalCopilotReply = {
  text: string;
  href?: string;
};

/** Deterministic copilote for care professionals (patients, docs, applications). */
export function answerProfessionalCopilot(input: {
  question: string;
  patients: Patient[];
}): ProfessionalCopilotReply {
  const q = input.question.toLowerCase();
  const patients = input.patients;

  const findPatient = () =>
    patients.find((p) => {
      const name = patientName(p).toLowerCase();
      return q.includes(name) || q.includes(p.firstName.toLowerCase()) || q.includes(p.lastName.toLowerCase());
    });

  if (q.includes("application") || q.includes("status") || q.includes("submitted") || q.includes("where")) {
    const apps = patients.flatMap((p) =>
      p.applications.map((a) => ({
        patient: patientName(p),
        community: a.communityName,
        status: APPLICATION_STATUS_LABEL[a.status] || a.status,
        next: a.nextAction,
      })),
    );
    if (!apps.length) {
      return {
        text: "No applications submitted yet. Open Communities, pick a patient, then Review & apply when their dossier is complete.",
        href: "/professional/communities",
      };
    }
    const lines = apps.slice(0, 6).map(
      (a) => `• ${a.patient} → ${a.community}: ${a.status}${a.next ? ` (${a.next})` : ""}`,
    );
    return {
      text: `Here's where applications stand:\n${lines.join("\n")}`,
      href: "/professional/applications",
    };
  }

  if (
    q.includes("document") ||
    q.includes("missing") ||
    q.includes("checklist") ||
    q.includes("ready") ||
    q.includes("dossier")
  ) {
    const focused = findPatient();
    if (focused) {
      const readiness = patientDossierReadyForApply(focused);
      if (readiness.ok) {
        return {
          text: `${patientName(focused)}'s dossier looks ready to apply. Open Communities and use Review & apply.`,
          href: `/professional/communities?patient=${focused.id}`,
        };
      }
      const lines = [
        ...readiness.missingProfile.map((m) => `• Profile: ${m}`),
        ...readiness.missingCare.map((m) => `• Care: ${m}`),
        ...readiness.missingChecklist.map((k) => `• Checklist: ${CHECKLIST_LABEL[k]}`),
        ...readiness.missingDocs.map((d) => `• Document: ${d.label}`),
      ].slice(0, 8);
      return {
        text: `${patientName(focused)} still needs:\n${lines.join("\n") || readiness.reasons.join("\n")}`,
        href: `/professional/patients/${focused.id}`,
      };
    }

    const incomplete = patients
      .map((p) => ({ p, r: patientDossierReadyForApply(p) }))
      .filter((x) => !x.r.ok);
    if (!incomplete.length) {
      return {
        text: "All patient dossiers look ready. You can submit applications from Communities.",
        href: "/professional/communities",
      };
    }
    const lines = incomplete.slice(0, 5).map((x) => {
      const n =
        x.r.missingDocs.length +
        x.r.missingChecklist.length +
        x.r.missingProfile.length +
        x.r.missingCare.length;
      return `• ${patientName(x.p)} — ${n} item${n === 1 ? "" : "s"} left`;
    });
    return {
      text: `Patients with incomplete dossiers:\n${lines.join("\n")}`,
      href: "/professional/patients?status=waiting_documents",
    };
  }

  if (q.includes("patient") || q.includes("caseload") || q.includes("priority") || q.includes("who")) {
    if (!patients.length) {
      return {
        text: "No patients yet. Add a patient to start building dossiers and applications.",
        href: "/professional/patients/new",
      };
    }
    const urgent = patients.filter((p) => p.priority === "urgent");
    const ready = patients.filter((p) => patientDossierReadyForApply(p).ok);
    const lines = patients
      .slice(0, 6)
      .map((p) => `• ${patientName(p)} — ${p.status.replaceAll("_", " ")}`);
    return {
      text: `Caseload snapshot: ${patients.length} patient${patients.length === 1 ? "" : "s"}, ${urgent.length} urgent, ${ready.length} ready to apply.\n${lines.join("\n")}`,
      href: "/professional/dashboard",
    };
  }

  if (q.includes("message") || q.includes("inbox") || q.includes("reply")) {
    return {
      text: "Open Messages to follow family and community threads for each patient.",
      href: "/professional/messages",
    };
  }

  if (q.includes("communit") || q.includes("search") || q.includes("find") || q.includes("place")) {
    return {
      text: "Browse communities, select a patient, then Review & apply when the dossier is complete.",
      href: "/professional/communities",
    };
  }

  if (q.includes("contact") || q.includes("admission")) {
    return {
      text: "Facility contacts are under Contacts—admissions names, emails, and linked residences.",
      href: "/professional/contacts",
    };
  }

  return {
    text: "I can check patient readiness, missing documents, application status, or help you find communities. Try “Who needs documents?” or “Where are my applications?”",
    href: "/professional/dashboard",
  };
}
