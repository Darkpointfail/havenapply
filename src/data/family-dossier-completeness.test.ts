import { describe, expect, it } from "vitest";
import {
  buildNextSteps,
  computeFamilyDossierCompleteness,
  createEmptyProfile,
  emptyDraftDocs,
} from "@/data/family-space";

describe("computeFamilyDossierCompleteness", () => {
  it("returns 0% and create prompt without a profile", () => {
    const c = computeFamilyDossierCompleteness(null);
    expect(c.percent).toBe(0);
    expect(c.fieldsDone).toBe(0);
    expect(c.docsReceived).toBe(0);
    expect(c.next).toMatch(/créer un dossier/i);
  });

  it("stays near 0% on a blank draft (default RAMQ alone does not count)", () => {
    const c = computeFamilyDossierCompleteness(createEmptyProfile("p1"));
    expect(c.percent).toBe(0);
    expect(c.fieldsDone).toBe(0);
    expect(c.docsReceived).toBe(0);
    expect(c.next).toBe("Indiquer pour qui est le dossier");
  });

  it("increases when written fields are filled, even with 0 documents", () => {
    const blank = computeFamilyDossierCompleteness(createEmptyProfile("p1"));
    const filled = computeFamilyDossierCompleteness({
      ...createEmptyProfile("p1"),
      profileSubject: "proche",
      rel: "Parent",
      prenom: "Jeanne",
      nom: "Côté",
      ville: "Québec",
      contactPrincipalNom: "Camille",
      contactPrincipalTel: "418-555-0100",
      autonomyScore: 6,
      searchSector: "Québec",
      searchBudgetMax: 3200,
      docs: emptyDraftDocs(),
    });
    expect(filled.docsReceived).toBe(0);
    expect(filled.percent).toBeGreaterThan(blank.percent);
    expect(filled.percent).toBeGreaterThan(40);
    expect(filled.fieldsDone).toBeGreaterThanOrEqual(5);
    expect(filled.next).not.toMatch(/pièce d'identité/i);
  });

  it("prefers the next missing field over the next document", () => {
    const c = computeFamilyDossierCompleteness({
      ...createEmptyProfile("p1"),
      profileSubject: "self",
      rel: "Moi-même",
      prenom: "Jeanne",
      nom: "Côté",
      // ville missing → identity incomplete
      docs: emptyDraftDocs(),
    });
    expect(c.next).toBe("Compléter l'identité (nom et ville)");
  });

  it("falls back to a document next action when fields are complete", () => {
    const c = computeFamilyDossierCompleteness({
      ...createEmptyProfile("p1"),
      profileSubject: "self",
      rel: "Moi-même",
      prenom: "Jeanne",
      nom: "Côté",
      ville: "Québec",
      contactPrincipalNom: "Camille",
      contactPrincipalTel: "418-555-0100",
      mandatProtection: "Oui",
      assuranceMaladie: "RAMQ",
      revenusMensuels: "2800",
      autonomyScore: 7,
      searchSector: "Québec",
      searchBudgetMax: 3000,
      consentPartage: true,
      signatureNom: "Jeanne Côté",
      docs: emptyDraftDocs(),
    });
    expect(c.fieldsDone).toBe(c.fieldsTotal);
    expect(c.next).toMatch(/^Ajouter /);
    expect(c.percent).toBeLessThan(100);
  });
});

describe("buildNextSteps fieldNext", () => {
  it("surfaces a field gap before document uploads", () => {
    const steps = buildNextSteps({
      hasSeniorProfile: true,
      docs: emptyDraftDocs(),
      applicationsCount: 0,
      fieldNext: "Compléter l'identité (nom et ville)",
    });
    expect(steps[0]?.label).toBe("Compléter l'identité (nom et ville)");
    expect(steps.some((s) => /ajouter pièce/i.test(s.label))).toBe(true);
  });
});
