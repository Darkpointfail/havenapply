# HavenApply — Audit technique & architecture d’organisation

**Document :** trace d’organisation (résidences · clients · dossiers · demandes)  
**Public :** produit / technique / Notion  
**Statut :** référence de conception (pas encore entièrement implémentée)  
**Date :** 2026-08-31  
**Périmètre :** Québec B2C (familles) + console résidence B2B  
**Langue du document :** français  

> Objectif : anticiper les conflits d’identité (multi-proches, multi-résidences, sync local/Supabase) **avant** de coder.  
> Ce document décrit (1) l’état actuel constaté, (2) l’architecture cible recommandée, (3) les règles anti-conflit.

---

## 1. Résumé exécutif

HavenApply orchestre trois flux :

1. **Famille** construit / complète un **dossier** pour une **personne aînée**
2. **Famille** **envoie** ce dossier à une ou plusieurs **résidences**
3. **Résidence** reçoit, suit et décide sur chaque **demande**

### Décision d’architecture (à figer)

| Entité | ID technique | Référence métier (humaine) | Obligatoire |
| --- | --- | --- | --- |
| Compte / profil utilisateur | UUID | `HA-U-#####` (support) | UUID oui · réf optionnelle |
| Famille (foyer) | UUID | `HA-F-#####` | UUID oui · réf optionnelle |
| Personne aînée (sujet) | UUID | `HA-P-#####` | **Les deux** |
| Dossier d’admission | UUID | `HA-D-AAAA-#####` | **Les deux** |
| Demande envoyée | UUID | `HA-A-AAAA-#####` | **Les deux** |
| Résidence / établissement | UUID | MSSS / RPA (`1428`) + `RPA-1428` | **Les deux** |
| Document | UUID | — (pas de numéro public) | UUID seulement |
| Lot multi-envoi | UUID | `HA-B-AAAA-#####` | UUID oui · réf utile |

**Règle d’or :** on envoie une **Demande** (`HA-A-…`), pas « le compte Tom ».  
Le **Dossier** (`HA-D-…`) est la source réutilisable ; la Demande est l’instantané adressé à **une** résidence.

---

## 2. Glossaire (vocabulaire figé)

| Terme | Définition | Ce que ce n’est pas |
| --- | --- | --- |
| **Utilisateur** | Personne qui se connecte (aidant, staff) | La personne aînée |
| **Famille** | Compte foyer / espace collaboratif | Un dossier |
| **Personne (P)** | Aîné / résident potentiel, sujet des soins | Le compte aidant |
| **Dossier (D)** | Paquet d’admission (identité, soins, docs, consentements) | Une demande envoyée |
| **Demande (A)** | Envoi du dossier vers **une** résidence, avec statut de suivi | Le dossier entier |
| **Résidence (R)** | Établissement (RPA, CHSLD, etc.) | L’organisation multi-sites |
| **Organisation** | Groupe / bannière propriétaire de plusieurs résidences | Une fiche établissement |
| **Lot (B)** | Groupe de demandes créées en un clic multi-envoi | Une seule demande |

---

## 3. Architecture cible (organisation)

### 3.1 Schéma conceptuel

```text
Utilisateur (U)
  └─ Famille (F)
       ├─ Membres (rôles : propriétaire, éditeur, lecteur)
       └─ Personne aînée (P) × N
            └─ Dossier (D) × N dans le temps
                 ├─ Contenu (profil, soins, légal, budget…)
                 ├─ Documents (références Storage)
                 └─ Demande (A) × N
                      └─ Résidence (R)
                           └─ Timeline / messages / décision
```

### 3.2 Couches d’identité (anti-conflit)

