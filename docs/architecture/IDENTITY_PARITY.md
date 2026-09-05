# Parité d'identité entre l'application et Supabase

Ce document décrit comment une identité authentifiée est reliée à son profil, à
ses adhésions et à son périmètre en mode Supabase, comment les comptes existants
sont migrés, et ce qui se passe si une correspondance manque au déploiement.

Il fait suite à l'écart signalé dans `RLS_TESTING.md` : jusqu'ici l'identité
applicative vivait dans un fichier JSON, absent d'une instance serverless, et le
rôle de l'appelant était lu dans `user_metadata`, que le titulaire du compte peut
réécrire.

## Ce qui n'allait pas

Deux défauts, tous deux réels et tous deux couverts par des tests aujourd'hui.

**Le rôle venait du client.** `sessionFromSupabaseUser` lisait
`user.user_metadata.role`. Or `user_metadata` appartient au titulaire du compte :
un appel `supabase.auth.updateUser({ data: { role: "internal" } })` suffisait
pour que `requireAdmin` accorde l'accès. Le test
`tests/identity/identity-parity.test.ts` fait précisément cet appel, vérifie que
GoTrue l'accepte, et vérifie que le rôle résolu reste `family`.

**Le périmètre venait d'un fichier.** `requireStaff` lisait les adhésions dans
`.data/identity/state.json`. En mode Supabase ce fichier est vide, donc tout
compte de résidence était refusé avec « aucune résidence n'est liée à ce compte »,
alors que `staff_memberships` contenait la réponse.

## L'ancre

`public.app_identities`, ajoutée par `supabase/migrations/0012_identity_parity.sql` :

| Colonne | Rôle |
| --- | --- |
| `user_id` | clé primaire, `references auth.users (id)`. C'est l'ancre : l'UUID que GoTrue a vérifié en émettant le jeton. |
| `app_role` | rôle applicatif, écrit côté serveur uniquement. |
| `legacy_user_id` | ancien identifiant `usr_<uuid>`, unique. Présent seulement pour les comptes antérieurs. |
| `status` | `active` ou `disabled`. |

La clé primaire sur `user_id` et l'unicité sur `legacy_user_id` font de la
correspondance une bijection : un compte applicatif ne peut pointer que vers un
seul `auth.users.id`, et réciproquement.

Aucune politique d'écriture n'existe sur cette table. `anon` n'a aucun droit de
lecture ; `authenticated` peut lire `user_id`, `app_role`, `status` et les dates,
pour sa propre ligne seulement. `legacy_user_id` n'est pas exposé : c'est de la
comptabilité de migration, dont aucune session n'a besoin.

## Comment un rôle est attribué

Jamais par la requête qui le demande.

1. **Inscription.** Le déclencheur `on_auth_user_created_app_identity` crée la
   ligne avec `app_role = 'family'`, quoi que contienne le formulaire. Les
   métadonnées d'inscription sont contrôlées par le client, donc elles ne
   décident de rien.
2. **Résidence.** `accept_staff_invitation()` accorde l'adhésion et passe le
   compte à `facility`, dans la même transaction.
3. **Interne.** Uniquement par une action d'opérateur côté serveur. Aucun chemin
   applicatif ne mène à `internal`.

Le rôle applicatif ne donne aucun privilège de base de données : `is_platform_admin()`
reste adossé à `platform_roles`, et un compte `internal` sans ligne dans cette
table ne lit rien de plus qu'un autre. Les deux sont volontairement séparés.

## Comment un périmètre est résolu

`currentPrincipal()` appelle `supabase.auth.getUser()`, qui valide le jeton
auprès de GoTrue, puis lit `app_identities` **pour `auth.uid()`**. `requireStaff()`
lit ensuite `staff_memberships`, également pour `auth.uid()`.

Les deux lectures passent par le jeton de l'appelant, donc c'est la sécurité au
niveau des lignes qui limite le résultat, pas une clause `where` que du code
pourrait oublier. Le rôle de service n'intervient nulle part dans ce chemin : il
n'est utilisé que pour les écritures sans politique légitime — journal d'audit,
compteurs de limitation, approvisionnement par l'opérateur — et
`createAdminClient()` échoue bruyamment si sa clé manque, plutôt que de basculer
sur un magasin de fichiers.

