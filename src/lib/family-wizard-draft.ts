/**
 * Persist in-progress family dossier wizard across navigation / refresh.
 * Backend senior+dossier already receive patches, but incomplete names used to
 * hide the profile on remount — this bridge restores the draft UI immediately.
 */

import type { FamilyProfile } from "@/data/family-space";

const DRAFT_KEY = "haven-family-wizard-draft-v1";

export function loadFamilyWizardDraft(): FamilyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FamilyProfile;
    if (!parsed || typeof parsed !== "object" || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveFamilyWizardDraft(profile: FamilyProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(profile));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearFamilyWizardDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
