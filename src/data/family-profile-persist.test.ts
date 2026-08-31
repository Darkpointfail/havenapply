import { describe, expect, it } from "vitest";
import {
  buildProfileFromSenior,
  createEmptyProfile,
  familyPatchToSenior,
} from "@/data/family-space";

describe("family dossier step-1 persistence mapping", () => {
  it("maps demandeur fields onto SeniorProfile patch keys", () => {
    const patch = familyPatchToSenior({
      prenom: "Jeanne",
      nom: "Côté",
      dateNaissance: "1940-05-12",
      sexe: "Femme",
      adresse: "12 rue Principale",
      ville: "Amos",
      province: "Québec",
      codePostal: "J9T 1A1",
    });
    expect(patch).toEqual({
      firstName: "Jeanne",
      lastName: "Côté",
      dateOfBirth: "1940-05-12",
      gender: "Femme",
      address: "12 rue Principale",
      city: "Amos",
      state: "Québec",
      zip: "J9T 1A1",
    });
  });

  it("round-trips senior identity fields into FamilyProfile for the wizard", () => {
    const profile = buildProfileFromSenior({
      firstName: "Jeanne",
      lastName: "Côté",
      dateOfBirth: "1940-05-12",
      gender: "Femme",
      address: "12 rue Principale",
      city: "Amos",
      state: "Québec",
      zip: "J9T 1A1",
    });
    expect(profile).not.toBeNull();
    expect(profile!.dateNaissance).toBe("1940-05-12");
    expect(profile!.adresse).toBe("12 rue Principale");
    expect(profile!.ville).toBe("Amos");
    expect(profile!.province).toBe("Québec");
    expect(profile!.codePostal).toBe("J9T 1A1");
    expect(profile!.sexe).toBe("Femme");
  });

  it("starts empty drafts with Québec as default province", () => {
    const draft = createEmptyProfile("p-senior");
    expect(draft.province).toBe("Québec");
    expect(draft.dateNaissance).toBe("");
    expect(draft.adresse).toBe("");
  });
});