Rien n'est mis en cache. Révoquer une adhésion retire le périmètre de la session
déjà ouverte, sans attendre une reconnexion ; c'est testé des deux côtés, en SQL
et à travers l'application.

## Aucune association par courriel dans une requête

Il n'existe aucun point d'entrée qui prenne une adresse et rende une identité ou
un périmètre. Les conséquences concrètes :

- `/api/staff/bootstrap` prend `userId` en mode Supabase, l'UUID lu par
  l'opérateur dans le tableau de bord, et refuse un corps qui n'en contient pas.
- `/api/staff/invitations/accept` ne nomme personne : la fonction de base de
  données prend le compte dans la session.
- `staff_invitations` ne stocke qu'un `email_hash`. La table des invitations
  n'est pas la liste des personnes qu'une résidence a tenté de recruter.

La seule mise en correspondance par adresse a lieu dans le script de migration,
une fois, sous le regard d'un opérateur.

## Séparation des adaptateurs

`src/lib/security/identity-repository.ts` est le seul endroit qui répond à la
question « quel adaptateur ». `identityBackend()` rend `local` ou `supabase`, et
`assertLocalIdentity()` lève une erreur explicite pour les opérations qui
n'existent qu'en local — vérification d'un mot de passe, réinitialisation — parce
qu'en mode Supabase c'est GoTrue qui détient l'identifiant.

Il n'y a pas de repli silencieux. Un déploiement Supabase mal configuré échoue
visiblement ; il ne se met pas à lire un fichier vide et à conclure que personne
n'a de résidence.

`src/lib/security/identity-backend.test.ts` parcourt le graphe d'imports de
l'adaptateur Supabase et vérifie qu'aucun module qu'il atteint n'importe
`node:fs`.

## Migration des comptes existants

Deux mécanismes, pour deux populations différentes.

### Comptes Supabase antérieurs à la migration

Le déclencheur ne se déclenche qu'à l'inscription, donc `0012` rattrape les
comptes déjà présents dans `auth.users`. Le rôle est déduit de tables que le
serveur contrôle : `platform_roles` donne `internal`, une adhésion active dans
`staff_memberships` ou `community_team_members` donne `facility`, le reste est
`family`. `user_metadata` n'est jamais consulté.

Sans ce rattrapage, ces comptes s'authentifieraient puis ne résoudraient aucun
rôle — un verrouillage, pas un refus. C'est `scripts/identity/upgrade-check.mjs`
qui l'a mis en évidence, et qui le vérifie maintenant à chaque exécution.

### Comptes du magasin de fichiers

```bash
DATABASE_URL="..." npm run identity:migrate            # rapport seul
DATABASE_URL="..." npm run identity:migrate -- --apply # écrit les liens
DATABASE_URL="..." npm run identity:migrate -- --rollback
```

Le script lit `.data/identity/state.json`, résout chaque adresse dans
`auth.users`, et appelle `link_legacy_identity()`. Il est déterministe et
idempotent : une deuxième exécution ne crée pas de second lien.

Le rapport, écrit dans `.data/identity/migration-report.json`, sépare
explicitement les cas que le script refuse de trancher :

| Cas | Traitement |
| --- | --- |
| Compte applicatif sans compte Supabase | listé dans `orphanedLegacyAccounts`. Aucun compte n'est créé : il n'y a pas de mot de passe à reprendre, et en inventer un serait pire que de laisser le compte visible dans le rapport. |
| Adresse désignant plusieurs comptes Supabase | listée dans `ambiguousAddresses`, aucun lien écrit. |
| Compte Supabase déjà lié à un autre identifiant | même traitement, l'unicité prime. |
| Adhésion dont l'identité n'a pas pu être résolue | listée dans `membershipsWithoutIdentity`, avec la raison. |
| Invitation en attente | listée dans `pendingInvitations`, non migrée : son empreinte est liée au secret du magasin local. Elle doit être réémise. |
| Compte Supabase sans identifiant hérité | compté dans `supabaseAccountsWithoutLegacy`, ce qui est normal pour tout compte créé après la bascule. |

