# HavenApply — Modèle de menace (STRIDE)

**Date :** 2026-08-18  
**Périmètre :** dépôt HavenApply tel qu’observé (prototype client localStorage/IndexedDB + cible Supabase documentée).  
**Méthode :** STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege).  
**Référence architecture :** cartographie audit sécurité / données (runtime défaut = navigateur ; backend Supabase partiel).  
**RPA :** résidence privée pour aînés (portail community / facility).

**Important :** ce document n’affirme pas la conformité (Loi 25, LPRPDE/PIPEDA, HIPAA, FTC HBNR, SOC 2). Les contrôles sont notés **présent**, **partiel**, **absent** ou **non vérifiable**. Aucun secret ni donnée personnelle réelle n’y figure.

### Échelles

| Probabilité | Impact | Niveau de risque |
| --- | --- | --- |
| Faible / Moyenne / Élevée | Faible / Moyen / Élevé / Critique | Faible / Moyen / Élevé / Critique |

**Formule indicative :** risque ≈ max(probabilité, impact) ajusté par l’existence de contrôles sur le **chemin runtime actif**. En mode local actuel, plusieurs menaces sont déjà **Critiques**.

### Légende des actifs

| Actif | Description |
| --- | --- |
| A1 Identité famille | Comptes, sessions, tokens auth famille |
| A2 Identité professionnel | Comptes care professional / hôpital |
| A3 Identité RPA | Comptes staff résidence / org |
| A4 Identité interne | Comptes plateforme internal |
| A5 Dossier résident / PHI | Identité, médical, ADL, finances, SSN, docs, photos |
| A6 Paquet admission | SharedAdmissionPacket famille → RPA |
| A7 Coffre documents | Métadonnées + blobs IndexedDB / buckets prévus |
| A8 Messages | Threads sécurisés simulés |
| A9 Consentements / audit | Ledger consent, timelines, access log |
| A10 API / Edge | Routes Next, signup service-role, Edge Functions prévues |
| A11 Analytics / emails / logs | gtag, brouillons email/SMS, console, outbox prévu |
| A12 Stockage / backups | Storage Supabase, exports, sauvegardes hébergeur |
| A13 Sous-traitants | Supabase, hébergeur front, Google, futurs email/SMS/PSP |
| A14 Intégrité applicative | Dépendances npm, build, config |

---

## Vue STRIDE synthétique

| Catégorie STRIDE | Menaces principales (IDs) |
| --- | --- |
| **S** Spoofing | T-01, T-02, T-05, T-09, T-18 |
| **T** Tampering | T-06, T-07, T-08, T-16, T-17 |
| **R** Repudiation | T-09 (session), T-11 (logs incomplets), T-16 (suppression) |
| **I** Information disclosure | T-03, T-06, T-10, T-11, T-12, T-13, T-15, T-16, T-20 |
| **D** Denial of service | T-18, T-19 |
| **E** Elevation of privilege | T-04, T-14, T-07 (API) |

---

## Menaces détaillées

### T-01 — Prise de contrôle d’un compte familial

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Spoofing, Elevation of privilege |
| **1. Actif touché** | A1, A5, A7, A8, A9 |
| **2. Scénario** | Credential stuffing / force brute sur email+mdp ; vol de `haven-auth` / cookies Supabase sur machine partagée ; reset password faible ; open-access démo ; phishing vers `/auth/callback`. En mode local, la session et le hash vivent dans le navigateur. |
| **3. Probabilité** | Élevée (prototype local + MDP ≥ 8 sans MFA) |
| **4. Impact** | Critique (PHI famille complète, docs, candidatures) |
| **5. Niveau de risque** | **Critique** |
| **6. Contrôle existant** | **Partiel** — auth locale hashée (SHA-256+salt), Supabase Auth possible, gate site, `RequireAuth` UI. MFA **absent**. Isolation multi-utilisateur navigateur **absente**. |
| **7. Correction recommandée** | Auth serveur exclusive ; Argon2/bcrypt côté IdP ; MFA ; lockout / rate limit ; sessions httpOnly Secure ; interdire open-access en prod ; alerte connexion anormale. |
| **8. Test** | Tentatives de brute force bloquées ; session inaccessible via JS ; compte localStorage ne restaure plus PHI après bascule serveur ; MFA obligatoire sur comptes famille de test. |

---

