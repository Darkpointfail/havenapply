# PLATFORM_REBUILD_PLAN.md

**Produit :** Haven — Common Application for Senior Living (US)  
**Date d’audit :** 20 juillet 2026  
**Portée :** Audit complet + plan de reconstruction (aucune reconstruction exécutée dans cette étape)  
**Statut build :** `npm run build` OK — le projet actuel fonctionne toujours

---

## 1. État actuel du projet

### 1.1 Nature du projet

Prototype **frontend Next.js (App Router) + TypeScript + Tailwind**, orienté démo UX.

- **Pas de backend** (pas d’API, pas de base de données, pas d’email, pas de stockage fichier réel).
- Persistance limitée au **navigateur** (`localStorage`) pour l’auth démo et le dossier familial.
- Beaucoup d’écrans premium / marketing / AI **simulés**.

### 1.2 Structure technique (haut niveau)

```
src/
  app/                 # Routes (pages)
  components/          # UI, layout, auth helpers, AI panel, residence cards
  data/                # Données statiques (établissements, candidatures démo, messages démo…)
  lib/                 # auth, family-data, theme, ai, utils
```

### 1.3 Inventaire des pages / routes

| Route | Rôle annoncé | Accès |
|-------|--------------|--------|
| `/` | Landing marketing | Public |
| `/signup` | Création compte famille | Public |
| `/login` | Connexion famille | Public |
| `/forgot-password` | Magic link | Public (UI only) |
| `/verify` | Vérification email | Public (UI only) |
| `/onboarding` | Onboarding guidé + “AI extract” | Famille (RequireAuth) |
| `/dashboard` | Hub famille | Famille |
| `/residences` | Recherche établissements | Public |
| `/residences/[id]` | Fiche établissement | Public |
| `/compare` | Comparaison | Public |
| `/apply` | Wizard candidature / profil | Famille |
| `/profile` | Dossier médical éditable | Famille |
| `/documents` | Vault documents | Famille |
| `/applications` | Suivi candidatures | Famille |
| `/messages` | Messagerie | Famille |
| `/tasks` | Checklist tâches | Famille |
| `/calendar` | Calendrier admissions | Famille |
| `/notifications` | Centre de notifications | Famille |
| `/settings` | Paramètres | Famille |
| `/residence-login` | Login staff établissement | Public |
| `/admin` | Portail établissement | Rôle `residence` |
| `/for-residences` | Redirect → `/residence-login` | — |
| `/hospital-login` | Login hôpital | Public |
| `/hospital` | Portail discharge | Auth `family` (détournement) |

### 1.4 Couches de données actuelles

| Source | Contenu | Persistance |
|--------|---------|-------------|
| `lib/auth.tsx` | User `{ name, email, role }` | `localStorage` clé `haven-auth` |
| `lib/family-data.tsx` | Personne + sections médicales + documents (métadonnées) | `localStorage` clé `haven-family-{email}` |
| `lib/theme.tsx` | Light / dark | `localStorage` clé `haven-theme` |
| `data/residences.ts` | 6 établissements fictifs | Statique |
| `data/applications.ts` | 7 candidatures fictives | Statique |
| `data/messages.ts` | 3 conversations fictives | Statique |
| `data/documents.ts` / `data/profile.ts` | Anciens seeds | **Peu / plus utilisés** (remplacés par family-data) |
| `lib/ai.tsx` + `AiAssistant` | Prompt panel | État React local, réponses scriptées |

---

## 2. Problèmes identifiés

### 2.1 Fonctionnalités réellement opérationnelles (MVP partiel)

Ces flux **modifient un état** et survivent au refresh (navigateur) :

1. **Compte famille démo** — signup / login / logout (sans password, email libre).
2. **Compte établissement démo** — residence-login → `/admin`.
3. **Profil médical** — ajouter / éditer / supprimer items ; éditer la personne ; completeness ; load demo / reset.
4. **Documents** — ajouter (nom fichier ou sélection locale), catégoriser, partager (toggle résidences), supprimer. **Fichiers non uploadés** (métadonnées seulement).
5. **Apply wizard** — écrit dans le profil + ajoute docs au vault (local).
6. **Onboarding** — écrit person / care / location budget dans family-data ; “AI extract” simulé.
7. **Recherche établissements** — filtres client-side sur dataset statique.
8. **Compare** — lit IDs query + dataset statique.
9. **Tasks** — toggle done en mémoire session (perdu au refresh).
10. **Theme** — dark/light réel.

