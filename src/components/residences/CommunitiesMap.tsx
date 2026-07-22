"use client";

import { useCallback, useMemo, useState } from "react";
import {
  GoogleMap,
  InfoWindowF,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import type { Residence } from "@/data/residences";
import { cn, formatCurrency } from "@/lib/utils";

const mapContainerStyle = { width: "100%", height: "100%", minHeight: "420px" };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  clickableIcons: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "simplified" }] },
  ],
};

function mapCenter(residences: Residence[]) {
  if (residences.length === 0) return { lat: 30.27, lng: -97.74 };
  const lat = residences.reduce((s, r) => s + r.lat, 0) / residences.length;
  const lng = residences.reduce((s, r) => s + r.lng, 0) / residences.length;
  return { lat, lng };
}

/** Stylized fallback when no Google Maps API key is set. */
function StylizedMap({
  residences,
  selectedId,
  onSelect,
  className,
}: {
  residences: Residence[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const lats = residences.map((r) => r.lat);
  const lngs = residences.map((r) => r.lng);
  const minLat = Math.min(...lats, 30.1);
  const maxLat = Math.max(...lats, 30.6);
  const minLng = Math.min(...lngs, -97.95);
  const maxLng = Math.max(...lngs, -97.55);
  const pad = 0.04;

  const toPos = (r: Residence) => {
    const x = ((r.lng - (minLng - pad)) / (maxLng - minLng + pad * 2)) * 100;
    const y = (1 - (r.lat - (minLat - pad)) / (maxLat - minLat + pad * 2)) * 100;
    return { left: `${Math.min(94, Math.max(6, x))}%`, top: `${Math.min(90, Math.max(8, y))}%` };
  };

  return (
    <div
      className={cn(
        "relative min-h-[420px] overflow-hidden rounded-xl border border-line bg-[#f2ebe3] texture-paper",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,40,35,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,40,35,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <p className="absolute left-3 top-3 z-20 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink-muted shadow-xs">
        Demo map · add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Google Maps
      </p>
      {residences.map((r) => {
        const pos = toPos(r);
        const active = selectedId === r.id;
        return (
          <button
            key={r.id}
            type="button"
            style={{ left: pos.left, top: pos.top }}
            className={cn(
              "absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg px-2 py-1 text-left shadow-sm transition",
              active
                ? "bg-brand text-white ring-2 ring-brand/25"
                : "bg-white text-ink hover:bg-brand-soft",
            )}
            onClick={() => onSelect?.(r.id)}
          >
            <span className="block max-w-[140px] truncate text-xs font-semibold">{r.name}</span>
            <span className={cn("block text-[10px]", active ? "text-white/80" : "text-ink-faint")}>
              {r.availableNow ? "Open" : "Waitlist"} · {r.distanceMiles} mi
            </span>
          </button>
        );
      })}
      {residences.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-ink-muted">
          No communities in this map view, loosen filters to see pins.
        </div>
      )}
    </div>
  );
}

function GoogleCommunitiesMap({
  residences,
  selectedId,
  onSelect,
  className,
  apiKey,
}: {
  residences: Residence[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  apiKey: string;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "havenapply-google-maps",
    googleMapsApiKey: apiKey,
  });

  const center = useMemo(() => mapCenter(residences), [residences]);
  const [infoId, setInfoId] = useState<string | null>(null);
  const selected = residences.find((r) => r.id === (infoId || selectedId));

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      if (residences.length === 0) return;
      if (residences.length === 1) {
        map.setCenter({ lat: residences[0].lat, lng: residences[0].lng });
        map.setZoom(13);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      residences.forEach((r) => bounds.extend({ lat: r.lat, lng: r.lng }));
      map.fitBounds(bounds, 48);
    },
    [residences],
  );

  if (loadError) {
    return (
      <div
        className={cn(
          "flex min-h-[420px] items-center justify-center rounded-xl border border-line bg-bg-soft p-6 text-center text-sm text-ink-muted",
          className,
        )}
      >
        Couldn’t load Google Maps. Check your API key and that Maps JavaScript API is enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={cn(
          "flex min-h-[420px] items-center justify-center rounded-xl border border-line bg-bg-soft text-sm text-ink-muted",
          className,
        )}
      >
        Loading map…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative min-h-[420px] overflow-hidden rounded-xl border border-line",
        className,
      )}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={11}
        options={mapOptions}
        onLoad={onLoad}
        onClick={() => setInfoId(null)}
      >
        {residences.map((r) => {
          const active = selectedId === r.id || infoId === r.id;
          return (
            <MarkerF
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              title={r.name}
              onClick={() => {
                setInfoId(r.id);
                onSelect?.(r.id);
              }}
              icon={
                typeof google !== "undefined"
                  ? {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: active ? 11 : 8,
                      fillColor: active ? "#1f8a6a" : "#d4896a",
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 2,
                    }
                  : undefined
              }
            />
          );
        })}

        {selected && (
          <InfoWindowF
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setInfoId(null)}
            options={{ pixelOffset: new google.maps.Size(0, -8) }}
          >
            <div className="max-w-[200px] p-0.5 font-sans">
              <p className="text-sm font-semibold text-ink">{selected.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {selected.city}, {selected.state} · {selected.distanceMiles} mi
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                {selected.availableNow ? "Available" : "Waitlist"}
                {selected.priceAvailable && selected.priceFrom != null
                  ? ` · from ${formatCurrency(selected.priceFrom)}/mo`
                  : ""}
              </p>
              <a
                href={`/find-senior-living/${selected.id}`}
                className="mt-2 inline-block text-xs font-semibold text-brand hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View community →
              </a>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {residences.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/50 p-6 text-center text-sm text-ink-muted">
          No communities in this map view, loosen filters to see pins.
        </div>
      )}
    </div>
  );
}

export function CommunitiesMap({
  residences,
  selectedId,
  onSelect,
  className,
}: {
  residences: Residence[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    return (
      <StylizedMap
        residences={residences}
        selectedId={selectedId}
        onSelect={onSelect}
        className={className}
      />
    );
  }

  return (
    <GoogleCommunitiesMap
      apiKey={apiKey}
      residences={residences}
      selectedId={selectedId}
      onSelect={onSelect}
      className={className}
    />
  );
}