### T-02 — Prise de contrôle d’un compte professionnel

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Spoofing |
| **1. Actif touché** | A2, patients professionnels, candidatures au nom du patient |
| **2. Scénario** | Compromission email professionnel ; MDP faible ; signup metadata `role=professional` sans vérification d’employeur ; réutilisation de session sur poste clinique partagé. |
| **3. Probabilité** | Moyenne à élevée |
| **4. Impact** | Élevé à critique (multi-patients, hôpital) |
| **5. Niveau de risque** | **Critique** |
| **6. Contrôle existant** | **Partiel** — rôle dans metadata / store ; store patients souvent en mémoire. Vérification d’affiliation org **absente**. |
| **7. Correction recommandée** | Invitation org + domaine email ; revue manuelle ; MFA ; timeout session court ; pas de PHI durable hors serveur ; audit accès patient. |
| **8. Test** | Signup spontanе́ sans invite rejeté ; session expire ; accès patient journalisé et limité à l’org. |

---

### T-03 — Accès d’une RPA aux dossiers d’une autre RPA

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Information disclosure, Elevation of privilege |
| **1. Actif touché** | A3, A5, A6, A7 |
| **2. Scénario** | En runtime local, clé `haven-community-portal-v10` / admissions partagées **globales au navigateur** : staff RPA-A lit les dossiers de RPA-B sur le même appareil. Côté cible SQL, IDOR sur `application_id` / `senior_id` si RLS incomplète ou Edge Function mal autorisée. |
| **3. Probabilité** | Élevée (local) ; Moyenne (si Supabase mal configuré) |
| **4. Impact** | Critique (PHI concurrent / autre établissement) |
| **5. Niveau de risque** | **Critique** |
| **6. Contrôle existant** | **Absent** sur path local. RLS org/community **présent** en SQL (`0006_rls_policies.sql`) mais **non vérifiable** en prod. |
| **7. Correction recommandée** | Isolation stricte `organization_id` / `community_id` ; tests RLS négatifs ; jamais de store community global navigateur ; signed URLs scoped. |
| **8. Test** | Deux orgs : JWT RPA-A ne lit aucune row RPA-B (API + Storage) ; suite de tests automatisés matrice RLS. |

---

### T-04 — Élévation de privilèges

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Elevation of privilege |
| **1. Actif touché** | A1–A4, A10 |
| **2. Scénario** | Modification de `role` / `community_status` dans localStorage ou `user_metadata` ; endpoint `/api/auth/sign-up` avec service role créant un facility **verified** ; open-access portails ; UI `RequireAuth` contournée (routes non protégées serveur). |
| **3. Probabilité** | Élevée (client-trust) |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Critique** |
| **6. Contrôle existant** | **Partiel** — rôles UI + `platform_roles` SQL prévus. Autorité serveur sur mutations métier **absente** (pas d’Edge Functions). |
| **7. Correction recommandée** | Rôles uniquement en tables serveur (pas metadata client-writable) ; signup sans auto-verify ; RPC/Edge SECURITY DEFINER après AuthZ ; middleware RBAC serveur. |
| **8. Test** | Patch metadata `role=internal` sans effet ; facility reste `pending` jusqu’à admin ; appels directs RPC refusés. |

---

### T-05 — Usurpation d’un proche ou représentant légal

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Spoofing, Tampering |
| **1. Actif touché** | A1, A5, A9, collaboration famille |
| **2. Scénario** | Invitation email non authentifiée / token prévisible ; acceptation d’invite sans preuve d’identité ; rôle `medical` / `financial` auto-attribué ; signature consentement sans vérification d’identité du signataire ; seed/demo household. |
| **3. Probabilité** | Moyenne à élevée |
| **4. Impact** | Critique (accès médical/financier, décisions d’admission) |
| **5. Niveau de risque** | **Critique** |
| **6. Contrôle existant** | **Partiel** — rôles `owner|editor|viewer|financial|medical` en store collab ; tokens invite locaux. Preuve d’identité légale **absente**. |
| **7. Correction recommandée** | Invites à usage unique signées, TTL court ; owner seul attribue rôles sensibles ; journal consent + identité compte ; option vérification renforcée pour POA. |
| **8. Test** | Token expiré / réutilisé refusé ; viewer ne soumet pas ; audit montre acteur réel de la signature. |

---

