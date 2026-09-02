import { PrismaClient, Role, StaffPermission } from "@prisma/client";
import { hashPassword, generateRawToken, hashToken } from "../src/lib/crypto";

const prisma = new PrismaClient();
const DEV_PASSWORD = "DevOnlyPass123!";

async function upsertUser(input: {
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      passwordHash: input.passwordHash,
      isDevAccount: true,
      emailVerified: new Date(),
    },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: input.passwordHash,
      isDevAccount: true,
      emailVerified: new Date(),
      notificationPreference: { create: {} },
    },
  });
}

async function main() {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  const familyA = await upsertUser({
    email: "family.a@havenapply.local",
    name: "Family A Owner",
    role: "FAMILY",
    passwordHash,
  });
  const familyB = await upsertUser({
    email: "family.b@havenapply.local",
    name: "Family B Owner",
    role: "FAMILY",
    passwordHash,
  });
  const staffSite1 = await upsertUser({
    email: "staff.site1@havenapply.local",
    name: "Staff Site 1",
    role: "STAFF",
    passwordHash,
  });
  const staffOther = await upsertUser({
    email: "staff.other@havenapply.local",
    name: "Staff Other Site",
    role: "STAFF",
    passwordHash,
  });
  const admin = await upsertUser({
    email: "admin.dev@havenapply.local",
    name: "Dev Admin",
    role: "ADMIN",
    passwordHash,
  });

  // Legacy aliases used by earlier e2e tests
  await upsertUser({
    email: "family.dev@havenapply.local",
    name: "Dev Family",
    role: "FAMILY",
    passwordHash,
  });
  await upsertUser({
    email: "staff.dev@havenapply.local",
    name: "Dev Staff",
    role: "STAFF",
    passwordHash,
  });

  const profileA = await prisma.familyProfile.upsert({
    where: { id: "seed-family-a" },
    update: { displayName: "Family A", ownerUserId: familyA.id },
    create: {
      id: "seed-family-a",
      displayName: "Family A",
      ownerUserId: familyA.id,
      memberships: {
        create: { userId: familyA.id, role: "OWNER", acceptedAt: new Date() },
      },
    },
  });

  const profileB = await prisma.familyProfile.upsert({
    where: { id: "seed-family-b" },
    update: { displayName: "Family B", ownerUserId: familyB.id },
    create: {
      id: "seed-family-b",
      displayName: "Family B",
      ownerUserId: familyB.id,
      memberships: {
        create: { userId: familyB.id, role: "OWNER", acceptedAt: new Date() },
      },
    },
  });

  // Ensure memberships if profiles already existed without them
  await prisma.caregiverMembership.upsert({
    where: {
      familyProfileId_userId: { familyProfileId: profileA.id, userId: familyA.id },
    },
    update: { role: "OWNER", acceptedAt: new Date() },
    create: {
      familyProfileId: profileA.id,
      userId: familyA.id,
      role: "OWNER",
      acceptedAt: new Date(),
    },
  });
  await prisma.caregiverMembership.upsert({
    where: {
      familyProfileId_userId: { familyProfileId: profileB.id, userId: familyB.id },
    },
    update: { role: "OWNER", acceptedAt: new Date() },
    create: {
      familyProfileId: profileB.id,
      userId: familyB.id,
      role: "OWNER",
      acceptedAt: new Date(),
    },
  });

  const nowIso = new Date().toISOString();
  const facilityProvenance = {
    source: "FACILITY" as const,
    confidence: "HIGH" as const,
    collectedAt: nowIso,
    verifiedAt: nowIso,
    method: "seed_demo_facility",
  };
  const unknownAvailability = {
    value: null,
    source: "UNKNOWN" as const,
    confidence: "UNKNOWN" as const,
    method: null,
    collectedAt: null,
    verifiedAt: null,
  };

  const org = await prisma.residenceOrganization.upsert({
    where: { slug: "demo-residences" },
    update: {
      name: "Demo Residences Org",
      legalName: "Demo Residences Org Inc.",
      phone: "418-555-0100",
      email: "contact@demo-residences.example",
      website: "https://demo-residences.example",
      isActive: true,
      isVerified: true,
    },
    create: {
      name: "Demo Residences Org",
      slug: "demo-residences",
      legalName: "Demo Residences Org Inc.",
      phone: "418-555-0100",
      email: "contact@demo-residences.example",
      website: "https://demo-residences.example",
      isActive: true,
      isVerified: true,
    },
  });

  const site1 = await prisma.residenceSite.upsert({
    where: { id: "seed-site-1" },
    update: {
      name: "Résidence Les Érables",
      slug: "residence-les-erables",
      city: "Québec",
      region: "Capitale-Nationale",
      addressLine1: "1200 avenue des Érables",
      postalCode: "G1R 2J6",
      phone: "418-555-0111",
      organizationId: org.id,
      status: "ACTIVE",
      isActive: true,
      isVerified: true,
      officialCategories: ["RPA"],
      descriptionEditorial:
        "Résidence privée pour aînés au cœur de Québec. Contenu éditorial HavenApply (démo).",
      dataSource: "FACILITY",
      confidence: "HIGH",
      collectedAt: new Date(),
      verifiedAt: new Date(),
      verificationMethod: "seed_demo_verified",
      publishedAt: new Date(),
      servicesFact: { value: ["repas", "loisirs", "aide_quotidienne"], ...facilityProvenance },
      autonomyFact: { value: "SEMI_AUTONOME", ...facilityProvenance },
      pricingFact: {
        value: { monthlyFrom: 2800, monthlyTo: 4200, currency: "CAD" },
        ...facilityProvenance,
      },
      unitsFact: {
        value: { studio: true, oneBedroom: true, twoBedroom: false },
        ...facilityProvenance,
      },
      availabilityFact: unknownAvailability,
      photosFact: {
        value: [],
        ...facilityProvenance,
        method: "no_authorized_photos_in_seed",
      },
    },
    create: {
      id: "seed-site-1",
      name: "Résidence Les Érables",
      slug: "residence-les-erables",
      city: "Québec",
      region: "Capitale-Nationale",
      addressLine1: "1200 avenue des Érables",
      postalCode: "G1R 2J6",
      phone: "418-555-0111",
      organizationId: org.id,
      status: "ACTIVE",
      isActive: true,
      isVerified: true,
      officialCategories: ["RPA"],
      descriptionEditorial:
        "Résidence privée pour aînés au cœur de Québec. Contenu éditorial HavenApply (démo).",
      dataSource: "FACILITY",
      confidence: "HIGH",
      collectedAt: new Date(),
      verifiedAt: new Date(),
      verificationMethod: "seed_demo_verified",
      publishedAt: new Date(),
      servicesFact: { value: ["repas", "loisirs", "aide_quotidienne"], ...facilityProvenance },
      autonomyFact: { value: "SEMI_AUTONOME", ...facilityProvenance },
      pricingFact: {
        value: { monthlyFrom: 2800, monthlyTo: 4200, currency: "CAD" },
        ...facilityProvenance,
      },
      unitsFact: {
        value: { studio: true, oneBedroom: true, twoBedroom: false },
        ...facilityProvenance,
      },
      availabilityFact: unknownAvailability,
      photosFact: {
        value: [],
        ...facilityProvenance,
        method: "no_authorized_photos_in_seed",
      },
    },
  });
  const site2 = await prisma.residenceSite.upsert({
    where: { id: "seed-site-2" },
    update: {
      name: "Maison du Fleuve",
      slug: "maison-du-fleuve",
      city: "Lévis",
      region: "Chaudière-Appalaches",
      addressLine1: "45 rue du Quai",
      postalCode: "G6V 6N6",
      phone: "418-555-0222",
      organizationId: org.id,
      status: "ACTIVE",
      isActive: true,
      isVerified: true,
      officialCategories: ["RPA"],
      descriptionEditorial:
        "Maison de retraite face au fleuve Saint-Laurent. Contenu éditorial HavenApply (démo).",
      dataSource: "FACILITY",
      confidence: "HIGH",
      collectedAt: new Date(),
      verifiedAt: new Date(),
      verificationMethod: "seed_demo_verified",
      publishedAt: new Date(),
      servicesFact: { value: ["repas", "infirmiere", "transport"], ...facilityProvenance },
      autonomyFact: { value: "AUTONOME", ...facilityProvenance },
      pricingFact: {
        value: { monthlyFrom: 3200, monthlyTo: 5100, currency: "CAD" },
        ...facilityProvenance,
      },
      availabilityFact: unknownAvailability,
      photosFact: { value: [], ...facilityProvenance },
    },
    create: {
      id: "seed-site-2",
      name: "Maison du Fleuve",
      slug: "maison-du-fleuve",
      city: "Lévis",
      region: "Chaudière-Appalaches",
      addressLine1: "45 rue du Quai",
      postalCode: "G6V 6N6",
      phone: "418-555-0222",
      organizationId: org.id,
      status: "ACTIVE",
      isActive: true,
      isVerified: true,
      officialCategories: ["RPA"],
      descriptionEditorial:
        "Maison de retraite face au fleuve Saint-Laurent. Contenu éditorial HavenApply (démo).",
      dataSource: "FACILITY",
      confidence: "HIGH",
      collectedAt: new Date(),
      verifiedAt: new Date(),
      verificationMethod: "seed_demo_verified",
      publishedAt: new Date(),
      servicesFact: { value: ["repas", "infirmiere", "transport"], ...facilityProvenance },
      autonomyFact: { value: "AUTONOME", ...facilityProvenance },
      pricingFact: {
        value: { monthlyFrom: 3200, monthlyTo: 5100, currency: "CAD" },
        ...facilityProvenance,
      },
      availabilityFact: unknownAvailability,
      photosFact: { value: [], ...facilityProvenance },
    },
  });

  async function ensureStaff(
    userId: string,
    organizationId: string,
    siteId: string,
    permissions: StaffPermission[],
    orgRole: "OWNER" | "EDITOR" | "VIEWER" = "EDITOR",
  ) {
    const existing = await prisma.staffMembership.findFirst({
      where: { userId, organizationId, siteId },
    });
    if (existing) {
      await prisma.staffMembership.update({
        where: { id: existing.id },
        data: { orgRole },
      });
      await prisma.staffMembershipPermission.deleteMany({ where: { membershipId: existing.id } });
      await prisma.staffMembershipPermission.createMany({
        data: permissions.map((permission) => ({ membershipId: existing.id, permission })),
      });
      return existing;
    }
    return prisma.staffMembership.create({
      data: {
        userId,
        organizationId,
        siteId,
        orgRole,
        permissions: {
          create: permissions.map((permission) => ({ permission })),
        },
      },
    });
  }

  await ensureStaff(
    staffSite1.id,
    org.id,
    site1.id,
    ["VIEW_APPLICATIONS", "MANAGE_APPLICATIONS", "MANAGE_DOCUMENTS"],
    "OWNER",
  );
  await ensureStaff(
    staffOther.id,
    org.id,
    site2.id,
    ["VIEW_APPLICATIONS", "MANAGE_APPLICATIONS"],
    "OWNER",
  );

  // Read-only viewer on site1 for authz tests
  const staffViewer = await upsertUser({
    email: "staff.viewer@havenapply.local",
    name: "Staff Viewer Site 1",
    role: "STAFF",
    passwordHash,
  });
  await ensureStaff(staffViewer.id, org.id, site1.id, ["VIEW_APPLICATIONS"], "VIEWER");

  const staffEditor = await upsertUser({
    email: "staff.editor@havenapply.local",
    name: "Staff Editor Site 1",
    role: "STAFF",
    passwordHash,
  });
  await ensureStaff(
    staffEditor.id,
    org.id,
    site1.id,
    ["VIEW_APPLICATIONS", "MANAGE_APPLICATIONS"],
    "EDITOR",
  );

  // Attach legacy staff.dev to site1
  const legacyStaff = await prisma.user.findUniqueOrThrow({
    where: { email: "staff.dev@havenapply.local" },
  });
  await ensureStaff(
    legacyStaff.id,
    org.id,
    site1.id,
    ["VIEW_APPLICATIONS", "MANAGE_APPLICATIONS", "MANAGE_DOCUMENTS", "MANAGE_STAFF"],
    "OWNER",
  );

  const legacyFamily = await prisma.user.findUniqueOrThrow({
    where: { email: "family.dev@havenapply.local" },
  });
  await prisma.caregiverMembership.upsert({
    where: {
      familyProfileId_userId: { familyProfileId: profileA.id, userId: legacyFamily.id },
    },
    update: { role: "EDITOR", acceptedAt: new Date() },
    create: {
      familyProfileId: profileA.id,
      userId: legacyFamily.id,
      role: "EDITOR",
      acceptedAt: new Date(),
    },
  });

  const appA1 = await prisma.application.upsert({
    where: { publicRef: "HA-SEED-A1" },
    update: {
      familyProfileId: profileA.id,
      siteId: site1.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      residentPreferredName: "Alice A",
      residentBirthYear: 1942,
      contactName: "Family A Owner",
      contactEmail: "family.a@havenapply.local",
      contactPhone: "+14185550101",
      consentPrivacy: true,
      consentShareWithSite: true,
      consentAt: new Date(),
    },
    create: {
      publicRef: "HA-SEED-A1",
      familyProfileId: profileA.id,
      siteId: site1.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      residentPreferredName: "Alice A",
      residentBirthYear: 1942,
      contactName: "Family A Owner",
      contactEmail: "family.a@havenapply.local",
      contactPhone: "+14185550101",
      consentPrivacy: true,
      consentShareWithSite: true,
      consentAt: new Date(),
      statusHistory: {
        create: { toStatus: "SUBMITTED", changedByUserId: familyA.id, note: "Seeded" },
      },
    },
  });

  await prisma.application.upsert({
    where: { publicRef: "HA-SEED-B2" },
    update: {
      familyProfileId: profileB.id,
      siteId: site2.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      residentPreferredName: "Bernard B",
      residentBirthYear: 1938,
      contactName: "Family B Owner",
      contactEmail: "family.b@havenapply.local",
      contactPhone: "+14185550102",
      consentPrivacy: true,
      consentShareWithSite: true,
      consentAt: new Date(),
    },
    create: {
      publicRef: "HA-SEED-B2",
      familyProfileId: profileB.id,
      siteId: site2.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      residentPreferredName: "Bernard B",
      residentBirthYear: 1938,
      contactName: "Family B Owner",
      contactEmail: "family.b@havenapply.local",
      contactPhone: "+14185550102",
      consentPrivacy: true,
      consentShareWithSite: true,
      consentAt: new Date(),
      statusHistory: {
        create: { toStatus: "SUBMITTED", changedByUserId: familyB.id, note: "Seeded" },
      },
    },
  });

  await prisma.document.upsert({
    where: { id: "seed-doc-a1" },
    update: {
      originalFileName: "id.pdf",
      contentType: "application/pdf",
      status: "AVAILABLE",
      scanAdapter: "dev-passthrough",
      scanResult: "skipped_dev",
      scannedAt: new Date(),
    },
    create: {
      id: "seed-doc-a1",
      familyProfileId: profileA.id,
      applicationId: appA1.id,
      storageKey: "seed/family-a/doc.pdf",
      originalFileName: "id.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
      status: "AVAILABLE",
      scanAdapter: "dev-passthrough",
      scanResult: "skipped_dev",
      scannedAt: new Date(),
      uploadedByUserId: familyA.id,
    },
  });

  // Sample unused invitation token hash (raw not printed — for schema presence only)
  const inviteRaw = generateRawToken(16);
  await prisma.staffInvitation.upsert({
    where: { tokenHash: hashToken("seed-invite-placeholder") },
    update: {
      status: "PENDING",
      orgRole: "VIEWER",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      organizationId: org.id,
      siteId: site1.id,
      email: "invitee@havenapply.local",
      tokenHash: hashToken("seed-invite-placeholder"),
      invitedByUserId: staffSite1.id,
      status: "PENDING",
      orgRole: "VIEWER",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      permissions: { create: [{ permission: "VIEW_APPLICATIONS" }] },
      sites: { create: [{ siteId: site1.id }] },
    },
  });
  void inviteRaw;

  console.log("Seeded DEV multi-tenant accounts (isDevAccount=true, password shared):");
  console.log(`  password: ${DEV_PASSWORD}`);
  console.log("  FAMILY A:", familyA.email);
  console.log("  FAMILY B:", familyB.email);
  console.log("  STAFF site1:", staffSite1.email);
  console.log("  STAFF site2:", staffOther.email);
  console.log("  ADMIN:", admin.email);
  console.log("  legacy family.dev / staff.dev also seeded");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
