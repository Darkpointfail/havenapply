/**
 * The identity adapters must stay apart.
 *
 * The failure this guards against is quiet: a deployment configured for
 * Supabase falls through to the filesystem store, finds an empty file, and
 * decides the caller has no residence. Nothing throws, nothing is logged, and
 * a staff account simply loses its access. So the Supabase path is required to
 * fail loudly instead, and never to reach for a file.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const ORIGINAL_BACKEND = process.env.NEXT_PUBLIC_DATA_BACKEND;

async function withBackend<T>(backend: "local" | "supabase", body: () => Promise<T>): Promise<T> {
  process.env.NEXT_PUBLIC_DATA_BACKEND = backend;
  return body();
}

afterEach(() => {
  if (ORIGINAL_BACKEND === undefined) delete process.env.NEXT_PUBLIC_DATA_BACKEND;
  else process.env.NEXT_PUBLIC_DATA_BACKEND = ORIGINAL_BACKEND;
});

describe("choix de l'adaptateur d'identité", () => {
  it("nomme explicitement le backend en cours", async () => {
    const { identityBackend } = await import("@/lib/security/identity-repository");

    await withBackend("local", async () => {
      expect(identityBackend()).toBe("local");
    });
    await withBackend("supabase", async () => {
      expect(identityBackend()).toBe("supabase");
    });
  });

  it("refuse bruyamment les opérations réservées au magasin local", async () => {
    const { assertLocalIdentity } = await import("@/lib/security/identity-repository");

    await withBackend("supabase", async () => {
      expect(() => assertLocalIdentity("Password reset")).toThrowError(
        /not available in Supabase mode/,
      );
    });
    await withBackend("local", async () => {
      expect(() => assertLocalIdentity("Password reset")).not.toThrow();
    });
  });

  it("ne laisse aucun cycle de vie d'identifiant s'exécuter en mode Supabase", async () => {
    const service = await import("@/lib/security/auth-service");

    await withBackend("supabase", async () => {
      await expect(
        service.registerAccount({
          email: "someone@example.test",
          password: "Correct-Horse-9!",
          role: "family",
          firstName: "A",
          lastName: "B",
          fingerprint: "test",
        }),
      ).rejects.toThrow(/Supabase mode/);

      await expect(
        service.verifyCredentials({
          email: "someone@example.test",
          password: "Correct-Horse-9!",
          fingerprint: "test",
        }),
      ).rejects.toThrow(/Supabase mode/);

      await expect(service.requestPasswordReset("someone@example.test", "test")).rejects.toThrow(
        /Supabase mode/,
      );
    });
  });
});

describe("dépendance au système de fichiers", () => {
  /** Follows the local `@/lib/...` imports of a module, breadth first. */
  function importGraph(entry: string): Map<string, string> {
    const seen = new Map<string, string>();
    const queue = [entry];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;

      let source: string;
      try {
        source = readFileSync(current, "utf8");
      } catch {
        continue;
      }
      seen.set(current, source);

      // Type-only imports are erased before anything runs, so they cannot
      // drag a filesystem dependency into the Supabase path.
      const runtimeImports = source.replace(/import\s+type\s+\{[\s\S]*?\}\s+from\s+"[^"]+";/g, "");

      for (const match of runtimeImports.matchAll(/from\s+"(@\/[^"]+)"/g)) {
        const resolved = path.join(process.cwd(), "src", match[1].slice("@/".length));
        for (const candidate of [`${resolved}.ts`, `${resolved}.tsx`, `${resolved}/index.ts`]) {
          try {
            readFileSync(candidate, "utf8");
            queue.push(candidate);
            break;
          } catch {
            // Not this extension.
          }
        }
      }
    }
    return seen;
  }

  it("n'existe nulle part dans le graphe d'imports de l'adaptateur Supabase", () => {
    const entry = path.join(process.cwd(), "src/lib/security/identity-supabase.ts");
    const graph = importGraph(entry);

    expect(graph.size).toBeGreaterThan(1);

    const offenders = [...graph.entries()]
      .filter(([, source]) => /from\s+"node:fs"|from\s+"node:fs\/promises"|from\s+"fs"/.test(source))
      .map(([file]) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("laisse le magasin local comme seul module à écrire sur disque", () => {
    const store = readFileSync(
      path.join(process.cwd(), "src/lib/security/identity-store.ts"),
      "utf8",
    );
    // Stated as a fact about the local adapter, so that moving filesystem
    // access anywhere else trips the test above.
    expect(store).toMatch(/from "node:fs"/);
  });
});