### T-06 — Liens de documents devinables ou permanents

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Information disclosure |
| **1. Actif touché** | A7, A12 |
| **2. Scénario** | Paths Storage prévisibles `{family_id}/{senior_id}/…` sans signed URL ; bucket public par erreur ; data URLs / blobs exportés ; liens d’export permanents dans bucket `exports`. |
| **3. Probabilité** | Moyenne (cible) ; Faible aujourd’hui hors appareil (docs locaux) |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Élevé** (devient Critique dès Storage prod) |
| **6. Contrôle existant** | **Partiel** — `buckets.sql` nie l’accès client direct PHI et prévoit signed URLs ; Edge `create-signed-download` **absente** en code exécutable. |
| **7. Correction recommandée** | Uniquement URLs signées TTL court ; UUID non séquentiels ; pas de listing public ; purge exports ; antivirus + content-type allowlist. |
| **8. Test** | GET brut sur path Storage → 403 ; URL signée expire ; enumeration d’UUID échoue. |

---

### T-07 — Injection SQL, XSS, CSRF, SSRF, exécution de fichiers

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Tampering, Information disclosure, Elevation of privilege |
| **1. Actif touché** | A5, A10, A14, sessions |
| **2. Scénario** | **SQLi** via RPC mal échappée / concat SQL (moins probable avec client Supabase paramétré, possible en fonctions custom). **XSS** : champs notes/messages/noms rendus sans échappement, SVG/HTML dans docs, `dangerouslySetInnerHTML`. **CSRF** : cookies session sur POST state-changing sans token si cookie session. **SSRF** : futurs webhooks/outbox/`inbound-webhook` fetch URL attaquant. **Exécution fichier** : ouverture de PDF/Office malveillants côté staff. |
| **3. Probabilité** | Moyenne |
| **4. Impact** | Élevé à critique |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Partiel** — React échappe par défaut ; peu d’API mutantes. CSP / CSRF tokens / scan SSRF **absents** ou **non vérifiables**. |
| **7. Correction recommandée** | CSP stricte ; sanitization notes ; prepared statements only ; SameSite=Lax/Strict + CSRF sur cookies ; allowlist webhooks ; sandbox preview docs ; désactiver exécution côté serveur des uploads. |
| **8. Test** | Payload XSS dans note application non exécuté ; CSRF cross-site échoue ; webhook vers IP privée refusé ; suite SAST/DAST. |

---

### T-08 — Téléversement de fichiers malveillants

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Tampering, Denial of service, Information disclosure |
| **1. Actif touché** | A7, postes staff RPA, A12 |
| **2. Scénario** | Upload exe/html/svg polyglot dans IndexedDB puis partage ; double extension ; zip bomb ; malware PDF ciblant admissions staff. |
| **3. Probabilité** | Moyenne |
| **4. Impact** | Élevé |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Absent** — acceptation fichier client sans AV ; buckets prévoient mime/checksum mais pas de scan runtime. |
| **7. Correction recommandée** | Allowlist MIME+magic bytes ; taille max ; scan AV asynchrone ; quarantine ; conversion PDF safe ; ne jamais servir avec `Content-Disposition: inline` pour types risqués sans sanitization. |
| **8. Test** | `.html` / `.exe` rejetés ; EICAR détecté en quarantine ; download `attachment` only. |

---

### T-09 — Vol de session

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Spoofing, Information disclosure |
| **1. Actif touché** | A1–A4, A5 |
| **2. Scénario** | Lecture `localStorage` `haven-auth` ; XSS vole session ; cookie site gate / Supabase volé (XSS, malware endpoint, Wi-Fi) ; machine familiale partagée. |
| **3. Probabilité** | Élevée (localStorage sessions) |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Critique** |
| **6. Contrôle existant** | **Partiel** — cookie site httpOnly pour gate ; sessions métier locales **non** httpOnly. Refresh Supabase SSR **partiel**. |
| **7. Correction recommandée** | Cookies httpOnly Secure SameSite ; rotation refresh ; binding appareil optionnel ; logout global ; durée courte portails clinical. |
| **8. Test** | `document.cookie` ne contient pas le token session ; vol localStorage n’authentifie plus après migration. |

---

### T-10 — Fuite via logs, emails, analytics ou outils de support

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Information disclosure |
| **1. Actif touché** | A5, A11, A13 |
| **2. Scénario** | Google Analytics sur parcours authentifiés (URLs, user_id) ; `console.error` signup ; audit community journalisant **corps** email/SMS ; transition emails stockés en clair en localStorage ; futur outbox / Zendesk avec PHI ; support interne lisant `Internal*` seeds. |
| **3. Probabilité** | Élevée (GA actuel) |
| **4. Impact** | Élevé |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Partiel** — disclaimer privacy ; préférence analytics **non branchée** au script gtag ; minimisation logs **absente**. |
| **7. Correction recommandée** | Consent Mode / pas de GA sur portails PHI ; scrub PII logs ; emails transactionnels minimisés ; masquage support ; DPA sous-traitants. |
| **8. Test** | Aucun hit GA sur `/family/*` sans consentement ; fixtures logs sans SSN/email en clair ; revue templates email. |

