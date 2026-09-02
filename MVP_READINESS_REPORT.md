# Haven — MVP Readiness Report

**Date:** 2026-07-20  
**Scope:** End-to-end product validation (family → application → community response → family update), plus admin surfaces and general quality checks.  
**Verdict:** The **core admissions loop is now wired** in the local demo (localStorage bridge). The product is **not ready for real users or partner communities** until a real backend, identity, email, and compliance stack replace browser storage.

---

## Executive summary

| Question | Answer |
| --- | --- |
| Can a family submit and a community receive it? | **Yes** (same browser / shared `localStorage` key `haven-shared-admissions-v1`) |
| Can the community respond and the family see it? | **Yes** (bridge sync + tab focus refresh) |
| Is this production-ready? | **No** — demo / prototype only |
| Ready for paid beta families? | **No** |
| Ready for community partnerships? | **No** |

---

## Critical path status (must-work journey)

| Step | Status | Notes |
| --- | --- | --- |
| Family creates account | Done | Local auth + password hashing |
| Confirm email | Partial | Token flow exists; no real email delivery |
| Sign in / session resume | Done | Session in localStorage |
| Senior profile + care needs | Done | Onboarding + care needs modules |
| Documents vault | Done | IndexedDB blobs + share metadata |
| Search / filters / favorites / compare | Done | Catalog residences |
| Single + multi apply | Done | Double-submit guard; multi-apply skips `blocked` |
| Publish to community intake | **Fixed** | `publishFamilyApplication` on submit |
| Community receives live app | **Fixed** | `mergeSharedIntoCommunityApps` on load/focus |
| Community request doc / tour / accept / decline | **Fixed** | Mutations call `updateSharedFromCommunity` |
| Family sees community decision | **Fixed** | Sync on load + window focus |
| Withdrawal | **Fixed** | `markSharedWithdrawn` |
| Messaging both sides | Partial | Deep-link start from community→family added; no real delivery |
| Family invite + permissions | Done (demo) | Collaboration store |
| Admin verify / suspend / logs | Done (demo) | Internal admin store |

**Bottom line:** The admissions loop that blocked “MVP complete” is implemented for the **local demo**. It is still **not** a multi-device or multi-user production system.

---

## Fonctionnalités terminées

### Family portal
- Account signup, login, logout, session persistence  
- Email verification *UI + token confirm* (simulated)  
- Senior profile onboarding (multi-step)  
- Care needs questionnaire  
- Document vault (upload metadata, categories, share flags)  
- Community search, filters, favorites, compare  
- Single apply + multi-apply with consent / signature  
- Application tracking (list, detail, timeline, withdraw)  
- Messaging inbox (templates, attachments warning, archive)  
- Family members hub (roles, invites, tasks, comments)  
- Notifications & tasks  
- Privacy center (consents, sessions, password change, export, deletion request)  
- Settings (working links + appearance toggle)

### Community portal
- Dashboard & stats  
- Applications list + detail actions (assign, notes, info/doc request, tour/assessment, status, accept/decline)  
- Profile / pricing / admissions criteria editing  
- Availability / rooms  
- Team roles & invites  
- Messaging (community side)  
- Prospects / analytics / settings (demo)

### Internal admin
- Users (including suspend)  
- Communities (approve / refuse / suspend / verify)  
- Applications oversight  
- Moderation / reports queue  
- Analytics indicators  
- Audit log viewer  
- Permission-aware UI for internal roles

### Cross-cutting
- Role-based route guards (`RequireAuth`)  
- Shared messaging store  
- Admissions bridge (family ↔ community)  
- Marketing copy without false HIPAA/SOC2 “ready” claims  

---

## Fonctionnalités partiellement terminées

| Area | What’s missing |
| --- | --- |
| Email | No SMTP / provider; “confirm email” and invites are local-only |
| Notifications | In-app list only; no push/email/SMS |
| Document requests | Community can request; family must manually attach/re-share (no structured reply workflow) |
| Waitlist management | Position fields exist; no full waitlist ops product |
| Billing / payments | Settings rows marked “Coming later” |
| Language / accessibility prefs | Not implemented |
| 2FA | Privacy page mentions security; no real MFA |
| Real-time sync | Focus/reload based; no websockets/multi-tab broadcast channel |
| Cross-browser / multi-device | Impossible with localStorage-only |
| Seed vs live community apps | Seed demo apps remain in community intake alongside live shared apps |
| Mobile polish | Layouts responsive; not systematically QA’d on small devices |
| Analytics | Demo counters, not product telemetry |

---

## Bugs restants (known)

1. **No server of truth** — all state is per-browser; clearing storage wipes the “product.”  
2. **Family must refocus the tab** (or reload) to pick up a community decision written while they were idle.  
3. **Community seed applications** still appear in Maple Grove intake; actions on *seed* IDs do not sync to a real family account.  
4. **Catalog application IDs** (`getApplication`) remain reachable by URL for illustration; they are no longer mixed into the live applications list/dashboard.  
5. **Messaging** does not notify the other party out-of-band; both must open Messages.  
6. **Double-tab race** — two tabs can overwrite localStorage without merge.  
7. **ESLint / React Compiler** warnings may remain on some apply pages (build/typecheck currently clean).  
8. **Settings** still lists future items (billing, language, etc.) as non-interactive “Coming later.”  
9. **Admin “suspend”** does not forcibly kill an active browser session elsewhere.  
10. **Image/media paths** depend on local `public/` assets; missing assets show broken images.