### 2.2 Éléments uniquement visuels / simulés

| Zone | Simulation |
|------|------------|
| Landing | Stats, logos trust, pricing “Custom”, testimonials |
| Haven AI | Réponses fixes ; pas d’OCR / NLP réel |
| Onboarding upload | Timer + fake extract |
| Documents | Pas de blob/S3 ; pas de preview binaire |
| Applications | Liste figée ; pas liée au submit apply |
| Messages | Threads figés ; draft non envoyé |
| Dashboard “Needs attention” | Hardcodé (Margaret, Lakeside, etc.) |
| Calendar / Notifications | Contenu mock |
| Admin KPIs / rooms / visits | Mock |
| Admin Accept / Reject / etc. | Boutons sans handler |
| Hospital portal | UI mock ; rôle faux (`family`) |
| Compatibility / AI Match % | Formules / constantes affichage |
| Magic link / verify / 2FA | Écrans cosmétiques |
| Settings (sauf theme) | Liste non navigable |
| Virtual tour / map | UI placeholder |

### 2.3 Boutons / actions sans effet réel

- Admin : **Accept**, **Reject**, **Request info**, **Schedule visit**
- Messages : **Send**, **Request docs**, **Propose visit**, **Attach**
- Forgot password : **Send magic link**
- Hospital : **New patient packet**
- Settings : toutes les lignes sauf **Toggle theme**
- Applications : lien `?view=board` **non implémenté**
- AI : envoi utilisateur → réponse générique scriptée
- Residence profile : “Start virtual walkthrough” (affichage seulement)

### 2.4 Données statiques à rendre dynamiques (priorité MVP)

1. **Applications** — créées à partir d’un vrai “Apply to facility X” ; statuts mutables.
2. **Messages** — liés applications / établissements ; envoi réel (au moins local puis API).
3. **Facilities** — CRUD côté établissement (prix, dispo, critères).
4. **Documents** — fichiers réels + permissions par candidature.
5. **Family members / collaboration** — multi-users sur un même dossier.
6. **Tasks / calendar / notifications** — dérivés des candidatures et demandes établissement.
7. **Hospital referrals** — entité séparée, pas un faux login famille.

### 2.5 Incohérences de navigation / produit

1. **Deux “homes”** : landing `/` vs `/dashboard` — OK conceptuellement, mais CTAs parfois envoient vers `/onboarding` sans compte (landing AI CTA).
2. **Apply ≠ Applications** : finir `/apply` ne crée **aucune** entrée dans `/applications`.
3. **Hospital** utilise `RequireAuth role="family"` → le header famille apparaît ; pas de rôle `hospital`.
4. **Profil / apply / onboarding** peuvent diverger (mêmes données localement, mais pas de modèle “dossier patient” clair).
5. **Géo** : données Montréal / CAD alors que la cible produit est **US Senior Living**.
6. **Kanban** existait conceptuellement ; aujourd’hui timeline only + lien board mort.
7. **Nom “residences”** vs “communities / facilities” (vocabulaire US).
8. **Footer “After you sign up”** pointait autrefois vers des routes protégées sans contexte ; partiellement corrigé mais encore des chemins mixtes.

### 2.6 Risques de régression

| Risque | Impact |
|--------|--------|
| Remplacer `family-data` sans migration | Perte des dossiers démo utilisateurs |
| Changer les rôles auth | Hospital / admin cassés |
| Renommer routes (`/residences` → `/facilities`) | Liens marketing, compare, cards |
| Introduire backend sans garder mode démo | Impossible de présenter sans infra |
| Supprimer pages “simulées” trop tôt | Perte de couverture UX pour fundraising / design |
| Dark mode tokens (`teal` legacy vs `brand`) | Styles incohérents sur admin/messages encore partiellement en anciennes classes |

### 2.7 Composants réutilisables à conserver / étendre

**À conserver :**

