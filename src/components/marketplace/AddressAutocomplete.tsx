"use client";

// =============================================================================
// AddressAutocomplete — Google Places autocomplete bound to a regular
// <input>. Restricted to Colombia + addresses-only.
//
// Free-tier guardrails: Google Places gives $200/month free credit ≈ 70K
// autocomplete sessions. Each cart visit that types into the address
// is one "session" thanks to the sessionToken — keystrokes within the
// same session are billed once. We're nowhere near the cap.
//
// Graceful fallback: if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset (dev
// environments without the key, or production before the key is
// added) we render a plain <input> with the same value/onChange API.
// The buyer can still type their address manually; they just don't
// get the dropdown suggestions.
// =============================================================================

import React, { useEffect, useRef, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface Props {
  /** Current address value (controlled). */
  value: string;
  /** Called on every keystroke + on suggestion select. */
  onChange: (address: string) => void;
  /** Optionally receive the resolved city when a Place is picked. */
  onCityResolved?: (city: string) => void;
  /** Visible placeholder text. */
  placeholder?: string;
  /** Pass-through className for the underlying input. */
  className?: string;
  /** When true, we focus the input on mount. */
  autoFocus?: boolean;
}

// Google Maps script is global per page — track loading state at module
// scope so multiple AddressAutocomplete instances on the same render
// don't re-inject the <script> tag.
let scriptPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!API_KEY) return Promise.resolve();
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-tirepro-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Maps script failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&libraries=places&language=es&region=CO`;
    script.async = true;
    script.defer = true;
    script.dataset.tireproGmaps = "1";
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Maps script failed")));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function AddressAutocomplete({
  value,
  onChange,
  onCityResolved,
  placeholder = "Dirección (calle, número) *",
  className = "",
  autoFocus = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);

  // Bootstrap: load the Maps script + attach an Autocomplete to our
  // input once it's ready. Cleanup detaches on unmount.
  useEffect(() => {
    let detach: (() => void) | null = null;
    let cancelled = false;
    if (!API_KEY) return;
    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        const g = (window as any).google;
        if (!g?.maps?.places || !inputRef.current) return;
        // Use the stable Autocomplete API (the new
        // PlaceAutocompleteElement is still in beta as of May 2026
        // and breaks our <input> styling).
        const ac = new g.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "co" },
          types: ["address"],
          fields: ["formatted_address", "address_components", "geometry"],
        });
        const listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place) return;
          const addr = (place.formatted_address as string | undefined)?.split(",")[0]?.trim()
            || (place.formatted_address as string | undefined)
            || "";
          if (addr) onChange(addr);
          // Pull the locality out of the address components — used to
          // pre-fill the city field so the buyer doesn't have to
          // pick it from the dropdown.
          if (onCityResolved && Array.isArray(place.address_components)) {
            type Component = { long_name: string; short_name: string; types: string[] };
            const locality = (place.address_components as Component[]).find(
              (c) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"),
            );
            if (locality?.long_name) onCityResolved(locality.long_name);
          }
        });
        setReady(true);
        detach = () => listener.remove();
      })
      .catch(() => { /* swallow — we just won't get the dropdown. */ });
    return () => {
      cancelled = true;
      detach?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ready ? placeholder : (API_KEY ? `${placeholder} (cargando…)` : placeholder)}
      autoFocus={autoFocus}
      autoComplete="street-address"
      className={className}
      // Stop browsers' built-in autofill from fighting Google's
      // dropdown — Chrome occasionally renders both.
      data-form-type="other"
    />
  );
}