```text
┌─────────────────────────────────────────────────────────┐
│  Référence métier (affichée, support, PDF, téléphone)   │
│  HA-P-00217 · HA-D-2026-00482 · HA-A-2026-01903         │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│  ID technique (jointures DB, jamais collé à la main)    │
│  uuid · uuid · uuid                                     │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│  Identifiants externes (ponts)                          │
│  MSSS/RPA ref · legacy slug · id fournisseur CRM        │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Format des références métier

| Type | Format | Exemple | Notes |
| --- | --- | --- | --- |
| Personne | `HA-P-{SEQ}` | `HA-P-00217` | Séquence globale |
| Dossier | `HA-D-{AAAA}-{SEQ}` | `HA-D-2026-00482` | Reset possible par année |
| Demande | `HA-A-{AAAA}-{SEQ}` | `HA-A-2026-01903` | Visible famille **et** résidence |
| Lot | `HA-B-{AAAA}-{SEQ}` | `HA-B-2026-00044` | Relie plusieurs `HA-A` |
| Famille | `HA-F-{SEQ}` | `HA-F-00841` | Support |
| Résidence | `RPA-{MSSS}` | `RPA-1428` | Aligné registre Québec |

**Interdits :**
- réutiliser un numéro
- utiliser `Date.now()` comme identité durable
- numéroter les étapes du wizard (`1`, `2`, `3`) comme IDs globaux (ce sont des **codes d’étape** : `identity`, `contacts`, `care`…)

### 3.4 Cardinalités & contraintes

| Relation | Cardinalité | Contrainte |
| --- | --- | --- |
| Famille → Personnes | 1 → N | Au moins une personne active possible |
| Personne → Dossiers | 1 → N | Nouveau dossier si réadmission / transfert / nouveau besoin |
| Dossier → Demandes | 1 → N | Une demande = une résidence |
| Demande active | — | **Unique** `(dossier_id, residence_id)` tant que non retirée / non terminée |
| Multi-envoi | 1 lot → N demandes | Chaque résidence garde son `HA-A` |
| Organisation → Résidences | 1 → N | Staff org peut voir plusieurs sites |

### 3.5 Statuts (séparés volontairement)

**Dossier**
- `draft` — brouillon
- `ready` — assez complet pour envoyer
- `archived` — historique

**Demande**
- `draft` / `submitted` / `in_review` / `info_requested`
- `waitlist` / `visit_proposed` / `accepted` / `declined` / `withdrawn`

Ne jamais mélanger « dossier incomplet » et « demande refusée » dans le même enum.

### 3.6 Snapshot à l’envoi

Quand une Demande passe à `submitted` :

1. Figer une **version** du dossier (JSON versionné ou `dossier_version_id`)
2. Attacher la liste des documents **tels qu’envoyés**
3. La résidence lit le snapshot, pas le brouillon vivant

Sinon : conflit classique « la famille modifie après envoi ».

---

## 4. Audit de l’existant (constat code / données)

### 4.1 Ce qui existe déjà

| Domaine | État actuel | Format d’ID |
| --- | --- | --- |
| Auth utilisateur | Supabase `profiles.id` ou local `acc_…` | UUID / opaque |
| Famille | `families` + store local `fam_…` | UUID / opaque |
| Senior / personne | `seniors` + local `snr_…` ; UI souvent `p-senior` | UUID / opaque |
| Contenu dossier | Souvent **embarqué** sur le senior (`dossier_json`) | Pas d’ID dossier dédié |
| Demandes (runtime B2C) | `app-{residenceId}-{timestamp}-{rand}` | String volatile |
| Demandes (schéma DB) | `applications` UUID + FKs famille/senior/community | UUID |
| Résidences Québec | Catalogue `rpa-{ref}` (ex. `rpa-1428`) | Ref MSSS |
| Communautés DB | `communities.id` UUID | **Non aligné** sur `rpa-*` |
| Documents | UUID / `doc_…` + Storage | Opaque |

### 4.2 Relations réelles aujourd’hui

```text
User
  └─ FamilyAccount
       └─ Senior[]          ← UI traite souvent seniors[0] comme « le » dossier
            ├─ profil + soins + dossier embarqué
            ├─ documents
            └─ Applications (runtime) → residenceId = rpa-* | slug
                 ⚠ seniorId souvent absent côté objet UI
                 ⚠ communities.id UUID ≠ rpa-*
