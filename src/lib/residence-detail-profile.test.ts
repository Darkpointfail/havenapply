import { describe, expect, test } from "vitest";
import { getCommunityDetail, applyProfileToDetail } from "@/lib/residence-detail";
import { emptyCommunityProfile } from "@/lib/community-portal";
import type { CommunityProfile } from "@/lib/community-portal";

describe("applyProfileToDetail", () => {
  test("a blank saved profile never blanks out the curated demo listing", () => {
    const detail = getCommunityDetail("maple-grove");
    expect(detail).toBeDefined();
    const blank = emptyCommunityProfile("maple-grove", detail!.name);

    const merged = applyProfileToDetail(detail!, blank);

    expect(merged.philosophy).toBe(detail!.philosophy);
    expect(merged.image).toBe(detail!.image);
    expect(merged.gallery).toEqual(detail!.gallery);
    expect(merged.rooms).toEqual(detail!.rooms);
    expect(merged.phone).toBe(detail!.phone);
    expect(merged.email).toBe(detail!.email);
    expect(merged.admission).toEqual(detail!.admission);
    // acceptingApplications defaults to true in emptyCommunityProfile, so the
    // availability block must be untouched.
    expect(merged.availabilityDetail).toEqual(detail!.availabilityDetail);
  });

  test("fields the résidence actually filled in override the generated detail", () => {
    const detail = getCommunityDetail("maple-grove");
    expect(detail).toBeDefined();

    const profile: CommunityProfile = {
      ...emptyCommunityProfile("maple-grove", detail!.name),
      description: "Notre nouvelle description rédigée par l'équipe.",
      photos: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
      phone: "(514) 555-0101",
      email: "admissions@maplegrove.example",
      roomTypes: [
        { name: "Chambre privée", price: 3200, notes: "Vue sur le jardin" },
        { name: "Chambre partagée", price: 2400, notes: "" },
      ],
      careTypes: ["Soins de la mémoire", "Un tout nouveau service"],
      admissionCriteria: ["Évaluation gériatrique complétée"],
      notAccepted: ["Dépendance à un respirateur instable"],
      requiredDocuments: ["Carte d'assurance maladie"],
      acceptingApplications: false,
    };

    const merged = applyProfileToDetail(detail!, profile);

    expect(merged.philosophy).toBe(profile.description);
    expect(merged.image).toBe(profile.photos[0]);
    expect(merged.gallery).toEqual(profile.photos);
    expect(merged.phone).toBe(profile.phone);
    expect(merged.email).toBe(profile.email);

    expect(merged.rooms).toHaveLength(2);
    expect(merged.rooms[0]).toMatchObject({
      name: "Chambre privée",
      type: "Private",
      basePrice: 3200,
      estimated: false,
    });
    expect(merged.rooms[1]).toMatchObject({ name: "Chambre partagée", type: "Shared" });

    // "Soins de la mémoire" should mark the existing "Memory care" block
    // available; "Un tout nouveau service" has no match and is appended.
    const memoryBlock = merged.careServices.find((c) => c.title === "Memory care");
    expect(memoryBlock?.available).toBe(true);
    const extraBlock = merged.careServices.find((c) => c.title === "Un tout nouveau service");
    expect(extraBlock).toBeDefined();
    expect(extraBlock?.available).toBe(true);

    expect(merged.admission.acceptedConditions).toEqual(profile.admissionCriteria);
    expect(merged.admission.notAccepted).toEqual(profile.notAccepted);
    expect(merged.admission.documents).toEqual(profile.requiredDocuments);

    expect(merged.availabilityDetail.label).toMatch(/n'accepte pas/i);
  });
});
