/**
 * Server-authoritative store for a residence's public-facing profile
 * (description, photos, pricing, services, admission criteria...).
 *
 * Until now CommunityProfile only ever lived in the browser's localStorage
 * (community-portal-store.tsx) — invisible to a second staff member on
 * another device, and never read by the public listing pages families
 * browse. This is the fix: same filesystem-backed pattern as
 * admissions/local-store.ts and messaging-server/local-store.ts.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CommunityProfile } from "@/lib/community-portal";

const ROOT = path.join(process.cwd(), ".data", "community-profiles");
const STATE_FILE = path.join(ROOT, "state.json");

type State = { profiles: Record<string, CommunityProfile> };

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
    return { profiles: parsed.profiles ?? {} };
  } catch {
    return { profiles: {} };
  }
}

async function writeState(state: State) {
  await fs.mkdir(ROOT, { recursive: true, mode: 0o700 });
  const tmp = `${STATE_FILE}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, STATE_FILE);
}

export async function getProfile(siteId: string): Promise<CommunityProfile | null> {
  const state = await readState();
  return state.profiles[siteId] ?? null;
}

export async function saveProfile(
  siteId: string,
  profile: CommunityProfile,
): Promise<CommunityProfile> {
  return withState((state) => {
    state.profiles[siteId] = profile;
    return profile;
  });
}

/** Tests only. */
export async function __resetCommunityProfilesForTests() {
  await writeState({ profiles: {} });
}
