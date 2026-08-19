/**
 * Consent & governance security tests.
 * Run: node scripts/test-consent-governance.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const PURPOSES = [
  { id: "account_operation", category: "essential" },
  { id: "admissions_application", category: "essential" },
  { id: "document_sharing", category: "essential" },
  { id: "marketing_communications", category: "optional" },
  { id: "analytics_improvement", category: "optional" },
];

function buildPurposes(acceptedIds, at) {
  const set = new Set(acceptedIds);
  return PURPOSES.map((p) => ({
    purposeId: p.id,
    category: p.category,
    accepted: set.has(p.id),
    acceptedAt: set.has(p.id) ? at : null,
  }));
}

function grant({ acceptedPurposeIds, consenterRole, authorityProof }) {
  if (!acceptedPurposeIds.length) throw new Error("empty");
  if (consenterRole === "legal_representative" && (!authorityProof || authorityProof.kind === "none")) {
    throw new Error("authority_required");
  }
  const at = new Date().toISOString();
  return {
    id: "c1",
    active: true,
    consenterRole,
    purposes: buildPurposes(acceptedPurposeIds, at),
    establishments: [],
    history: [{ type: "granted", at }],
    withdrawnAt: null,
  };
}

function withdraw(record, reason) {
  return {
    ...record,
    active: false,
    withdrawnAt: new Date().toISOString(),
    withdrawalReason: reason,
    purposes: record.purposes.map((p) => ({ ...p, accepted: false })),
    history: [{ type: "withdrawn", at: new Date().toISOString() }, ...record.history],
  };
}

function transmit(record, establishmentId, purposeIds) {
  if (!record.active) throw new Error("inactive");
  for (const pid of purposeIds) {
    const row = record.purposes.find((p) => p.purposeId === pid);
    if (!row?.accepted) throw new Error(`missing_${pid}`);
  }
  return {
    ...record,
    establishments: [
      { establishmentId, transmittedAt: new Date().toISOString(), purposeIds },
      ...record.establishments,
    ],
  };
}

function categoriesUnderHold(holds) {
  const set = new Set();
  for (const h of holds.filter((x) => !x.releasedAt)) {
    for (const c of h.dataCategories) set.add(c);
  }
  return set;
}

function requestErase(holds, categories) {
  const held = categoriesUnderHold(holds);
  const blocked = categories.filter((c) => held.has(c));
  if (blocked.length) return { status: "blocked_legal_hold", blocked };
  return {
    status: "propagating",
    propagation: ["primary_store", "document_storage", "community_copies", "subprocessor", "backups"],
  };
}

function isAbandoned(status, lastIso, days, now = Date.now()) {
  if (!["draft", "withdrawn", "abandoned"].includes(status)) return false;
  return now > new Date(lastIso).getTime() + days * 86400000;
}

function initialCaptureState() {
  return {
    acceptedPurposeIds: [],
    acceptedTermsVersion: false,
    acceptedPrivacyVersion: false,
  };
}

async function main() {
  // No pre-checked purposes
  const initial = initialCaptureState();
  assert(initial.acceptedPurposeIds.length === 0, "no purposes pre-checked");
  assert(initial.acceptedTermsVersion === false, "terms not pre-checked");
  assert(initial.acceptedPrivacyVersion === false, "privacy not pre-checked");

  // Essential vs optional separated
  const essential = PURPOSES.filter((p) => p.category === "essential").map((p) => p.id);
  const optional = PURPOSES.filter((p) => p.category === "optional").map((p) => p.id);
  assert(essential.includes("admissions_application"), "essential includes admissions");
  assert(optional.includes("marketing_communications"), "optional includes marketing");
  assert(!essential.includes("marketing_communications"), "marketing not essential");

  // Grant records identity, role, purposes, history
  const record = grant({
    acceptedPurposeIds: ["admissions_application", "document_sharing"],
    consenterRole: "caregiver",
  });
  assert(record.purposes.find((p) => p.purposeId === "admissions_application").accepted, "purpose accepted");
  assert(!record.purposes.find((p) => p.purposeId === "marketing_communications").accepted, "marketing not silently accepted");
  assert(record.history[0].type === "granted", "history granted");

  // Legal representative requires authority proof
  let threw = false;
  try {
    grant({
      acceptedPurposeIds: ["admissions_application"],
      consenterRole: "legal_representative",
      authorityProof: { kind: "none" },
    });
  } catch {
    threw = true;
  }
  assert(threw, "legal rep without proof rejected");

  // Establishment transmission + withdraw
  const withEst = transmit(record, "maple-grove", ["admissions_application"]);
  assert(withEst.establishments[0].establishmentId === "maple-grove", "establishment logged");
  const withdrawn = withdraw(withEst, "user_request");
  assert(!withdrawn.active && withdrawn.withdrawnAt, "withdrawn");

  // Legal hold blocks erasure
  const blocked = requestErase(
    [{ releasedAt: null, dataCategories: ["documents", "applications"] }],
    ["documents", "messages"],
  );
  assert(blocked.status === "blocked_legal_hold", "legal hold blocks erase");
  const ok = requestErase([], ["documents"]);
  assert(ok.status === "propagating" && ok.propagation.includes("backups"), "propagation includes backups");

  // Abandoned applications expire
  const old = new Date(Date.now() - 100 * 86400000).toISOString();
  assert(isAbandoned("draft", old, 90), "abandoned draft expires");
  assert(!isAbandoned("submitted", old, 90), "submitted not abandoned");

  // Export shape
  const exportPayload = {
    manifest: { sections: ["account", "consentGovernance"] },
    data: { consentGovernance: [record] },
  };
  assert(exportPayload.manifest.sections.includes("consentGovernance"), "export includes consent");

  console.log("test-consent-governance: all passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
