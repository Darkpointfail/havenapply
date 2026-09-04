/**
 * Identity parity, exercised against a running Supabase stack.
 *
 * Each case here is a way the old design broke. Identity used to live in a JSON
 * file that a serverless instance never has, and the caller's role used to be
 * read from `user_metadata`, which the caller can rewrite. The tests below are
 * written so that either of those returning would fail them.
 *
 * Requires the stack: `npm run supabase:stack`. Skipped otherwise.
 */

import { afterAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { IDS } from "../rls/harness";
import {
  closeDb,
  db,
  resolveIdentity,
  resolveMemberships,
  rest,
  rpc,
  signIn,
  signUp,
  stackAvailable,
  stackEnv,
  uniqueEmail,
  updateOwnMetadata,
  type Account,
} from "./harness";

const run = promisify(execFile);
const live = stackAvailable() ? describe : describe.skip;

/** Grants a membership the way the operator path does: service side, no email. */
async function grantMembership(userId: string, siteId: string, role: string) {
  await db().query(
    `insert into public.staff_memberships (user_id, community_id, role, status)
     values ($1, $2, $3, 'active')
     on conflict (user_id, community_id) do update set role = excluded.role, status = 'active'`,
    [userId, siteId, role],
  );
  await db().query(
    `update public.app_identities set app_role = 'facility'
      where user_id = $1 and app_role <> 'internal'`,
    [userId],
  );
}

async function issueInvitation(siteId: string, role: string, tokenHash: string) {
  const { rows } = await db().query(
    `insert into public.staff_invitations (email_hash, community_id, role, token_hash, expires_at)
     values ('hashed', $1, $2, $3, timezone('utc', now()) + interval '1 hour')
     returning id`,
    [siteId, role, tokenHash],
  );
  return rows[0].id as string;
}

live("identité applicative et Supabase", () => {
  afterAll(async () => {
    await closeDb();
  });

  // 1 ------------------------------------------------------------------
  describe("compte FAMILY", () => {
    it("est créé et résolu depuis l'UUID vérifié de auth.users", async () => {
      const account = await signUp(uniqueEmail("famille"));

      const identity = await resolveIdentity(account);
      expect(identity.status).toBe(200);
      expect(identity.body).toEqual([
        { user_id: account.userId, app_role: "family", status: "active" },
      ]);

      // The anchor is the auth user, not a separate application identifier.
      const anchored = await db().query(
        "select 1 from auth.users u join public.app_identities i on i.user_id = u.id where u.id = $1",
        [account.userId],
      );
      expect(anchored.rowCount).toBe(1);

      // A family account holds no site scope at all.
      const memberships = await resolveMemberships(account);
      expect(memberships.body).toEqual([]);
    });

    it("résout la même identité depuis une session entièrement nouvelle", async () => {
      const email = uniqueEmail("famille.session");
      const created = await signUp(email);
      const fresh = await signIn(email);

      expect(fresh.userId).toBe(created.userId);
      expect(fresh.accessToken).not.toBe(created.accessToken);
      const identity = await resolveIdentity(fresh);
      expect((identity.body as Array<{ app_role: string }>)[0].app_role).toBe("family");
    });
  });

  // 2 ------------------------------------------------------------------
  describe("compte STAFF sur plusieurs sites", () => {
    it("résout ses deux résidences depuis une nouvelle session", async () => {
      const email = uniqueEmail("staff.multi");
      const account = await signUp(email);
      await grantMembership(account.userId, IDS.siteA, "manager");
      await grantMembership(account.userId, IDS.siteB, "readonly");

      // The scope must come from the database on each request, not from
      // anything carried in the token.
      const fresh = await signIn(email);
      const identity = await resolveIdentity(fresh);
      expect((identity.body as Array<{ app_role: string }>)[0].app_role).toBe("facility");

      const memberships = await resolveMemberships(fresh);
      const scope = (memberships.body as Array<{ community_id: string; role: string }>)
        .map((m) => `${m.community_id}:${m.role}`)
        .sort();
      expect(scope).toEqual([`${IDS.siteA}:manager`, `${IDS.siteB}:readonly`].sort());
    });

    it("ne voit pas les memberships d'un autre compte", async () => {
      const mine = await signUp(uniqueEmail("staff.mine"));
      const other = await signUp(uniqueEmail("staff.other"));
      await grantMembership(other.userId, IDS.siteA, "admin");

      const leaked = await rest<Array<unknown>>(
        `/staff_memberships?select=community_id&user_id=eq.${other.userId}`,
        { token: mine.accessToken },
      );
      expect(leaked.body).toEqual([]);
    });
  });

  // 3 ------------------------------------------------------------------
  describe("rôle readonly", () => {
    it("lit la demande mais ne peut pas la décider", async () => {
      const email = uniqueEmail("staff.readonly");
      const account = await signUp(email);
      await grantMembership(account.userId, IDS.siteA, "readonly");
      const session = await signIn(email);

      const readable = await rest<Array<{ id: string }>>(
        `/applications?select=id&id=eq.${IDS.appA}`,
        { token: session.accessToken },
      );
      expect(readable.status).toBe(200);
      expect(readable.body.length).toBe(1);

      const decided = await rest(`/applications?id=eq.${IDS.appA}`, {
        token: session.accessToken,
        method: "PATCH",
        body: { status: "accepted" },
      });
      // `is_site_decider` refuses the row, so nothing comes back changed.
      expect(decided.body).toEqual([]);

      const after = await db().query("select status from public.applications where id = $1", [
        IDS.appA,
      ]);
      expect(after.rows[0].status).not.toBe("accepted");
    });
  });

  // 4 ------------------------------------------------------------------
  describe("ADMIN", () => {
    it("n'est jamais atteint en réécrivant ses propres métadonnées", async () => {
      const email = uniqueEmail("famille.escalade");
      const account = await signUp(email);

      // GoTrue accepts this: user_metadata belongs to the user. That is exactly
      // why the application role cannot live there.
      const status = await updateOwnMetadata(account, { role: "internal" });
      expect(status).toBe(200);

      const session = await signIn(email);
      const identity = await resolveIdentity(session);
      expect((identity.body as Array<{ app_role: string }>)[0].app_role).toBe("family");
    });

    it("ne peut pas être obtenu en écrivant directement dans app_identities", async () => {
      const account = await signUp(uniqueEmail("famille.ecriture"));

      const written = await rest(`/app_identities?user_id=eq.${account.userId}`, {
        token: account.accessToken,
        method: "PATCH",
        body: { app_role: "internal" },
      });
      expect([401, 403, 404]).toContain(written.status);

      const { rows } = await db().query(
        "select app_role from public.app_identities where user_id = $1",
        [account.userId],
      );
      expect(rows[0].app_role).toBe("family");
    });

    it("est accordé explicitement côté serveur et alors reconnu", async () => {
      const email = uniqueEmail("interne");
      const account = await signUp(email);
      await db().query("update public.app_identities set app_role = 'internal' where user_id = $1", [
        account.userId,
      ]);

      const session = await signIn(email);
      const identity = await resolveIdentity(session);
      expect((identity.body as Array<{ app_role: string }>)[0].app_role).toBe("internal");

      // The application role does not hand out database privileges: platform
      // admin is a separate grant, and this account does not have it.
      const others = await rest<Array<unknown>>("/platform_roles?select=user_id", {
        token: session.accessToken,
      });
      expect(others.body).toEqual([]);
    });
  });

  // 5 ------------------------------------------------------------------
  describe("compte Supabase sans profil applicatif", () => {
    it("n'est pas autorisé, plutôt qu'autorisé par défaut", async () => {
      const email = uniqueEmail("sans.profil");
      const account = await signUp(email);
      await db().query("delete from public.app_identities where user_id = $1", [account.userId]);

      const session = await signIn(email);
      const identity = await resolveIdentity(session);
      // A valid token, and still no application identity: the guard has nothing
      // to build a principal from and refuses.
      expect(identity.status).toBe(200);
      expect(identity.body).toEqual([]);
    });
  });

  // 6 ------------------------------------------------------------------
  describe("profil applicatif sans compte Supabase", () => {
    it("est signalé comme orphelin par la migration, jamais rattaché au hasard", async () => {
      const report = await runMigration([
        { userId: "usr_00000000-0000-4000-8000-00000000dead", email: uniqueEmail("disparu"), role: "family" },
      ]);
      expect(report.orphanedLegacyAccounts).toHaveLength(1);
      expect(report.linked).toHaveLength(0);
    });
  });

  // 7 ------------------------------------------------------------------
  describe("identifiant ou courriel falsifié", () => {
    it("ne permet pas de lire l'identité d'un autre compte", async () => {
      const attacker = await signUp(uniqueEmail("attaquant"));
      const victim = await signUp(uniqueEmail("victime"));

      const forged = await rest<Array<unknown>>(
        `/app_identities?select=user_id,app_role&user_id=eq.${victim.userId}`,
        { token: attacker.accessToken },
      );
      expect(forged.body).toEqual([]);
    });

    it("ne permet pas de s'attribuer un membership", async () => {
      const attacker = await signUp(uniqueEmail("attaquant.membership"));

      const inserted = await rest("/staff_memberships", {
        token: attacker.accessToken,
        method: "POST",
        body: { user_id: attacker.userId, community_id: IDS.siteA, role: "admin" },
      });
      expect(inserted.status).toBeGreaterThanOrEqual(400);

      const memberships = await resolveMemberships(attacker);
      expect(memberships.body).toEqual([]);
    });

    it("ne permet pas de se rattacher à une identité par courriel", async () => {
      const victimEmail = uniqueEmail("cible");
      const victim = await signUp(victimEmail);
      await grantMembership(victim.userId, IDS.siteA, "admin");

      const attacker = await signUp(uniqueEmail("usurpateur"));
      // There is no endpoint that takes an address and returns a scope; the
      // only lookup available is by the session's own id.
      const byEmail = await rest<Array<unknown>>(
        `/app_identities?select=user_id&user_id=eq.${victim.userId}`,
        { token: attacker.accessToken },
      );
      expect(byEmail.body).toEqual([]);

      const scope = await resolveMemberships(attacker);
      expect(scope.body).toEqual([]);
    });
  });

  // 8 ------------------------------------------------------------------
  describe("membership modifié pendant une session ouverte", () => {
    it("perd immédiatement le périmètre sans attendre une reconnexion", async () => {
      const email = uniqueEmail("staff.revoque");
      const account = await signUp(email);
      await grantMembership(account.userId, IDS.siteA, "manager");
      const session = await signIn(email);

      expect((await resolveMemberships(session)).body).toHaveLength(1);

      await db().query(
        "update public.staff_memberships set status = 'suspended' where user_id = $1",
        [account.userId],
      );

      // Same token, same session. The scope is re-read on every request, so it
      // is already gone.
      expect((await resolveMemberships(session)).body).toEqual([]);
    });

    it("suit un changement de rôle sans nouvelle session", async () => {
      const email = uniqueEmail("staff.retrograde");
      const account = await signUp(email);
      await grantMembership(account.userId, IDS.siteA, "manager");
      const session = await signIn(email);

      await db().query(
        "update public.staff_memberships set role = 'readonly' where user_id = $1",
        [account.userId],
      );

      const decided = await rest(`/applications?id=eq.${IDS.appA}`, {
        token: session.accessToken,
        method: "PATCH",
        body: { status: "accepted" },
      });
      expect(decided.body).toEqual([]);
    });
  });

  // 9 ------------------------------------------------------------------
  describe("invitation", () => {
    it("n'est acceptée qu'une seule fois", async () => {
      const tokenHash = `single-use-${Date.now()}`;
      await issueInvitation(IDS.siteB, "coordinator", tokenHash);

      const first = await signUp(uniqueEmail("invite.premier"));
      const second = await signUp(uniqueEmail("invite.second"));

      const accepted = await rpc<Array<{ site_id: string }>>(
        "accept_staff_invitation",
        { p_token_hash: tokenHash },
        { token: first.accessToken },
      );
      expect(accepted.status).toBe(200);
      expect(accepted.body[0].site_id).toBe(IDS.siteB);

      const replayed = await rpc(
        "accept_staff_invitation",
        { p_token_hash: tokenHash },
        { token: second.accessToken },
      );
      expect(replayed.status).toBeGreaterThanOrEqual(400);

      const holders = await db().query(
        "select user_id from public.staff_memberships where community_id = $1 and user_id = any($2::uuid[])",
        [IDS.siteB, [first.userId, second.userId]],
      );
      expect(holders.rows.map((r) => r.user_id)).toEqual([first.userId]);
    });

    it("résiste à deux acceptations simultanées", async () => {
      const tokenHash = `race-${Date.now()}`;
      await issueInvitation(IDS.siteB, "readonly", tokenHash);

      const a = await signUp(uniqueEmail("invite.course.a"));
      const b = await signUp(uniqueEmail("invite.course.b"));

      const results = await Promise.all([
        rpc("accept_staff_invitation", { p_token_hash: tokenHash }, { token: a.accessToken }),
        rpc("accept_staff_invitation", { p_token_hash: tokenHash }, { token: b.accessToken }),
      ]);
      const winners = results.filter((r) => r.status === 200);
      expect(winners).toHaveLength(1);
    });

    it("grave le membership sur le compte de la session, pas sur celui nommé", async () => {
      const tokenHash = `session-bound-${Date.now()}`;
      await issueInvitation(IDS.siteB, "manager", tokenHash);

      const invitee = await signUp(uniqueEmail("invite.session"));
      const bystander = await signUp(uniqueEmail("invite.temoin"));

      await rpc(
        "accept_staff_invitation",
        { p_token_hash: tokenHash },
        { token: invitee.accessToken },
      );

      const granted = await db().query(
        "select user_id from public.staff_memberships where community_id = $1 and user_id = any($2::uuid[])",
        [IDS.siteB, [invitee.userId, bystander.userId]],
      );
      expect(granted.rows.map((r) => r.user_id)).toEqual([invitee.userId]);
    });

    it("est refusée à une session anonyme", async () => {
      const tokenHash = `anon-${Date.now()}`;
      await issueInvitation(IDS.siteB, "readonly", tokenHash);

      const anonymous = await rpc("accept_staff_invitation", { p_token_hash: tokenHash });
      expect(anonymous.status).toBeGreaterThanOrEqual(400);
    });
  });

  // 10 -----------------------------------------------------------------
  describe("migration depuis les identifiants usr_<uuid>", () => {
    it("relie, puis délie, de façon déterministe", async () => {
      const email = uniqueEmail("legacy");
      const account = await signUp(email);
      const legacyUserId = `usr_${account.userId}`;

      const report = await runMigration([{ userId: legacyUserId, email, role: "family" }]);
      expect(report.linked).toEqual([
        { legacyUserId, userId: account.userId, appRole: "family" },
      ]);

      const linked = await db().query(
        "select legacy_user_id from public.app_identities where user_id = $1",
        [account.userId],
      );
      expect(linked.rows[0].legacy_user_id).toBe(legacyUserId);

      // Running it twice must not produce a second link.
      const again = await runMigration([{ userId: legacyUserId, email, role: "family" }]);
      expect(again.linked).toHaveLength(0);
      expect(again.alreadyLinked).toHaveLength(1);

      await runMigration([{ userId: legacyUserId, email, role: "family" }], ["--rollback"]);
      const unlinked = await db().query(
        "select legacy_user_id from public.app_identities where user_id = $1",
        [account.userId],
      );
      expect(unlinked.rows[0].legacy_user_id).toBeNull();
    });

    it("refuse de choisir quand une adresse désigne plusieurs comptes", async () => {
      const email = uniqueEmail("ambigu");
      const account = await signUp(email);
      // A second auth user on the same address, which GoTrue would refuse but a
      // partly migrated database can hold.
      // The uniqueness index on auth.users covers password accounts only, so a
      // federated sign-in on the same address is a duplicate the migration can
      // genuinely meet.
      const duplicate = await db().query(
        `insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                                 is_sso_user, created_at, updated_at)
         values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
                 $1, 'x', true, timezone('utc', now()), timezone('utc', now()))
         returning id`,
        [email],
      );

      const report = await runMigration([
        { userId: `usr_${account.userId}`, email, role: "family" },
      ]);
      expect(report.ambiguousAddresses).toHaveLength(1);
      expect(report.linked).toHaveLength(0);

      await db().query("delete from auth.users where id = $1", [duplicate.rows[0].id]);
    });

    it("reporte les memberships dont l'identité n'a pas pu être résolue", async () => {
      const report = await runMigration(
        [
          {
            userId: "usr_00000000-0000-4000-8000-0000000000ff",
            email: uniqueEmail("absent"),
            role: "facility",
          },
        ],
        [],
        [
          {
            id: "mem_orphan",
            userId: "usr_00000000-0000-4000-8000-0000000000ff",
            siteId: IDS.siteA,
            role: "manager",
            status: "active",
          },
        ],
      );
      expect(report.membershipsWithoutIdentity).toHaveLength(1);
    });
  });

  // 11 -----------------------------------------------------------------
  describe("configuration Supabase", () => {
    it("crée et résout un compte sans toucher au magasin de fichiers", async () => {
      // If any of this were still reading or writing `.data/identity`, the file
      // would change under us.
      const stateFile = path.join(process.cwd(), ".data", "identity", "state.json");
      const before = await readFile(stateFile, "utf8").catch(() => null);

      const email = uniqueEmail("sans.fichier");
      const account = await signUp(email);
      await grantMembership(account.userId, IDS.siteA, "manager");
      const session = await signIn(email);

      expect((await resolveIdentity(session)).body).toEqual([
        { user_id: account.userId, app_role: "facility", status: "active" },
      ]);
      expect((await resolveMemberships(session)).body).toHaveLength(1);

      const after = await readFile(stateFile, "utf8").catch(() => null);
      expect(after).toEqual(before);
    });

    it("garde le service_role hors de portée du client", async () => {
      const account = await signUp(uniqueEmail("service.role"));
      const claims = JSON.parse(
        Buffer.from(account.accessToken.split(".")[1], "base64url").toString("utf8"),
      ) as { role: string };
      expect(claims.role).toBe("authenticated");

      // The two roles PostgREST can switch into are the only ones a browser can
      // reach, and neither escapes row level security nor inherits service_role.
      const { rows } = await db().query(
        `select r.rolname, r.rolbypassrls, r.rolsuper,
                exists (select 1 from pg_auth_members m
                         join pg_roles g on g.oid = m.roleid
                        where m.member = r.oid and g.rolname = 'service_role') as inherits_service
           from pg_roles r where r.rolname in ('anon', 'authenticated')
          order by r.rolname`,
      );
      expect(rows).toEqual([
        { rolname: "anon", rolbypassrls: false, rolsuper: false, inherits_service: false },
        { rolname: "authenticated", rolbypassrls: false, rolsuper: false, inherits_service: false },
      ]);

      // And nothing the client sends can name the service role.
      const escalated = await rest("/app_identities?select=user_id", {
        token: account.accessToken,
      });
      expect(escalated.status).toBe(200);
    });
  });
});

// ---------------------------------------------------------------------------

type LegacyCredential = { userId: string; email: string; role: string };
type LegacyMembership = {
  id: string;
  userId: string;
  siteId: string;
  role: string;
  status: string;
};
type MigrationReport = {
  linked: Array<{ legacyUserId: string; userId: string; appRole: string }>;
  alreadyLinked: unknown[];
  orphanedLegacyAccounts: unknown[];
  ambiguousAddresses: unknown[];
  membershipsWithoutIdentity: unknown[];
};

/**
 * Runs the operator migration script in a throwaway working directory, so the
 * legacy state it reads is the fixture below and nothing else.
 */
async function runMigration(
  credentials: LegacyCredential[],
  extraArgs: string[] = [],
  memberships: LegacyMembership[] = [],
): Promise<MigrationReport> {
  const env = stackEnv();
  if (!env) throw new Error("Supabase stack is not running");

  const cwd = await mkdtemp(path.join(tmpdir(), "haven-identity-"));
  await mkdir(path.join(cwd, ".data", "identity"), { recursive: true });
  await writeFile(
    path.join(cwd, ".data", "identity", "state.json"),
    JSON.stringify({ credentials, memberships, invitations: [] }),
  );

  const args = extraArgs.includes("--rollback") ? extraArgs : ["--apply", ...extraArgs];
  if (extraArgs.includes("--rollback")) {
    // Rollback reads the report the previous run wrote, so replay the link
    // first in this fresh directory.
    await run("node", [path.join(process.cwd(), "scripts/identity/migrate-legacy.mjs"), "--apply"], {
      cwd,
      env: { ...process.env, DATABASE_URL: env.databaseUrl },
    });
  }

  await run("node", [path.join(process.cwd(), "scripts/identity/migrate-legacy.mjs"), ...args], {
    cwd,
    env: { ...process.env, DATABASE_URL: env.databaseUrl },
  });

  return JSON.parse(
    await readFile(path.join(cwd, ".data", "identity", "migration-report.json"), "utf8"),
  ) as MigrationReport;
}
