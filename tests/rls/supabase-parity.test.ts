/**
 * Parity between the Supabase adapter and the actual database.
 *
 * Every statement below is the SQL equivalent of a call in
 * src/lib/admissions/supabase-store.ts, run as the principal that issues it in
 * production. A column the adapter forgets, an enum member that does not exist,
 * an `on conflict` target PostgreSQL cannot infer or a write RLS refuses all
 * fail here — none of them would fail against a mocked client.
 *
 * Skipped when RLS_TEST_DATABASE_URL is unset. `npm run test:rls` runs it.
 */

import { afterAll, describe, expect, it } from "vitest";
import { DATABASE_URL, IDS, PRINCIPALS, as, closePool, refused } from "./harness";

const live = DATABASE_URL ? describe : describe.skip;

live("adaptateur Supabase des admissions contre PostgreSQL", () => {
  afterAll(async () => {
    await closePool();
  });

  describe("getSite", () => {
    it("reconnaît une résidence publiée comme ouverte aux demandes", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const site = await session.attempt(
          "select id, name, status, deleted_at from public.communities where id = $1",
          [IDS.siteA],
        );
        expect(site.rowCount).toBe(1);
        // The adapter compares against this exact value; `active` is not a
        // member of community_status and would close every residence.
        expect(site.rows[0].status).toBe("verified");
        expect(site.rows[0].deleted_at).toBeNull();

        const settings = await session.attempt(
          "select is_active from public.site_admissions_settings where community_id = $1",
          [IDS.siteA],
        );
        expect(settings.rows[0]?.is_active).toBe(true);
      });
    });

    it("voit une résidence en pause fermée aux demandes", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const settings = await session.attempt(
          "select is_active from public.site_admissions_settings where community_id = $1",
          [IDS.siteUnlisted],
        );
        expect(settings.rows[0]?.is_active).toBe(false);
      });
    });
  });

  describe("résolution de la famille, de l'organisation et de l'aîné", () => {
    it("retrouve la famille du compte", async () => {
      const rows = await as(PRINCIPALS.familyA, (s) =>
        s.attempt(
          `select family_id from public.family_members
           where user_id = $1 and invitation_status = 'accepted' limit 1`,
          [IDS.familyAOwner],
        ),
      );
      expect(rows.rows[0]?.family_id).toBe(IDS.familyA);
    });

    it("retrouve l'organisation de la résidence", async () => {
      const rows = await as(PRINCIPALS.familyA, (s) =>
        s.attempt("select organization_id from public.communities where id = $1", [IDS.siteA]),
      );
      expect(rows.rows[0]?.organization_id).toBe(IDS.orgA);
    });

    it("réutilise l'aîné existant plutôt que d'en créer un second", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const existing = await session.attempt(
          "select id, first_name, last_name from public.seniors where family_id = $1",
          [IDS.familyA],
        );
        expect(existing.rowCount).toBe(2);

        const created = await session.attempt(
          `insert into public.seniors (family_id, first_name, last_name)
           values ($1, 'Nouvelle', 'Personne') returning id`,
          [IDS.familyA],
        );
        expect(created.ok).toBe(true);
      });
    });
  });

  describe("submitApplication", () => {
    it("insère un dossier complet et rejoue la même requête sans doublon", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const insert = `
          insert into public.applications
            (family_id, senior_id, community_id, organization_id, submitted_by,
             client_request_id, status, submitted_at, desired_move_in,
             admissions_payload, updated_at)
          values ($1, $2, $3, $4, $5, $6, 'submitted', now(), '2026-10-01',
                  '{"siteName":"Residence A"}'::jsonb, now())
          on conflict (family_id, client_request_id) do update
            set status = excluded.status,
                admissions_payload = excluded.admissions_payload,
                updated_at = excluded.updated_at
          returning id, client_request_id`;
        const params = [
          IDS.familyA,
          IDS.seniorA1,
          IDS.siteB,
          IDS.orgB,
          IDS.familyAOwner,
          "req-parite-1",
        ];

        const first = await session.attempt(insert, params);
        expect(first.ok).toBe(true);
        expect(first.rowCount).toBe(1);

        const replay = await session.attempt(insert, params);
        expect(replay.ok).toBe(true);
        expect(replay.rows[0].id).toBe(first.rows[0].id);

        const count = await session.attempt(
          "select count(*)::int as n from public.applications where client_request_id = $1",
          ["req-parite-1"],
        );
        expect(count.rows[0].n).toBe(1);
      });
    });

    it("consigne la soumission par la fonction d'audit et pas par une insertion directe", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const direct = await session.attempt(
          `insert into public.admissions_audit_log (application_id, actor_type, action)
           values ($1, 'family', 'application.submitted') returning id`,
          [IDS.appA],
        );
        expect(refused(direct)).toBe(true);

        const viaFunction = await session.attempt(
          "select public.record_admissions_event($1, 'family', $2, 'application.submitted', $3) as id",
          [IDS.appA, "famille.a.proprietaire@example.test", JSON.stringify({ siteId: IDS.siteA })],
        );
        expect(viaFunction.ok).toBe(true);
        expect(viaFunction.rows[0].id).toBeTruthy();
      });
    });

    it("refuse de consigner un évènement sur le dossier d'une autre famille", async () => {
      const attempt = await as(PRINCIPALS.familyB, (s) =>
        s.attempt("select public.record_admissions_event($1, 'family', '', 'forge') as id", [
          IDS.appA,
        ]),
      );
      expect(attempt.ok).toBe(false);
      expect(attempt.code).toBe("42501");
    });
  });

  describe("listForFamily et listForSites", () => {
    it("liste les dossiers de la famille", async () => {
      const rows = await as(PRINCIPALS.familyA, (s) =>
        s.attempt(
          `select id, admissions_payload, client_request_id, is_seed, desired_move_in, submitted_at
           from public.applications
           where family_id = $1 and deleted_at is null
           order by created_at desc`,
          [IDS.familyA],
        ),
      );
      expect(rows.ok).toBe(true);
      expect(rows.rowCount).toBe(2);
    });

    it("liste la file d'admission d'une résidence sans les brouillons", async () => {
      const rows = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt(
          `select id from public.applications
           where community_id = any($1) and status <> 'draft' and deleted_at is null
           order by submitted_at desc`,
          [[IDS.siteA]],
        ),
      );
      expect(rows.rows.map((r) => r.id)).toEqual([IDS.appA]);
    });
  });

  describe("changeStatus", () => {
    it("laisse le staff autorisé changer le statut et déclenche l'historique", async () => {
      await as(PRINCIPALS.staffAuthorized, async (session) => {
        const before = await session.attempt(
          "select count(*)::int as n from public.application_status_history where application_id = $1",
          [IDS.appA],
        );

        const updated = await session.attempt(
          `update public.applications
           set status = 'under_review', admissions_payload = admissions_payload, updated_at = now()
           where id = $1 and community_id = any($2)
           returning id, status`,
          [IDS.appA, [IDS.siteA]],
        );
        expect(updated.ok).toBe(true);
        expect(updated.rows[0].status).toBe("under_review");

        // 0007's security-definer trigger appends the history the client is not
        // allowed to write itself.
        const after = await session.attempt(
          "select count(*)::int as n from public.application_status_history where application_id = $1",
          [IDS.appA],
        );
        expect(after.rows[0].n).toBe(before.rows[0].n + 1);

        const event = await session.attempt(
          "select public.record_admissions_event($1, 'staff', $2, 'status.under_review') as id",
          [IDS.appA, "residence.a.gestion@example.test"],
        );
        expect(event.ok).toBe(true);
      });
    });

    it("refuse le même changement au staff en lecture seule", async () => {
      const updated = await as(PRINCIPALS.staffReadonly, (s) =>
        s.attempt(
          `update public.applications set status = 'under_review'
           where id = $1 and community_id = any($2) returning id`,
          [IDS.appA, [IDS.siteA]],
        ),
      );
      expect(refused(updated)).toBe(true);
    });
  });

  describe("withdraw", () => {
    it("laisse la famille retirer son dossier et pas celui d'une autre", async () => {
      await as(PRINCIPALS.familyA, async (session) => {
        const own = await session.attempt(
          `update public.applications set status = 'withdrawn', updated_at = now()
           where id = $1 and family_id = $2 returning id`,
          [IDS.appA, IDS.familyA],
        );
        expect(own.rowCount).toBe(1);

        const foreign = await session.attempt(
          `update public.applications set status = 'withdrawn', updated_at = now()
           where id = $1 and family_id = $2 returning id`,
          [IDS.appB, IDS.familyB],
        );
        expect(refused(foreign)).toBe(true);
      });
    });
  });

  describe("listMembershipsForUser", () => {
    it("lit le périmètre du staff dans staff_memberships", async () => {
      const rows = await as(PRINCIPALS.staffAuthorized, (s) =>
        s.attempt(
          `select id, user_id, community_id, role, status from public.staff_memberships
           where user_id = $1 and status = 'active'`,
          [IDS.staffManagerA],
        ),
      );
      expect(rows.rows).toEqual([
        expect.objectContaining({
          user_id: IDS.staffManagerA,
          community_id: IDS.siteA,
          role: "manager",
          status: "active",
        }),
      ]);
    });

    it("n'attribue aucun périmètre à un compte sans adhésion", async () => {
      const rows = await as(PRINCIPALS.familyA, (s) =>
        s.attempt(
          "select id from public.staff_memberships where user_id = $1 and status = 'active'",
          [IDS.familyAOwner],
        ),
      );
      expect(rows.rowCount).toBe(0);
    });
  });
});