---

### T-11 — Mauvaise configuration du stockage

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Information disclosure |
| **1. Actif touché** | A7, A12 |
| **2. Scénario** | Bucket `senior-documents` passé public ; policies RLS Storage trop permissives ; service role dans le front ; CORS large ; lifecycle purge exports désactivé. |
| **3. Probabilité** | Moyenne (erreur humaine prod) |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Partiel** — SQL buckets documente private + deny client ; application runtime **non vérifiable**. |
| **7. Correction recommandée** | IaC + drift detection ; tests « bucket public = fail CI » ; service role serveur only ; least privilege keys. |
| **8. Test** | Scan config Storage en CI ; tentative anon list/get → deny. |

---

### T-12 — Export massif de dossiers

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Information disclosure, Elevation of privilege |
| **1. Actif touché** | A5, A4, A10 |
| **2. Scénario** | Compte internal / service role exfiltre tables `seniors` / `documents` ; API admin sans pagination/quota ; export Privacy Center étendu par erreur ; scrap du portail community. |
| **3. Probabilité** | Moyenne |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Absent** / **partiel** — export client limité aujourd’hui ; pas de DLP serveur ; admin UI démo. |
| **7. Correction recommandée** | Rate limit exports ; break-glass admin avec MFA + ticket ; détection volume anormal ; chiffrement exports TTL. |
| **8. Test** | >N exports/heure bloqués ; alerte déclenchée ; admin sans `platform_roles` → 403. |

---

### T-13 — Employés internes trop privilégiés

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Elevation of privilege, Information disclosure |
| **1. Actif touché** | A4, A5, A9 |
| **2. Scénario** | Rôle `internal` ou `is_platform_admin()` trop large ; support lit dossiers complets ; absence de need-to-know ; pas de just-in-time access. |
| **3. Probabilité** | Moyenne |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Partiel** — UI internal « identifiers minimized » annoncé ; enforcement serveur **non vérifiable** ; seeds admin locaux. |
| **7. Correction recommandée** | RBAC fin (support vs security vs eng) ; accès JIT ; masquage champs ; audit obligatoire motif ; revue trimestrielle. |
| **8. Test** | Support ne voit pas SSN/docs bruts ; chaque accès crée `audit_logs` avec reason. |

---

### T-14 — Vulnérabilités des API

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Toutes catégories selon endpoint |
| **1. Actif touché** | A10, A1, A5 |
| **2. Scénario** | `/api/auth/sign-up` abus (spam comptes, privilege) ; `/api/site-access` brute force mot de passe site ; `/api/communities` OK (peu sensible) ; futures Edge Functions sans AuthZ ; mass assignment sur metadata. |
| **3. Probabilité** | Élevée sur signup/site-access sans rate limit |
| **4. Impact** | Moyen à critique |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Partiel** — validation champs signup ; rate limit / WAF / captcha **absents** ou **non vérifiables**. |
| **7. Correction recommandée** | Rate limiting, captcha, schéma strict (zod), authz sur chaque mutation, tests contrat OpenAPI, pas de service role dans handlers publics sans garde-fous. |
| **8. Test** | 100 POST signup → 429 ; body avec `role=internal` ignoré ; fuzzing schemа. |

---

### T-15 — Sauvegardes non protégées

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Information disclosure |
| **1. Actif touché** | A12, A5, A13 |
| **2. Scénario** | Backups Postgres/Storage/Vercel non chiffrés ou accessibles trop largement ; copies staging avec prod dump ; retention infinie. |
| **3. Probabilité** | Moyenne (ops) — aujourd’hui backups app **absents** |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Absent** dans le dépôt (checklist MVP seulement). |
| **7. Correction recommandée** | Backups chiffrés, accès break-glass, restore drills, environnement séparé anonymisé, retention définie. |
| **8. Test** | Restore drill documenté ; accès backup refusé au rôle eng standard ; scan secrets sur dumps. |

---

