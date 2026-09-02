# Import et vérification des données de résidences

Cette procédure décrit comment importer des données de résidences dans HavenApply
sans jamais traiter une donnée importée comme vérifiée sans provenance explicite.

## Principes

1. **Organisation ≠ site** — l’entité exploitante (`ResidenceOrganization`) est distincte
   du site physique (`ResidenceSite`).
2. **Vide = inconnu** — une valeur absente ou `null` signifie « inconnue », jamais
   « non offert ».
3. **Pas d’invention** — ne jamais inventer prix, disponibilité, services ou équipements.
4. **Provenance obligatoire** pour chaque fait important (`servicesFact`, `unitsFact`,
   `pricingFact`, `availabilityFact`, `autonomyFact`, `photosFact`) :
   - `source` : `GOVERNMENT` | `FACILITY` | `EDITORIAL` | `UNKNOWN`
   - `collectedAt`, `verifiedAt`, `method`, `confidence` (`HIGH`|`MEDIUM`|`LOW`|`UNKNOWN`)
5. **Photos** — uniquement URLs fournies / autorisées par l’établissement (`source: FACILITY`).
   Interdit : scraping Google, sites concurrents, banques d’images non licenciées.
6. **Import ≠ vérification** — un import gouvernemental arrive en `DRAFT` ou
   `PENDING_VERIFICATION` avec `confidence` appropriée. Seul un admin peut passer
   à `VERIFIED` puis `ACTIVE`.

## États du site

```
DRAFT → PENDING_VERIFICATION → VERIFIED → ACTIVE → SUSPENDED → ARCHIVED
```

- Seuls les sites `ACTIVE` (org active + vérifiée) sont publics.
- `VERIFIED` n’active pas automatiquement la publication.
- Activation, suspension et modifications sensibles sont auditées
  (`SiteChangeHistory` + `AuditLog`).

## Doublons

- Blocage à la création si `rlsNumber` déjà utilisé.
- Rapprochement adresse (`addressLine1` + `city`) suggère des candidats.
- Marquage soft : `duplicateOfSiteId` + statut `ARCHIVED` — **pas de suppression
  destructive automatique**.

## Procédure d’import (CSV / JSON)

### 1. Préparer le fichier

Colonnes minimales site :

| Champ | Obligatoire | Notes |
|-------|-------------|--------|
| `organizationSlug` | oui | doit exister ou être créé avant |
| `name` | oui | |
| `slug` | non | généré si absent |
| `addressLine1`, `city`, `region`, `postalCode` | non | vide = inconnu |
| `rlsNumber` | non | identifiant officiel QC |
| `officialCategories` | non | JSON array, ex. `["RPA"]` |
| `phone`, `email`, `website` | non | |
| `source` | oui | `GOVERNMENT` pour import MSSS/RLS |
| `collectedAt` | oui | ISO-8601 |
| `verificationMethod` | oui | ex. `gov_csv_2026-03` |

Ne pas inclure de prix/services/disponibilité sauf si la source les contient
**explicitement** avec date et méthode.

### 2. Créer / rattacher l’organisation

Via console `/admin/organizations` ou seed. Marquer `isVerified` seulement après
contrôle KYC / registre.

### 3. Importer en DRAFT

Script type (à exécuter en environnement contrôlé) :

```ts
// Exemple conceptuel — adapter au pipeline CI
await createSite({
  role: "ADMIN",
  actorUserId: adminId,
  fields: {
    organizationId,
    name: row.name,
    slug: row.slug,
    city: row.city || null,
    region: row.region || null,
    addressLine1: row.addressLine1 || null,
    rlsNumber: row.rlsNumber || null,
    dataSource: "GOVERNMENT",
    confidence: "MEDIUM",
    verificationMethod: "gov_csv_import",
    // Faits absents → null / unknownFact() — jamais "non offert"
    pricingFact: unknownFact(),
    availabilityFact: unknownFact(),
    servicesFact: row.services
      ? governmentFact(row.services, { method: "gov_csv_import" })
      : unknownFact(),
  },
});
```

Le site naît en `DRAFT`. Les slugs stables et redirections sont gérés à la
renommation (`SiteSlugRedirect`).

### 4. Vérification humaine

Checklist admin (`/admin/sites/[id]`) :

- [ ] Identité / RLS / adresse cohérents avec la source
- [ ] Aucun prix ou disponibilité inventé
- [ ] Photos uniquement FACILITY
- [ ] Doublons examinés (RLS / adresse)
- [ ] Transition `DRAFT` → `PENDING_VERIFICATION` → `VERIFIED`
- [ ] Aperçu avant activation
- [ ] Transition `VERIFIED` → `ACTIVE` (publication catalogue)

### 5. Activation

Prérequis : organisation `isActive` + `isVerified`. L’activation écrit
`publishedAt`, l’historique et l’audit.

### 6. Corrections post-publication

- Mise à jour des faits avec nouvelle `verifiedAt` / `method`
- Suspension si données douteuses (`SUSPENDED` retire du catalogue)
- Changement de slug → redirection 301 logique via `SiteSlugRedirect`

## Filtres catalogue public

- Géographie : région / ville
- Budget : **uniquement** si `pricingFact` confirmé (`isConfirmedPricing`)
- Autonomie / services : uniquement faits non `UNKNOWN`/`LOW`
- Pas de fausse disponibilité affichée

## Deep-link candidature

`Faire une demande` émet un `siteClaim` HMAC (`AUTH_SECRET`, TTL 2h).
Après connexion/inscription, le serveur vérifie la signature et que le site
est encore `ACTIVE`. Un `siteId` conflictuel dans le formulaire est ignoré.

## Seed démo

`npm run db:seed` crée l’org `demo-residences` et deux sites ACTIVE avec
provenance `FACILITY` explicite. La disponibilité reste `UNKNOWN` volontairement.