- `Button`, `Badge`, `Card`
- `Logo`, `Header`, `Footer`, `SiteShell`, `MobileNav`
- `RequireAuth`, `ApplyButton`, `MessageButton`
- `ResidenceCard` (à généraliser en `FacilityCard`)
- `AiAssistant` (shell UI ; brancher plus tard)
- `AuthProvider`, `FamilyDataProvider`, `ThemeProvider`

**À refactorer avant scale :**

- Séparer **marketing shell** vs **app shell** vs **B2B shell**
- Extraire **ApplicationTimeline**, **StatusBadge**, **EmptyState**, **FileDropzone**
- Unifier tokens CSS (éliminer doublons teal/brand)

---

## 3. Structure fonctionnelle cible

### 3.1 Vision produit

Haven = **système d’admission** (pas un marketplace) :

- Famille : **un dossier intelligent** → multi-candidatures.
- Établissement : **pipeline d’admission** + inventaire.
- (Phase 2) Hôpital / case manager : discharge → multi-send.

### 3.2 Parcours famille cible (MVP)

```
Signup / Login
  → Onboarding dossier (proche)
    → Profil (identité, médical, assurance, finances, besoins)
    → Documents (upload réel)
  → Search / Compare facilities
  → Apply (sélection N établissements, 1 clic / confirmation)
  → Application Center (statuts live)
  → Messages + Tasks + Notifications
  → (Option) Inviter un autre membre de la famille
```

### 3.3 Parcours établissement cible (MVP)

```
Staff login (invité / SSO plus tard)
  → Dashboard admissions
  → Inbox candidatures
  → Voir dossier + documents partagés
  → Demander infos / changer statut / planifier visite
  → Gérer disponibilité, prix, critères
  → Messagerie famille
```

### 3.4 Rôles utilisateurs

| Rôle | Description | Accès MVP |
|------|-------------|-----------|
| `family_owner` | Créateur du compte / dossier | Full famille |
| `family_member` | Invité (frère/sœur, conjoint) | Lecture + édition selon permissions |
| `senior` (optionnel) | Le résident lui-même | Sous-ensemble simplifié |
| `facility_admin` | Directeur / admissions lead | Portail établissement |
| `facility_staff` | Intake / nursing liaison | Portail limité |
| `hospital_case_manager` | Phase 2 | Portail hospital |
| `platform_admin` | Ops Haven | Interne |

**Aujourd’hui :** seulement `family` | `residence` (noms à renommer vers la table ci-dessus).

### 3.5 Entités de données principales

```
User
Account (org type: family | facility | hospital)
FamilyProfile / CareRecipient
  - identity, medical, insurance, financial, lifestyle, careNeeds, POA
Document
  - file, category, versions, shares[]
Facility
  - location, careLevels, pricing, amenities, availability, criteria, media
Application
  - careRecipientId, facilityId, status, timeline[], sharedDocumentIds[]
MessageThread / Message
Task / CalendarEvent / Notification
Invitation (family collaboration)
FacilityInventory (rooms, waitlist, rates)
```

**Statuts Application (cible US MVP) :**  
`draft` → `submitted` → `under_review` → `documents_requested` → `tour_scheduled` → `assessment` → `accepted` | `waitlist` | `rejected` → `move_in`

---

## 4. Pages — conserver / modifier / créer

### 4.1 À conserver (avec polish)

| Page | Motif |
|------|--------|
| `/` | Landing — base conversion solide |
| `/signup`, `/login` | Socle auth UI |
| `/residences`, `/residences/[id]` | Découverte (renommer plus tard) |
| `/compare` | Différenciateur clair |
| `/profile` | Cœur dossier — déjà dynamique |
| `/documents` | Vault — déjà partiellement dynamique |
| `/apply` | Wizard — à reconnecter aux Applications |
| `/dashboard` | Hub — à brancher sur données réelles |
| `/applications` | Suivi — à brancher |
| `/messages` | Shell messagerie |
| `/admin` | Shell B2B |
| Design system (globals, Button/Card/Badge) | Capital UX |

### 4.2 À modifier (prioritaire)