### T-16 — Suppression incomplète

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Information disclosure, Repudiation |
| **1. Actif touché** | A5, A7, A9, A12 |
| **2. Scénario** | `requestAccountDeletion` pose un flag local sans effacer family/community/shared/messages/IndexedDB ; soft-delete SQL sans purge Storage/outbox/backups/email provider ; analytics et logs conservent identifiants. |
| **3. Probabilité** | Élevée (comportement actuel) |
| **4. Impact** | Élevé (obligations Loi 25 / PIPEDA) |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Partiel** — UI demande suppression ; soft-delete colonnes prévues ; purge réelle **absente**. |
| **7. Correction recommandée** | Pipeline DSR : Auth delete, rows, Storage, outbox, exports, sous-traitants ; attestation ; délais légaux. |
| **8. Test** | Après DSR, requêtes SQL/Storage/email vendor sans résidu identifiant ; checklist signée. |

---

### T-17 — Dépendances compromises

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Tampering, Information disclosure |
| **1. Actif touché** | A14, tout le runtime |
| **2. Scénario** | Package npm trojanisé (typosquat, maintainer compromise) exfiltre env (`SUPABASE_SERVICE_ROLE_KEY`) au build/runtime. |
| **3. Probabilité** | Faible à moyenne |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Partiel** — lockfile attendu ; audit CI / pinning / SLSA **non vérifiable**. |
| **7. Correction recommandée** | `npm audit`/OSV en CI ; Dependabot ; pin versions ; least privilege CI secrets ; SBOM. |
| **8. Test** | Pipeline échoue sur CVE critique ; secret scanning ; rebuild reproductible. |

---

### T-18 — Attaques par force brute

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Spoofing, Denial of service |
| **1. Actif touché** | A1–A3, gate site, A10 |
| **2. Scénario** | Brute force login local/Supabase ; stuffing ; attaque sur `SITE_ACCESS_PASSWORD` via `/api/site-access`. |
| **3. Probabilité** | Élevée sans rate limit |
| **4. Impact** | Élevé |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Absent** / **non vérifiable** — pas de lockout applicatif visible. |
| **7. Correction recommandée** | Rate limit IP+compte ; CAPTCHA progressif ; alertes ; MDP site gate ≠ contrôle PHI (retirer gate comme sécurité réelle). |
| **8. Test** | Seuil N échecs → 429/lock ; bypass multi-IP limité par fingerprint/CAPTCHA. |

---

### T-19 — Déni de service

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Denial of service |
| **1. Actif touché** | Disponibilité admissions, A10, A12 |
| **2. Scénario** | Flood signup/APIs ; uploads volumineux IndexedDB/Storage ; zip bombs ; épuisement quotas Supabase ; saturation Edge outbox. |
| **3. Probabilité** | Moyenne |
| **4. Impact** | Moyen à élevé (soins / placements urgents) |
| **5. Niveau de risque** | **Moyen** à **Élevé** |
| **6. Contrôle existant** | **Absent** / **non vérifiable** (WAF, quotas app). |
| **7. Correction recommandée** | Quotas upload, WAF, autoscaling limites, circuit breakers outbox, status page. |
| **8. Test** | Charge upload > max rejeté ; chaos quota ; runbook incident. |

---

### T-20 — Fuite provenant d’un sous-traitant

| Champ | Contenu |
| --- | --- |
| **STRIDE** | Information disclosure |
| **1. Actif touché** | A13, A5, A11 |
| **2. Scénario** | Incident Supabase / hébergeur / Google / futur email-SMS-PSP ; support cloud accède au projet ; région hors Québec sans clauses ; absence de BAA quand HIPAA applicable. |
| **3. Probabilité** | Faible à moyenne |
| **4. Impact** | Critique |
| **5. Niveau de risque** | **Élevé** |
| **6. Contrôle existant** | **Absent** dans le dépôt (pas de registre sous-traitants opérationnel, région **non vérifiable**). |
| **7. Correction recommandée** | Registre Loi 25 ; DPA/BAA ; résidence des données choisie ; minimisation envoyée aux vendors ; encryption ; droit d’audit ; plan breach (FTC HBNR / Loi 25). |
| **8. Test** | Revue contrats annuelle ; tabletop breach sous-traitant ; vérification région projet cloud. |

---

## Menaces transverses additionnelles (couverture STRIDE)

### T-21 — Manipulation du paquet d’admission côté client (Tampering)

| Champ | Contenu |
| --- | --- |
| **1. Actif** | A6 |
| **2. Scénario** | Attaquant édite `haven-shared-admissions-v2` pour falsifier dossier / décision / consentement. |
| **3. Probabilité** | Élevée (local) |
| **4. Impact** | Élevé |
| **5. Risque** | **Élevé** |
| **6. Contrôle** | **Absent** (confiance client) |
| **7. Correction** | Source de vérité serveur + signatures d’événement / timeline immuable |
| **8. Test** | Modification locale ignorée après sync ; hash serveur mismatch alerte |

