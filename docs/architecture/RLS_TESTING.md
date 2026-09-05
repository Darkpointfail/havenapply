# Tester les politiques RLS contre PostgreSQL

Ce document décrit comment les politiques de sécurité au niveau ligne sont
réellement exécutées, pas seulement relues. Le contrôle statique des migrations
reste dans `src/lib/security/rls-policies.test.ts`; il ne suffit pas et n'a
jamais permis d'affirmer la parité.

## Exécuter la suite

```bash
npm run test:rls
```

La commande enchaîne quatre étapes et ne laisse rien derrière elle :

1. démarrage d'un conteneur `public.ecr.aws/supabase/postgres` vide, éphémère;
2. application des onze migrations dans l'ordre, depuis une base vierge;
3. chargement des fixtures fictives (`tests/rls/fixtures.sql`);
4. exécution de `tests/rls/`, puis destruction du conteneur.

Variantes utiles :

```bash
RLS_KEEP_DB=1 npm run test:rls      # garde la base pour inspection
npm run rls:db -- up                # démarre seulement la base
npm run rls:db -- down              # la supprime
RLS_TEST_DATABASE_URL=... npx vitest run tests/rls   # base déjà prête
```

Sans `RLS_TEST_DATABASE_URL`, `npm test` ignore ces fichiers : la suite unitaire
reste utilisable sans Docker.

## Fidélité du harnais

Les assertions ne passent pas par le propriétaire des tables, qui échapperait à
RLS sans le dire. Le script crée un rôle de connexion `rls_test_authenticator`
calqué sur l'`authenticator` de Supabase :

- il peut devenir `anon` ou `authenticated`, rien d'autre;
- il n'est ni superutilisateur ni porteur de `BYPASSRLS`;
- il n'est pas membre de `service_role`.

Chaque cas ouvre une transaction, positionne `request.jwt.claim.sub` et
`request.jwt.claims` (les deux formes, pour rester compatible avec les
définitions ancienne et actuelle de `auth.uid()`), bascule de rôle, puis annule
la transaction. Aucun cas ne peut réussir grâce à des privilèges de
propriétaire, et aucun n'influence le suivant.

## Ce qui est couvert

| Mesure | Valeur |
| --- | --- |
| Tables du schéma `public` | 63 |
| Tables avec RLS activée | 62 (seule `spatial_ref_sys`, référentiel PostGIS, en est exempte) |
| Politiques déclarées | 95 |
| Politiques réellement exercées | 95 |
| Cas exécutés | 75 |

La couverture n'est pas déclarative : chaque cas enregistre les politiques
qu'il met sous tension et un dernier test compare ce registre à `pg_policies`.
Une politique ajoutée sans test fait échouer la suite.

Une seule table porte RLS sans aucune politique, `auth_rate_limits`, réservée au
`service_role`; la suite vérifie que la liste des tables sans politique se
limite exactement à celle-là.

### Rôles exercés

`visiteur anonyme`, `famille A propriétaire`, `famille A lecteur`,
`famille B propriétaire`, `staff lecture seule (résidence A)`,
`staff autorisé / manager (résidence A)`, `administrateur (résidence A)`,
`administrateur (résidence B)`, `administrateur plateforme`,
`propriétaire d'organisation`, `équipe historique community_team_members`.

### Opérations exercées

Lecture, création, modification et suppression sont assertées séparément. Le
balayage anonyme parcourt les 62 tables une par une pour chacune des trois
opérations d'écriture et pour la lecture, et vérifie que le seul contenu
lisible sans session est le catalogue public : les deux résidences `verified`
et leurs pages, jamais la résidence non publiée.

### Non-vacuité

La suite a été validée par mutation. En rétablissant
`applications_update_staff` sur `is_site_staff` et en désactivant RLS sur
`documents`, huit cas échouent immédiatement, dont « le staff en lecture seule
ne peut pas changer le statut » et « aucune table publique sans RLS ».

## Écarts trouvés en exécutant les politiques

Cinq défauts que la relecture statique n'avait pas vus. Tous corrigés dans
`0010` et `0011`, tous couverts par un test.

1. **La migration `0010` n'appliquait pas.** `site_accepts_applications`
   comparait `communities.status` à `'active'`, valeur absente de l'énumération
   `community_status`. Sur une base vierge, la migration s'arrêtait là. Corrigé
   en `'verified'`, l'état publié utilisé partout ailleurs.
2. **L'index d'idempotence était inutilisable.** Partiel
   (`where client_request_id is not null`), il ne pouvait pas être inféré par
   `on conflict (family_id, client_request_id)`; toute soumission via
   l'adaptateur Supabase aurait échoué. L'index est désormais complet, les clés
   nulles restant distinctes.
3. **Une adhésion `readonly` pouvait décider.** `applications_update_staff`
   n'exigeait que `is_site_staff`, alors que l'API exige `requireDecidingRole`.
   Une politique moins stricte que le code applicatif n'est pas une défense en
   profondeur. Ajout de `is_site_decider` (`admin`, `manager`, `coordinator`).
4. **Le personnel voyait le dossier mais rien de son contenu.** Les surfaces
   rattachées à une demande (`can_read_application`, `documents_select`,
   `document_access_logs_select`) ne résolvaient le personnel que par
   `community_team_members`. Une résidence dont l'équipe vit dans
   `staff_memberships` lisait la ligne de dossier et ni le document partagé, ni
   l'historique, ni l'audit. Les deux modèles sont désormais acceptés, le temps
   de retirer l'ancien.
