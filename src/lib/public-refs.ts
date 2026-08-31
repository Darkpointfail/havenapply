/**
 * HavenApply public business references (MVP).
 *
 * Technical IDs stay UUID/opaque everywhere.
 * These refs are human-facing for family UI, residence console, and support.
 *
 * Formats (see docs/architecture/AUDIT_ORGANISATION_IDENTITES.md):
 * - Person:      HA-P-{SEQ}
 * - Dossier:     HA-D-{YEAR}-{SEQ}
 * - Application: HA-A-{YEAR}-{SEQ}
 * - Batch:       HA-B-{YEAR}-{SEQ}
 * - Residence:   RPA-{MSSS} when catalog id is rpa-{ref}
 */

export type PublicRefKind = "P" | "D" | "A" | "B" | "F" | "U";

const STORAGE_KEY = "haven-public-ref-seq-v1";

type SeqStore = Partial<Record<string, number>>;

/** In-memory fallback for SSR / tests (and when localStorage is unavailable). */
let memoryStore: SeqStore = {};

function yearNow(d = new Date()) {
  return d.getFullYear();
}

function seqKey(kind: PublicRefKind, year?: number) {
  if (kind === "P" || kind === "F" || kind === "U") return kind;
  return `${kind}-${year ?? yearNow()}`;
}

function readStore(): SeqStore {
  if (typeof window === "undefined") return { ...memoryStore };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...memoryStore };
    const parsed = JSON.parse(raw) as SeqStore;
    if (parsed && typeof parsed === "object") {
      memoryStore = { ...memoryStore, ...parsed };
      return { ...memoryStore };
    }
    return { ...memoryStore };
  } catch {
    return { ...memoryStore };
  }
}

function writeStore(store: SeqStore) {
  memoryStore = { ...store };
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

/** Reset sequences (tests only). */
export function resetPublicRefSequencesForTests() {
  memoryStore = {};
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Allocate next sequence (persisted in localStorage for MVP). */
export function allocatePublicRefSeq(kind: PublicRefKind, year = yearNow()): number {
  const key = seqKey(kind, year);
  const store = readStore();
  const next = Math.max(1, (store[key] ?? 0) + 1);
  store[key] = next;
  writeStore(store);
  return next;
}

function pad(n: number, width = 5) {
  return String(n).padStart(width, "0");
}

export function formatPersonRef(seq: number) {
  return `HA-P-${pad(seq)}`;
}

export function formatDossierRef(seq: number, year = yearNow()) {
  return `HA-D-${year}-${pad(seq)}`;
}

export function formatApplicationRef(seq: number, year = yearNow()) {
  return `HA-A-${year}-${pad(seq)}`;
}

export function formatBatchRef(seq: number, year = yearNow()) {
  return `HA-B-${year}-${pad(seq)}`;
}

export function formatFamilyRef(seq: number) {
  return `HA-F-${pad(seq)}`;
}

/** Allocate a fresh application public ref. */
export function nextApplicationRef(year = yearNow()) {
  return formatApplicationRef(allocatePublicRefSeq("A", year), year);
}

export function nextPersonRef() {
  return formatPersonRef(allocatePublicRefSeq("P"));
}

export function nextDossierRef(year = yearNow()) {
  return formatDossierRef(allocatePublicRefSeq("D", year), year);
}

export function nextBatchRef(year = yearNow()) {
  return formatBatchRef(allocatePublicRefSeq("B", year), year);
}

/**
 * Map catalog / legacy residence ids to a stable public residence code.
 * - rpa-1428 → RPA-1428
 * - already RPA-… → unchanged
 * - other slugs → HA-R-{SLUG} (legacy / demo)
 */
export function residencePublicCode(residenceId: string | null | undefined): string {
  const id = (residenceId || "").trim();
  if (!id) return "RPA-????";
  if (/^RPA-\d+$/i.test(id)) return id.toUpperCase();
  const mss = id.match(/^rpa-(\d+)$/i);
  if (mss) return `RPA-${mss[1]}`;
  const slug = id
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `HA-R-${slug || "UNKNOWN"}`;
}

/** True if value looks like an HA application ref. */
export function isApplicationPublicRef(value: string | null | undefined): boolean {
  return /^HA-A-\d{4}-\d{5}$/.test((value || "").trim());
}

/**
 * Ensure an application has a publicRef (allocate once, then keep).
 * Safe to call repeatedly — does not re-sequence when already set.
 */
export function ensureApplicationPublicRef<T extends { publicRef?: string | null }>(
  app: T,
): T & { publicRef: string } {
  if (app.publicRef && isApplicationPublicRef(app.publicRef)) {
    return { ...app, publicRef: app.publicRef };
  }
  return { ...app, publicRef: nextApplicationRef() };
}

export function ensurePersonPublicRef(existing?: string | null) {
  if (existing && /^HA-P-\d{5}$/.test(existing)) return existing;
  return nextPersonRef();
}

export function ensureDossierPublicRef(existing?: string | null) {
  if (existing && /^HA-D-\d{4}-\d{5}$/.test(existing)) return existing;
  return nextDossierRef();
}

/** Display helper: prefer publicRef, else short technical id. */
export function displayApplicationRef(
  app: { publicRef?: string | null; id?: string } | null | undefined,
): string {
  if (!app) return "";
  if (app.publicRef && isApplicationPublicRef(app.publicRef)) return app.publicRef;
  const id = (app.id || "").trim();
  if (!id) return "";
  return id.length > 18 ? `${id.slice(0, 16)}…` : id;
}
