"use client";

import React, { useState } from "react";
import {
  Search, X, AlertTriangle, Loader2, CheckCircle,
  Layers, Clock, Plus, CalendarDays,
} from "lucide-react";

// =============================================================================
// Types — aligned with backend schema
// =============================================================================

interface TireEvento {
  id: string;
  tipo: string;
  fecha: string;
  notas?: string | null;
}

interface Tire {
  id: string;
  placa: string;
  marca: string;
  posicion?: number | null;
  eventos?: TireEvento[];
}

interface Vehicle {
  id: string;
  placa: string;
  tipovhc?: string;
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

const VIDA_ORDER = ["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"] as const;

// =============================================================================
// Helpers
// =============================================================================

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

/** Get current vida from TireEvento[] (backend stores vida in eventos.notas) */
function currentVida(eventos?: TireEvento[]): string {
  if (!eventos?.length) return "nueva";
  const vidaEventos = eventos.filter(
    (e) => e.notas && VIDA_ORDER.includes(e.notas.toLowerCase() as typeof VIDA_ORDER[number])
  );
  if (!vidaEventos.length) return "nueva";
  return vidaEventos[vidaEventos.length - 1].notas!.toLowerCase();
}

/** Get last non-vida evento (the actual custom events) */
function lastCustomEvent(eventos?: TireEvento[]): TireEvento | null {
  if (!eventos?.length) return null;
  const custom = [...eventos]
    .reverse()
    .find(e => !e.notas || !VIDA_ORDER.includes(e.notas.toLowerCase() as typeof VIDA_ORDER[number]));
  return custom ?? null;
}

const VIDA_LABELS: Record<string, string> = {
  nueva: "Nueva",
  reencauche1: "Reencauche 1",
  reencauche2: "Reencauche 2",
  reencauche3: "Reencauche 3",
  fin: "Fin de vida",
};

function vidaBadgeStyle(vida: string): React.CSSProperties {
  if (vida === "fin")   return { background: "rgba(220,38,38,0.1)",  color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)" };
  if (vida === "nueva") return { background: "rgba(22,163,74,0.1)",  color: "#16a34a", border: "1px solid rgba(22,163,74,0.25)" };
  return                       { background: "rgba(30,118,182,0.1)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.25)" };
}

// =============================================================================
// Design-system micro-components (matching VidaPage)
// =============================================================================

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.15)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <div>
        <p className="text-sm font-black text-[#0A183A] leading-none">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl text-sm font-medium text-[#0A183A] bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all";
const inputStyle = { border: "1.5px solid rgba(52,140,203,0.2)" };

// =============================================================================
// Main component
// =============================================================================

const EventosPage: React.FC = () => {
  const [searchTerm,     setSearchTerm]     = useState("");
  const [vehicle,        setVehicle]        = useState<Vehicle | null>(null);
  const [tires,          setTires]          = useState<Tire[]>([]);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");
  const [loading,        setLoading]        = useState(false);

  // Modal state
  const [selectedTire,   setSelectedTire]   = useState<Tire | null>(null);
  const [newEventText,   setNewEventText]   = useState("");
  const [modalError,     setModalError]     = useState("");
  const [showModal,      setShowModal]      = useState(false);
  const [saving,         setSaving]         = useState(false);

  // ── Search ─────────────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setVehicle(null); setTires([]);
    if (!searchTerm.trim()) { setError("Por favor ingrese la placa del vehículo."); return; }

    setLoading(true);
    try {
      const vRes = await authFetch(
        `${API_BASE}/vehicles/by-placa?placa=${encodeURIComponent(searchTerm.trim().toLowerCase())}`
      );
      if (!vRes.ok) throw new Error("Vehículo no encontrado");
      const vData: Vehicle = await vRes.json();
      setVehicle(vData);

      const tRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${vData.id}`);
      if (!tRes.ok) throw new Error("Error al obtener las llantas");
      const tData: Tire[] = await tRes.json();
      tData.sort((a, b) => (a.posicion ?? Infinity) - (b.posicion ?? Infinity));
      setTires(tData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function openModal(tire: Tire) {
    setSelectedTire(tire);
    setNewEventText("");
    setModalError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedTire(null);
    setNewEventText("");
    setModalError("");
  }

  // ── Submit event ───────────────────────────────────────────────────────────
  async function handleAddEvent() {
    if (!newEventText.trim()) { setModalError("Ingrese el texto del evento."); return; }
    if (!selectedTire) return;

    setSaving(true);
    try {
      // Backend: PATCH /tires/:id/eventos  body: { valor: string }
      const res = await authFetch(`${API_BASE}/tires/${selectedTire.id}/eventos`, {
        method: "PATCH",
        body: JSON.stringify({ valor: newEventText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error desconocido" }));
        throw new Error(err.message ?? "Error desconocido");
      }

      const updated: Tire = await res.json();
      setTires(prev =>
        prev
          .map(t => (t.id === updated.id ? updated : t))
          .sort((a, b) => (a.posicion ?? Infinity) - (b.posicion ?? Infinity))
      );

      setSuccess("Evento agregado exitosamente.");
      setTimeout(() => setSuccess(""), 5000);
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div style={{ background: "white" }}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* ── Success banner ─────────────────────────────────────────────── */}
        {success && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}
          >
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="flex-1 text-green-700">{success}</span>
            <button onClick={() => setSuccess("")}><X className="w-4 h-4 text-green-400" /></button>
          </div>
        )}

        {/* ── Search card ───────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5">
          <CardTitle icon={Search} title="Buscar Vehículo" sub="Ingrese la placa para cargar las llantas" />
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ textTransform: "uppercase" }}
                placeholder="Ej. abc-123"
                className={`${inputCls} pl-10`}
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Buscando…</>
                : <><Search className="w-4 h-4" />Buscar</>
              }
            </button>
          </form>
        </Card>

        {/* ── Vehicle info ──────────────────────────────────────────────── */}
        {vehicle && (
          <Card className="p-4 sm:p-5">
            <CardTitle icon={CheckCircle} title="Vehículo Encontrado" />
            <div
              className="flex flex-wrap gap-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.12)" }}
            >
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Placa</p>
                <p className="text-sm font-black text-[#0A183A]">{vehicle.placa.toUpperCase()}</p>
              </div>
              {vehicle.tipovhc && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tipo</p>
                  <p className="text-sm font-black text-[#0A183A]">{vehicle.tipovhc}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Llantas</p>
                <p className="text-sm font-black text-[#0A183A]">{tires.length}</p>
              </div>
            </div>
          </Card>
        )}

        {/* ── Tire grid ─────────────────────────────────────────────────── */}
        {tires.length > 0 && (
          <div>
            <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide mb-3">
              Llantas — {tires.length} encontrada{tires.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tires.map(tire => {
                const vida   = currentVida(tire.eventos);
                const ultimo = lastCustomEvent(tire.eventos);

                return (
                  <Card key={tire.id} className="overflow-hidden">
                    {/* Top accent stripe */}
                    <div
                      className="h-1"
                      style={{
                        background:
                          vida === "fin"   ? "#DC2626" :
                          vida === "nueva" ? "#16a34a" : "#1E76B6",
                      }}
                    />
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#0A183A] truncate">{tire.placa}</p>
                          <p className="text-[10px] text-gray-400">{tire.marca}</p>
                        </div>
                        <span
                          className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{ background: "rgba(10,24,58,0.06)", color: "#173D68" }}
                        >
                          Pos. {tire.posicion ?? "—"}
                        </span>
                      </div>

                      {/* Vida badge */}
                      <div className="mb-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-black"
                          style={vidaBadgeStyle(vida)}
                        >
                          {VIDA_LABELS[vida] ?? vida}
                        </span>
                      </div>

                      {/* Last custom event */}
                      {ultimo ? (
                        <div
                          className="mb-3 px-3 py-2 rounded-xl text-xs"
                          style={{
                            background: "rgba(10,24,58,0.02)",
                            border: "1px solid rgba(52,140,203,0.12)",
                          }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <CalendarDays className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400">
                              {new Date(ultimo.fecha).toLocaleDateString("es-CO")}
                            </span>
                          </div>
                          <p className="text-[#0A183A] font-medium leading-snug line-clamp-2">
                            {ultimo.notas ?? "—"}
                          </p>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <p className="text-[11px] text-gray-400 italic">Sin eventos registrados</p>
                        </div>
                      )}

                      {/* CTA */}
                      <button
                        onClick={() => openModal(tire)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #173D68, #1E76B6)" }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar Evento
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && selectedTire && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,24,58,0.5)" }}
        >
          <Card className="w-full max-w-md">
            {/* Modal header */}
            <div
              className="px-5 py-4 flex items-center justify-between rounded-t-2xl"
              style={{
                background: "linear-gradient(135deg, #0A183A, #173D68)",
                borderBottom: "1px solid rgba(52,140,203,0.12)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-black text-white">Agregar Evento</p>
              </div>
              <button onClick={closeModal}>
                <X className="w-4 h-4 text-white/70 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Tire summary */}
              <div
                className="px-4 py-3 rounded-xl text-xs space-y-1"
                style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.12)" }}
              >
                <p>
                  <span className="font-bold text-[#0A183A]">Placa:</span>{" "}
                  <span className="text-[#173D68]">{selectedTire.placa}</span>
                </p>
                <p>
                  <span className="font-bold text-[#0A183A]">Marca:</span>{" "}
                  <span className="text-[#173D68]">{selectedTire.marca}</span>
                </p>
                <p>
                  <span className="font-bold text-[#0A183A]">Posición:</span>{" "}
                  <span className="text-[#173D68]">{selectedTire.posicion ?? "—"}</span>
                </p>
                <p>
                  <span className="font-bold text-[#0A183A]">Vida actual:</span>{" "}
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-black"
                    style={vidaBadgeStyle(currentVida(selectedTire.eventos))}
                  >
                    {VIDA_LABELS[currentVida(selectedTire.eventos)] ?? currentVida(selectedTire.eventos)}
                  </span>
                </p>
              </div>

              {/* Modal error */}
              {modalError && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                  style={{
                    background: "rgba(220,38,38,0.06)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    color: "#DC2626",
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {modalError}
                </div>
              )}

              {/* Event textarea */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-[#0A183A] uppercase tracking-wide">
                  Detalle del Evento
                </label>
                <textarea
                  value={newEventText}
                  onChange={e => setNewEventText(e.target.value)}
                  placeholder="Describa el evento o incidencia…"
                  rows={4}
                  className={`${inputCls} resize-none`}
                  style={inputStyle}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                  style={{
                    background: "rgba(10,24,58,0.05)",
                    color: "#0A183A",
                    border: "1px solid rgba(52,140,203,0.2)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
                    : <><Plus className="w-4 h-4" />Guardar</>
                  }
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EventosPage;