```

### 4.3 Écarts / risques de conflit (priorisés)

| # | Risque | Impact | Sévérité |
| --- | --- | --- | --- |
| R1 | Trois mondes d’ID résidence (`rpa-*`, slug US, UUID DB) sans table pont | Doublons, sync B2B cassée | **Critique** |
| R2 | Demande runtime sans `senior_id` / `dossier_id` stables | Multi-proches = collision | **Critique** |
| R3 | Pas de référence métier `HA-A` / `HA-D` | Support & résidence ne peuvent pas citer un numéro | Élevé |
| R4 | Dossier non versionné à l’envoi | Divergence famille ↔ résidence | Élevé |
| R5 | Dual store (local vs Supabase) ; persist applications partiel | Pertes / divergences | Élevé |
| R6 | UI « un seul dossier » vs modèle multi-seniors | Bloque multi-proches propre | Moyen |
| R7 | Unicité DB `(senior, community)` non appliquée au flux B2C live | Doubles envois | Moyen |

### 4.4 Ce qui est déjà sain à conserver

- Séparation domaines famille / org / admissions (docs `DATA_MODEL.md`)
- UUID comme PK technique
- Documents via Storage + URLs signées (pas d’URL publique durable)
- Intention multi-envoi via `batch_id`
- Catalogue RPA Québec ancré sur le numéro de registre MSSS

---

## 5. Modèle cible détaillé (entités)

### 5.1 Personne (`HA-P`)

**Contient :** identité, dates, langue, liens familiaux  
**Ne contient pas :** statut d’une demande résidence  

### 5.2 Dossier (`HA-D`)

**Contient :**  
- sections (qui, identité, contacts, légal, assurances, finances, autonomie, recherche, consentement)  
- score de complétude  
- documents liés  
- version courante  

**Cycle de vie :** `draft` → `ready` → (toujours éditable) → `archived`

### 5.3 Demande (`HA-A`)

**Contient :**  
- `dossier_id`, `personne_id`, `famille_id`, `residence_id`  
- `batch_id` optionnel  
- `dossier_version_id` (snapshot)  
- statut + timeline  

**Affichage :** famille *et* console résidence voient le même `HA-A-…`

### 5.4 Résidence (`RPA-####` + UUID)

Table pont recommandée :

| Colonne | Rôle |
| --- | --- |
| `id` (UUID) | PK interne |
| `public_code` | `RPA-1428` |
| `msss_ref` | `1428` |
| `legacy_slug` | anciens slugs démo |
| `organization_id` | multi-sites |

### 5.5 Documents

| Colonne | Rôle |
| --- | --- |
| `id` UUID | PK |
| `personne_id` / `dossier_id` | appartenance |
| `category` | id, ramq, bilan, meds… |
| `storage_path` | chemin bucket |
| `sha256` | anti-doublon / intégrité |
| `visibility` | famille / envoyé / résidence |

Pas de numéro public sauf besoin d’impression.

---

## 6. Flux métier (comment ça s’organise au quotidien)

### 6.1 Famille

1. Créer / rejoindre une **Famille**
2. Créer une **Personne** (`HA-P`)
3. Remplir le **Dossier** (`HA-D`) + documents
4. Choisir des résidences
5. Envoyer → crée N **Demandes** (`HA-A`) + 1 **Lot** si multi
6. Suivre chaque `HA-A` (statut, messages, visite)

### 6.2 Résidence

1. Inbox des `HA-A` entrantes
2. Ouvrir le snapshot dossier + pièces
3. Actions : demander info / liste d’attente / visite / accepter / refuser
4. Toute action écrit une entrée timeline liée à `HA-A`

### 6.3 Support HavenApply

Recherche par :
- `HA-A-…` (le plus fréquent)
- `HA-D-…` / `HA-P-…`
- `RPA-####`
- courriel compte

---

## 7. Matrice « que numéroter ? »

