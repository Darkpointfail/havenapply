import { rm } from "node:fs/promises";
import path from "node:path";

/**
 * Start each run from an empty identity store.
 *
 * The rate limiter counts attempts in that file, so leftovers from a previous
 * run make the suite fail on the second execution for reasons that have nothing
 * to do with the code under test.
 */
export default async function globalSetup() {
  await rm(path.join(process.cwd(), ".data", "identity"), { recursive: true, force: true });
}