`--rollback` défait exactement ce que le rapport décrit : il délie les
identifiants hérités et supprime les adhésions que la migration a créées, jamais
celles accordées depuis par une invitation. Un compte promu entre-temps garde sa
promotion.

### Si une correspondance manque au déploiement

Le comportement est le refus, pas la supposition.

- Un compte Supabase sans ligne dans `app_identities` s'authentifie auprès de
  GoTrue mais ne construit aucun principal : `currentPrincipal()` rend `null` et
  les routes répondent 401. `/api/auth/sign-in` va plus loin et répond 403, avec
  une entrée d'audit `no_application_identity`, plutôt que d'ouvrir une session
  sans rôle.
- Un compte de résidence sans adhésion reçoit 403 sur les routes de résidence,
  et rien d'autre ne s'ouvre pour compenser.
- Le rattrapage de `0012` fait que ce cas ne devrait pas exister après migration ;
  s'il apparaît, il signale une ligne créée hors du chemin normal, et le rapport
  de migration est l'endroit où le voir.

## Fonctions `security definer`

Quatre fonctions sont ajoutées. Toutes fixent `search_path = public`, aucune
n'accepte d'identifiant d'appelant en argument, et les droits sont retirés de
`public` avant d'être accordés explicitement.

| Fonction | Accordée à | Identité |
| --- | --- | --- |
| `app_role()` | `authenticated` | `auth.uid()`, sans argument possible |
| `accept_staff_invitation(text)` | `authenticated` | `auth.uid()`, échoue si absent |
| `consume_auth_rate_limit(text, int, int)` | `service_role` | sans objet, compteur seul |
| `link_legacy_identity(...)` / `unlink_legacy_identity(...)` | personne | migration uniquement, exécutées par le rôle de service |

`accept_staff_invitation()` mérite un mot : l'usage unique repose sur un
`update ... where used_at is null ... returning`. Deux appels concurrents ne
peuvent pas trouver la ligne libre tous les deux, et l'adhésion est accordée dans
la même transaction. Le test exécute les deux appels en parallèle et vérifie
qu'un seul l'emporte.

## Tests

`npm run test:identity` monte la pile, applique les migrations depuis une base
vide, sème les fixtures et exécute les 24 cas de
`tests/identity/identity-parity.test.ts`. `npm run test:e2e:supabase` rejoue les
parcours à travers l'application.

| Exigence | Où |
| --- | --- |
| 1. Création et résolution d'un compte FAMILY | `compte FAMILY` |
| 2. Compte STAFF avec plusieurs sites | `compte STAFF sur plusieurs sites` |
| 3. Rôle readonly sans pouvoir de décision | `rôle readonly` |
| 4. ADMIN explicitement autorisé | `ADMIN` (trois cas, dont deux tentatives d'escalade) |
| 5. Compte Supabase sans profil applicatif | `compte Supabase sans profil applicatif` |
| 6. Profil sans compte Supabase | `profil applicatif sans compte Supabase` |
| 7. Association falsifiée | `identifiant ou courriel falsifié` (trois cas) |
| 8. Membership modifié pendant une session | `membership modifié pendant une session ouverte` |
| 9. Invitation acceptée une seule fois | `invitation` (quatre cas, dont la course) |
| 10. Migration et retour arrière | `migration depuis les identifiants usr_<uuid>` |
| 11. Aucune dépendance au système de fichiers | `configuration Supabase` et `identity-backend.test.ts` |
| 12. Parcours Playwright FAMILY et STAFF | `e2e/supabase-identity.spec.ts` |

## Écart connu

Le cookie de session de `@supabase/ssr` n'est pas `HttpOnly`, parce que le client
navigateur rafraîchit la même session et doit pouvoir la lire. Une faille XSS
permettrait donc d'emporter une session, ce que le cookie `haven_session` du mode
local empêche. Le fermer suppose de faire passer l'inscription et la connexion de
l'interface par les routes serveur — qui existent désormais — puis de rendre le
client navigateur muet sur l'authentification. C'est un chantier à part, sans
rapport avec la parité d'identité, et il touche des pages.
