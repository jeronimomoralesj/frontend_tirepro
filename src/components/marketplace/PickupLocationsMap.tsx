"use client";

// Leaflet map for the pickup-location editor. Click-anywhere-to-place
// pin; drag the pin to fine-tune. Lifted as a separate file so it
// can be lazy-imported via `next/dynamic({ ssr: false })` from
// PickupLocationsEditor — react-leaflet touches `window` at module
// eval time which crashes Next.js SSR.

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icons rely on relative URLs that next/image
// + webpack don't resolve correctly; this is the canonical workaround.
// Without it the marker renders as a broken image. We point the three
// referenced PNGs at the unpkg-hosted copies bundled with the leaflet
// release that matches our package version.
const DEFAULT_ICON = L.icon({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
});

interface Props {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

// Recenters the map when the parent's lat/lng changes (e.g. user
// pasted coordinates manually instead of clicking). Without this the
// pin would silently move off-screen.
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

// Map-click handler: drop the pin where the user clicked.
function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onChange(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function PickupLocationsMap({ lat, lng, onChange }: Props) {
  const [position, setPosition] = useState<[number, number]>([lat, lng]);

  // Sync local marker state with parent props (handles the typed-coord
  // case + initial render).
  useEffect(() => { setPosition([lat, lng]); }, [lat, lng]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 240, border: "1px solid rgba(10,24,58,0.12)" }}>
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={lat} lng={lng} />
        <ClickHandler onChange={onChange} />
        <Marker
          position={position}
          icon={DEFAULT_ICON}
          draggable
          eventHandlers={{
            dragend(e) {
              const m = e.target as L.Marker;
              const ll = m.getLatLng();
              onChange(ll.lat, ll.lng);
            },
          }}
        />
      </MapContainer>
    </div>
  );
}
