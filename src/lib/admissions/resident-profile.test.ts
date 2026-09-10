import { describe, expect, it } from "vitest";
import { admissionRecordToCommunityApplication } from "@/lib/admissions/mapping";
import type { AdmissionApplicationRecord } from "@/lib/admissions/types";
import { parseSubmitInput } from "@/lib/admissions/validation";

const SNAPSHOT = {
  updatedAt: "2026-08-21T14:00:00.000Z",
  completeness: {
    percent: 75,
    missingItems: ["Formulaire médical signé"],
    missingDocuments: ["Procuration"],
  },
  context: {
    currentAddress: "Rosemont, Montréal",
    currentLivingSituation: "home",
    primaryLanguage: "fr",
    referralSource: "Déposée par la famille (HavenApply)",
  },
  housing: {
    communityTypes: ["assisted"],
    preferredCities: "Montréal, Laval",
    roomPreference: "private",
    specialPreferences: ["french"],
    specialPreferencesNotes: "Ascenseur ou unité sans escalier",
    budgetMin: "4500",
    budgetMax: "5500",
  },
  autonomy: {
    level: "assisted",
    mobility: "walker",
    mobilityDevices: ["walker"],
    adls: { bathing: "hands_on", eating: "independent" },
    continence: "continent",
    memoryCognition: ["memory_loss"],
    nutrition: ["normal"],
    specialCareNeeds: "",
  },
  clinical: {
    diagnoses: "Diabète de type 2",
    medicalConditions: "Hypertension",
    currentMedications: "Metformine 500 mg, matin et soir",
    allergies: "Pénicilline",
    medicationAllergies: "",
    pharmacy: "Pharmacie Beaubien",
    physician: "Dre Tremblay",
    physicianPhone: "514 555-0123",
  },
  emergencyContact: {
    name: "Jean Gagnon",
    email: "jean@example.com",
    phone: "514 555-0111",
    relationship: "Fils",
  },
  secondaryContact: null,
  communicationPreference: "Téléphone, 9 h à 17 h",
  decisionAuthority: "Fille · dossier signé",
};

describe("resident admission-profile contract", () => {
  it("accepts only the allow-listed dossier snapshot and strips sensitive fields", () => {
    const result = parseSubmitInput({
      clientRequestId: "app-1",
      siteId: "rpa-1428",
      dossierSnapshot: {
        ...SNAPSHOT,
        ssn: "123-45-6789",
        bankAccount: "000111222",
        clinical: {
          ...SNAPSHOT.clinical,
          insurancePolicyNumber: "POLICY-SECRET",
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dossierSnapshot?.completeness.percent).toBe(75);
    expect(result.value.dossierSnapshot?.emergencyContact?.name).toBe("Jean Gagnon");
    const serialized = JSON.stringify(result.value.dossierSnapshot);
    expect(serialized).not.toContain("123-45-6789");
    expect(serialized).not.toContain("000111222");
    expect(serialized).not.toContain("POLICY-SECRET");
  });

  it("hydrates staff-facing dossier, contact, housing and completeness from server data", () => {
    const record: AdmissionApplicationRecord = {
      id: "adm-1",
      familyUserId: "family-1",
      familyEmail: "sophie@example.com",
      siteId: "rpa-1428",
      siteName: "Résidence test",
      clientRequestId: "app-1",
      publicRef: "HA-A-2026-00001",
      personRef: "HA-P-00001",
      dossierRef: "HA-D-2026-00001",
      status: "under_review",
      senior: {
        name: "Madeleine Gagnon",
        age: 82,
        relationship: "Mère",
        photoUrl: null,
      },
      summary: "Madeleine cherche un milieu avec soins évolutifs.",
      careNeeds: ["Mobilité : marchette"],
      medicalHighlights: ["Diabète de type 2"],
      documents: [],
      familyContact: {
        name: "Sophie Gagnon",
        email: "sophie@example.com",
        phone: "514 555-0198",
        relationship: "Fille",
      },
      dossierSnapshot: SNAPSHOT,
      dossier: null,
      desiredMoveIn: "Dans les 30 prochains jours",
      waitlistPosition: null,
      decision: null,
      isSeed: false,
      createdAt: "2026-08-21T14:00:00.000Z",
      submittedAt: "2026-08-21T14:00:00.000Z",
      updatedAt: "2026-08-26T14:00:00.000Z",
    };

    const app = admissionRecordToCommunityApplication(record);
    expect(app.dossierCompleteness).toEqual(SNAPSHOT.completeness);
    expect(app.housingPreferences?.preferredCities).toBe("Montréal, Laval");
    expect(app.emergencyContact?.phone).toBe("514 555-0111");
    expect(app.dossier?.medicationNotes).toContain("Metformine");
    expect(app.dossier?.adls).toContainEqual({
      activity: "bathing",
      level: "hands_on",
    });
  });
});
