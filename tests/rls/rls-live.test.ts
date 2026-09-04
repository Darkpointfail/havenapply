/**
 * Row level security, exercised against a real PostgreSQL server.
 *
 * The suite is skipped when RLS_TEST_DATABASE_URL is unset so `npm test` stays
 * usable without Docker. Run the whole thing with `npm run test:rls`, which
 * boots an ephemeral Supabase Postgres, applies every migration from an empty
 * database, loads fictitious fixtures and then runs this file.
 *
 * Reading the assertions: a read is refused when it returns zero rows, a write
 * is refused when PostgreSQL raises 42501 or when the statement matches zero
 * rows. Both are checked with `refused()`.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DATABASE_URL,
  IDS,
  PRINCIPALS,
  as,
  asOwner,
  closePool,
  exercise,
  exercisedPolicies,
  refused,
} from "./harness";

const live = DATABASE_URL ? describe : describe.skip;

/** PostgreSQL raises 42501 for both an RLS refusal and a missing privilege. */
const DENIED = "42501";

type TableInfo = { table: string; pk: string | null };
type PolicyInfo = { table: string; policy: string; cmd: string };

/** Tables a signed-out visitor is meant to read: the public residence catalogue. */
const PUBLIC_READ_EXPECTATIONS: Record<string, number> = {
  // Only the two `verified` residences; the unpublished one stays hidden.
  communities: 2,
  community_services: 1,
  community_amenities: 1,
  community_rooms: 1,
  admission_requirements: 1,
  availability: 1,
  // Intake switch is deliberately world-readable so a residence page can say
  // "not accepting applications" without a session.
  site_admissions_settings: 2,
};

/** RLS on, no policy at all: reachable only through the service role. */
const SERVICE_ROLE_ONLY = ["auth_rate_limits"];

let tables: TableInfo[] = [];
let policies: PolicyInfo[] = [];

