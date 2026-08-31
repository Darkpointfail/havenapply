import { describe, expect, it, beforeEach } from "vitest";
import { submitFamilyApplication, emptyDraftApplication } from "@/lib/family-applications";
import { storeAppToUi, communityAppToDemande } from "@/lib/fr-portal-dynamic";
import { mergeSharedIntoCommunityApps, publishFamilyApplication } from "@/lib/admissions-bridge";
import { resetPublicRefSequencesForTests } from "@/lib/public-refs";
import type { Residence } from "@/data/residences";

function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
    writable: true,
  });
}

const fakeResidence = {
  id: "rpa-1428",
  name: "Résidence La Cathédrale",
  image: "/x.jpg",
  priceAvailable: true,
  priceFrom: 3000,
} as unknown as Residence;

describe("public refs end-to-end flow", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    resetPublicRefSequencesForTests();
    localStorage.clear();
  });

  it("assigns HA-A on submit and keeps it through UI + bridge + Demande", () => {
    const draft = emptyDraftApplication(fakeResidence, {
      name: "Tom Martin",
      email: "tom@example.com",
    });
    const submitted = submitFamilyApplication({
      ...draft,
      personRef: "HA-P-00001",
      dossierRef: "HA-D-2026-00001",
      consentShare: true,
      consentAccurate: true,
      signatureName: "Tom Martin",
    });

    expect(submitted.publicRef).toMatch(/^HA-A-\d{4}-\d{5}$/);

    const ui = storeAppToUi(submitted);
    expect(ui).not.toBeNull();
    expect(ui!.publicRef).toBe(submitted.publicRef);

    const packet = publishFamilyApplication(submitted, {
      seniorName: "Marguerite Lévesque",
      seniorAge: 84,
      relationship: "Fils",
    });
    expect(packet.publicRef).toBe(submitted.publicRef);

    const community = mergeSharedIntoCommunityApps("rpa-1428", []);
    expect(community[0]?.publicRef).toBe(submitted.publicRef);

    const demande = communityAppToDemande(community[0]!);
    expect(demande.publicRef).toBe(submitted.publicRef);
  });
});
