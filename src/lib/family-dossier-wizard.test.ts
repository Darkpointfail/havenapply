import { describe, expect, it } from "vitest";
import {
  applyFamilyPatchToDossier,
  wizardFieldsFromDossier,
} from "@/lib/family-dossier-wizard";
import { emptyResidentDossier } from "@/lib/resident-dossier";

describe("family dossier wizard full persistence", () => {
  it("round-trips contacts, legal, insurance, finances, care, signature", () => {
    let d = emptyResidentDossier();
    d = applyFamilyPatchToDossier(d, {
      contactPrincipalNom: "Sophie Lévesque",
      contactPrincipalLien: "Fille",
      contactPrincipalTel: "418-555-0100",
      contactPrincipalCourriel: "sophie@example.com",
      contactSecondaireNom: "Paul Lévesque",
      contactSecondaireLien: "Fils",
      contactSecondaireTel: "418-555-0101",
      contactSecondaireCourriel: "paul@example.com",
      mandatProtection: "Oui",
      procuration: "Non",
      curatelle: "À préciser",
      directivesMedicales: "Oui",
      nomMandataire: "Sophie Lévesque",
      assuranceMaladie: "RAMQ",
      assurancePrivee: "Desjardins",
      numeroPolice: "POL-99",
      assuranceVie: "SSQ",
      revenusMensuels: "3200",
      sourcesRevenus: "Pension",
      garantFinancier: "Sophie Lévesque",
      modePaiement: "Privé",
      autonomie: "Semi-autonome",
      mobilite: "Marche avec canne",
      aideRepas: "Supervision",
      aideHygiene: "Aide partielle",
      aideMedication: "Rappels",
      allergies: "Pénicilline",
      regimeAlimentaire: "Sans sel",
      consentPartage: true,
      signatureNom: "Sophie Lévesque",
      signatureDate: "2026-08-31",
    });

    expect(d.emergencyContact?.name).toBe("Sophie Lévesque");
    expect(d.secondaryContact?.email).toBe("paul@example.com");
    expect(d.hasGuardianOrPoa).toBe("yes");
    expect(d.hasFinancialPoa).toBe("no");
    expect(d.healthcareProxyName).toBe("Sophie Lévesque");
    expect(d.insurance).toBe("RAMQ");
    expect(d.supplementalInsuranceCompany).toBe("Desjardins");
    expect(d.lifeInsuranceCompany).toBe("SSQ");
    expect(d.monthlyIncome).toBe("3200");
    expect(d.primaryPayor).toBe("Privé");
    expect(d.autonomyLevel).toBe("Semi-autonome");
    expect(d.mobility).toBe("Marche avec canne");
    expect(d.adls.eating).toBe("Supervision");
    expect(d.adls.bathing).toBe("Aide partielle");
    expect(d.allergies).toBe("Pénicilline");
    expect(d.acknowledgementSigned).toBe(true);
    expect(d.signatureName).toBe("Sophie Lévesque");
    expect(d.familyMembers.some((c) => c.isFinancialGuarantor && c.name === "Sophie Lévesque")).toBe(
      true,
    );

    const w = wizardFieldsFromDossier(d);
    expect(w.contactPrincipalNom).toBe("Sophie Lévesque");
    expect(w.assurancePrivee).toBe("Desjardins");
    expect(w.assuranceVie).toBe("SSQ");
    expect(w.aideMedication).toBe("Rappels");
    expect(w.consentPartage).toBe(true);
    expect(w.garantFinancier).toBe("Sophie Lévesque");
  });
});
