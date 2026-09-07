import { describe, expect, it, beforeEach } from "vitest";
import { computeProfileProgress } from "@/lib/family/completeness";
import {
  validateApplicantPatch,
  validateSeniorPatchSafe,
  validateUploadMeta,
  MAX_DOC_UPLOAD_BYTES,
} from "@/lib/family/validation";
import { emptyCareNeeds } from "@/lib/care-needs";
import { emptyResidentDossier } from "@/lib/resident-dossier";
import { emptySeniorProfile } from "@/lib/senior-profile";
import {
  mintFamilySessionToken,
  verifyFamilySessionToken,
} from "@/lib/family/session";
import type { SessionUser } from "@/lib/auth-store";
import {
  __resetFamilyForTests,
  ensureFamilyForUser,
  updateSeniorProfile,
  updateCareNeeds,
  recordProfileConsent,
  addDocument,
  deleteDocument,
  getDocumentFile,
  requestAccountDeletion,
} from "@/lib/family/local-store";
import {
  PROFILE_RETENTION_CONSENT_VERSION,
} from "@/lib/family/types";

const userA: SessionUser = {
  id: "user_a_test",
  email: "famille.a@example.com",
  firstName: "Camille",
  lastName: "Tremblay",
  name: "Camille Tremblay",
  role: "family",
  emailConfirmed: true,
  onboardingCompleted: false,
};

const userB: SessionUser = {
  id: "user_b_test",
  email: "autre.b@example.com",
  firstName: "Alex",
  lastName: "Roy",
  name: "Alex Roy",
  role: "family",
  emailConfirmed: true,
  onboardingCompleted: false,
};

describe("session tokens", () => {
  it("mints and verifies a family session", () => {
    const token = mintFamilySessionToken(userA);
    const payload = verifyFamilySessionToken(token);
    expect(payload?.id).toBe(userA.id);
    expect(payload?.email).toBe(userA.email);
  });

  it("rejects tampered tokens", () => {
    const token = mintFamilySessionToken(userA);
    const bad = token.slice(0, -4) + "xxxx";
    expect(verifyFamilySessionToken(bad)).toBeNull();
  });
});

describe("validation", () => {
  it("rejects invalid email and postal code", () => {
    expect(validateApplicantPatch({ email: "not-an-email" })).toMatch(/email/i);
    expect(validateSeniorPatchSafe({ zip: "12345" })).toMatch(/postal/i);
    expect(validateSeniorPatchSafe({ zip: "H2X 1Y4" })).toBeNull();
  });

  it("rejects invalid upload mime/size", () => {
    expect(
      validateUploadMeta({
        mimeType: "application/exe",
        sizeBytes: 100,
        originalFilename: "x.exe",
      }),
    ).toMatch(/file type/i);
    expect(
      validateUploadMeta({
        mimeType: "application/pdf",
        sizeBytes: MAX_DOC_UPLOAD_BYTES + 1,
        originalFilename: "big.pdf",
      }),
    ).toMatch(/10 MB/i);
  });
});

describe("completeness", () => {
  it("starts at low percent for empty profile without consent", () => {
    const progress = computeProfileProgress({
      senior: emptySeniorProfile(),
      careNeeds: emptyCareNeeds(),
      residentDossier: emptyResidentDossier(),
      emergencyContacts: [],
      documents: [],
      lastSavedAt: null,
      resumeStep: 0,
      hasProfileConsent: false,
    });
    expect(progress.percent).toBe(0);
    expect(progress.sections.every((s) => !s.complete)).toBe(true);
  });

  it("increases when identity and consent are present", () => {
    const senior = {
      ...emptySeniorProfile(),
      firstName: "Jeanne",
      lastName: "Côté",
      dateOfBirth: "1940-01-01",
      city: "Québec",
      relationship: "Daughter",
      livingSituation: "alone",
      urgency: "1to3",
      housingTypes: ["assisted"],
      searchZones: [{ id: "z1", query: "Québec", radiusMiles: 25 }],
      budgetUnsure: true,
    };
    const progress = computeProfileProgress({
      senior,
      careNeeds: { ...emptyCareNeeds(), mobility: ["walker"], completedAt: new Date().toISOString() },
      residentDossier: emptyResidentDossier(),
      emergencyContacts: [
        { id: "1", fullName: "Camille", relationship: "Fille", phone: "418-555-0100", email: "", isPrimary: true, sortOrder: 0 },
      ],
      documents: [],
      lastSavedAt: new Date().toISOString(),
      resumeStep: 3,
      hasProfileConsent: true,
    });
    expect(progress.percent).toBeGreaterThan(50);
    expect(progress.resumeStep).toBe(3);
  });
});

