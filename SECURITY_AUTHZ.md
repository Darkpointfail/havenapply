# Authorization hardening — HavenApply

**Date :** 2026-08-18  
**Branch work :** multi-tenant AuthZ engine, IDOR fixes, RLS hardening, automated tests  
**Status :** controls improved; **not** a claim of full production isolation while the default backend remains `localStorage`.

## Objectif

Garantir qu’aucune RPA, aucun employé et aucun utilisateur ne peut accéder aux données d’un autre tenant sans autorisation explicite dérivée du **serveur / de la politique**, jamais d’identifiants fournis seuls par le navigateur.

## Changements livrés

### 1. Moteur d’autorisation canonique (`src/lib/authz/`)

| Fichier | Rôle |
| --- | --- |
| `types.ts` | Rôles, actions, ressources, décisions HTTP 401/403/404 |
| `roles.ts` | Mapping portail / famille / RPA / plateforme → `AuthzRole` |
| `tenant.ts` | Isolation famille & community, grants support, invites |
| `policy.ts` | `authorize()` — décision unique, fail-closed |
| `support-access.ts` | Break-glass justifié, TTL max 8h, révocation |
| `authz.test.ts` | Preuves automatisées des scénarios exigés |

**Rôles couverts :** `family_owner`, `family_caregiver`, `family_legal_representative`, `family_viewer`, `resident`, `community_employee`, `community_admin`, `haven_support`, `haven_super_admin`.

### 2. Correctif IDOR critique (RPA)

- `resolveCommunityResidenceId` **ne retombe plus** sur `maple-grove`.
- Org inconnue → `null` ; le portail community reste vide (**fail closed**).
- Fichiers : `src/lib/community-portal.ts`, `src/lib/community-portal-store.tsx`.

### 3. Cycle de vie des comptes

- `accountStatus`: `active` | `disabled` | `suspended` sur `AccountRecord` / `SessionUser`.
- `readSession()` revalide le statut et **efface la session** si désactivé.
- `signInAccount` refuse les comptes non actifs.
- `disableAccount` / `setAccountLifecycleStatus`.
- Signup facility local + API : `community_status = pending` (plus d’auto-`verified`).

### 4. API serveur

- `POST /api/authz/check` — décision côté serveur ; **refuse** role/grant venant du body ; exige backend Supabase (503 sinon).
- Signup admin : strip des clés d’élévation ; rôle limité à l’allowlist signup.

### 5. Politiques base de données (`supabase/migrations/0008_authz_hardening.sql`)

- `is_active_profile`, `is_super_admin` (support ≠ admin total).
- Table `support_access_grants` (justification, TTL, révocation) + RLS.
- Helpers `is_family_member` / `is_community_staff` / permissions mis à jour.
- `can_write_application_family`, `can_act_on_application_staff`.
- `expire_stale_invitations()`.

### 6. Tests

```bash
npm run test:authz
```

Couvre notamment :

1. RPA A ↛ lire/modifier dossiers RPA B (404)  
2. Famille A ↛ dossier famille B (404)  
3. Identifiant modifié / ressource absente → 404  
4. Compte disabled/suspended → refus immédiat  
5. Limites par rôle (employee vs admin, viewer, resident, self-role-change)  
6. Support sans grant / avec grant TTL / révoqué  

## Matrice de contrôles (post-changement)

| Contrôle | État |
| --- | --- |
| Isolation multi-tenant (moteur TS) | **présent** |
| Isolation multi-tenant (runtime localStorage) | **partiel** (clés navigateur encore partagées) |
| AuthZ serveur sur chaque requête métier | **partiel** (endpoint check + signup ; pas encore toutes les mutations Edge) |
| Non-confiance identifiants navigateur (policy) | **présent** (contrat) / **partiel** (stores locaux) |
| Protection IDOR/BOLA (policy + fix maple-grove) | **présent** (couche policy) |
| Moindre privilège par rôle | **présent** (moteur) |
| Révocation / désactivation compte | **présent** (store local) / **partiel** (Supabase profile.status via SQL) |
| Invitations expirables | **présent** (famille TTL) / **partiel** (SQL expire helper) |
| Interdiction self role-change | **présent** |
| Support break-glass justifié + TTL + journalisable | **présent** (TS + SQL table) ; journal applicatif complet **partiel** |
| RLS DB | **présent** (migrations) ; application live **non vérifiable** sans projet Supabase |

## Risques résiduels

1. **Backend défaut = localStorage** : un utilisateur technique peut encore lire d’autres paquets dans les mêmes clés navigateur. Le moteur AuthZ n’est efficace qu’s’il est appelé avant toute lecture/écriture.
2. **Edge Functions** submit/accept/download toujours non implémentées : les mutations critiques doivent y basculer.
3. **`/api/authz/check`** mappe encore des metadata session en attendant les RPC d’appartenance DB — à remplacer par jointures `family_members` / `community_team_members`.
4. **Org-wide staff** (SQL) peut voir plusieurs sites de la même org — par design ; documenter pour les RPA multi-sites.
5. **Open-access / site gate** ne constituent pas une AuthZ tenant.
6. **Tests RLS pgTAP** non exécutés dans CI (pas de Postgres de test dans le dépôt).
7. **Professionnel** mappé en `family_caregiver` côté API check — affiner avec tenant patient dédié.

## Utilisation recommandée (prochaines itérations)

1. Toute nouvelle API métier : construire `AuthzActor` depuis JWT + DB, puis `authorize()` avant I/O.  
2. Activer `NEXT_PUBLIC_DATA_BACKEND=supabase` + appliquer `0008_authz_hardening.sql`.  
3. Brancher cron `expire_stale_invitations`.  
4. Journaliser chaque grant support (qui, quoi, pourquoi, début/fin) dans `audit_logs`.  

## Non-affirmation

Ce document **n’affirme pas** la conformité Loi 25 / PIPEDA / HIPAA / SOC 2. La validation juridique et un pentest d’autorisation restent nécessaires avant des données réelles.