### T-22 — Répudiation des décisions RPA (Repudiation)

| Champ | Contenu |
| --- | --- |
| **1. Actif** | A9, décisions accept/decline |
| **2. Scénario** | Staff nie avoir accepté ; audit local falsifiable ; pas de non-répudiation serveur. |
| **3. Probabilité** | Moyenne |
| **4. Impact** | Moyen à élevé |
| **5. Risque** | **Moyen** |
| **6. Contrôle** | **Partiel** (timeline locale) |
| **7. Correction** | `audit_logs` append-only serveur, acteur JWT, horodatage fiable |
| **8. Test** | Update/delete audit refusé ; export audit intègre |

---

## Matrice de risque (résumé)

| ID | Menace | Risque |
| --- | --- | --- |
| T-01 | Prise de contrôle compte familial | Critique |
| T-02 | Prise de contrôle compte professionnel | Critique |
| T-03 | RPA → dossiers autre RPA | Critique |
| T-04 | Élévation de privilèges | Critique |
| T-05 | Usurpation proche / représentant | Critique |
| T-06 | Liens documents devinables / permanents | Élevé |
| T-07 | SQLi / XSS / CSRF / SSRF / fichiers | Élevé |
| T-08 | Upload malveillant | Élevé |
| T-09 | Vol de session | Critique |
| T-10 | Fuite logs / email / analytics / support | Élevé |
| T-11 | Mauvaise config stockage | Élevé |
| T-12 | Export massif | Élevé |
| T-13 | Internes trop privilégiés | Élevé |
| T-14 | Vulnérabilités API | Élevé |
| T-15 | Sauvegardes non protégées | Élevé |
| T-16 | Suppression incomplète | Élevé |
| T-17 | Dépendances compromises | Élevé |
| T-18 | Force brute | Élevé |
| T-19 | Déni de service | Moyen–Élevé |
| T-20 | Fuite sous-traitant | Élevé |
| T-21 | Tampering paquet admission | Élevé |
| T-22 | Répudiation décisions | Moyen |

---

## Priorisation de mitigation (alignée audit précédent)

| Priorité | Menaces visées | Objectif |
| --- | --- | --- |
| **P0** | T-01, T-03, T-04, T-09, T-10, T-18 | Stopper PHI réel sur prototype ; GA/consent ; isoler orgs ; durcir auth/API |
| **P1** | T-02, T-05, T-06, T-08, T-11, T-14, T-16 | Backend Supabase+RLS+Storage signé ; DSR réel ; uploads sûrs |
| **P2** | T-07, T-12, T-13, T-15, T-19, T-21, T-22 | SOC 2 ops : WAF, backups, JIT admin, audit immuable, tests sécu |
| **P3** | T-17, T-20 | Supply chain, registre vendors, certifications / BAA selon périmètre |

---

## Hypothèses et limites

1. L’analyse suppose le **comportement par défaut** `NEXT_PUBLIC_DATA_BACKEND≠supabase` (stores navigateur), tout en couvrant la **cible SQL/Edge**.  
2. La configuration cloud réelle (région, policies live, WAF) est **non vérifiable** depuis le dépôt seul.  
3. « RPA » désigne les **résidences** (community portal), non la RPA industrielle.  
4. Les tests listés sont des **critères d’acceptation sécurité**, pas une attestation d’exécution.  
5. Toute mise en production de PHI exige validation **juridique et sécurité externes**.

---

## Références dépôt (sans secrets)

- `src/lib/supabase/config.ts` — backend défaut local  
- `src/lib/auth-store.ts`, `src/lib/auth-crypto.ts`, `src/lib/auth-supabase.ts`  
- `src/app/api/auth/sign-up/route.ts`, `src/middleware.ts`  
- `src/lib/admissions-bridge.ts`, `src/lib/community-portal-store.tsx`, `src/lib/doc-blobs.ts`  
- `src/app/layout.tsx` — analytics  
- `supabase/migrations/0006_rls_policies.sql`, `supabase/storage/buckets.sql`  
- `supabase/functions/_index.md`  
- `docs/architecture/*`, `MVP_READINESS_REPORT.md`  

---

*Document généré pour pilotage sécurité produit. À réviser à chaque changement majeur d’architecture ou d’activation du backend Supabase.*
