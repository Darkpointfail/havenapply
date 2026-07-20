# HavenApply — Migration from Prototype

The current product is a **Next.js UX prototype** with browser persistence (`localStorage` / IndexedDB). This document maps that state onto the Supabase architecture and defines cutover phases.

---

## Current prototype stores

| Storage key / module | Contents |
| --- | --- |
| Auth (`src/lib/auth-store.ts`) | Demo accounts, sessions |
| `haven-family-{email}` (`family-data.tsx`) | Senior, care needs, docs meta, applications |
| IndexedDB blobs | Document file bytes |
| `haven-shared-admissions-v1` (`admissions-bridge.ts`) | Family↔community admissions bridge |
| `haven-community-portal-v1` | Community workspace (profile, apps, team, availability) |
| `haven-messages-v1` | Threads / messages |
| Family collaboration store | Invites, roles, tasks, comments |
| Internal admin store | Users, moderation, audit demo |
| Notifications / privacy stores | In-app prefs and sessions |

There are **no real production users** to migrate. Cutover is a **platform rewrite of the data layer**, not a live data pump.

---

## Target mapping

| Prototype | Supabase target |
| --- | --- |
| Demo auth users | `auth.users` + `profiles` |
| Implicit “family” per account | `families` + `family_members` (owner) |
| Senior profile + onboarding | `seniors` |
| Care needs | `senior_care_assessments` (+ optional normalized meds/allergies) |
| Vault documents | `documents` + Storage `senior-documents` |
| Family applications | `applications` + timeline + `application_documents` |
| `haven-shared-admissions-v1` | **Deleted** — shared truth is `applications` under RLS |
| Community portal workspace | `organizations`, `communities`, rooms, availability, `community_team_members` |
| Seed Maple Grove demo | Seed migration / script: one org + one community + staff |
| Messages | `conversations` + `messages` + `message_reads` |
| Family invites / roles | `family_members` + `family_invitations` |
| Tasks / notifications | `tasks` / `notifications` |
| Internal admin | `platform_roles` + `audit_logs` + future moderation tables |
| Compatibility / AI panel | `compatibility_analyses` / `ai_summaries` |

---

## Phases

### Phase 0 — Schema freeze (this delivery)

- Docs under `docs/architecture/`
- SQL migrations `0001`–`0007`
- Storage buckets
- Edge Function contracts

**Exit:** empty Supabase project can apply migrations cleanly.

### Phase 1 — Adapters (no UI rewrite)

- Add `src/lib/api/*` repositories matching existing hooks (`useFamilyData`, community portal, messaging).
- Feature flag `NEXT_PUBLIC_DATA_BACKEND=local|supabase`.
- Keep localStorage path working for demos.

**Exit:** same screens run against Supabase in a staging project for happy paths.

### Phase 2 — Critical path Edge Functions

Implement first:

1. Auth (Supabase) + profile trigger  
2. `submit-application` / `withdraw-application`  
3. `community-application-action`  
4. Signed upload/download  

**Exit:** family submit → community receive → staff respond → family sees update **without** admissions-bridge.

### Phase 3 — Dual-run / cutover

- Staging uses `supabase` only.
- Demo accounts recreated via seed script (not imported from localStorage).
- Remove `admissions-bridge` from architecture diagrams and eventually from code.

### Phase 4 — Decommission prototype stores

- Delete or gate localStorage stores behind `DATA_BACKEND=local` for Storybook-only.
- Remove IndexedDB document path once Storage is live.

### Phase 5 — Scale hardening

- Partition hot tables
- Read replicas / search external if needed
- BAA + retention policies if PHI in production

---

## Seed strategy (demo)

Do **not** silently mix fake applications with live ones (lesson from MVP readiness).

Provide explicit:

```bash
# conceptual
supabase db reset
pnpm seed:demo
```

Seed contents:

- Platform admin user
- Family owner + senior + sample docs (optional)
- Organization “Maple Grove Senior Living LLC”
- Community `maple-grove`
- Community team member `community@…`
- Zero pre-seeded applications (or clearly labeled fixtures behind `is_fixture=true`)

---

## Compatibility checklist before removing localStorage

- [ ] Signup / verify email / login (Supabase Auth)
- [ ] Senior onboarding + care assessment persist
- [ ] Document upload via signed URL
- [ ] Search communities (RPC)
- [ ] Favorites + compare
- [ ] Submit single + multi-apply
- [ ] Community intake sees application
- [ ] Staff request doc / propose tour / accept / decline
- [ ] Family timeline updates (Realtime or refresh)
- [ ] Messaging both sides
- [ ] Family invite
- [ ] Withdraw application
- [ ] Admin suspend / verify community
- [ ] Outbox row created on submit/status change

---

## What not to migrate

- Marketing static residence catalog may remain code (`src/data/residences.ts`) until communities are seeded in DB; then replace search source with RPC.
- Scripted AI assistant replies stay client-side until `generate-compatibility` exists.
- Demo passwords / local hash schemes — replace with Supabase Auth entirely.
