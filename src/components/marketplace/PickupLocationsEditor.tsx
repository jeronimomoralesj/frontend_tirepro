"use client";

// Distributor-facing editor for manual pickup locations on a single
// listing. Used inside the Edit-Listing modal in
// /dashboard/marketplace/productos when:
//   - deliveryMode is "pickup" or "both", AND
//   - there's no retailSource connected (Alkosto/Ktronix integration)
// Otherwise the dist either uses the retailer's daily-scraped points
// or has no pickup option to manage.
//
// Each location carries name + address + city + lat/lng + stock units.
// Map is Leaflet over OpenStreetMap (free, no API key) — buyer side
// just gets the lat/lng so we don't actually render the map there.

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Plus, Trash2, Check, X, Edit2 } from "lucide-react";

// react-leaflet pulls in `window` references at module-eval time, which
// crashes Next.js SSR. Lazy-import the actual map shell with ssr:false
// so it only loads on the client.
const PickupMap = dynamic(() => import("./PickupLocationsMap"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

interface PickupLocation {
  id: string;
  distributorListingId: string;
  name: string;
  address: string | null;
  city: string;
  cityDisplay: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  stockUnits: number;
  isActive: boolean;
}

interface DraftLocation {
  id?: string; // present when editing an existing row
  name: string;
  address: string;
  city: string;
  cityDisplay: string;
  lat: number | null;
  lng: number | null;
  hours: string;
  stockUnits: number;
  isActive: boolean;
}

const EMPTY_DRAFT: DraftLocation = {
  name: "",
  address: "",
  city: "",
  cityDisplay: "",
  lat: 4.711,    // Bogotá centre — gives the map a sensible initial view
  lng: -74.072,
  hours: "",
  stockUnits: 0,
  isActive: true,
};

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("token") ?? "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export function PickupLocationsEditor({ listingId }: { listingId: string }) {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [draft, setDraft]         = useState<DraftLocation | null>(null);
  const [saving, setSaving]       = useState(false);

  const refresh = useMemo(() => async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/marketplace/listings/${listingId}/pickup-locations`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        setError("No se pudieron cargar los puntos de recogida.");
        setLocations([]);
        return;
      }
      const data = (await res.json()) as PickupLocation[];
      setLocations(data);
    } catch {
      setError("Error de red al cargar puntos.");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { void refresh(); }, [refresh]);

  function startNew() {
    setDraft({ ...EMPTY_DRAFT });
  }
  function startEdit(loc: PickupLocation) {
    setDraft({
      id:          loc.id,
      name:        loc.name,
      address:     loc.address ?? "",
      city:        loc.city,
      cityDisplay: loc.cityDisplay ?? loc.city,
      lat:         loc.lat ?? EMPTY_DRAFT.lat,
      lng:         loc.lng ?? EMPTY_DRAFT.lng,
      hours:       loc.hours ?? "",
      stockUnits:  loc.stockUnits,
      isActive:    loc.isActive,
    });
  }
  function cancel() { setDraft(null); }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { setError("Nombre requerido"); return; }
    if (!draft.cityDisplay.trim()) { setError("Ciudad requerida"); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        name:        draft.name.trim(),
        address:     draft.address.trim() || null,
        city:        draft.cityDisplay.trim(),  // backend normalises
        cityDisplay: draft.cityDisplay.trim(),
        lat:         draft.lat,
        lng:         draft.lng,
        hours:       draft.hours.trim() || null,
        stockUnits:  Math.max(0, Math.floor(draft.stockUnits)),
        isActive:    draft.isActive,
      };
      const url = draft.id
        ? `${API_BASE}/marketplace/listings/${listingId}/pickup-locations/${draft.id}`
        : `${API_BASE}/marketplace/listings/${listingId}/pickup-locations`;
      const res = await fetch(url, {
        method: draft.id ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setError(txt.slice(0, 200) || "No se pudo guardar.");
        return;
      }
      setDraft(null);
      await refresh();
    } catch {
      setError("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este punto de recogida?")) return;
    try {
      const res = await fetch(`${API_BASE}/marketplace/listings/${listingId}/pickup-locations/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) { setError("No se pudo eliminar."); return; }
      await refresh();
    } catch {
      setError("Error de red al eliminar.");
    }
  }

  return (
    <div className="rounded-xl p-3.5" style={{ background: "#F8FAFC", border: "1px solid rgba(10,24,58,0.06)" }}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Puntos de recogida</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Tus tiendas físicas donde el comprador puede recoger esta llanta.
          </p>
        </div>
        {!draft && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black text-white"
            style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
          >
            <Plus className="w-3 h-3" /> Agregar punto
          </button>
        )}
      </div>

      {error && <p className="text-[11px] text-red-600 font-bold mb-2">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {locations.length === 0 && !draft && (
            <p className="text-[12px] text-gray-500 italic py-3 text-center">
              Aún no has agregado puntos de recogida para esta llanta.
            </p>
          )}

          {/* List existing */}
          {locations.length > 0 && (
            <ul className="space-y-2">
              {locations.map((loc) => (
                <li
                  key={loc.id}
                  className="flex items-start justify-between gap-2 rounded-xl bg-white px-3 py-2.5"
                  style={{ border: "1px solid rgba(10,24,58,0.08)", opacity: loc.isActive ? 1 : 0.55 }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-[#0A183A] truncate">{loc.name}</p>
                    {loc.cityDisplay && (
                      <p className="text-[11px] text-gray-500 truncate">{loc.cityDisplay}{loc.address ? ` · ${loc.address}` : ""}</p>
                    )}
                    {loc.hours && <p className="text-[10px] text-gray-400 truncate">{loc.hours}</p>}
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span
                        className="px-1.5 py-0.5 rounded-full font-black"
                        style={{
                          background: loc.stockUnits > 0 ? "rgba(34,197,94,0.10)" : "rgba(107,114,128,0.10)",
                          color:      loc.stockUnits > 0 ? "#15803d" : "#6b7280",
                        }}
                      >
                        {loc.stockUnits} {loc.stockUnits === 1 ? "unidad" : "unidades"}
                      </span>
                      {!loc.isActive && (
                        <span className="text-gray-500 italic">Inactivo</span>
                      )}
                      {loc.lat != null && loc.lng != null && (
                        <span className="text-gray-400 inline-flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" /> Mapa
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(loc)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#1E76B6] hover:bg-[#F0F7FF]"
                      aria-label="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(loc.id)}
                      className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Add / edit form */}
          {draft && (
            <div className="mt-3 rounded-xl bg-white p-3" style={{ border: "1px solid rgba(30,118,182,0.20)" }}>
              <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">
                {draft.id ? "Editar punto" : "Nuevo punto"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block sm:col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Nombre del punto *</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Bodega Centro / Tienda Norte"
                    className="w-full px-3 py-2 rounded-lg text-[13px] bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A]"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Ciudad *</span>
                  <input
                    type="text"
                    value={draft.cityDisplay}
                    onChange={(e) => setDraft({ ...draft, cityDisplay: e.target.value })}
                    placeholder="Bogotá"
                    className="w-full px-3 py-2 rounded-lg text-[13px] bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A]"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Unidades en stock</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.stockUnits}
                    onChange={(e) => setDraft({ ...draft, stockUnits: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-[13px] bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A]"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Dirección</span>
                  <input
                    type="text"
                    value={draft.address}
                    onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                    placeholder="Calle 100 # 15-20"
                    className="w-full px-3 py-2 rounded-lg text-[13px] bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A]"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Horarios</span>
                  <input
                    type="text"
                    value={draft.hours}
                    onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
                    placeholder="Lun–Vie 8am–6pm · Sáb 9am–1pm"
                    className="w-full px-3 py-2 rounded-lg text-[13px] bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/20 focus:border-[#1E76B6] text-[#0A183A]"
                  />
                </label>
              </div>

              {/* Map pin-drop. Centred on the current draft lat/lng,
                  click anywhere to move the pin. Stays fully sync'd
                  with the lat/lng inputs above (which we don't show
                  separately to keep the form clean). */}
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Ubica el pin
                  <span className="text-gray-400 normal-case font-normal tracking-normal">
                    · arrastra o haz clic en el mapa
                  </span>
                </p>
                <PickupMap
                  lat={draft.lat ?? EMPTY_DRAFT.lat!}
                  lng={draft.lng ?? EMPTY_DRAFT.lng!}
                  onChange={(lat, lng) => setDraft({ ...draft, lat, lng })}
                />
                <p className="text-[10px] text-gray-400 mt-1 tabular-nums">
                  Coordenadas: {(draft.lat ?? 0).toFixed(5)}, {(draft.lng ?? 0).toFixed(5)}
                </p>
              </div>

              <label className="mt-3 flex items-center gap-2 text-[12px] text-[#0A183A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[#1E76B6]"
                />
                <span>Visible para compradores</span>
              </label>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  style={{ border: "1px solid rgba(10,24,58,0.10)" }}
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg text-[12px] font-black text-white disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                >
                  {saving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <><Check className="w-3.5 h-3.5" /> Guardar</>}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