| Page | Modifications |
|------|----------------|
| `/apply` | Créer/mettre à jour `Application[]` ; choisir facilities ; confirmation réelle |
| `/applications` | Source dynamique ; détail par candidature ; board optionnel |
| `/dashboard` | Widgets dérivés (docs manquants, tours, unread) |
| `/documents` | Upload réel (même local blob URL en V1) ; share lié aux applications |
| `/messages` | CRUD local puis API ; lier à facility/application |
| `/onboarding` | Persister étapes ; finances + insurance ; US copy |
| `/profile` | Sections finances / POA / family members |
| `/admin` | Actions statut réelles ; filtrer candidatures de *cet* établissement |
| `/residences*` | Vocabulaire US ; filtres insurance/Medicaid/VA ; map (phase 1.5) |
| `/settings` | Family members + notifications prefs au minimum |
| Auth | Password ou magic link réel ; rôles hospital séparés |
| Header/nav | App shell vs marketing ; retirer liens morts |

### 4.3 À créer (MVP)

| Page / flux | Pourquoi |
|-------------|----------|
| `/applications/[id]` | Détail candidature + timeline + docs demandés |
| `/facilities/...` (alias ou rename) | Alignement US (peut être redirect depuis residences) |
| Invitation famille (`/invite/[token]`) | Collaboration |
| Facility settings : pricing & availability | B2B MVP |
| `/admin/applications/[id]` | Revue dossier côté établissement |
| Empty / error states standardisés | Production UX |
| (Phase 2) Hospital packet builder | Hors MVP famille+facility strict |

### 4.4 À déprécier / ne pas investir

- `/verify`, `/forgot-password` tant que pas d’email provider — garder stub ou brancher Auth.
- Contenu marketing “12k+ families” non sourcé — remplacer par social proof réel ou retirer.
- AI “production claims” sans pipeline — garder comme **assistant guidé** transparent (“demo / assisté”).

---

## 5. Fonctionnalités manquantes pour un MVP fonctionnel

### Must-have (bloquant “Common App”)

1. **Modèle Application** dynamique (créer, lister, statut).
2. **Apply to one or many facilities** à partir du dossier.
3. **Facility portal** qui voit *ses* candidatures et change le statut.
4. **Demande de documents** établissement → visible famille (task + notification).
5. **Messagerie** minimale bidirectionnelle liée à une candidature.
6. **Auth réelle** (email + session serveur) — ou au minimum auth démo multi-onglets documentée.
7. **Collaboration famille** (invite + permissions basiques).
8. **Données US** (états, $USD, care levels US, insurance fields).
9. **Persistance serveur** (sinon ce n’est pas un produit multi-acteur).

### Should-have (MVP+)

10. Calendar events générés (tours).
11. Compare saved shortlist.
12. Facility edit pricing/availability.
13. Notifications persistées.
14. Audit log simple des partages documents.

### Later

15. Vrai AI/OCR.
16. Map search.
17. Hospital portal complet.
18. Paiements / billing B2B.
19. 2FA / SSO.

---

## 6. Ordre recommandé de développement

### Phase 0 — Stabilisation (1–3 jours)

- Documenter ce plan (fait).
- Inventaire liens morts : les désactiver ou les marquer “Coming soon” pour éviter fausse confiance.
- Unifier vocabulaire (Facility vs Residence) *sans* casser routes (aliases).
- Checklist non-régression manuelle (ci-dessous).
- **Ne pas supprimer** profile/documents dynamiques.

**Validation Phase 0**

- [ ] Build vert
- [ ] Signup → onboarding → dashboard OK
- [ ] Profile add/edit/delete OK après refresh
- [ ] Documents add/share/delete OK après refresh
- [ ] Residence search + fiche + compare OK
- [ ] Residence login → admin OK
- [ ] Aucune page critique 404

### Phase 1 — Domaine Applications (cœur MVP)

1. Introduire store `applications` (local d’abord, même shape que l’API future).
2. “Apply” crée N applications `submitted`.
3. `/applications` lit le store.
4. `/applications/[id]` détail + timeline.
5. Admin lit/filtre + **Accept / Reject / Request documents** mutent le store.
6. Dashboard widgets branchés sur ce store.

**Validation Phase 1**

