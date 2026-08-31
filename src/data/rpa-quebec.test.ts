import { describe, expect, it } from "vitest";
import { RESIDENCES, RPA_REGIONS, RPA_SOURCE, filterResidences } from "@/data/rpa-quebec";

describe("RPA Québec catalog", () => {
  it("loads Active residences from the registry extract", () => {
    expect(RPA_SOURCE.count).toBeGreaterThan(1000);
    expect(RESIDENCES.length).toBe(RPA_SOURCE.count);
    expect(RPA_REGIONS).toContain("Capitale-Nationale");
    expect(RPA_REGIONS).toContain("Montréal");
  });

  it("maps registry fields into family Residence cards", () => {
    const sample = RESIDENCES.find((r) => r.city.includes("Québec")) ?? RESIDENCES[0];
    expect(sample.id).toMatch(/^rpa-/);
    expect(sample.name.length).toBeGreaterThan(2);
    expect(sample.price).toBe("Sur demande");
    expect(sample.location.address.length).toBeGreaterThan(5);
    expect(sample.unitRows.length).toBeGreaterThan(0);
  });

  it("filters by city query and declared services", () => {
    const montreal = filterResidences({ query: "Montréal", limit: 20 });
    expect(montreal.length).toBeGreaterThan(0);
    expect(montreal.every((r) => /montréal/i.test(`${r.name} ${r.city} ${r.location.address}`))).toBe(
      true,
    );

    const nursing = filterResidences({
      region: "Capitale-Nationale",
      services: ["Soins infirmiers"],
      limit: 50,
    });
    expect(nursing.every((r) => r.services.includes("Soins infirmiers"))).toBe(true);
  });
});
