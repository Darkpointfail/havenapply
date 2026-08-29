import type { FamilyBundle } from "@/lib/family/types";
import type { CareNeeds } from "@/lib/care-needs";
import type { SeniorProfile } from "@/lib/senior-profile";
import type { ResidentDossier } from "@/lib/resident-dossier";
import type { DocCategoryId } from "@/lib/document-vault";
import type { ApplicantIdentity, EmergencyContactDto } from "@/lib/family/types";

type ApiOk<T> = { ok: true } & T;
type ApiFail = { ok: false; error: string };

async function parse<T>(res: Response): Promise<ApiOk<T> | ApiFail> {
  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Réponse serveur invalide." };
  }
  if (!res.ok || json.ok === false) {
    return { ok: false, error: String(json.error || "Une erreur est survenue.") };
  }
  return { ok: true, ...(json as T) };
}

export async function syncFamilySession(user: unknown | null) {
  if (!user) {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    return;
  }
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user }),
  }).catch(() => undefined);
}

export async function fetchFamilyBundle(): Promise<ApiOk<{ bundle: FamilyBundle }> | ApiFail> {
  const res = await fetch("/api/family/me", { credentials: "same-origin", cache: "no-store" });
  return parse(res);
}

export async function apiPatchApplicant(patch: Partial<ApplicantIdentity>) {
  const res = await fetch("/api/family/applicant", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parse<{ bundle: FamilyBundle }>(res);
}

export async function apiPatchSenior(
  patch: Partial<SeniorProfile>,
  opts?: { seniorId?: string; onboardingStep?: number },
) {
  const res = await fetch("/api/family/senior", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patch,
      seniorId: opts?.seniorId,
      onboardingStep: opts?.onboardingStep,
    }),
  });
  return parse<{ bundle: FamilyBundle }>(res);
}

export async function apiPatchCareNeeds(careNeeds: CareNeeds, seniorId?: string) {
  const res = await fetch("/api/family/care-needs", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ careNeeds, seniorId }),
  });
  return parse<{ bundle: FamilyBundle }>(res);
}

export async function apiPatchDossier(input: {
  dossier?: ResidentDossier;
  emergencyContacts?: EmergencyContactDto[];
  seniorId?: string;
}) {
  const res = await fetch("/api/family/dossier", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parse<{ bundle: FamilyBundle }>(res);
}

export async function apiRecordConsent(granted: boolean) {
  const res = await fetch("/api/family/consents", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ granted, purpose: "profile_retention" }),
  });
  return parse<{ bundle: FamilyBundle }>(res);
}

export async function apiRequestDeletion(scope: "profile" | "account", reason?: string) {
  const res = await fetch("/api/family/deletion", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, reason }),
  });
  return parse<{ bundle: FamilyBundle }>(res);
}

export async function apiUploadDocument(input: {
  file: File;
  category: DocCategoryId;
  seniorId?: string;
  description?: string;
  expires?: string;
  onProgress?: (pct: number) => void;
}) {
  // XHR for upload progress
  return new Promise<ApiOk<{ bundle: FamilyBundle }> | ApiFail>((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", input.file);
    form.append("category", input.category);
    if (input.seniorId) form.append("seniorId", input.seniorId);
    if (input.description) form.append("description", input.description);
    if (input.expires) form.append("expires", input.expires);

    xhr.open("POST", "/api/family/documents");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && input.onProgress) {
        input.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as Record<string, unknown>;
        if (xhr.status >= 200 && xhr.status < 300 && json.ok !== false) {
          resolve({ ok: true, ...(json as { bundle: FamilyBundle }) });
        } else {
          resolve({ ok: false, error: String(json.error || "Échec du téléversement.") });
        }
      } catch {
        resolve({ ok: false, error: "Réponse serveur invalide." });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: "Erreur réseau lors du téléversement." });
    xhr.send(form);
  });
}

export async function apiDeleteDocument(id: string) {
  const res = await fetch(`/api/family/documents?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return parse<{ bundle: FamilyBundle }>(res);
}

export async function apiReplaceDocument(id: string, file: File) {
  const form = new FormData();
  form.append("id", id);
  form.append("file", file);
  const res = await fetch("/api/family/documents", {
    method: "PUT",
    credentials: "same-origin",
    body: form,
  });
  return parse<{ bundle: FamilyBundle }>(res);
}

export function documentPreviewUrl(id: string) {
  return `/api/family/documents/${encodeURIComponent(id)}`;
}