- [ ] Apply à 2 facilities → 2 cards apparaissent
- [ ] Admin reject d’une → statut visible côté famille
- [ ] Request documents → badge / task famille
- [ ] Refresh conserve les candidatures (local ou API)

### Phase 2 — Documents & partage liés

1. Lier `sharedWith` aux `applicationId` / `facilityId`.
2. Preview locale (object URL) ou upload storage.
3. Liste “missing documents” dérivée des demandes admin.

**Validation Phase 2**

- [ ] Doc uploadé apparaît dans vault et peut être attaché à une candidature
- [ ] Admin voit uniquement docs partagés pour sa facility
- [ ] Famille voit demande manquante jusqu’à upload

### Phase 3 — Messagerie minimale

1. Threads par application.
2. Send message (local puis realtime/API).
3. Unread counts sur dashboard.

**Validation Phase 3**

- [ ] Message famille → visible admin (même store / API)
- [ ] Reply admin → visible famille
- [ ] Attach doc depuis vault

### Phase 4 — Auth & multi-acteur réel

1. Backend auth (email magic link ou password).
2. Rôles `facility_*` / `family_*` séparés.
3. Hospital role stub propre (plus de détournement family).
4. Invitations famille.

**Validation Phase 4**

- [ ] Deux navigateurs / comptes distincts collaborent sur un dossier
- [ ] Staff facility ne voit que son org
- [ ] Logout invalide session

### Phase 5 — Facility ops

1. Édition pricing / availability / admission criteria.
2. Ces champs alimentent search filters.
3. Waitlist position (règle simple).

**Validation Phase 5**

- [ ] Changement prix facility visible sur fiche publique
- [ ] Filtre budget search cohérent

### Phase 6 — Polish produit US + AI assist (non bloquant)

1. Copy US, USD, states.
2. AI assistant = règles / templates (pas de claims OCR tant que pas branché).
3. Map, hospital, billing.

---

## 7. Checklist de validation globale (par étape)

Utiliser cette grille à chaque phase :

### Technique

- [ ] `npm run build` OK
- [ ] Pas de régression sur pages publiques
- [ ] Auth gates : pages privées redirigent bien
- [ ] Dark mode non cassé sur pages touchées

### Famille

- [ ] Créer compte
- [ ] Créer / éditer dossier proche
- [ ] Ajouter infos médicales
- [ ] Ajouter document
- [ ] Rechercher / comparer
- [ ] Envoyer dossier à ≥2 établissements
- [ ] Voir statuts
- [ ] Recevoir demande d’info / y répondre

### Établissement

- [ ] Login staff
- [ ] Voir candidatures entrantes
- [ ] Ouvrir dossier
- [ ] Changer statut
- [ ] Demander document
- [ ] Message famille

### Collaboration (dès Phase 4)

- [ ] Inviter second membre famille
- [ ] Permissions respectées

### Non-régression explicite

- [ ] Aucune suppression des flux profile/documents dynamiques sans remplacement
- [ ] Landing et search restent utilisables hors connexion compte
- [ ] Portail residence reste séparé de la nav famille

---

## 8. Décisions recommandées (pour les prochaines étapes)

1. **Construire le MVP données en local-first avec le même schéma que l’API** pour ne pas jeter l’UI.
2. **Prioriser le lien Apply ↔ Applications ↔ Admin** avant tout nouvel écran marketing/AI.
3. **Ne pas vendre l’OCR comme réel** tant que non branché ; garder l’UX “assisted”.
4. **Séparer les rôles hospital** dès la Phase 4 pour éviter la dette actuelle.
5. **Renommer progressivement** Residence → Facility via aliases de routes.

---

## 9. Conclusion de l’étape “PROMPT 1”

| Attendu | Statut |
|---------|--------|
| Analyse complète sans reconstruction massive | Fait |
| Projet toujours fonctionnel | Fait (`build` OK) |
| Fonctionnalités utiles non supprimées | Fait (aucune suppression dans cette étape) |
| Plan assez précis pour guider la suite | Fait (ce document) |

**Prochaine étape suggérée :** Phase 0 (désactiver/marquer actions mortes) puis **Phase 1 — Domaine Applications**.
