import { describe, expect, it } from "vitest";
import {
  createEmptyProfile,
  familyPatchToSenior,
  isFamilyProfileSelf,
} from "@/data/family-space";
import { isSelfApplicant } from "@/lib/senior-profile";

describe("B2C self vs proche profile subject", () => {
  it("treats Moi-même / self subject as the logged-in resident", () => {
    const self = { ...createEmptyProfile("p1"), profileSubject: "self" as const, rel: "Moi-même" };
    const proche = {
      ...createEmptyProfile("p2"),
      profileSubject: "proche" as const,
      rel: "Parent",
    };
    expect(isFamilyProfileSelf(self)).toBe(true);
    expect(isFamilyProfileSelf(proche)).toBe(false);
  });

  it("maps profileSubject onto senior filledBy + relationship", () => {
    const selfPatch = familyPatchToSenior({ profileSubject: "self", rel: "Moi-même" });
    expect(selfPatch.filledBy).toBe("Pour moi-même");
    expect(selfPatch.relationship).toBe("Moi-même");

    const prochePatch = familyPatchToSenior({ profileSubject: "proche", rel: "Parent" });
    expect(prochePatch.filledBy).toBe("Pour un proche");
    expect(prochePatch.relationship).toBe("Parent");
  });

  it("aligns isSelfApplicant with French relationship labels", () => {
    expect(isSelfApplicant({ relationship: "Moi-même", filledBy: "Pour moi-même" })).toBe(true);
    expect(isSelfApplicant({ relationship: "Parent", filledBy: "Pour un proche" })).toBe(false);
  });
});
