"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useCommunityPortal } from "@/lib/community-portal-store";
import { useT } from "@/lib/i18n/locale";

const inputClass =
  "w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Creates a patient transfer draft (optionally prefilled from a dossier),
 * then redirects to the transfer editor.
 */
export function NewPatientTransferPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetAppId = searchParams.get("applicationId");
  const { ready, workspace, createPatientTransfer, can } = useCommunityPortal();
  const [applicationId, setApplicationId] = useState(presetAppId || "");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const candidates = useMemo(() => {
    const list = workspace?.applications ?? [];
    return [...list].sort((a, b) => a.seniorName.localeCompare(b.seniorName));
  }, [workspace]);

  useEffect(() => {
    if (presetAppId) setApplicationId(presetAppId);
  }, [presetAppId]);

  function handleCreate(blank: boolean) {
    setError(null);
    if (!can("acceptDecline")) {
      setError(t("You don’t have permission to create transfers."));
      return;
    }
    setCreating(true);
    const res = createPatientTransfer({
      applicationId: blank ? null : applicationId || null,
    });
    if (!res.ok || !res.transfer) {
      setCreating(false);
      setError(res.error || t("Could not create transfer."));
      return;
    }
    router.replace(`/community/transition/transfer/${res.transfer.id}`);
  }

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        {t("Opening transfer…")}
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {t("Workspace unavailable")}
        </h1>
        <Button href="/community/transition" size="sm" className="mt-5">
          {t("Back to Transition")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-[560px] space-y-6 px-5 py-8 md:px-8 md:py-12">
        <header>
          <p className="text-sm font-medium text-ink-muted">{t("Admissions")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            {t("New patient transfer")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {t(
              "Create a transfer packet to send a resident’s clinical and administrative information to another center.",
            )}
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <label className="block text-sm">
            <span className="font-medium text-ink">
              {t("Prefill from resident dossier (optional)")}
            </span>
            <select
              className={`${inputClass} mt-1.5`}
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
            >
              <option value="">{t("Start blank — enter details manually")}</option>
              {candidates.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.seniorName}
                  {app.status ? ` · ${app.status}` : ""}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={creating}
              onClick={() => handleCreate(false)}
            >
              {applicationId
                ? t("Create transfer from dossier")
                : t("Create blank transfer")}
            </Button>
            {applicationId ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={creating}
                onClick={() => handleCreate(true)}
              >
                {t("Create blank instead")}
              </Button>
            ) : null}
            <Button href="/community/transition" size="sm" variant="ghost">
              {t("Cancel")}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
