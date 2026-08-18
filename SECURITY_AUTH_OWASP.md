# Authentification & sessions — OWASP hardening (HavenApply)

**Date :** 2026-08-18  
**IdP :** Supabase Auth (GoTrue) remains the production identity provider. Local `auth-store` is demo-only.

## Controles implementes

| Exigence | Etat | Implementation |
| --- | --- | --- |
| MFA obligatoire pro / admin / RPA | **present** (Supabase path) | `roleRequiresMfa` + `RequireAuth` AAL2 + `/security/mfa/*` |
| MFA propose aux familles | **present** | `roleSuggestsMfa` / `suggest_enroll` apres login |
| Hash mots de passe Argon2id / equivalent IdP | **present** via Supabase (bcrypt GoTrue) ; local = PBKDF2-SHA256 210k | `auth-crypto.ts`, Supabase Auth |
| Mots de passe compromis (HIBP k-anon) | **present** | `auth-password-policy.ts` |
| Limitation tentatives | **present** | `auth-rate-limit.ts` sur signup / site-access / events |
| Credential stuffing | **partiel** | rate limit + HIBP + generic errors ; WAF recommande |
| Erreurs sans enumeration | **present** / **partiel** | soft resend/reset ; signup emailTaken encore explicite |
| Verification email | **partiel** | auto-confirm desactive en production (`AUTH_SIGNUP_AUTO_CONFIRM`) |
| Reset tokens courts / one-time | **present** | local TTL 30m ; Supabase recovery links |
| Cookies Secure / HttpOnly / SameSite | **present** / **partiel** | site-access HttpOnly ; Supabase SSR `sameSite=lax` + `secure` prod (HttpOnly limite SSR) |
| Rotation / revocation sessions | **present** | `signOut({ scope: 'others'|'global' })` apres password change/reset |
| Expiration inactivite | **present** | cookie `haven_last_activity` 30 min (middleware) |
| Revocation apres changement MDP | **present** | local clear session + Supabase `others` |
| CSRF | **present** | Origin/Referer allowlist sur APIs mutantes |
| Pas de secrets frontend | **present** | service role serveur only |
| JWT sans donnees sensibles | **partiel** | metadata role encore dans JWT — migrer vers tables (`platform_roles`) |
| Journalisation evenements | **present** | `auth_security_events` / `.data/auth-events.json` (hash) |
| Alerte activite anormale | **partiel** | `detectAuthAnomaly` burst failures |

## Fichiers cles

- `src/lib/auth-password-policy.ts`, `auth-rate-limit.ts`, `auth-csrf.ts`, `auth-events.ts`, `auth-mfa.ts`, `auth-cookies.ts`
- `src/app/security/mfa/enroll/page.tsx`, `challenge/page.tsx`
- `src/components/auth/RequireAuth.tsx`
- `src/app/api/auth/sign-up/route.ts`, `security-event/route.ts`
- `supabase/migrations/0010_auth_security_events.sql`
- Tests : `npm run test:auth-security`

## Actions manuelles

1. Activer MFA TOTP dans le projet Supabase Auth.
2. `NEXT_PUBLIC_DATA_BACKEND=supabase` en staging/prod.
3. Definir `ACCESS_LOG_HASH_SECRET` / `AUTH_EVENT_HASH_SECRET`, `NEXT_PUBLIC_SITE_URL`.
4. Ne pas definir `AUTH_SIGNUP_AUTO_CONFIRM=true` en production.
5. Appliquer migration `0010`.
6. Configurer SMTP Supabase pour confirmation email reelle.
7. Ajouter rate limiting edge/WAF devant les routes auth.

## Risques residuels

- Prototype localStorage auth encore disponible hors Supabase (ne pas l’utiliser en production).
- Rate limit memoire non partage entre instances serverless.
- Cookies session Supabase lisibles en JS (limitation `@supabase/ssr`) — XSS reste critique.
- Pas de notification email push pour anomalies (log seulement).
- Enumeration partielle via `emailTaken` au signup.

**Aucune affirmation de conformite OWASP ASVS complete.** Validation externe recommandee.