| Élément | Numéro public ? | Pourquoi |
| --- | --- | --- |
| Étapes wizard | Non | Codes internes (`identity`, …) |
| Sections complétude | Non | Idem |
| Personne | Oui (`HA-P`) | Multi-proches, fusion, support |
| Dossier | Oui (`HA-D`) | Réadmission, historique |
| Demande | Oui (`HA-A`) | Suivi partagé famille ↔ résidence |
| Lot multi-envoi | Oui (`HA-B`) | « J’ai envoyé à 6 résidences ce jour-là » |
| Document | Non | UUID + type |
| Message | Non | UUID |
| Résidence | Oui (MSSS / RPA) | Alignement registre Québec |

---

## 8. Plan d’adoption (sans précipiter le code)

### Phase A — Décisions (maintenant)
- [x] Figer glossaire P / D / A / R / B  
- [x] Figer formats `HA-*` et `RPA-*`  
- [ ] Valider ce que la résidence voit en priorité (`HA-A` obligatoire)

### Phase B — Fondations données
- [ ] Table pont résidences (`uuid` ↔ `msss_ref` ↔ `legacy_slug`)  
- [ ] Colonne `public_ref` sur personnes / dossiers / demandes  
- [ ] Toujours persister `senior_id` + `dossier_id` sur chaque demande  
- [ ] Contrainte unique demande active `(dossier_id, residence_id)`

### Phase C — Produit
- [ ] Afficher `HA-A` dans Accueil famille + console résidence  
- [ ] Snapshot dossier à `submitted`  
- [ ] Support : recherche par référence métier

### Phase D — Durcissement
- [ ] Fusion de personnes / familles doublons  
- [ ] Multi-dossiers par personne (réadmission)  
- [ ] Audit log immuable par `HA-A`

---

## 9. Décisions ouvertes (à trancher)

1. **Séquence** : globale vs par année pour `HA-P` (recommandé : globale pour P/F, annuelle pour D/A/B)  
2. **Visibilité résidence** : voit-elle `HA-P` / `HA-D` ou seulement `HA-A` + nom ?  
3. **Réadmission** : nouveau `HA-D` ou réouverture du même dossier ? (recommandé : **nouveau dossier**, lien `supersedes_dossier_id`)  
4. **CHSLD / RI hors RPA** : préfixe `ETS-` ou namespace unique `HA-R-` ?  
5. **Environnements** : préfixe `HA-` identique en staging avec range de numéros séparé, ou `HA-TEST-` ?

---

## 10. Liens vers la doc architecture existante

| Doc | Contenu |
| --- | --- |
| [README architecture](./README.md) | Index |
| [DATA_MODEL.md](./DATA_MODEL.md) | Schéma canonique Supabase / ERD |
| [BACKEND.md](./BACKEND.md) | Edge Functions, outbox, Realtime |
| [RLS_MATRIX.md](./RLS_MATRIX.md) | Droits lecture / écriture |
| [MIGRATION_FROM_PROTOTYPE.md](./MIGRATION_FROM_PROTOTYPE.md) | localStorage → Supabase |

Ce document **complète** (et ne remplace pas) `DATA_MODEL.md` : il ajoute la couche **références métier Québec / suivi opérationnel** et l’audit des écarts du prototype actuel.

---

## 11. Annexe — Exemple concret

**Tom** aide sa mère **Marguerite**.

| Entité | Réf |
| --- | --- |
| Compte Tom | UUID + `HA-U-…` (support) |
| Famille | `HA-F-00841` |
| Marguerite | `HA-P-00217` |
| Dossier admission 2026 | `HA-D-2026-00482` |
| Envoi à La Cathédrale (`RPA-1428`) | `HA-A-2026-01903` |
| Envoi à une 2ᵉ résidence (même lot) | `HA-A-2026-01904` |
| Lot | `HA-B-2026-00044` |

Au téléphone :  
« Bonjour, je vous appelle pour la demande **HA-A-2026-01903**. »

---

## 12. Historique du document

| Date | Auteur | Changement |
| --- | --- | --- |
| 2026-08-31 | Architecture produit/tech | Création audit + architecture d’organisation (Notion) |