5. **Le journal d'admission n'avait aucune entrée.** `admissions_audit_log`
   n'a volontairement pas de politique d'insertion, mais l'application y
   écrivait directement : les écritures étaient refusées sans bruit. L'ajout
   passe maintenant par `record_admissions_event`, fonction `security definer`
   qui revérifie `can_read_application` et prend l'acteur dans la session, pas
   dans ses arguments.

Correctif adjacent : `paused_reason` peut contenir une note interne alors que
le commutateur d'admission est public. RLS ne sait pas restreindre une colonne;
le droit de lecture d'`anon` est donc accordé colonne par colonne.

## Parité de l'adaptateur Supabase

`tests/rls/supabase-parity.test.ts` rejoue en SQL, sous le principal réel,
chaque requête de `src/lib/admissions/supabase-store.ts`. L'exercice a montré
que l'adaptateur ne pouvait pas fonctionner : statut comparé à une valeur hors
énumération, colonnes `senior_id` et `organization_id` non nulles absentes des
insertions, cible `on conflict` non inférable, périmètre du personnel lu dans
la table au vocabulaire de rôles incompatible, audit écrit par une insertion
refusée. Les cinq points sont corrigés et testés.

### Écart d'identité, comblé depuis

Cette section signalait que `src/lib/security/identity-store.ts` restait adossé
au système de fichiers, si bien qu'en mode Supabase `requireStaff` lisait des
adhésions absentes et refusait tout compte de résidence.

C'est fait. L'identité est désormais ancrée sur `auth.users.id` par la table
`app_identities`, le rôle est lu dans la base et non dans `user_metadata`, et le
périmètre vient de `staff_memberships` sous la sécurité au niveau des lignes.
Voir `IDENTITY_PARITY.md` pour la conception, la migration des comptes existants
et le comportement si une correspondance manque.

## Suite d'identité, contre GoTrue et PostgREST

Le harnais de `tests/rls` usurpe un principal en posant des revendications JWT
dans une transaction. C'est fidèle pour les politiques, et insuffisant pour
l'identité : cela suppose déjà connu l'UUID que l'on veut vérifier.
`tests/identity` passe donc par le réseau.

```bash
npm run test:identity        # pile complète, base vide, 24 cas
npm run test:e2e:supabase    # les mêmes parcours à travers l'application
npm run identity:upgrade-check   # migration d'une base existante, puis retour arrière
```

`scripts/supabase-stack/stack.mjs` monte Postgres, GoTrue et PostgREST derrière
un routeur d'une trentaine de lignes qui les présente sur une seule origine,
comme le fait Kong. La CLI Supabase n'est pas utilisée : son conteneur de
migration Realtime n'aboutit pas sur cet hôte, et l'application ne parle qu'à ces
deux services. Ce que voit l'application est donc réel — des jetons émis par
GoTrue contre de vraies lignes `auth.users`, et la sécurité au niveau des lignes
appliquée par PostgREST.

Les identifiants sont générés à chaque démarrage et écrits dans
`.supabase-stack/`, ignoré par git. Rien ne pointe vers un projet distant.

## Base de test distante

Le harnais n'a besoin que d'une chaîne de connexion; il fonctionne donc aussi
contre un projet Supabase de test dédié :

```bash
RLS_TEST_DATABASE_URL="..." node scripts/rls/setup-db.mjs
RLS_TEST_DATABASE_URL="..." npx vitest run tests/rls
```

`setup-db.mjs` vide **toutes** les tables du schéma `public` avant de semer.
Ne le pointez jamais ailleurs que sur une base jetable.

Noms exacts des variables attendues, à renseigner dans le gestionnaire de
secrets du tableau de bord et nulle part ailleurs :

| Variable | Usage |
| --- | --- |
| `RLS_TEST_DATABASE_URL` | connexion PostgreSQL de la base de test |
| `NEXT_PUBLIC_SUPABASE_URL` | projet Supabase de test, côté application |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publique du projet de test |
| `SUPABASE_SERVICE_ROLE_KEY` | clé de service, serveur uniquement |
| `HAVEN_SESSION_SECRET` | signature des sessions, 32 caractères minimum |

Un projet de test ne doit contenir que des données fictives. Les fixtures de ce
dépôt le sont : noms inventés, adresses en `example.test`, aucun dossier réel.

## `service_role` côté serveur uniquement

Trois vérifications, dont deux exécutées contre la base :

1. `service_role` est le seul rôle porteur de `BYPASSRLS`; `anon` et
   `authenticated` ne l'ont pas.
2. Ni `anon` ni `authenticated` n'est membre de `service_role`, et la connexion
   utilisée par les tests ne l'est pas non plus : `set role service_role` y est
   refusé.
3. Côté dépôt, `src/lib/security/bundle-safety.test.ts` interdit toute
   référence à `SUPABASE_SERVICE_ROLE_KEY` depuis un module client, et
   `validateSecurityEnv` refuse toute variable `NEXT_PUBLIC_` contenant
   `SERVICE_ROLE`, ce préfixe étant intégré au bundle du navigateur.