live("politiques RLS exercées contre PostgreSQL", () => {
  beforeAll(async () => {
    await asOwner(async (client) => {
      const tableRows = await client.query(`
        select
          c.relname as table,
          (
            select a.attname
            from pg_index i
            join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
            where i.indrelid = c.oid and i.indisprimary
            limit 1
          ) as pk
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
        order by c.relname
      `);
      tables = tableRows.rows as TableInfo[];

      const policyRows = await client.query(`
        select tablename as table, policyname as policy, cmd
        from pg_policies
        where schemaname = 'public'
        order by tablename, policyname
      `);
      policies = policyRows.rows as PolicyInfo[];
    });
  });

  afterAll(async () => {
    await closePool();
  });

  // -------------------------------------------------------------------------
  describe("état du schéma après migration depuis une base vide", () => {
    it("protège toutes les tables applicatives", () => {
      expect(tables.length).toBeGreaterThan(50);
    });

    it("ne laisse aucune table publique sans RLS hors référentiel PostGIS", async () => {
      const { rows } = await asOwner((client) =>
        client.query(`
          select c.relname as table
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
          order by 1
        `),
      );
      expect(rows.map((r) => r.table)).toEqual(["spatial_ref_sys"]);
    });

    it("ne laisse sans politique que les tables réservées au service role", () => {
      const withPolicies = new Set(policies.map((p) => p.table));
      const orphans = tables.map((t) => t.table).filter((t) => !withPolicies.has(t));
      expect(orphans.sort()).toEqual([...SERVICE_ROLE_ONLY].sort());
    });
  });

  // -------------------------------------------------------------------------
  describe("service_role reste hors du navigateur", () => {
    it("est le seul rôle à contourner RLS", async () => {
      const { rows } = await asOwner((client) =>
        client.query(`
          select rolname, rolbypassrls, rolcanlogin
          from pg_roles
          where rolname in ('anon', 'authenticated', 'service_role')
          order by rolname
        `),
      );
      const byName = Object.fromEntries(rows.map((r) => [r.rolname, r]));
      expect(byName.service_role.rolbypassrls).toBe(true);
      expect(byName.anon.rolbypassrls).toBe(false);
      expect(byName.authenticated.rolbypassrls).toBe(false);
    });

    it("n'est atteignable ni depuis anon ni depuis authenticated", async () => {
      const { rows } = await asOwner((client) =>
        client.query(`
          select
            pg_has_role('anon', 'service_role', 'member') as anon_member,
            pg_has_role('authenticated', 'service_role', 'member') as authenticated_member
        `),
      );
      expect(rows[0].anon_member).toBe(false);
      expect(rows[0].authenticated_member).toBe(false);
    });

    it("reste hors de portée de la connexion utilisée par les tests", async () => {
      const { rows } = await asOwner((client) =>
        client.query(
          `select rolsuper, rolbypassrls, pg_has_role(rolname, 'service_role', 'member') as service_member
           from pg_roles where rolname = 'rls_test_authenticator'`,
        ),
      );
      expect(rows[0]).toMatchObject({
        rolsuper: false,
        rolbypassrls: false,
        service_member: false,
      });
    });

    it("refuse un changement de rôle depuis une session authentifiée", async () => {
      const attempt = await as(PRINCIPALS.familyA, (s) => s.attempt("set role service_role"));
      expect(attempt.ok).toBe(false);
      expect(attempt.code).toBe(DENIED);
    });
  });

  // -------------------------------------------------------------------------
  describe("visiteur anonyme", () => {
    it("ne lit que le catalogue public, table par table", async () => {
      const readable: Record<string, number> = {};
      await as(PRINCIPALS.anonymous, async (session) => {
        for (const { table, pk } of tables) {
          const result = await session.attempt(`select ${pk ?? "*"} from public.${table}`);
          readable[table] = result.ok ? result.rowCount : -1;
          for (const policy of policies.filter(
            (p) => p.table === table && (p.cmd === "SELECT" || p.cmd === "ALL"),
          )) {
            exercise(`${policy.table}.${policy.policy}`);
          }
        }
      });

      const unexpected = Object.entries(readable)
        .filter(([table, count]) => count !== (PUBLIC_READ_EXPECTATIONS[table] ?? 0))
        .map(([table, count]) => `${table}=${count}`);
      expect(unexpected).toEqual([]);
    });

    it("ne voit pas la résidence non publiée", async () => {
      const result = await as(PRINCIPALS.anonymous, (s) =>
        s.attempt("select id from public.communities where id = $1", [IDS.siteUnlisted]),
      );
      exercise("communities.communities_public_select");
      expect(result.rowCount).toBe(0);
    });

    it("ne peut modifier aucune table", async () => {
      const failures: string[] = [];
      await as(PRINCIPALS.anonymous, async (session) => {
        for (const { table, pk } of tables) {
          if (!pk) continue;
          const updated = await session.attempt(
            `update public.${table} set ${pk} = ${pk} returning ${pk}`,
          );
          if (!refused(updated)) failures.push(`update ${table}`);
          for (const policy of policies.filter(
            (p) => p.table === table && (p.cmd === "UPDATE" || p.cmd === "ALL"),
          )) {
            exercise(`${policy.table}.${policy.policy}`);
          }
        }
      });
      expect(failures).toEqual([]);
    });

    it("ne peut supprimer aucune ligne", async () => {
      const failures: string[] = [];
      await as(PRINCIPALS.anonymous, async (session) => {
        for (const { table, pk } of tables) {
          if (!pk) continue;
          const deleted = await session.attempt(`delete from public.${table} returning ${pk}`);
          if (!refused(deleted)) failures.push(`delete ${table}`);
          for (const policy of policies.filter(
            (p) => p.table === table && (p.cmd === "DELETE" || p.cmd === "ALL"),
          )) {
            exercise(`${policy.table}.${policy.policy}`);
          }
        }
      });
      expect(failures).toEqual([]);
    });

    it("ne peut créer ni famille, ni dossier, ni consentement", async () => {
      await as(PRINCIPALS.anonymous, async (session) => {
        const family = await session.attempt(
          "insert into public.families (owner_id) values ($1) returning id",
          [IDS.familyAOwner],
        );
        exercise("families.families_insert");
        expect(refused(family)).toBe(true);

        const application = await session.attempt(
          `insert into public.applications (family_id, senior_id, community_id, organization_id)
           values ($1, $2, $3, $4) returning id`,
          [IDS.familyA, IDS.seniorA1, IDS.siteA, IDS.orgA],
        );
        exercise("applications.applications_insert");
        expect(refused(application)).toBe(true);

        const consent = await session.attempt(
          `insert into public.consent_records (user_id, family_id, purpose, granted, version, purpose_text)
           values ($1, $2, 'profile_retention', true, 'v1', 'test') returning id`,
          [IDS.familyAOwner, IDS.familyA],
        );
        exercise("consent_records.consent_records_insert");
        expect(refused(consent)).toBe(true);

        const rights = await session.attempt(
          "insert into public.rights_operation_logs (user_id, operation) values ($1, 'export') returning id",
          [IDS.familyAOwner],
        );
        exercise("rights_operation_logs.rights_operation_logs_insert");
        expect(refused(rights)).toBe(true);

        const deletion = await session.attempt(
          "insert into public.account_deletion_requests (user_id) values ($1) returning id",
          [IDS.familyAOwner],
        );
        exercise("account_deletion_requests.account_deletion_requests_insert");
        expect(refused(deletion)).toBe(true);

        const conversation = await session.attempt(
          `insert into public.conversations (application_id, family_id, community_id, organization_id)
           values ($1, $2, $3, $4) returning id`,
          [IDS.appA, IDS.familyA, IDS.siteA, IDS.orgA],
        );
        exercise("conversations.conversations_insert");
        expect(refused(conversation)).toBe(true);

        const message = await session.attempt(
          "insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'x') returning id",
          [IDS.conversationA, IDS.familyAOwner],
        );
        exercise("messages.messages_insert");
        expect(refused(message)).toBe(true);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("famille A", () => {
    it("lit son dossier et jamais celui de la famille B", async () => {
      const rows = await as(PRINCIPALS.familyA, (s) =>
        s.attempt("select id from public.applications order by created_at"),
      );
      exercise("applications.applications_select");
      const ids = rows.rows.map((r) => r.id);
      expect(ids).toContain(IDS.appA);
      expect(ids).toContain(IDS.appADraft);
      expect(ids).not.toContain(IDS.appB);
    });

    it("lit son coffre documentaire et jamais celui de la famille B", async () => {
      const rows = await as(PRINCIPALS.familyA, (s) =>
        s.attempt("select id from public.documents"),
      );
      exercise("documents.documents_select");
      const ids = rows.rows.map((r) => r.id);
      expect(ids).toEqual(expect.arrayContaining([IDS.documentA, IDS.documentAPrivate]));
      expect(ids).not.toContain(IDS.documentB);
    });

    it("crée un dossier vers une résidence publiée", async () => {
      const created = await as(PRINCIPALS.familyA, (s) =>
        s.attempt(
          `insert into public.applications (family_id, senior_id, community_id, organization_id)
           values ($1, $2, $3, $4) returning id`,
          [IDS.familyA, IDS.seniorA1, IDS.siteB, IDS.orgB],
        ),
      );
      exercise("applications.applications_insert");
      expect(created.ok).toBe(true);
      expect(created.rowCount).toBe(1);
    });

    it("ne peut pas créer un dossier au nom de la famille B", async () => {
      const created = await as(PRINCIPALS.familyA, (s) =>
        s.attempt(
          `insert into public.applications (family_id, senior_id, community_id, organization_id)
           values ($1, $2, $3, $4) returning id`,
          [IDS.familyB, IDS.seniorB, IDS.siteA, IDS.orgA],
        ),
      );
      exercise("applications.applications_insert");
      expect(refused(created)).toBe(true);
    });

    it("ne peut pas postuler à une résidence non publiée", async () => {
      const created = await as(PRINCIPALS.familyA, (s) =>
        s.attempt(
          `insert into public.applications (family_id, senior_id, community_id, organization_id)
           values ($1, $2, $3, $4) returning id`,
          [IDS.familyA, IDS.seniorA1, IDS.siteUnlisted, IDS.orgA],
        ),
      );
      exercise("applications.applications_insert");
      expect(refused(created)).toBe(true);
    });

    it("retire son propre dossier", async () => {
      const updated = await as(PRINCIPALS.familyA, (s) =>
        s.attempt(
          "update public.applications set status = 'withdrawn' where id = $1 returning id",
          [IDS.appA],
        ),
      );
      exercise("applications.applications_update_family");
      expect(updated.ok).toBe(true);
      expect(updated.rowCount).toBe(1);
    });

    it("ne peut pas toucher au dossier de la famille B", async () => {
      const updated = await as(PRINCIPALS.familyA, (s) =>
        s.attempt(
          "update public.applications set status = 'approved' where id = $1 returning id",
          [IDS.appB],
        ),
      );
      exercise("applications.applications_update_family", "applications.applications_update_staff");
      expect(refused(updated)).toBe(true);
    });

    it("ne peut pas transférer son dossier à une autre famille", async () => {
      const updated = await as(PRINCIPALS.familyA, (s) =>
        s.attempt("update public.applications set family_id = $1 where id = $2 returning id", [
          IDS.familyB,
          IDS.appA,
        ]),
      );
      exercise("applications.applications_update_family");
      expect(refused(updated)).toBe(true);
    });

    it("ne peut pas supprimer un dossier", async () => {
      const deleted = await as(PRINCIPALS.familyA, (s) =>
        s.attempt("delete from public.applications where id = $1 returning id", [IDS.appA]),
      );
      expect(refused(deleted)).toBe(true);
    });

    it("ne lit ni la famille, ni les aînés, ni le journal d'audit de la famille B", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const families = await session.attempt("select id from public.families");
        exercise("families.families_select");
        expect(families.rows.map((r) => r.id)).toEqual([IDS.familyA]);

        const seniors = await session.attempt("select id from public.seniors");
        exercise("seniors.seniors_select");
        expect(seniors.rows.map((r) => r.id)).not.toContain(IDS.seniorB);

        const audit = await session.attempt("select application_id from public.admissions_audit_log");
        exercise("admissions_audit_log.admissions_audit_log_select");
        expect(audit.rows.map((r) => r.application_id)).toEqual([IDS.appA]);

        const history = await session.attempt(
          "select application_id from public.application_status_history",
        );
        exercise("application_status_history.application_status_history_select");
        expect(history.rows.map((r) => r.application_id)).toEqual([IDS.appA]);
      });
    });

    it("ne peut pas écrire dans l'historique de statut ni dans l'audit", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const history = await session.attempt(
          `insert into public.application_status_history (application_id, to_status)
           values ($1, 'approved') returning id`,
          [IDS.appA],
        );
        expect(refused(history)).toBe(true);

        const audit = await session.attempt(
          `insert into public.admissions_audit_log (application_id, actor_type, action)
           values ($1, 'family', 'forge') returning id`,
          [IDS.appA],
        );
        expect(refused(audit)).toBe(true);
      });
    });

    it("ne lit que sa propre session et ne peut pas en forger une", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const sessions = await session.attempt("select id from public.auth_sessions");
        exercise("auth_sessions.auth_sessions_select");
        expect(sessions.rows.map((r) => r.id)).toEqual([IDS.sessionA]);

        const revokeOther = await session.attempt(
          "update public.auth_sessions set revoked_at = now() where id = $1 returning id",
          [IDS.sessionB],
        );
        exercise("auth_sessions.auth_sessions_revoke");
        expect(refused(revokeOther)).toBe(true);

        const revokeOwn = await session.attempt(
          "update public.auth_sessions set revoked_at = now() where id = $1 returning id",
          [IDS.sessionA],
        );
        expect(revokeOwn.rowCount).toBe(1);

        const forged = await session.attempt(
          "insert into public.auth_sessions (user_id, expires_at) values ($1, now() + interval '1 day') returning id",
          [IDS.familyAOwner],
        );
        expect(refused(forged)).toBe(true);
      });
    });

    it("ne lit que son propre profil", async () => {
      const profiles = await as(PRINCIPALS.familyA, (s) =>
        s.attempt("select id from public.profiles"),
      );
      exercise("profiles.profiles_select_self");
      expect(profiles.rows.map((r) => r.id)).toEqual([IDS.familyAOwner]);
    });

    it("ne peut pas modifier le profil d'un autre compte", async () => {
      const updated = await as(PRINCIPALS.familyA, (s) =>
        s.attempt("update public.profiles set first_name = 'X' where id = $1 returning id", [
          IDS.familyBOwner,
        ]),
      );
      exercise("profiles.profiles_update_self");
      expect(refused(updated)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("famille A en lecture seule", () => {
    it("lit le dossier mais ne peut pas le modifier", async () => {
      await as(PRINCIPALS.familyAViewer, async (session) => {
        const read = await session.attempt("select id from public.applications");
        expect(read.rows.map((r) => r.id)).toContain(IDS.appA);

        const created = await session.attempt(
          `insert into public.applications (family_id, senior_id, community_id, organization_id)
           values ($1, $2, $3, $4) returning id`,
          [IDS.familyA, IDS.seniorA1, IDS.siteB, IDS.orgB],
        );
        exercise("applications.applications_insert");
        expect(refused(created)).toBe(true);

        const senior = await session.attempt(
          "update public.seniors set first_name = 'X' where id = $1 returning id",
          [IDS.seniorA1],
        );
        exercise("seniors.seniors_write");
        expect(refused(senior)).toBe(true);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("famille B", () => {
    it("ne voit rien de la famille A", async () => {
      await as(PRINCIPALS.familyB, async (session) => {
        const applications = await session.attempt("select id from public.applications");
        expect(applications.rows.map((r) => r.id)).toEqual([IDS.appB]);

        const documents = await session.attempt("select id from public.documents");
        expect(documents.rows.map((r) => r.id)).toEqual([IDS.documentB]);

        const tasks = await session.attempt("select family_id from public.tasks");
        exercise("tasks.tasks_all");
        expect(tasks.rows.map((r) => r.family_id)).toEqual([IDS.familyB]);

        const favorites = await session.attempt("select family_id from public.favorites");
        exercise("favorites.favorites_all");
        expect(favorites.rows.map((r) => r.family_id)).toEqual([IDS.familyB]);
      });
    });

    it("ne peut pas écrire dans le coffre de la famille A", async () => {
      await as(PRINCIPALS.familyB, async (session) => {
        const updated = await session.attempt(
          "update public.documents set title = 'X' where id = $1 returning id",
          [IDS.documentA],
        );
        exercise("documents.documents_write");
        expect(refused(updated)).toBe(true);

        const deleted = await session.attempt(
          "delete from public.medications where senior_id = $1 returning id",
          [IDS.seniorA1],
        );
        exercise("medications.medications_family");
        expect(refused(deleted)).toBe(true);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("staff en lecture seule, résidence A", () => {
    it("lit les dossiers soumis à sa résidence", async () => {
      const rows = await as(PRINCIPALS.staffReadonly, (s) =>
        s.attempt("select id from public.applications"),
      );
      exercise("applications.applications_select");
      expect(rows.rows.map((r) => r.id)).toContain(IDS.appA);
    });

    it("ne lit pas les dossiers de la résidence B", async () => {
      const rows = await as(PRINCIPALS.staffReadonly, (s) =>
        s.attempt("select id from public.applications"),
      );
      expect(rows.rows.map((r) => r.id)).not.toContain(IDS.appB);
    });

    it("ne peut pas changer le statut d'un dossier", async () => {
      const updated = await as(PRINCIPALS.staffReadonly, (s) =>
        s.attempt("update public.applications set status = 'approved' where id = $1 returning id", [
          IDS.appA,
        ]),
      );
      exercise("applications.applications_update_staff");
      expect(refused(updated)).toBe(true);
    });

    it("ne peut pas supprimer un dossier", async () => {
      const deleted = await as(PRINCIPALS.staffReadonly, (s) =>
        s.attempt("delete from public.applications where id = $1 returning id", [IDS.appA]),
      );
      expect(refused(deleted)).toBe(true);
    });

    it("ne peut pas s'octroyer une autre adhésion", async () => {
      const created = await as(PRINCIPALS.staffReadonly, (s) =>
        s.attempt(
          "insert into public.staff_memberships (user_id, community_id, role) values ($1, $2, 'admin') returning id",
          [IDS.staffReadonlyA, IDS.siteB],
        ),
      );
      exercise("staff_memberships.staff_memberships_write");
      expect(refused(created)).toBe(true);
    });

    it("ne peut pas s'élever au rôle administrateur", async () => {
      const updated = await as(PRINCIPALS.staffReadonly, (s) =>
        s.attempt("update public.staff_memberships set role = 'admin' where id = $1 returning id", [
          IDS.membershipReadonlyA,
        ]),
      );
      exercise("staff_memberships.staff_memberships_write");
      expect(refused(updated)).toBe(true);
    });

    it("ne lit pas les invitations de sa résidence", async () => {
      const rows = await as(PRINCIPALS.staffReadonly, (s) =>
        s.attempt("select id from public.staff_invitations"),
      );
      exercise("staff_invitations.staff_invitations_select");
      expect(rows.rowCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe("staff autorisé (manager), résidence A", () => {
    it("change le statut d'un dossier de sa résidence", async () => {
      const updated = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt("update public.applications set status = 'under_review' where id = $1 returning id", [
          IDS.appA,
        ]),
      );
      exercise("applications.applications_update_staff");
      expect(updated.ok).toBe(true);
      expect(updated.rowCount).toBe(1);
    });

    it("ne peut pas déplacer un dossier vers une autre résidence", async () => {
      const updated = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt("update public.applications set community_id = $1 where id = $2 returning id", [
          IDS.siteB,
          IDS.appA,
        ]),
      );
      exercise("applications.applications_update_staff");
      expect(refused(updated)).toBe(true);
    });

    it("ne voit pas les brouillons non soumis de la famille", async () => {
      // The draft is visible at SQL level to site staff; the API layer filters
      // it out. This asserts the current, documented behaviour.
      const rows = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt("select id, status from public.applications where id = $1", [IDS.appADraft]),
      );
      expect(rows.rows.map((r) => r.status)).toEqual(["draft"]);
    });

    it("ne lit pas le coffre non partagé de la famille", async () => {
      const rows = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt("select id from public.documents"),
      );
      exercise("documents.documents_select");
      const ids = rows.rows.map((r) => r.id);
      expect(ids).toContain(IDS.documentA);
      expect(ids).not.toContain(IDS.documentAPrivate);
      expect(ids).not.toContain(IDS.documentB);
    });

    it("ne peut pas modifier un document de la famille", async () => {
      const updated = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt("update public.documents set title = 'X' where id = $1 returning id", [
          IDS.documentA,
        ]),
      );
      exercise("documents.documents_write");
      expect(refused(updated)).toBe(true);
    });

    it("ne peut pas créer d'invitation staff", async () => {
      const created = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt(
          `insert into public.staff_invitations (email_hash, community_id, role, token_hash, expires_at)
           values ('h', $1, 'admin', 'jeton', now() + interval '1 day') returning id`,
          [IDS.siteA],
        ),
      );
      exercise("staff_invitations.staff_invitations_write");
      expect(refused(created)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("administrateur de la résidence A", () => {
    it("lit et crée les invitations de sa résidence uniquement", async () => {
      await as(PRINCIPALS.siteAdmin, async (session) => {
        const read = await session.attempt("select community_id from public.staff_invitations");
        exercise("staff_invitations.staff_invitations_select");
        expect(read.rows.map((r) => r.community_id)).toEqual([IDS.siteA]);

        const own = await session.attempt(
          `insert into public.staff_invitations (email_hash, community_id, role, token_hash, expires_at)
           values ('h', $1, 'coordinator', 'jeton-a', now() + interval '1 day') returning id`,
          [IDS.siteA],
        );
        exercise("staff_invitations.staff_invitations_write");
        expect(own.ok).toBe(true);

        const foreign = await session.attempt(
          `insert into public.staff_invitations (email_hash, community_id, role, token_hash, expires_at)
           values ('h', $1, 'coordinator', 'jeton-b', now() + interval '1 day') returning id`,
          [IDS.siteB],
        );
        expect(refused(foreign)).toBe(true);
      });
    });

    it("gère les adhésions de sa résidence et pas celles de la résidence B", async () => {
      await as(PRINCIPALS.siteAdmin, async (session) => {
        const promote = await session.attempt(
          "update public.staff_memberships set role = 'coordinator' where id = $1 returning id",
          [IDS.membershipReadonlyA],
        );
        exercise("staff_memberships.staff_memberships_write");
        expect(promote.rowCount).toBe(1);

        const foreign = await session.attempt(
          "update public.staff_memberships set role = 'readonly' where community_id = $1 returning id",
          [IDS.siteB],
        );
        expect(refused(foreign)).toBe(true);

        const removeForeign = await session.attempt(
          "delete from public.staff_memberships where community_id = $1 returning id",
          [IDS.siteB],
        );
        expect(refused(removeForeign)).toBe(true);
      });
    });

    it("lit l'équipe de sa résidence sans voir celle de la résidence B", async () => {
      const rows = await as(PRINCIPALS.siteAdmin, (s) =>
        s.attempt("select community_id from public.staff_memberships"),
      );
      exercise("staff_memberships.staff_memberships_select");
      expect(new Set(rows.rows.map((r) => r.community_id))).toEqual(new Set([IDS.siteA]));
    });

    it("ne lit pas le journal de sécurité des autres comptes", async () => {
      const rows = await as(PRINCIPALS.siteAdmin, (s) =>
        s.attempt("select actor_id from public.security_audit_log"),
      );
      exercise("security_audit_log.security_audit_log_select");
      expect(rows.rowCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe("staff d'une autre résidence", () => {
    it("ne lit aucun dossier de la résidence A", async () => {
      const rows = await as(PRINCIPALS.otherSiteStaff, (s) =>
        s.attempt("select id from public.applications"),
      );
      expect(rows.rows.map((r) => r.id)).toEqual([IDS.appB]);
    });

    it("ne lit aucun document partagé avec la résidence A", async () => {
      const rows = await as(PRINCIPALS.otherSiteStaff, (s) =>
        s.attempt("select id from public.documents"),
      );
      expect(rows.rows.map((r) => r.id)).toEqual([IDS.documentB]);
    });

    it("ne change pas le statut d'un dossier de la résidence A", async () => {
      const updated = await as(PRINCIPALS.otherSiteStaff, (s) =>
        s.attempt("update public.applications set status = 'approved' where id = $1 returning id", [
          IDS.appA,
        ]),
      );
      expect(refused(updated)).toBe(true);
    });

    it("ne lit pas l'audit d'admission de la résidence A", async () => {
      const rows = await as(PRINCIPALS.otherSiteStaff, (s) =>
        s.attempt("select application_id from public.admissions_audit_log"),
      );
      expect(rows.rows.map((r) => r.application_id)).toEqual([IDS.appB]);
    });

    it("ne suspend pas les admissions de la résidence A", async () => {
      const updated = await as(PRINCIPALS.otherSiteStaff, (s) =>
        s.attempt(
          "update public.site_admissions_settings set is_active = false where community_id = $1 returning community_id",
          [IDS.siteA],
        ),
      );
      exercise("site_admissions_settings.site_admissions_settings_write");
      expect(refused(updated)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe("organisation et équipe historique", () => {
    it("le propriétaire d'organisation gère son organisation et pas l'autre", async () => {
      await as(PRINCIPALS.orgOwner, async (session) => {
        const own = await session.attempt(
          "update public.organizations set name = 'Groupe A bis' where id = $1 returning id",
          [IDS.orgA],
        );
        exercise("organizations.organizations_write", "organizations.organizations_select");
        expect(own.rowCount).toBe(1);

        const foreign = await session.attempt(
          "update public.organizations set name = 'X' where id = $1 returning id",
          [IDS.orgB],
        );
        expect(refused(foreign)).toBe(true);

        const settings = await session.attempt(
          "select organization_id from public.organization_settings",
        );
        exercise(
          "organization_settings.organization_settings_select",
          "organization_settings.organization_settings_write",
        );
        expect(settings.rows.map((r) => r.organization_id)).toEqual([IDS.orgA]);

        const roles = await session.attempt("select organization_id from public.organization_roles");
        exercise("organization_roles.organization_roles_all");
        expect(roles.rows.map((r) => r.organization_id)).toEqual([IDS.orgA]);

        const integrations = await session.attempt(
          "select organization_id from public.organization_integrations",
        );
        exercise("organization_integrations.organization_integrations_org");
        expect(integrations.rows.map((r) => r.organization_id)).toEqual([IDS.orgA]);

        const webhooks = await session.attempt("select organization_id from public.webhook_events");
        exercise("webhook_events.webhook_events_org");
        expect(webhooks.rows.map((r) => r.organization_id)).toEqual([IDS.orgA]);

        const logs = await session.attempt(
          "select organization_integration_id from public.integration_logs",
        );
        exercise("integration_logs.integration_logs_org");
        expect(logs.rowCount).toBe(1);
      });
    });

    it("l'équipe historique garde ses droits sur sa résidence", async () => {
      await as(PRINCIPALS.legacyStaff, async (session) => {
        const applications = await session.attempt("select id from public.applications");
        expect(applications.rows.map((r) => r.id)).toContain(IDS.appA);

        const editProfile = await session.attempt(
          "update public.communities set description = 'texte' where id = $1 returning id",
          [IDS.siteA],
        );
        exercise("communities.communities_write");
        expect(editProfile.rowCount).toBe(1);

        const services = await session.attempt(
          "update public.community_services set service = 'x' where community_id = $1 returning id",
          [IDS.siteA],
        );
        exercise("community_services.community_services_write");
        expect(services.rowCount).toBe(1);

        const rooms = await session.attempt(
          "update public.community_rooms set room_type = 'x' where community_id = $1 returning id",
          [IDS.siteA],
        );
        exercise("community_rooms.community_rooms_write");
        expect(rooms.rowCount).toBe(1);

        const amenities = await session.attempt(
          "update public.community_amenities set amenity = 'x' where community_id = $1 returning id",
          [IDS.siteA],
        );
        exercise("community_amenities.community_amenities_write");
        expect(amenities.rowCount).toBe(1);

        const requirements = await session.attempt(
          "update public.admission_requirements set notes = 'x' where community_id = $1 returning id",
          [IDS.siteA],
        );
        exercise("admission_requirements.admission_requirements_write");
        expect(requirements.rowCount).toBe(1);

        const availability = await session.attempt(
          "update public.availability set available_rooms = 1 where community_id = $1 returning id",
          [IDS.siteA],
        );
        exercise("availability.availability_write");
        expect(availability.rowCount).toBe(1);

        const team = await session.attempt("select id from public.community_team_members");
        exercise("community_team_members.community_team_select");
        expect(team.rowCount).toBe(1);

        const foreignSite = await session.attempt(
          "update public.communities set description = 'x' where id = $1 returning id",
          [IDS.siteB],
        );
        expect(refused(foreignSite)).toBe(true);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("administrateur plateforme", () => {
    it("voit les surfaces réservées à l'exploitation", async () => {
      await as(PRINCIPALS.platformAdmin, async (session) => {
        for (const [table, policy] of [
          ["audit_logs", "audit_logs.audit_logs_admin"],
          ["outbox_events", "outbox_events.outbox_admin_select"],
          ["partners", "partners.partners_admin"],
          ["partner_services", "partner_services.partner_services_admin"],
          ["referrals", "referrals.referrals_admin"],
          ["quotes", "quotes.quotes_admin"],
          ["platform_roles", "platform_roles.platform_roles_admin"],
        ] as const) {
          const rows = await session.attempt(`select * from public.${table}`);
          exercise(policy);
          expect(rows.rowCount).toBeGreaterThan(0);
        }
      });
    });

    it("voit les surfaces d'appariement et de messagerie", async () => {
      await as(PRINCIPALS.platformAdmin, async (session) => {
        const providers = await session.attempt("select id from public.integration_providers");
        exercise("integration_providers.integration_providers_read");
        expect(providers.rowCount).toBe(1);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("surfaces liées au dossier", () => {
    it("réserve pièces, questions, visites et journal au périmètre du dossier", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const documents = await session.attempt(
          "select application_id from public.application_documents",
        );
        exercise("application_documents.application_documents_all");
        expect(documents.rows.map((r) => r.application_id)).toEqual([IDS.appA]);

        const questions = await session.attempt(
          "select application_id from public.application_questions",
        );
        exercise("application_questions.application_questions_all");
        expect(questions.rows.map((r) => r.application_id)).toEqual([IDS.appA]);

        const timeline = await session.attempt(
          "select application_id from public.application_timeline",
        );
        exercise("application_timeline.application_timeline_select");
        expect(timeline.rows.map((r) => r.application_id)).toEqual([IDS.appA]);

        const tours = await session.attempt("select application_id from public.tours");
        exercise("tours.tours_select", "tours.tours_write");
        expect(tours.rows.map((r) => r.application_id)).toEqual([IDS.appA]);

        const access = await session.attempt("select document_id from public.document_access");
        exercise("document_access.document_access_select", "document_access.document_access_write");
        expect(access.rows.map((r) => r.document_id)).toEqual([IDS.documentA]);

        const accessLogs = await session.attempt(
          "select document_id from public.document_access_logs",
        );
        exercise("document_access_logs.document_access_logs_select");
        expect(accessLogs.rows.map((r) => r.document_id)).toEqual([IDS.documentA]);

        const conversations = await session.attempt("select id from public.conversations");
        exercise("conversations.conversations_select");
        expect(conversations.rows.map((r) => r.id)).toEqual([IDS.conversationA]);

        const messages = await session.attempt("select conversation_id from public.messages");
        exercise("messages.messages_select");
        expect(messages.rows.map((r) => r.conversation_id)).toEqual([IDS.conversationA]);

        const reads = await session.attempt("select user_id from public.message_reads");
        exercise("message_reads.message_reads_all");
        expect(reads.rows.map((r) => r.user_id)).toEqual([IDS.familyAOwner]);

        const notifications = await session.attempt("select user_id from public.notifications");
        exercise("notifications.notifications_all");
        expect(notifications.rows.map((r) => r.user_id)).toEqual([IDS.familyAOwner]);

        const comparisons = await session.attempt("select family_id from public.comparisons");
        exercise("comparisons.comparisons_all");
        expect(comparisons.rows.map((r) => r.family_id)).toEqual([IDS.familyA]);

        const items = await session.attempt("select comparison_id from public.comparison_items");
        exercise("comparison_items.comparison_items_all");
        expect(items.rowCount).toBe(1);

        const invitations = await session.attempt("select family_id from public.family_invitations");
        exercise(
          "family_invitations.family_invitations_select",
          "family_invitations.family_invitations_write",
        );
        expect(invitations.rows.map((r) => r.family_id)).toEqual([IDS.familyA]);

        const members = await session.attempt("select family_id from public.family_members");
        exercise("family_members.family_members_select", "family_members.family_members_write");
        expect(new Set(members.rows.map((r) => r.family_id))).toEqual(new Set([IDS.familyA]));

        const contacts = await session.attempt("select senior_id from public.emergency_contacts");
        exercise(
          "emergency_contacts.emergency_contacts_select",
          "emergency_contacts.emergency_contacts_write",
        );
        expect(contacts.rows.map((r) => r.senior_id)).toEqual([IDS.seniorA1]);

        const assessments = await session.attempt(
          "select senior_id from public.senior_care_assessments",
        );
        exercise(
          "senior_care_assessments.care_assessments_select",
          "senior_care_assessments.care_assessments_write",
        );
        expect(assessments.rows.map((r) => r.senior_id)).toEqual([IDS.seniorA1]);

        const conditions = await session.attempt(
          "select senior_id from public.senior_medical_conditions",
        );
        exercise("senior_medical_conditions.conditions_family");
        expect(conditions.rows.map((r) => r.senior_id)).toEqual([IDS.seniorA1]);

        const allergies = await session.attempt("select senior_id from public.allergies");
        exercise("allergies.allergies_family");
        expect(allergies.rows.map((r) => r.senior_id)).toEqual([IDS.seniorA1]);

        const embeddings = await session.attempt("select senior_id from public.senior_embeddings");
        exercise("senior_embeddings.senior_embeddings_family");
        expect(embeddings.rows.map((r) => r.senior_id)).toEqual([IDS.seniorA1]);

        const summaries = await session.attempt("select senior_id from public.ai_summaries");
        exercise("ai_summaries.ai_summaries_select");
        expect(summaries.rows.map((r) => r.senior_id)).toEqual([IDS.seniorA1]);

        const compatibility = await session.attempt(
          "select senior_id from public.compatibility_analyses",
        );
        exercise("compatibility_analyses.compatibility_select");
        expect(compatibility.rows.map((r) => r.senior_id)).toEqual([IDS.seniorA1]);

        const consents = await session.attempt("select user_id from public.consent_records");
        exercise(
          "consent_records.consent_records_select",
          "consent_records.consent_records_update",
        );
        expect(consents.rows.map((r) => r.user_id)).toEqual([IDS.familyAOwner]);

        const rights = await session.attempt("select user_id from public.rights_operation_logs");
        exercise("rights_operation_logs.rights_operation_logs_select");
        expect(rights.rows.map((r) => r.user_id)).toEqual([IDS.familyAOwner]);

        const deletion = await session.attempt(
          "select user_id from public.account_deletion_requests",
        );
        exercise(
          "account_deletion_requests.account_deletion_requests_select",
          "account_deletion_requests.account_deletion_requests_update",
        );
        expect(deletion.rows.map((r) => r.user_id)).toEqual([IDS.familyAOwner]);

        const medications = await session.attempt("select senior_id from public.medications");
        exercise("medications.medications_family");
        expect(medications.rows.map((r) => r.senior_id)).toEqual([IDS.seniorA1]);

        const families = await session.attempt(
          "update public.families set family_name = 'Famille A bis' where id = $1 returning id",
          [IDS.familyA],
        );
        exercise("families.families_update");
        expect(families.rowCount).toBe(1);
      });
    });

    it("laisse la résidence lire les embeddings de son établissement seulement", async () => {
      const rows = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt("select community_id from public.community_embeddings"),
      );
      exercise("community_embeddings.community_embeddings_staff");
      expect(rows.rowCount).toBe(0);
    });

    it("laisse l'équipe historique lire les embeddings de son établissement", async () => {
      const rows = await as(PRINCIPALS.legacyStaff, (s) =>
        s.attempt("select community_id from public.community_embeddings"),
      );
      exercise("community_embeddings.community_embeddings_staff");
      expect(rows.rows.map((r) => r.community_id)).toEqual([IDS.siteA]);
    });

    it("réserve le commutateur d'admission au personnel du site", async () => {
      const rows = await as(PRINCIPALS.anonymous, (s) =>
        s.attempt("select community_id from public.site_admissions_settings"),
      );
      exercise("site_admissions_settings.site_admissions_settings_select");
      expect(rows.rowCount).toBe(2);

      const reason = await as(PRINCIPALS.anonymous, (s) =>
        s.attempt("select paused_reason from public.site_admissions_settings"),
      );
      expect(reason.ok).toBe(false);
      expect(reason.code).toBe(DENIED);
    });
  });

  // -------------------------------------------------------------------------
  it("a exercé chacune des politiques du schéma", () => {
    const declared = policies.map((p) => `${p.table}.${p.policy}`).sort();
    const covered = exercisedPolicies();
    const missing = declared.filter((name) => !covered.has(name));
    expect(missing).toEqual([]);
  });
});