describe("local family store persistence", () => {
  beforeEach(async () => {
    await __resetFamilyForTests(userA.id);
    await __resetFamilyForTests(userB.id);
  });

  it("creates an empty family with no demo data", async () => {
    const bundle = await ensureFamilyForUser(userA);
    expect(bundle.seniors).toEqual([]);
    expect(bundle.documents).toEqual([]);
    expect(bundle.applications).toEqual([]);
    expect(bundle.account.applicant.email).toBe(userA.email);
    expect(bundle.progress.percent).toBe(0);
  });

  it("saves and resumes senior profile", async () => {
    await ensureFamilyForUser(userA);
    const saved = await updateSeniorProfile(
      userA.id,
      null,
      {
        firstName: "Jeanne",
        lastName: "Côté",
        dateOfBirth: "1940-05-12",
        city: "Lévis",
        relationship: "Mother",
      },
      { stepIndex: 2 },
    );
    expect(saved?.seniors[0]?.profile.firstName).toBe("Jeanne");
    expect(saved?.account.onboarding.stepIndex).toBe(2);

    const reloaded = await ensureFamilyForUser(userA);
    expect(reloaded.seniors[0]?.profile.lastName).toBe("Côté");
    expect(reloaded.account.onboarding.stepIndex).toBe(2);
  });

  it("updates care needs and consent with version", async () => {
    await ensureFamilyForUser(userA);
    await updateSeniorProfile(userA.id, null, { firstName: "Jeanne", lastName: "Côté" });
    const care = await updateCareNeeds(userA.id, null, {
      ...emptyCareNeeds(),
      mobility: ["cane"],
      completedAt: new Date().toISOString(),
    });
    expect(care?.seniors[0]?.careNeeds.mobility).toContain("cane");

    const consented = await recordProfileConsent(userA.id, true);
    expect(consented?.account.profileConsent?.version).toBe(PROFILE_RETENTION_CONSENT_VERSION);
    expect(consented?.account.profileConsent?.recordedAt).toBeTruthy();
    expect(consented?.consents[0]?.purpose).toBe("profile_retention");
  });

  it("uploads and deletes documents with ownership checks", async () => {
    await ensureFamilyForUser(userA);
    await updateSeniorProfile(userA.id, null, { firstName: "Jeanne", lastName: "Côté" });
    const bytes = Buffer.from("%PDF-1.4 fake");
    const uploaded = await addDocument({
      ownerId: userA.id,
      category: "identification",
      originalFilename: "carte.pdf",
      mimeType: "application/pdf",
      sizeBytes: bytes.length,
      bytes,
    });
    expect("document" in uploaded).toBe(true);
    if (!("document" in uploaded)) return;
    const docId = uploaded.document.id;
    const file = await getDocumentFile(userA.id, docId);
    expect(file?.filename).toBe("carte.pdf");

    // Other user cannot read
    await ensureFamilyForUser(userB);
    const stolen = await getDocumentFile(userB.id, docId);
    expect(stolen).toBeNull();

    const deleted = await deleteDocument(userA.id, docId);
    expect(deleted && !("error" in deleted)).toBe(true);
    expect(await getDocumentFile(userA.id, docId)).toBeNull();
  });

  it("isolates family data between users", async () => {
    await ensureFamilyForUser(userA);
    await updateSeniorProfile(userA.id, null, { firstName: "Jeanne", lastName: "Côté" });
    await ensureFamilyForUser(userB);
    const b = await ensureFamilyForUser(userB);
    expect(b.seniors).toEqual([]);
    expect(b.account.applicant.email).toBe(userB.email);
  });

  it("persists account deletion request", async () => {
    await ensureFamilyForUser(userA);
    const bundle = await requestAccountDeletion(userA.id, {
      scope: "account",
      reason: "Je souhaite retirer mes données",
    });
    expect(bundle?.account.deletionRequest?.status).toBe("pending");
    expect(bundle?.account.deletionRequest?.scope).toBe("account");
  });

  it("exports data and executes real profile deletion", async () => {
    await ensureFamilyForUser(userA);
    await updateSeniorProfile(userA.id, null, {
      firstName: "Jeanne",
      lastName: "Côté",
      city: "Québec",
    });
    const bytes = Buffer.from("%PDF-1.4");
    await addDocument({
      ownerId: userA.id,
      category: "identification",
      originalFilename: "id.pdf",
      mimeType: "application/pdf",
      sizeBytes: bytes.length,
      bytes,
    });

    const { buildFamilyExport, executeAccountDeletion, getDocumentFile: getDoc } = await import(
      "@/lib/family/local-store"
    );
    const exported = await buildFamilyExport(userA.id);
    expect(exported?.seniors[0]?.profile.firstName).toBe("Jeanne");
    expect(exported?.documents.length).toBe(1);
    expect(exported?.rightsLog.some((l) => l.operation === "export")).toBe(true);

    const executed = await executeAccountDeletion(userA.id, { scope: "profile" });
    expect(executed?.ok).toBe(true);
    const after = await ensureFamilyForUser(userA);
    expect(after.seniors).toEqual([]);
    expect(after.documents).toEqual([]);
    expect(after.account.deletionRequest?.status).toBe("completed");
    // document bytes gone
    if (exported?.documents[0]) {
      expect(await getDoc(userA.id, exported.documents[0].id)).toBeNull();
    }
  });

  it("rejects empty invalid file content size at store boundary via validation helper", () => {
    expect(
      validateUploadMeta({
        mimeType: "application/pdf",
        sizeBytes: 0,
        originalFilename: "empty.pdf",
      }),
    ).toMatch(/empty/i);
  });
});
