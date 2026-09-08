# HavenApply — Audit d'utilisabilité B2C et B2B

**Document :** audit d'exécution — « le logiciel est-il utilisable ? »
**Destinataire :** agent d'implémentation (Claude)
**Date :** 2026-09-07
**Base auditée :** `main` à `477a486` (« Server-verified identity for family and residence portals », PR #106)
**Périmètre :** parcours famille (B2C) et console résidence (B2B), configuration par défaut
**Langue :** français

> Cet audit ne décrit pas une architecture cible. Il répond à une seule question :
> **un vrai proche aidant et une vraie résidence peuvent-ils se servir du logiciel aujourd'hui ?**
> La réponse est non, et l'audit dit exactement où ça casse, avec la preuve d'exécution pour chaque blocage.

---

## 1. Résumé exécutif

**Verdict : le logiciel n'est utilisable de bout en bout ni en B2C ni en B2B.** La cause n'est pas un manque de fonctionnalités — la surface produit est large et largement construite — mais **cinq ruptures de câblage** entre des morceaux qui, pris isolément, fonctionnent.

Le schéma est constant : une couche serveur correcte existe, une couche UI riche existe, et **l'UI n'appelle pas la couche serveur**. Le durcissement d'authentification de la PR #106 a déplacé la vérité côté serveur sans rebrancher les écrans qui écrivaient encore dans le navigateur.

### Les cinq blocages, par ordre de gravité

| # | Blocage | Effet | Preuve |
| --- | --- | --- | --- |
| **B1** | **Créer un compte ne crée aucun compte.** L'écran d'inscription écrit dans `localStorage` et n'appelle aucune API. | **Personne ne peut entrer**, ni famille ni résidence. Le compte créé ne survit pas à un rafraîchissement et ne permet pas de se reconnecter. | §4.1 — sonde navigateur |
| **B2** | **Aucune candidature ne peut partir vers une résidence québécoise.** Le bouton « Envoyer » est un `return` silencieux pour les 1 328 résidences du catalogue RPA. | **La conversion B2C est nulle.** Aucun message d'erreur. | §4.2 — 0/200 testées |
| **B3** | **La console résidence lève une exception pour deux des quatre rôles staff.** `manager` et `coordinator` ne sont pas dans la table de permissions. | Les rôles qui *décident* des admissions plantent le portail B2B. | §4.3 — `TypeError` |
| **B4** | **Une résidence sans dossier voit des dossiers fictifs.** Faute de données serveur, la console affiche des résidents inventés et des statistiques inventées. | Perte de crédibilité immédiate à la démo, et confusion sur ce qui est réel. | §4.4 |
| **B5** | **Les décisions de la résidence n'atteignent jamais la famille.** L'API existe, l'UI famille ne l'appelle jamais. | La boucle métier du produit — envoyer, être répondu — est ouverte. | §4.5 |

### Ce que ça implique

Ces cinq points ne sont pas des « bugs à corriger un jour » : **B1 et B2 rendent toute démonstration impossible** et **B5 rend le produit inutile même si B1 et B2 sont réglés**. Tant qu'ils tiennent, mesurer quoi que ce soit d'autre (rétention, mobile, esthétique) n'a pas de sens.

Bonne nouvelle : les trois premiers sont des corrections de câblage de portée réduite, pas des réécritures. Le travail structurant est concentré sur B5 et sur les sorties transactionnelles (§6).

---

## 2. Méthode

Audit conduit sur un arbre propre à `477a486`, dépendances installées via `npm ci`. Chaque constat marqué **prouvé** a été vérifié par exécution, pas par lecture seule.

| Commande | Résultat |
| --- | --- |
| `npm ci` | 432 paquets |
| `npm run build` | succès, 149 pages, 2 avertissements (`middleware` déprécié, `metadataBase` absent) |
| `npx tsc --noEmit` | aucune erreur |
| `npm run lint` | **88 problèmes** (45 erreurs, 43 avertissements) |
| `npm test` (vitest) | **93 tests, 15 fichiers, tous verts** |
| `npm run test:e2e` (Playwright) | **6 tests verts** — `e2e/authz.spec.ts` uniquement |
| Sondes jetables (§4, annexe A) | 3 sondes, supprimées après mesure |

**Point de méthode important :** la suite de tests est verte et le produit ne fonctionne pas. Ce n'est pas contradictoire — les tests couvrent les modules serveur (autorisation, isolation locative, complétude, références publiques) et **aucun parcours utilisateur complet**. Les tests Playwright créent leurs comptes via `POST /api/auth/register`, c'est-à-dire **en contournant précisément l'écran d'inscription qui est cassé** (`e2e/authz.spec.ts:67`). C'est la raison structurelle pour laquelle B1 a pu passer inaperçu.

---

## 3. Verdict par parcours

### 3.1 Parcours famille (B2C)

| Étape | État | Note |
| --- | --- | --- |
| Découvrir le produit (`/`) | ✅ Fonctionne | Landing FR soignée |
| Créer un compte | ❌ **Cassé (B1)** | Compte fantôme, non réutilisable |
| Se connecter | ✅ Fonctionne | …si le compte a été créé par l'API |
| Constituer le dossier (9 étapes) | ✅ Fonctionne | Sauvegarde serveur débouncée, complétude pondérée |
| Téléverser des pièces | ✅ Fonctionne | Échec signalé par `window.alert` |
| Chercher une résidence | ✅ Fonctionne | 1 328 résidences RPA, filtres, score de correspondance |
| **Envoyer une candidature** | ❌ **Cassé (B2)** | Silencieux, 0 % de succès sur le catalogue réel |
| Suivre la demande | ⚠️ Partiel | Affiche l'état initial, jamais mis à jour |
| **Recevoir la réponse** | ❌ **Cassé (B5)** | Aucune synchronisation, aucune notification, aucun courriel |
| Écrire à la résidence | ❌ Trompeur | Le bouton ouvre la FAQ, pas la messagerie |

### 3.2 Parcours résidence (B2B)

| Étape | État | Note |
| --- | --- | --- |
| Créer un compte établissement | ❌ **Cassé (B1)** | Même cause que B2C |
| Être rattaché à une résidence | ⚠️ Hors produit | Uniquement par `bootstrap` opérateur, invitation API, ou seed dev — §5.1 |
| Ouvrir la console | ⚠️ **Trompeur (B4)** | Dossiers et KPI fictifs si aucune donnée serveur |
| Travailler avec le rôle reçu | ❌ **Cassé (B3)** | `manager` / `coordinator` → exception |
| Traiter une demande | ✅ Fonctionne | Machine d'états, journal d'audit, checklist de revue |
| Ouvrir une pièce jointe | ❌ Non implémenté | Bouton *Open* désactivé, octets non transmis au staff |
| Notifier la famille | ❌ Simulé | Écrit des lignes d'audit « courriel envoyé » sans envoi |
| Gérer plusieurs sites | ❌ Non implémenté | Seul `siteIds[0]` est chargé — §5.2 |
| Éditer la fiche publique | ⚠️ Sans effet | Reste dans le `localStorage` du poste staff — §5.3 |
| Inviter un collègue | ⚠️ Factice | L'UI n'appelle pas l'API d'invitation — §5.4 |

---

## 4. Blocages (à corriger en premier)

### 4.1 B1 — Créer un compte ne crée aucun compte

**Constat.** En configuration par défaut (`NEXT_PUBLIC_DATA_BACKEND=local`), la connexion passe par le serveur alors que l'inscription ne le fait pas.

- `signIn` appelle `serverSignIn()` → `POST /api/auth/sign-in`, qui vérifie les identifiants dans le magasin serveur `.data/` et pose un cookie de session `httpOnly` (`src/lib/auth.tsx:258`).
- `signUp` appelle `signUpWithRoleAccount()` (`src/lib/auth.tsx:187`), qui écrit un compte et une session **dans le navigateur** et ne contacte aucune API (`src/lib/auth-store.ts:308-341`, `saveAccount` + `writeSession`).
- `serverRegister()` existe et vise la bonne route, mais **aucun composant ne l'appelle** ; seul le test e2e le fait (`src/lib/family/client-api.ts:56-69`, `e2e/authz.spec.ts:67`).

Les deux moitiés du flux consultent donc deux magasins différents : le serveur ne connaîtra jamais un compte créé par l'UI.

**Preuve (sonde Playwright, navigateur réel, build de production).** Inscription famille complète depuis `/get-started` :

```
PROBE url after signup:              http://127.0.0.1:3210/family/dashboard
PROBE API writes during signup:      []                ← aucune requête non-GET vers /api
PROBE /api/auth/me after signup ->   200 {"ok":true,"user":null}
PROBE /api/family/me after signup -> 401
PROBE url after reload:              /sign-in?next=%2Ffamily%2Fdashboard
PROBE url after re-sign-in:          /sign-in          ← échec avec les identifiants tout juste créés
```

L'utilisateur atterrit sur son tableau de bord, croit son compte créé, **n'a aucune session serveur**, perd l'accès au premier rafraîchissement, et **ne peut plus jamais se connecter** avec ces identifiants.

**Impact.** Bloquant absolu, B2C et B2B, sur le chemin par défaut. C'est le premier écran du produit.

**Correction attendue.** Router `signUp` vers `POST /api/auth/register` puis établir la session par le même chemin que `signIn` (register → sign-in serveur → `fetchServerIdentity`). Traiter explicitement le cas « vérification de courriel requise ». Retirer `haven-accounts-v1` et `haven-auth` du chemin produit ; ils entrent aujourd'hui en conflit direct avec l'identité serveur.

**Critère de vérification.** Un test Playwright qui **passe par l'UI** : inscription → rafraîchissement → toujours connecté → déconnexion → reconnexion avec les mêmes identifiants → accès à `/api/family/me` en 200. Ce test doit exister, sinon la régression reviendra.

---

### 4.2 B2 — Aucune candidature ne peut partir vers une résidence québécoise

**Constat.** Deux catalogues de résidences coexistent et le chemin d'envoi utilise le mauvais.

- La recherche famille s'appuie sur le registre RPA du Québec : **1 328 résidences**, identifiants `rpa-<réf MSSS>` (`data/rpa/quebec-residences.json`, `src/data/rpa-quebec.ts`).
- L'envoi passe par `buildSubmitDraft()`, qui résout l'identifiant via `getResidence()` — lequel ne connaît que **7 communautés de démonstration américaines** (`src/data/residences.ts:591`, ids `maple-grove`, `lakeside-haven`, `cedar-memory`…).
- `toCatalogResidenceId()` ne fait la passerelle que pour trois alias de maquette et renvoie l'entrée telle quelle sinon (`src/lib/fr-portal-dynamic.ts:300-312`).
- Résultat : `getResidence("rpa-1428")` est `undefined`, donc `buildSubmitDraft` renvoie `null` (`src/lib/fr-portal-dynamic.ts:202-205`).
- Et l'appelant traite ce `null` par un **abandon muet** :

```620:642:src/components/family-space/FamilySpace.tsx
  const sendApplication = () => {
    if (!selectedRes || !selectedUnit || !consent) return;
    const draft = buildSubmitDraft({
      residenceId: selectedRes.id,
      // …
    });
    if (!draft) return;
    const saved = submitApplication(draft);
    // …
  };
```

**Preuve (exécution).** Sur un échantillon de 200 résidences du catalogue RPA réel :

```
RPA catalog total: 1328
sampled: 200, submittable: 0
first id: rpa-1428 -> catalog id: rpa-1428
```

**Impact.** La famille remplit son dossier, choisit une unité, coche le consentement, clique « Envoyer » — **et rien ne se produit**. Pas de navigation, pas d'erreur, pas de trace. C'est le pire mode de défaillance possible sur l'action qui porte toute la valeur du produit.

**Correction attendue.** Trois choses, dans cet ordre :
1. **Rendre l'échec impossible à ignorer** : un `null` sur le chemin d'envoi doit produire une erreur visible, jamais un `return`. C'est la correction d'une ligne qui évite la prochaine occurrence de cette classe de bug.
2. **Unifier le catalogue** : le brouillon de candidature doit se construire depuis le catalogue RPA, qui est la seule source réelle. Le catalogue de démonstration américain doit sortir du chemin produit.
3. **Vérifier l'accord avec le registre serveur** : `src/lib/admissions/site-registry.ts` valide les `siteId` acceptés côté serveur ; l'envoi doit viser des identifiants que ce registre reconnaît, sinon on remplace un échec muet par un 403.

**Critère de vérification.** Un test qui parcourt un échantillon du catalogue RPA et exige un brouillon non nul pour **chaque** entrée, plus un parcours e2e qui envoie une candidature à une résidence québécoise et la retrouve dans « Mes demandes » et dans la console résidence.

---

### 4.3 B3 — La console résidence plante pour deux des quatre rôles staff

**Constat.** Deux vocabulaires de rôles cohabitent sans traduction.

- Le serveur émet `admin | manager | coordinator | readonly` (`src/lib/admissions/types.ts:117`), et ce sont `admin`, `manager`, `coordinator` qui ont le pouvoir de décision côté garde d'autorisation.
- La console attend `admin | admissions_manager | sales_counselor | nurse_reviewer | readonly` (`src/lib/community-portal.ts:10-15`), et sa table de permissions est indexée sur ces clés-là (`src/lib/community-portal.ts:95-131`).
- Le magasin transtype le rôle serveur en rôle console sans conversion (`src/lib/community-portal-store.tsx:299-313`), puis `communityRoleHas` déréférence une entrée absente :

```133:138:src/lib/community-portal.ts
export function communityRoleHas(
  role: CommunityTeamRole,
  permission: CommunityPermission,
) {
  return ROLE_PERMS[role].includes(permission);
}
```

**Preuve (exécution).** Évaluation de `viewDashboard` pour les quatre rôles réellement émis par le serveur :

```
admin       -> true
manager     -> THROWS TypeError: Cannot read properties of undefined (reading 'includes')
coordinator -> THROWS TypeError: Cannot read properties of undefined (reading 'includes')
readonly    -> true
```

**Impact.** Un collègue invité comme `manager` ou `coordinator` — c'est-à-dire **le profil d'usage normal d'une résidence**, l'admin étant l'exception — fait tomber le rendu de la console. Seuls `admin` et `readonly` fonctionnent, par coïncidence de nommage. Aucun `error.tsx` n'existe pour amortir la chute (§6.4).

**Correction attendue.** Choisir **un seul** vocabulaire de rôles pour tout le produit. Le vocabulaire serveur est le bon candidat : il est déjà celui des invitations, des gardes et de la base. Traduire ou remplacer la table de permissions de la console en conséquence, et rendre `communityRoleHas` total (repli explicite sur `readonly` pour toute valeur inconnue plutôt qu'un déréférencement).

**Critère de vérification.** Un test unitaire qui itère sur `StaffMembershipRole` et exige une réponse booléenne pour chaque rôle et chaque permission — sans exception levée.

---

### 4.4 B4 — Une résidence sans dossier voit des dossiers fictifs

**Constat.** La console retombe sur des données de maquette dès que la liste serveur est vide.

```384:390:src/components/residence-console/ResidenceConsole.tsx
  const portalApps = portal.workspace?.applications ?? [];
  const demandes = useMemo(() => {
    if (!portalApps.length) return localDemandes;
    return portalApps
      .filter((a) => a.status !== "withdrawn" && a.status !== "closed" && a.status !== "declined")
      .map(communityAppToDemande);
  }, [portalApps, localDemandes]);
```

`localDemandes` est initialisé avec la constante `DEMANDES` (`src/components/residence-console/ResidenceConsole.tsx:360`, `src/data/residence-console.ts:69`), qui contient des personnes inventées avec un niveau de détail clinique : *« Marguerite Lévesque, 84 ans, 1840 rue des Érables, Québec, semi-autonome, aide à la toilette et médication, 3 200 $/mois »*. Le tableau de bord ajoute un entonnoir inventé (`142 reçues → 34 admissions confirmées`, `src/data/residence-console.ts:323-328`) et une messagerie pré-remplie de deux messages fictifs (`ResidenceConsole.tsx:366-381`).

La condition se déclenche dans deux cas très ordinaires : une résidence réelle qui n'a encore reçu aucune demande, et un compte sans rattachement de site — car le magasin met alors l'espace de travail à `null` (`src/lib/community-portal-store.tsx:224-230`) sans que la page ne pose de garde (`src/app/community/(portal)/dashboard/page.tsx:22-30`).

**Impact.** Double. D'abord la crédibilité : une résidence à qui l'on fait une démonstration voit des dossiers de résidents qui ne sont pas les siens et ne comprend pas s'ils sont réels. Ensuite l'exploitation : il devient impossible de distinguer « aucune demande » de « les demandes ne se chargent pas », y compris pour nous.

**Correction attendue.** Supprimer le repli de démonstration du chemin produit et le remplacer par deux états distincts et explicites : **espace non rattaché** (avec le chemin de résolution : rattachement par invitation ou par l'opérateur) et **aucune demande pour l'instant** (état vide légitime). Les constantes de maquette peuvent rester pour les tests visuels, mais ne doivent plus être importées par le composant de production.

**Critère de vérification.** Un test qui monte la console avec un espace de travail vide et vérifie qu'aucun nom de la maquette n'apparaît dans le rendu.

---

### 4.5 B5 — Les décisions de la résidence n'atteignent jamais la famille

**Constat.** Le circuit de retour est construit d'un seul côté.

- La résidence change un statut → `POST /api/admissions/[id]/status` → écrit dans le magasin serveur avec événements et audit.
- Côté famille, l'API de lecture existe : `apiListFamilyAdmissions()` (`src/lib/admissions/client-api.ts:62`), servie par `GET /api/admissions/family`.
- **Aucun appelant.** Une recherche sur l'ensemble de `src/` ne renvoie que la définition de la fonction. L'UI famille ne relit jamais le serveur.

L'écran « Mes demandes » affiche donc l'objet produit localement au moment de l'envoi, figé à son état initial (`src/components/family-space/FamilySpace.tsx`, vue `demandes`). Symétriquement, l'envoi vers le serveur est en tir-et-oubli : `void apiSubmitAdmission(input)` sans traitement d'échec (`src/lib/family-data.tsx:338`) — si la publication échoue, la famille voit sa demande « envoyée » et la résidence ne la reçoit jamais.

**Impact.** La proposition de valeur du produit est « envoyez une fois, suivez les réponses ». La seconde moitié n'existe pas. Aucun canal de retour ne fonctionne : ni la relecture serveur, ni les notifications in-app (magasin `localStorage` qui démarre vide, jamais alimenté par une décision), ni le courriel (§6.1), ni la messagerie (le bouton « écrire à la résidence » ouvre la FAQ, `FamilySpace.tsx:1017-1018`).

**Correction attendue.** Faire de `GET /api/admissions/family` la source de vérité de l'écran « Mes demandes » : lecture au montage, relecture au retour d'onglet (la console fait déjà exactement cela pour le staff, `src/lib/community-portal-store.tsx:277-297` — reprendre ce motif plutôt que d'en inventer un autre). Rendre l'échec de `publishToServer` visible. Ensuite seulement, brancher les notifications sur les transitions de statut.

**Critère de vérification.** Un parcours e2e à deux contextes : la famille envoie, le staff accepte, la famille recharge et voit « Acceptée » — sans intervention manuelle et sans partage de `localStorage`.

---

## 5. Défauts majeurs (après les blocages)

### 5.1 Aucun chemin d'embarquement pour une résidence

Créer un compte `facility` ne rattache à aucun site. Le rattachement n'existe que par `POST /api/staff/bootstrap` (jeton opérateur), `POST /api/staff/invitations/accept`, ou le seed de développement. Sans membership, la garde serveur refuse : « No residence is linked to this account. » (`src/lib/security/guards.ts:127-131`).

Par ailleurs le discours et le code se contredisent : l'inscription promet une vérification (« nous vérifions votre résidence sous un jour ouvrable ») alors que le code pose `communityStatus: "verified"` immédiatement (`src/lib/auth-store.ts:332`). Il faut trancher : soit la vérification est réelle et l'écran `/community/pending` sert, soit la promesse disparaît.

### 5.2 Le multi-site n'est pas implémenté

Le serveur renvoie l'ensemble des `siteIds` et des rôles par site, et l'API accepte un paramètre `?siteId=`. La console n'en lit qu'un seul :

```224:230:src/lib/community-portal-store.tsx
      const residenceId = siteIds[0];
      if (!residenceId) {
        // No membership, no workspace. Nothing is inferred from the address.
        setWorkspace(null);
        setReady(true);
        return;
      }
```

Un groupe de résidences — le client B2B qui a le plus de valeur — ne voit qu'un site, sans sélecteur ni indication que les autres existent.

### 5.3 La fiche publique et la pause des admissions ne sortent pas du navigateur

Le profil, la disponibilité, la tarification et l'indicateur « accepte les candidatures » sont écrits dans `haven-community-portal-v10`, dans le `localStorage` du poste du staff (`src/lib/community-portal.ts:487`). Côté famille, la lecture interroge la même clé locale et **retourne `true` par défaut quand elle est absente** (`src/lib/community-portal.ts:493-507`, `src/lib/use-residence-accepting.ts:10-29`).

Conséquence concrète : une résidence qui ferme ses admissions continue de recevoir des candidatures, parce qu'aucune famille — sur un autre appareil — ne lira jamais ce drapeau. Toute la gestion de fiche est un formulaire sans destinataire.

### 5.4 L'invitation d'équipe de l'UI n'est pas l'invitation d'équipe de l'API

`CommunityTeamManager` ajoute une ligne locale et affiche « Invitation envoyée » ; il n'appelle pas `POST /api/staff/invitations`, qui est pourtant implémentée, à usage unique et auditée. Le collègue n'est jamais invité et le rattachement n'a pas lieu.

### 5.5 Deux consoles B2B parallèles

`/community/dashboard` (`ResidenceConsole`) et `/community/applications` (`CommunityApplicationsList` / `CommunityApplicationDetail`) sont deux interfaces d'admission distinctes, avec des filtres, des mises en page et des profondeurs fonctionnelles différentes. Le tableau de bord ne renvoie jamais vers le détail riche. La navigation d'en-tête pointe vers l'une, l'autre n'est atteignable qu'en connaissant l'URL. Il faut choisir laquelle est le produit.

### 5.6 Les pièces jointes ne sont pas consultables par le staff

Le contrat serveur ne transmet que les métadonnées (`src/lib/admissions/types.ts:76-77`) et le bouton *Open* du détail est désactivé (`CommunityApplicationDetail.tsx:1119-1125`). Une résidence ne peut donc pas lire l'évaluation médicale qu'on lui demande d'évaluer. C'est une décision d'architecture à assumer (avec URLs signées et journal d'accès, comme le prévoit déjà le modèle de données) ou à corriger.

---

## 6. Défauts transverses

### 6.1 Aucune sortie transactionnelle n'existe

Aucun transport courriel ou SMS n'est présent dans les dépendances (`package.json:17-27` — pas de Resend, SendGrid, Nodemailer, Twilio). Les conséquences se propagent partout :

| Événement | Attendu | Réel |
| --- | --- | --- |
| Réinitialisation de mot de passe | courriel avec jeton | jeton créé, jamais envoyé |
| Invitation d'un collègue | courriel à l'invité | jeton lisible uniquement par l'opérateur |
| Vérification d'adresse | courriel de confirmation | contournement opérateur ou admin Supabase |
| Candidature reçue | avis à la résidence | rien |
| Décision d'admission | avis à la famille | lignes d'audit « courriel envoyé », sans envoi (`community-portal-store.tsx:567-587`) |

Une table `outbox_events` et une fonction `enqueue_outbox()` existent dans les migrations (`supabase/migrations/0005_integrations_ai_audit.sql:161`) mais **aucun code applicatif ne les lit ni ne les écrit**. La fondation est posée, le producteur et le consommateur manquent.

Sans courriel, un utilisateur qui oublie son mot de passe est définitivement dehors, et une invitation ne peut pas être délivrée sans intervention manuelle d'un opérateur.

### 6.2 Le stockage navigateur porte encore des données métier

Au-delà de B1 et de §5.3 :

| Clé | Contenu | Équivalent serveur | Perte si changement d'appareil |
| --- | --- | --- | --- |
| `haven-messages-v1` | tous les fils de messages | aucun | intégrale |
| `haven-notif-tasks-v1-{email}` | notifications et tâches | aucun | intégrale |
| `haven-households-v1` | foyers, invitations, commentaires | aucun | intégrale |
| `haven-community-portal-v10` | profil, équipe, disponibilité B2B | partiel (demandes seulement) | intégrale hors demandes |
| `haven-public-ref-seq-v1` | séquence des références `HA-*` | aucun | **collisions de références entre appareils** |
| `haven-privacy-v1-{email}` | consentements, journal d'accès | partiel | quasi intégrale |

La dernière ligne mérite une attention particulière : les références métier `HA-A-…` sont l'identifiant que la famille et la résidence sont censées citer au téléphone. Une séquence par navigateur ne peut pas garantir l'unicité.

### 6.3 Les erreurs sont silencieuses ou brutales

Trois régimes coexistent, aucun n'est un système :
- **Silence** — une cinquantaine de fichiers avec `catch { /* ignore */ }` ; `fetch` renvoyant `null` en cas d'échec réseau (`src/lib/admissions/client-api.ts:39-40`) ; l'abandon muet de B2.
- **`window.alert`** — 8 occurrences, y compris sur l'échec de téléversement de document et l'échec d'invitation.
- **Bannières locales** — propres à quelques composants, non réutilisables.

Il n'y a **aucun `error.tsx`, `global-error.tsx`, `loading.tsx` ni `not-found.tsx`** dans tout `src/app/`. Une exception de rendu (B3, par exemple) produit donc l'écran d'erreur brut de Next.js.

### 6.4 Poids client

Le plus gros fragment JavaScript pèse **1,77 Mo**, dominé par le catalogue RPA de **1,63 Mo** importé statiquement dans un composant client (`ResidencesPage.tsx` → `family-space.ts:712` → `rpa-quebec.ts`). Les 1 328 résidences du Québec sont téléchargées intégralement par chaque famille pour en consulter 24 par page. La recherche et la pagination devraient se faire côté serveur, ou sur un index réduit.

### 6.5 Internationalisation à deux vitesses

Le mécanisme est maison (`src/lib/i18n/locale.tsx`), avec environ 2 549 clés. La couverture est bonne sur la landing et le portail famille, et **nettement moins bonne côté B2B et professionnel** : les cartes de rôles de `/get-started` sont intégralement en anglais en dur (`src/app/get-started/page.tsx:41-63`), tout comme des libellés de décision d'admission (`CommunityApplicationDetail.tsx:324-336`), les filtres de la liste de demandes, et des `aria-label` (`ResidenceCard.tsx:95`). Pour un produit québécois vendu à des RPA francophones, l'écran d'inscription en anglais est un problème commercial, pas seulement un défaut de finition.

### 6.6 Accessibilité

Points positifs réels : jetons de contraste documentés (`globals.css:8-17`), `role="dialog"` et `aria-modal` sur la galerie, `role="switch"` correctement porté dans la console. Défauts concrets : `alt` vide sur des photos porteuses de sens (`ProfilePhotoPicker.tsx:55,126`, `CommunityDetail.tsx:907`), absence de piège de focus dans les modales, libellés d'accessibilité en anglais quand la locale est française.

### 6.7 Qualité de code

45 erreurs ESLint, très majoritairement `react-hooks/set-state-in-effect` — un motif qui produit des rendus superflus et, dans les magasins, des boucles de synchronisation difficiles à suivre. TypeScript est propre.

---

## 7. Ce qui est sain et doit être préservé

Il serait faux de conclure que la base est mauvaise. Sont solides et ne doivent pas être touchés sans raison :

- **La couche d'autorisation serveur** issue de la PR #106 : gardes centralisées, sessions `httpOnly`, CSRF, limitation de débit, invitations à usage unique, journal d'audit. Elle est testée et elle tient.
- **Le catalogue RPA du Québec** ancré sur le numéro de registre MSSS : c'est un actif différenciant.
- **Le dossier famille** : découpage en 9 sections, complétude pondérée, sauvegarde serveur débouncée. Le meilleur morceau du produit.
- **La machine d'états d'admission** et son journal d'audit côté console.
- **Les références métier `HA-*`** (personne, dossier, demande, lot) — le concept est juste, seule la séquence doit passer côté serveur.
- **La suite de tests serveur** : 93 tests verts, dont l'isolation locative et la couverture des routes.

---

## 8. Plan d'exécution pour Claude

### 8.1 Règles de travail

1. **Lire `AGENTS.md` avant toute chose.** Cette version de Next.js diverge des habitudes ; consulter `node_modules/next/dist/docs/` pour toute API concernée.
2. **Un lot = une PR.** Les lots sont ordonnés par dépendance, pas par confort.
3. **Aucun changement visuel** (CSS, Tailwind, thème, typographie, espacement, assets, comportement responsive) sauf mention explicite dans le lot. Le chantier mobile reste gelé.
4. **Ne pas commencer les courriels transactionnels avant le lot 4**, conformément à la séquence déjà arrêtée.
5. **Tenir compte de la PR #107** (parité Supabase et RLS) : elle modifie la plomberie d'identité. Se rebaser dessus avant de toucher au lot 0 si elle est fusionnée entre-temps.
6. **Chaque lot ajoute le test qui aurait attrapé le défaut.** Un correctif sans test de non-régression ne compte pas comme terminé — c'est exactement ainsi que B1 est passé.

### 8.2 Séquence

| Lot | Objet | Corrige | Portée |
| --- | --- | --- | --- |
| **0** | **Fermer la boucle d'inscription** — router `signUp` vers `/api/auth/register`, établir la session par le chemin serveur, retirer `haven-accounts-v1` / `haven-auth` du chemin produit, gérer le cas « vérification requise ». | B1 | `src/lib/auth.tsx`, `src/lib/auth-store.ts`, `src/lib/family/client-api.ts`, `/get-started` |
| **1** | **Rendre l'envoi possible** — échec bruyant sur le chemin d'envoi, unification sur le catalogue RPA, accord avec `site-registry`, retrait du catalogue de démonstration du chemin produit. | B2 | `fr-portal-dynamic.ts`, `FamilySpace.tsx`, `data/residences.ts`, `site-registry.ts` |
| **2** | **Console résidence exploitable** — vocabulaire de rôles unique, `communityRoleHas` total, suppression du repli de démonstration, états vides explicites (non rattaché / aucune demande). | B3, B4 | `community-portal.ts`, `community-portal-store.tsx`, `ResidenceConsole.tsx` |
| **3** | **Refermer la boucle famille ↔ résidence** — « Mes demandes » lit `GET /api/admissions/family` au montage et au retour d'onglet, échec de publication visible, notifications in-app alimentées par les transitions de statut, bouton « écrire à la résidence » branché sur la messagerie ou retiré. | B5 | `family-data.tsx`, `FamilySpace.tsx`, `admissions/client-api.ts` |
| **4** | **Sorties transactionnelles** — transport courriel, producteur et consommateur d'`outbox_events`, gabarits FR/EN pour : vérification, réinitialisation, invitation staff, candidature reçue, décision. | §6.1 | nouveau module + migrations existantes |
| **5** | **Embarquement et périmètre B2B** — rattachement de site depuis le produit (invitation réelle depuis l'UI équipe), sélecteur multi-site, cohérence entre la promesse de vérification et `communityStatus`. | §5.1, §5.2, §5.4 | `CommunityTeamManager.tsx`, `community-portal-store.tsx`, `/get-started` |
| **6** | **Fiche résidence côté serveur** — profil, disponibilité, tarification et pause des admissions persistés côté serveur et lus par le catalogue famille. | §5.3 | `community-portal.ts`, nouvelles routes API |
| **7** | **Robustesse et poids** — `error.tsx` / `not-found.tsx` / `loading.tsx`, remplacement des `alert` et des `catch` muets par un mécanisme unique, chargement du catalogue RPA côté serveur avec pagination. | §6.3, §6.4 | transverse |
| **8** | **Finition FR** — traduction des poches anglaises B2B et professionnelles, `aria-label` localisés, nettoyage des routes obsolètes et du code mort (`DossierWizard`, `CommunityDashboard`, `/admin`). | §6.5, §6.6 | transverse |

### 8.3 Critères de sortie

Le logiciel est « utilisable » quand ces six affirmations sont vraies **et couvertes par un test automatisé** :

1. Une famille crée un compte depuis l'UI, se déconnecte, se reconnecte et retrouve son dossier.
2. Une famille envoie une candidature à une résidence du registre québécois et la voit dans « Mes demandes ».
3. Une résidence reçoit cette candidature dans sa console, quel que soit le rôle staff parmi les quatre.
4. La résidence décide, et la famille voit la décision depuis un autre appareil, sans intervention manuelle.
5. Une résidence sans demande voit un état vide honnête, jamais un dossier inventé.
6. `npm run build`, `npm run lint`, `npm test` et `npm run test:e2e` sont verts.

---

## Annexe A — Reproduire les preuves

Les trois sondes ci-dessous ont été exécutées puis supprimées. Elles sont reproductibles telles quelles.

**A.1 — B2, envoi impossible vers le catalogue RPA** (`src/lib/__proof.test.ts`, puis `npx vitest run`) :

```ts
import { buildSubmitDraft } from "@/lib/fr-portal-dynamic";
import { RESIDENCES } from "@/data/rpa-quebec";

const sample = RESIDENCES.slice(0, 200);
const ok = sample.filter((r) =>
  buildSubmitDraft({
    residenceId: r.id,
    residenceName: r.name,
    unit: "Studio",
    userName: "Test",
    userEmail: "t@example.com",
    documentIds: [],
  }) !== null,
);
// attendu aujourd'hui : ok.length === 0 sur 200
```

**A.2 — B3, rôles staff non évaluables** :

```ts
import { communityRoleHas } from "@/lib/community-portal";

for (const role of ["admin", "manager", "coordinator", "readonly"]) {
  // manager et coordinator lèvent TypeError
  communityRoleHas(role as never, "viewDashboard");
}
```

**A.3 — B1, inscription sans compte** (`e2e/__proof-onboarding.spec.ts`, puis `npx playwright test`) : remplir `/get-started`, journaliser les requêtes non-GET vers `/api`, puis interroger `/api/auth/me` et `/api/family/me`, recharger, et retenter la connexion avec les mêmes identifiants.

## Annexe B — Drapeaux de configuration

| Variable | Défaut | Effet |
| --- | --- | --- |
| `NEXT_PUBLIC_DATA_BACKEND` | `local` | `supabase` bascule les dépôts famille et admissions |
| `NEXT_PUBLIC_ADMISSIONS_BACKEND` | non défini = **actif** | `off` coupe la publication serveur des candidatures |
| `HAVEN_SESSION_SECRET` | éphémère en dev, **requis** en production | signe les cookies de session |
| `SITE_ACCESS_PASSWORD` | non défini | portail d'accès de préproduction |
| `HAVEN_BOOTSTRAP_TOKEN` + `HAVEN_OPERATOR_ENDPOINTS` | non définis | ouvrent les routes opérateur (rattachement, lecture de jetons) |
| `NEXT_PUBLIC_AUTH_OPEN_ACCESS` | `false` | désactivé en dur dans le code |

Le commentaire de `src/lib/admissions/config.ts:8` mentionne `HAVEN_ADMISSIONS_BACKEND` alors que le code lit `NEXT_PUBLIC_ADMISSIONS_BACKEND` — à corriger au passage.

## Annexe C — Documents liés

| Document | Contenu |
| --- | --- |
| [AUDIT_ORGANISATION_IDENTITES.md](./AUDIT_ORGANISATION_IDENTITES.md) | Références métier `HA-*`, cardinalités, conflits d'identité |
| [DATA_MODEL.md](./DATA_MODEL.md) | Schéma canonique Supabase |
| [RLS_MATRIX.md](./RLS_MATRIX.md) | Droits de lecture et d'écriture |
| [BACKEND.md](./BACKEND.md) | Edge Functions, outbox, Realtime |
| [FAMILY_B2C_PERSISTENCE.md](./FAMILY_B2C_PERSISTENCE.md) | Persistance du dossier famille |

## Annexe D — Historique

| Date | Base | Changement |
| --- | --- | --- |
| 2026-09-07 | `main` @ `477a486` | Création — audit d'utilisabilité B2C / B2B, 5 blocages prouvés par exécution |
