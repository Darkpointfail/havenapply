import { expect, test, type APIRequestContext } from "@playwright/test";

const PASSWORD = "Correct-Horse-42!";
const ORIGIN = `http://127.0.0.1:${process.env.E2E_PORT ?? 3210}`;

async function csrf(api: APIRequestContext) {
  const response = await api.get("/api/auth/csrf");
  expect(response.ok()).toBeTruthy();
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function post(
  api: APIRequestContext,
  path: string,
  data: unknown,
  extraHeaders: Record<string, string> = {},
) {
  return api.post(path, {
    data,
    headers: {
      origin: ORIGIN,
      "x-haven-csrf": await csrf(api),
      ...extraHeaders,
    },
  });
}

async function registerAndVerify(
  api: APIRequestContext,
  input: { email: string; firstName: string; lastName: string },
) {
  const registered = await post(api, "/api/auth/register", {
    ...input,
    password: PASSWORD,
  });
  expect(registered.status(), await registered.text()).toBe(201);

  const verified = await post(
    api,
    "/api/auth/verify-email",
    { email: input.email },
    { "x-haven-bootstrap-token": "e2e-bootstrap-token" },
  );
  expect(verified.status(), await verified.text()).toBe(200);
}

async function signIn(api: APIRequestContext, email: string) {
  const response = await post(api, "/api/auth/sign-in", {
    email,
    password: PASSWORD,
  });
  expect(response.status(), await response.text()).toBe(200);
}

test("staff reviews a server-backed resident profile and reverses a decision", async ({
  browser,
}) => {
  const suffix = Date.now();
  const family = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "203.0.113.211" },
  });
  const familyApi = family.request;
  const familyEmail = `sophie.profile.${suffix}@example.com`;
  await registerAndVerify(familyApi, {
    email: familyEmail,
    firstName: "Sophie",
    lastName: "Gagnon",
  });
  await signIn(familyApi, familyEmail);

  const submitted = await post(familyApi, "/api/admissions/submit", {
    clientRequestId: `resident-profile-${suffix}`,
    siteId: "maple-grove",
    publicRef: `HA-A-${suffix}`,
    senior: {
      name: "Madeleine Gagnon",
      age: 82,
      relationship: "Mère",
      photoUrl: null,
    },
    summary: "Madeleine souhaite se rapprocher de sa famille à Montréal.",
    careNeeds: ["Mobilité : marchette", "Hygiène : aide partielle"],
    medicalHighlights: ["Diabète de type 2"],
    documents: [
      {
        id: `doc-${suffix}`,
        name: "Évaluation médicale",
        category: "care_assessment",
        shared: true,
      },
    ],
    familyContact: {
      name: "Sophie Gagnon",
      email: familyEmail,
      phone: "514 555-0198",
      relationship: "Fille",
    },
    desiredMoveIn: "Dans les 30 prochains jours",
    dossierSnapshot: {
      updatedAt: new Date().toISOString(),
      completeness: {
        percent: 75,
        missingItems: ["Formulaire médical signé"],
        missingDocuments: ["Procuration"],
      },
      context: {
        currentAddress: "Rosemont, Montréal",
        currentLivingSituation: "À domicile",
        primaryLanguage: "Français",
        referralSource: "Déposée par la famille (HavenApply)",
      },
      housing: {
        communityTypes: ["Résidence avec soins évolutifs"],
        preferredCities: "Montréal, Laval",
        roomPreference: "Studio ou 2 ½",
        specialPreferences: ["Milieu francophone"],
        specialPreferencesNotes: "Ascenseur ou unité sans escalier",
        budgetMin: "4 500",
        budgetMax: "5 500",
      },
      autonomy: {
        level: "Semi-autonome",
        mobility: "Marchette",
        mobilityDevices: ["Marchette"],
        adls: { bathing: "Aide partielle", eating: "Autonome" },
        continence: "Autonome",
        memoryCognition: ["Légers troubles de mémoire"],
        nutrition: ["Texture régulière"],
        specialCareNeeds: "Vérifications quotidiennes",
      },
      clinical: {
        diagnoses: "Diabète de type 2",
        medicalConditions: "Hypertension",
        currentMedications: "Metformine 500 mg, matin et soir",
        allergies: "Pénicilline",
        medicationAllergies: "",
        pharmacy: "Pharmacie Beaubien",
        physician: "Dre Tremblay",
        physicianPhone: "514 555-0134",
      },
      emergencyContact: {
        name: "Jean Gagnon",
        email: "jean@example.com",
        phone: "514 555-0112",
        relationship: "Fils",
      },
      secondaryContact: null,
      communicationPreference: "Préfère le téléphone, 9 h à 17 h",
      decisionAuthority: "Décisions autorisées",
    },
  });
  expect(submitted.status(), await submitted.text()).toBe(201);
  const submittedBody = (await submitted.json()) as {
    application: { id: string };
  };
  await family.close();

  const staff = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "203.0.113.212" },
  });
  const staffApi = staff.request;
  const staffEmail = `claudine.profile.${suffix}@example.com`;
  await registerAndVerify(staffApi, {
    email: staffEmail,
    firstName: "Claudine",
    lastName: "Mercier",
  });
  const bootstrapped = await post(
    staffApi,
    "/api/staff/bootstrap",
    { email: staffEmail, siteId: "maple-grove" },
    { "x-haven-bootstrap-token": "e2e-bootstrap-token" },
  );
  expect(bootstrapped.status(), await bootstrapped.text()).toBe(201);
  await signIn(staffApi, staffEmail);

  const page = await staff.newPage();
  await page.goto(
    `/community/applications/capp-shared-${submittedBody.application.id}`,
  );

  await expect(page.getByRole("heading", { name: "Madeleine Gagnon" })).toBeVisible();
  await expect(page.getByText("75 % complété")).toBeVisible();
  await expect(page.getByRole("link", { name: /514 555-0198/ }).first()).toHaveAttribute(
    "href",
    "tel:514 555-0198",
  );

  await page.getByRole("button", { name: /Ouvrir les notes du dossier/ }).click();
  await page.getByLabel("Ajouter une note interne").fill("Visite à confirmer.");
  await page.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(page.getByText("Visite à confirmer.")).toBeVisible();
  await page.getByRole("button", { name: "Fermer les notes" }).click();

  await page.getByRole("button", { name: "Accepter la demande" }).click();
  await expect(page.getByText("Demande acceptée", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Annuler la décision" }).click();
  await expect(page.getByText("Le dossier est de nouveau en évaluation.")).toBeVisible();

  await staff.close();
});