---

## Risques critiques

| Risk | Severity | Why it blocks real use |
| --- | --- | --- |
| Client-only PII (medical, docs, contacts) | **Critical** | Not HIPAA-capable; data on device, exportable, not encrypted at rest server-side |
| No backend auth / RBAC enforcement | **Critical** | Roles are UI + local flags; trivially spoofable |
| Fake email confirmation | **Critical** | Cannot prove identity or recover accounts safely |
| Admissions bridge is localStorage | **Critical** | Family and community must share the same browser profile for the demo loop |
| Document blobs in IndexedDB | **High** | Loss on clear-site-data; no backup; no retention policy |
| Liability of care recommendations | **High** | Product must not imply clinical advice or placement guarantees |
| Partner trust | **High** | Communities cannot rely on demo intake for real admissions |

---

## Éléments nécessaires avant utilisateurs réels

1. **Hosted backend** (API + database) with multi-tenant auth (e.g. Auth provider + verified email).  
2. **Encrypted document storage** (S3-compatible) with signed URLs, virus scan, retention, and audit.  
3. **True email** (verification, invites, application receipts, community alerts).  
4. **Server-enforced permissions** for family roles and community team roles.  
5. **Privacy program**: BAA path if PHI is in scope, consent records, DSR (export/delete) that actually delete server data.  
6. **Session security**: httpOnly cookies / refresh rotation; logout everywhere.  
7. **Input validation & rate limits** on all mutating endpoints.  
8. **Observability**: error tracking, audit trail immutable enough for disputes.  
9. **Content policy**: clear “demo vs production” banners until partners are live.  
10. **Manual E2E QA** on mobile Safari/Chrome for apply + documents + messaging.

---

## Éléments nécessaires avant partenariats établissements

1. **Verified community onboarding** with legal entity, licensing, and admin approval that sticks server-side.  
2. **Admissions packet schema** agreed with partners (required docs, care levels, pricing disclosure rules).  
3. **SLA for response times** and status vocabulary shared with families (accepted / declined / waitlist / more info).  
4. **Team seats & SSO** (or at least invite + role enforcement) for admissions staff.  
5. **Export / CRM integration** or CSV of applicants.  
6. **Contract + DPA** and clarity that Haven is a messaging/application channel, not a medical record system unless certified.  
7. **Sandbox vs production** environments so staff can train without touching real families.  
8. **Support runbook** for contested decisions, withdrawn apps, and document disputes.

---

## Checklist de lancement

### Product
- [x] Family can create senior profile and care needs  
- [x] Family can submit ≥1 application  
- [x] Community can see that application (demo bridge)  
- [x] Community can accept / decline / request info  
- [x] Family can see the updated status (after refresh/focus)  
- [x] Withdrawal removes from shared intake  
- [ ] Real email for verify + notifications  
- [ ] Multi-device persistence  
- [ ] Empty/error states reviewed on every primary route  
- [ ] Mobile smoke test signed off  

### Trust & safety
- [x] No “HIPAA-ready / SOC2-ready” marketing claims  
- [ ] Legal pages reviewed by counsel (ToS, Privacy, community agreement)  
- [ ] Abuse / report flow connected to real moderation ops  
- [ ] Data retention & deletion verified end-to-end  

### Operations
- [ ] Staging environment  
- [ ] Backups & restore drill  
- [ ] On-call / support inbox  
- [ ] Partner success playbook  

### Go / No-go
- [ ] **GO for closed demo** (sales / investor walkthrough on one machine) — **YES**  
- [ ] **GO for private beta families** — **NO**  
- [ ] **GO for community pilots with real applicants** — **NO**

---

## Fixes landed during this validation (PROMPT 19)

1. **Admissions bridge** (`src/lib/admissions-bridge.ts`) connecting family submit ↔ community intake ↔ family decision sync.  
2. **Family submit/withdraw** publish/withdraw into the shared store; reload/focus re-syncs decisions.  
3. **Community portal** merges shared apps on load/focus; mutations sync decisions back to the family store.  
4. **Multi-apply** only submits `ready` / `needs_info` destinations (no longer includes `blocked`).  
5. **Double-submit guard** uses latest state inside `persist` (not a stale snapshot).  
6. **Applications list + dashboard** no longer mix catalog demo apps with live submissions.  
7. **Settings** dead buttons replaced with explicit “Coming later” rows; duplicate links removed.  
8. **Community “Message family”** deep-link can start a thread with the applicant family email.

---

## Recommended next engineering slice (post-MVP demo)

1. Replace localStorage with an API + Postgres (or equivalent).  
2. Wire transactional email (Resend/Postmark) for verify + application events.  
3. Add a structured “Respond to document request” flow on the family side.  
4. Add BroadcastChannel / polling so family UI updates without tab focus.  
5. Separate seed demo data behind a “Load sample data” button so partners never confuse it with live intake.

---

## Final statement

Haven’s **UX shell and demo admissions OS are substantially built**. After PROMPT 19, the **family → candidature → réception établissement → réponse → suivi famille** path works in the **local demo**.  

**The platform is not finished for real users.** Do not onboard real families or partner communities until backend, email, permissions enforcement, and privacy controls are in place.
