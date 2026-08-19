# Consent & data governance

**Scope:** verifiable consent ledger, purpose separation, retention, subject rights, erasure propagation.  
**Not legal advice.** All user-facing legal copy is marked `[LEGAL PLACEHOLDER — pending attorney validation. Not final legal text.]`.

## What is recorded on each consent grant

| Field | Source |
|---|---|
| Consenter identity | `consenterDisplayName`, `consenterEmail`, `consenterUserId` |
| Role | `resident` \| `caregiver` \| `legal_representative` \| `other` |
| Exact text versions | `policyBundleVersionId` + per-purpose `policyVersionId` |
| Purposes | Separate booleans; essential vs optional sections in UI |
| Date/time/context | `grantedAt`, `context.surface`, optional UA hint |
| Duration | `expiresAt` (nullable) |
| Withdrawal | `withdrawnAt`, `withdrawalReason`, history entry |
| Authority proof | Required for legal representatives (`authorityProof`) |
| Establishments | `establishments[]` on each transmission |
| History | Append-only `history[]` (granted / withdrawn / amended / expired / …) |

## Rules enforced in product

1. **No pre-checked consent** — `ConsentCapture` initializes all checkboxes to false; signup prefs seed to false; no silent `consentShare: true` without capture.
2. **Essential vs optional separated** in UI sections.
3. **Minimization** — `minimization.ts` maps data categories to required purposes.
4. **Retention** — configurable via `RETENTION_*_DAYS` env; abandoned applications via `RETENTION_ABANDONED_APPLICATION_DAYS` (default 90) + `/api/consent/expire-abandoned`.
5. **Access / rectification / export** — Privacy → Governance tab; structured JSON export.
6. **Erasure** — delete or anonymize; **blocked** when a legal hold covers the category; propagation to primary store, documents, community copies, subprocessors, backups.
7. **Backups** — not live-purged; marked `deferred_backup_cycle` until retention expiry (`BACKUP_ERASURE_POLICY`).

## Code map

| Area | Path |
|---|---|
| Types | `src/lib/consent/types.ts` |
| Policy placeholders | `src/lib/consent/policy-versions.ts` |
| Purposes | `src/lib/consent/purposes.ts` |
| Ledger | `src/lib/consent/ledger.ts` |
| Rights / export / erasure | `src/lib/consent/rights.ts`, `propagation.ts` |
| UI capture | `src/components/consent/ConsentCapture.tsx` |
| Governance panel | `src/components/consent/ConsentGovernancePanel.tsx` |
| Legal pages | `/legal/terms`, `/legal/privacy` |
| SQL | `supabase/migrations/0012_consent_governance.sql` |

## Counsel checklist

- Replace all `LEGAL_PLACEHOLDER` bodies before production.
- Confirm retention days and abandoned-application notices.
- Confirm legal-hold authority and subprocessor notification text.
- Confirm authority-proof verification workflow for representatives.

## Tests

`npm run test:consent-governance`
