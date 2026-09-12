/**
 * Server-authoritative store for a residence's availability (room
 * categories, counts, waitlists, pricing).
 *
 * Until now AvailabilityUnit only ever lived in the browser's localStorage
 * (community-portal-store.tsx) — invisible to a second staff member on
 * another device. Same filesystem-backed pattern as
 * community-profile/local-store.ts.
 *
 * Mirrors public.availability's real constraint (migration 0003: unique on
 * community_id + care_level) so the two backends behave the same way: two
 * units saved under the same care level collapse into one, last write wins.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AvailabilityUnit } from "@/lib/community-portal";

const ROOT = path.join(process.cwd(), ".data", "community-availability");
const STATE_FILE = path.join(ROOT, "state.json");

type State = { bySite: Record<string, AvailabilityUnit[]> };

let writeChain: Promise<unknown> = Promise.resolve();
function withState<T>(fn: (state: State) => Promise<T> | T): Promise<T> {
  const run = writeChain.then(async () => {
    const state = await readState();
    const result = await fn(state);
    await writeState(state);
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

async function readState(): Promise<State> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<State>;
    return { bySite: parsed.bySite ?? {} };
  } catch {
    return { bySite: {} };
  }
}

async function writeState(state: State) {
  await fs.mkdir(ROOT, { recursive: true, mode: 0o700 });
  const tmp = `${STATE_FILE}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, STATE_FILE);
}

export async function listAvailability(siteId: string): Promise<AvailabilityUnit[]> {
  const state = await readState();
  return state.bySite[siteId] ?? [];
}

export async function upsertAvailability(
  siteId: string,
  unit: AvailabilityUnit,
): Promise<AvailabilityUnit> {
  return withState((state) => {
    const list = state.bySite[siteId] ?? [];
    const index = list.findIndex((u) => u.careLevel === unit.careLevel);
    const saved: AvailabilityUnit = {
      ...unit,
      id: index >= 0 ? list[index].id : `av_${randomUUID()}`,
    };
    state.bySite[siteId] = index >= 0 ? list.map((u, i) => (i === index ? saved : u)) : [saved, ...list];
    return saved;
  });
}

export async function removeAvailability(
  siteId: string,
  unitId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withState((state) => {
    const list = state.bySite[siteId] ?? [];
    if (!list.some((u) => u.id === unitId)) {
      return { ok: false as const, error: "Availability unit not found." };
    }
    state.bySite[siteId] = list.filter((u) => u.id !== unitId);
    return { ok: true as const };
  });
}

/** Tests only. */
export async function __resetCommunityAvailabilityForTests() {
  await writeState({ bySite: {} });
}
