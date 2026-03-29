"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

interface DistributorMapData {
  id: string;
  name: string;
  profileImage: string;
  colorMarca: string | null;
  cobertura: { ciudad: string; direccion: string; lat: number; lng: number }[];
  telefono: string | null;
  ciudad: string | null;
  _count: { listings: number };
}

export default function DistributorMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [distributors, setDistributors] = useState<DistributorMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/marketplace/distributors/map`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setDistributors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || distributors.length === 0 || !mapRef.current || mapLoaded) return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const map = L.map(mapRef.current).setView([4.6, -74.08], 6); // Colombia center

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      // Add markers for each distributor location
      distributors.forEach((d) => {
        const color = d.colorMarca ?? "#1E76B6";
        const cob = d.cobertura.filter((c) => c.lat && c.lng);

        cob.forEach((loc) => {
          const icon = L.divIcon({
            className: "",
            html: `<div style="
              width:32px; height:32px; border-radius:50%; background:${color};
              border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3);
              display:flex; align-items:center; justify-content:center;
              overflow:hidden;
            ">
              ${d.profileImage && d.profileImage !== "https://tireproimages.s3.us-east-1.amazonaws.com/companyResources/logoFull.png"
                ? `<img src="${d.profileImage}" style="width:20px; height:20px; object-fit:contain; border-radius:2px;" />`
                : `<span style="color:white; font-size:10px; font-weight:900;">${d.name.charAt(0)}</span>`
              }
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          L.marker([loc.lat, loc.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:system-ui; min-width:160px;">
                <p style="font-weight:800; color:#0A183A; margin:0 0 4px; font-size:13px;">${d.name}</p>
                <p style="font-size:11px; color:#666; margin:0 0 2px;">${loc.ciudad}${loc.direccion ? ` · ${loc.direccion}` : ""}</p>
                <p style="font-size:11px; color:#666; margin:0 0 8px;">${d._count.listings} productos</p>
                <a href="/marketplace/distributor/${d.id}" style="
                  display:inline-block; padding:4px 12px; border-radius:8px;
                  background:${color}; color:white; font-size:11px; font-weight:700;
                  text-decoration:none;
                ">Ver catalogo</a>
              </div>
            `);
        });
      });

      setMapLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup handled by Leaflet internally
    };
  }, [loading, distributors, mapLoaded]);

  if (loading) {
    return (
      <div className="h-64 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#1E76B6]" />
      </div>
    );
  }

  if (distributors.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-black text-[#0A183A] mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#1E76B6]" />
        Distribuidores en Colombia
      </h2>
      <div ref={mapRef} className="h-72 sm:h-80 rounded-2xl overflow-hidden border border-gray-200" style={{ zIndex: 0 }} />
      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
        {distributors.map((d) => (
          <Link key={d.id} href={`/marketplace/distributor/${d.id}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-gray-100 hover:shadow text-[10px] font-bold text-[#0A183A] flex-shrink-0 transition-all">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.colorMarca ?? "#1E76B6" }} />
            {d.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
