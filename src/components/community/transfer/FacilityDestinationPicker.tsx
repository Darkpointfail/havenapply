"use client";

import { useEffect, useState } from "react";
import type { Residence } from "@/data/residences";
import type { TransferDestination } from "@/lib/patient-transfer";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

type Props = {
  value: TransferDestination | null;
  onChange: (destination: TransferDestination | null) => void;
  excludeFacilityId?: string;
};

export function FacilityDestinationPicker({
  value,
  onChange,
  excludeFacilityId,
}: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [results, setResults] = useState<Residence[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (manual) return;
    const q = query.trim();
    if (q.length < 2 && !stateFilter.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (stateFilter.trim()) params.set("state", stateFilter.trim().toUpperCase());
        params.set("limit", "12");
        params.set("source", "all");
        const res = await fetch(`/api/communities?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { items: Residence[] };
        setResults(
          (data.items || []).filter((r) => r.id !== excludeFacilityId).slice(0, 12),
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(t("Could not search facilities. Try again or enter manually."));
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, stateFilter, manual, excludeFacilityId, t]);

  async function selectResidence(r: Residence) {
    setError(null);
    let phone = "";
    let address = "";
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(r.id)}`);
      if (res.ok) {
        const detail = (await res.json()) as { phone?: string; streetAddress?: string };
        phone = detail.phone && detail.phone !== "N/A" ? detail.phone : "";
        address = detail.streetAddress || "";
      }
    } catch {
      // Keep list fields if detail fetch fails
    }
    onChange({
      facilityId: r.id,
      name: r.name,
      city: r.city,
      state: r.state,
      zip: r.zip,
      phone,
      address,
      source: r.id.startsWith("cms-") ? "medicare" : "curated",
    });
    setQuery("");
    setResults([]);
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink">{value.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {[value.address, value.city, value.state, value.zip]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {value.phone ? (
                <p className="mt-0.5 text-xs text-ink-muted">{value.phone}</p>
              ) : null}
              <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">
                {value.source === "medicare"
                  ? t("Medicare catalog")
                  : value.source === "curated"
                    ? t("Haven listing")
                    : t("Manual entry")}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-brand hover:underline"
              onClick={() => onChange(null)}
            >
              {t("Change center")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                !manual ? "bg-brand text-white" : "bg-bg-soft text-ink-muted",
              )}
              onClick={() => setManual(false)}
            >
              {t("Search catalog")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                manual ? "bg-brand text-white" : "bg-bg-soft text-ink-muted",
              )}
              onClick={() => setManual(true)}
            >
              {t("Enter manually")}
            </button>
          </div>

          {manual ? (
            <ManualDestinationForm
              onSave={(dest) => {
                onChange(dest);
                setManual(false);
              }}
            />
          ) : (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_88px]">
                <input
                  className={inputClass}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("Search by facility name or city…")}
                />
                <input
                  className={inputClass}
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value.slice(0, 2))}
                  placeholder={t("State")}
                  maxLength={2}
                />
              </div>
              {loading ? (
                <p className="text-xs text-ink-faint">{t("Searching…")}</p>
              ) : null}
              {error ? <p className="text-xs text-danger">{error}</p> : null}
              {results.length > 0 ? (
                <ul className="max-h-56 overflow-auto rounded-xl border border-line bg-surface">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 border-b border-line/60 px-3 py-2.5 text-left last:border-0 hover:bg-bg-soft"
                        onClick={() => void selectResidence(r)}
                      >
                        <span className="text-sm font-medium text-ink">{r.name}</span>
                        <span className="text-xs text-ink-muted">
                          {r.city}, {r.state} {r.zip}
                          {r.id.startsWith("cms-") ? ` · ${t("Medicare")}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.trim().length >= 2 && !loading ? (
                <p className="text-xs text-ink-faint">
                  {t("No facilities found. Try another search or enter manually.")}
                </p>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ManualDestinationForm({
  onSave,
}: {
  onSave: (dest: TransferDestination) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
      <input
        className={inputClass}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("Facility name *")}
      />
      <input
        className={inputClass}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={t("Street address")}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          className={cn(inputClass, "col-span-1")}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("City")}
        />
        <input
          className={inputClass}
          value={state}
          onChange={(e) => setState(e.target.value.slice(0, 2))}
          placeholder={t("State")}
          maxLength={2}
        />
        <input
          className={inputClass}
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder={t("ZIP")}
        />
      </div>
      <input
        className={inputClass}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={t("Phone")}
      />
      <button
        type="button"
        disabled={!name.trim()}
        className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        onClick={() =>
          onSave({
            facilityId: `manual-${Date.now()}`,
            name: name.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state.trim().toUpperCase(),
            zip: zip.trim(),
            phone: phone.trim(),
            source: "manual",
          })
        }
      >
        {t("Use this center")}
      </button>
    </div>
  );
}
