"use client";

import React, { useEffect, useState } from "react";
import {
  Users, Tag, Search, Timer, Camera, AlertTriangle, ArrowLeft,
  Truck, Gauge, Wind, CheckCircle2, Loader2, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { fallbackAxleLayout } from "../../../shared/axleLayoutFallback";

export type UserData = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
  plates: string[];
};

type Inspeccion = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
};

type Vehicle = {
  id: string;
  placa: string;
  tipovhc: string;
  tireCount: number;
  kilometrajeActual: number;
  configuracion?: string;
};

type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion: number;
  profundidadInicial: number;
  inspecciones?: Inspeccion[];
};

type TireUpdate = {
  profundidadInt: number | "";
  profundidadCen: number | "";
  profundidadExt: number | "";
  presionPsi: number | "";
  observacion: string;
  image: File | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

// -- Vehicle diagram ----------------------------------------------------------

function parseConfig(cfg: string): number[][] {
  const parts = cfg.split("-").map(Number).filter((n) => n > 0);
  const axles: number[][] = [];
  let pos = 1;
  for (const count of parts) {
    const a: number[] = [];
    for (let i = 0; i < count; i++) a.push(pos++);
    axles.push(a);
  }
  return axles;
}

function VehicleDiagram({
  tires,
  tireUpdates,
  configuracion,
}: {
  tires: Tire[];
  tireUpdates: Record<string, TireUpdate>;
  configuracion?: string | null;
}) {
  const tireMap: Record<number, Tire> = {};
  tires.forEach((t) => { if (t.posicion > 0) tireMap[t.posicion] = t; });
  const maxPos = Math.max(0, ...tires.map((t) => t.posicion));

  let axles: number[][] = [];
  if (configuracion) axles = parseConfig(configuracion);
  if (axles.length === 0) axles = fallbackAxleLayout(maxPos);

  const covered = new Set<number>();
  axles.forEach((a) => a.forEach((p) => covered.add(p)));
  const leftover = tires
    .map((t) => t.posicion)
    .filter((p) => p > 0 && !covered.has(p))
    .sort((a, b) => a - b);
  for (let i = 0; i < leftover.length; i += 2) {
    axles.push(leftover.slice(i, i + 2));
  }

  function statusOf(pos: number): "done" | "partial" | "empty" | "none" {
    const t = tireMap[pos];
    if (!t) return "none";
    const u = tireUpdates[t.id];
    if (!u) return "empty";
    const filled = [u.profundidadInt, u.profundidadCen, u.profundidadExt].filter((v) => v !== "" && v !== 0).length;
    if (filled === 3) return "done";
    if (filled > 0) return "partial";
    return "empty";
  }

  const statusColor: Record<string, string> = {
    done: "#22c55e",
    partial: "#f97316",
    empty: "rgba(52,140,203,0.3)",
    none: "rgba(10,24,58,0.08)",
  };

  return (
    <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-3.5 h-3.5 text-[#1E76B6]" />
        <p className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider">Diagrama del vehículo</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        {axles.map((axle, axleIdx) => {
          const mid = Math.ceil(axle.length / 2);
          const left = axle.slice(0, mid);
          const right = axle.slice(mid);
          const tileFor = (pos: number) => {
            const tire = tireMap[pos];
            const status = statusOf(pos);
            return (
              <div
                key={pos}
                className="relative flex flex-col items-center justify-center rounded-lg"
                style={{
                  width: 50, height: 50,
                  background: "rgba(10,24,58,0.02)",
                  border: `2px solid ${statusColor[status]}`,
                  opacity: tire ? 1 : 0.4,
                }}
              >
                <span className="text-[9px] font-black" style={{ color: "#0A183A" }}>P{pos}</span>
                {tire && <span className="text-[7px] font-bold truncate max-w-[40px]" style={{ color: "#348CCB" }}>{tire.marca}</span>}
                {status === "done" && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border border-white" />}
                {status === "partial" && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-400 border border-white" />}
              </div>
            );
          };
          return (
            <div key={axleIdx} className="flex items-center gap-0">
              <div className="flex items-center gap-0.5">{left.map(tileFor)}</div>
              <div className="h-3 mx-1 rounded-full flex items-center justify-center" style={{ background: "#0A183A", minWidth: 36, width: 44 }}>
                <div className="h-0.5 w-7 rounded-full" style={{ background: "#1E76B6" }} />
              </div>
              <div className="flex items-center gap-0.5">{right.map(tileFor)}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-3 mt-3">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[9px] text-gray-400">Completa</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-[9px] text-gray-400">Parcial</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "rgba(52,140,203,0.3)" }} /><span className="text-[9px] text-gray-400">Pendiente</span></div>
      </div>
    </div>
  );
}

// -- Tire inspection card -----------------------------------------------------

function TireCard({
  tire,
  update,
  onChange,
}: {
  tire: Tire;
  update: TireUpdate;
  onChange: (field: string, value: any) => void;
}) {
  const [showExtras, setShowExtras] = useState(false);
  const lastInsp = (tire.inspecciones ?? [])[0];
  const prevDepths = lastInsp
    ? `${lastInsp.profundidadInt} / ${lastInsp.profundidadCen} / ${lastInsp.profundidadExt} mm`
    : null;

  const depthFields = [
    { key: "profundidadInt", label: "Interior", last: lastInsp?.profundidadInt },
    { key: "profundidadCen", label: "Central", last: lastInsp?.profundidadCen },
    { key: "profundidadExt", label: "Exterior", last: lastInsp?.profundidadExt },
  ] as const;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.18)" }}>
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
        <Gauge className="w-3.5 h-3.5 text-white/70" />
        <span className="text-xs font-bold text-white tracking-wide">
          {tire.placa} — P{tire.posicion} — {tire.marca}
        </span>
      </div>

      <div className="p-4 space-y-3 bg-white">
        {/* Previous inspection reference */}
        {prevDepths && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px]"
            style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(52,140,203,0.15)" }}>
            <span className="text-[#348CCB] font-semibold">Última inspección:</span>
            <span className="text-[#0A183A] font-semibold">{prevDepths}</span>
          </div>
        )}

        {/* Depth inputs */}
        <div>
          <p className="text-[10px] font-black text-[#173D68] uppercase tracking-wider mb-2">
            Profundidades (mm)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {depthFields.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider text-center mb-1">
                  {f.label}
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.1}
                  inputMode="decimal"
                  value={update[f.key] === "" ? "" : update[f.key]}
                  placeholder={f.last != null ? String(f.last) : "mm"}
                  onChange={(e) => onChange(f.key, e.target.value === "" ? "" : Number(e.target.value))}
                  className={`${inputCls} text-center`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Image upload */}
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium"
          style={{
            background: update.image ? "rgba(30,118,182,0.08)" : "#F0F7FF",
            border: "1px dashed rgba(52,140,203,0.4)",
            color: "#1E76B6",
          }}>
          <Camera className="w-4 h-4 flex-shrink-0" />
          <span className="truncate text-xs">{update.image ? update.image.name : "Foto del neumático (opcional)"}</span>
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => onChange("image", e.target.files?.[0] ?? null)} />
        </label>

        {/* Pressure toggle */}
        <button type="button" onClick={() => setShowExtras(!showExtras)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
          style={{ background: "rgba(240,247,255,0.6)", border: "1px dashed rgba(52,140,203,0.35)" }}>
          <div className="flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-[#1E76B6]" />
            <span className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider">Presión</span>
            {update.presionPsi !== "" && update.presionPsi !== 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(30,118,182,0.15)", color: "#1E76B6" }}>
                {update.presionPsi} PSI
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#348CCB]">{showExtras ? "Ocultar" : "Opcional"}</span>
        </button>
        {showExtras && (
          <div className="flex items-center gap-2 px-1">
            <input type="number" min={0} max={200} step={1}
              value={update.presionPsi === "" ? "" : update.presionPsi} placeholder="PSI"
              onChange={(e) => onChange("presionPsi", e.target.value === "" ? "" : Number(e.target.value))}
              className={`${inputCls} max-w-[120px]`} />
            <span className="text-xs text-[#348CCB]">PSI</span>
          </div>
        )}

        {/* Observation */}
        <textarea
          value={update.observacion}
          onChange={(e) => onChange("observacion", e.target.value)}
          placeholder="Observación (opcional)"
          rows={2}
          maxLength={500}
          className={inputCls + " resize-none"}
        />
      </div>
    </div>
  );
}

// -- Main component -----------------------------------------------------------

const UserPlateInspection: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [inspectablePlates, setInspectablePlates] = useState<string[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlate, setSelectedPlate] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tires, setTires] = useState<Tire[]>([]);
  const [tireUpdates, setTireUpdates] = useState<Record<string, TireUpdate>>({});
  const [newKilometraje, setNewKilometraje] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      try {
        const parsedUser: UserData = JSON.parse(storedUser);
        setUser(parsedUser);
        if (parsedUser.id) fetchInspectablePlates(parsedUser.id);
        else { setUserError("No user id"); setUserLoading(false); }
      } catch { setUserError("Error parsing user"); setUserLoading(false); }
    } else { setUserError("User not found"); setUserLoading(false); }
  }, []);

  async function fetchInspectablePlates(userId: string) {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/vehicles`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
      const data: { placa?: string }[] = await res.json();
      const placas = Array.from(
        new Set((data ?? []).map((v) => v.placa).filter((p): p is string => !!p)),
      );
      setInspectablePlates(placas);
      setUserLoading(false);
    } catch { setUserError("Error fetching plates"); setUserLoading(false); }
  }

  async function handlePlateSelection(plate: string) {
    setSelectedPlate(plate);
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const vRes = await fetch(`${API_BASE}/vehicles/by-placa?placa=${plate}`, {
        headers: authHeaders(),
      });
      if (!vRes.ok) throw new Error("Vehicle not found");
      const v = await vRes.json();
      setVehicle({
        id: v.id,
        placa: v.placa,
        tipovhc: v.tipovhc,
        tireCount: v._count?.tires ?? 0,
        kilometrajeActual: v.kilometrajeActual,
        configuracion: v.configuracion ?? undefined,
      });
      setNewKilometraje(v.kilometrajeActual);

      const tRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${v.id}`, {
        headers: authHeaders(),
      });
      if (!tRes.ok) throw new Error("Error fetching tires");
      const tData: any[] = await tRes.json();
      const sorted = tData
        .map((t) => ({
          id: t.id,
          placa: t.placa,
          marca: t.marca,
          posicion: t.posicion,
          profundidadInicial: t.profundidadInicial,
          inspecciones: Array.isArray(t.inspecciones) ? t.inspecciones : [],
        }))
        .sort((a, b) => a.posicion - b.posicion);
      setTires(sorted);
      const init: Record<string, TireUpdate> = {};
      sorted.forEach((t) => {
        init[t.id] = { profundidadInt: "", profundidadCen: "", profundidadExt: "", presionPsi: "", observacion: "", image: null };
      });
      setTireUpdates(init);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  function handleInputChange(tireId: string, field: string, value: any) {
    setTireUpdates((prev) => ({ ...prev, [tireId]: { ...prev[tireId], [field]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(""); setSuccess("");

    try {
      const toSubmit = tires.filter((t) => {
        const u = tireUpdates[t.id];
        return u && u.profundidadInt !== "" && u.profundidadCen !== "" && u.profundidadExt !== "";
      });

      if (toSubmit.length === 0) throw new Error("Complete al menos las 3 profundidades de una llanta");

      const vehicleStartingKm = vehicle?.kilometrajeActual ?? 0;
      const kmDelta = Math.max(Number(newKilometraje) - vehicleStartingKm, 0);

      for (const tire of toSubmit) {
        const u = tireUpdates[tire.id];
        const payload: Record<string, unknown> = {
          profundidadInt: Number(u.profundidadInt),
          profundidadCen: Number(u.profundidadCen),
          profundidadExt: Number(u.profundidadExt),
          newKilometraje: Number(newKilometraje),
          ...(kmDelta > 0 && { kmDelta }),
          imageUrl: u.image ? await convertFileToBase64(u.image) : "",
        };
        if (u.presionPsi !== "" && u.presionPsi !== 0) payload.presionPsi = Number(u.presionPsi);
        if (u.observacion.trim()) payload.observacion = u.observacion.trim();
        if (user?.name?.trim()) {
          payload.inspeccionadoPorNombre = user.name.trim();
          payload.inspeccionadoPorId = user.id;
        }

        const res = await fetch(`${API_BASE}/tires/${tire.id}/inspection`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.message ?? `Error al actualizar ${tire.placa}`);
        }
      }

      setSuccess(`${toSubmit.length} inspección${toSubmit.length > 1 ? "es" : ""} guardada${toSubmit.length > 1 ? "s" : ""} exitosamente`);
      setSelectedPlate(""); setVehicle(null); setTires([]); setNewKilometraje(0);
    } catch (e: any) { setError(e.message); }
    setSubmitting(false);
  }

  if (userLoading) return (
    <div className="flex items-center justify-center py-20 text-[#1E76B6]">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
  if (userError) return <div className="max-w-md mx-auto mt-8 p-4 bg-red-50 rounded-xl text-red-600 text-sm">{userError}</div>;
  if (!user) return null;

  const filteredPlates = searchQuery.trim()
    ? inspectablePlates.filter((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))
    : inspectablePlates;

  const filledCount = tires.filter((t) => {
    const u = tireUpdates[t.id];
    return u && u.profundidadInt !== "" && u.profundidadCen !== "" && u.profundidadExt !== "";
  }).length;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-[#0A183A]">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-[#348CCB]" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(30,118,182,0.3)" }}>
            <CheckCircle2 className="w-4 h-4 text-[#1E76B6] flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-[#0A183A]">{success}</span>
            <button onClick={() => setSuccess("")}><X className="w-4 h-4 text-[#348CCB]" /></button>
          </div>
        )}

        {!selectedPlate ? (
          <>
            {/* Header */}
            <div className="mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0A183A]">Inspección por Conductor</h1>
              <p className="text-sm text-[#348CCB] mt-1">Seleccione una placa para registrar inspección</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#348CCB]" />
              <input
                type="text"
                placeholder="Buscar placa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputCls} pl-10`}
              />
            </div>

            {/* Plates grid */}
            {filteredPlates.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredPlates.map((plate) => (
                  <button
                    key={plate}
                    onClick={() => handlePlateSelection(plate)}
                    className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl text-sm font-bold text-[#0A183A] transition-all hover:shadow-md active:scale-95"
                    style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                  >
                    <Tag className="w-4 h-4 text-[#1E76B6]" />
                    {plate}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#348CCB] text-sm">
                {searchQuery ? `No se encontraron placas para "${searchQuery}"` : "No hay placas asignadas"}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Back button */}
            <button
              onClick={() => { setSelectedPlate(""); setVehicle(null); setTires([]); setError(""); setSuccess(""); setSearchQuery(""); }}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#1E76B6] hover:text-[#0A183A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a mis placas
            </button>

            {/* Vehicle info bar */}
            <div className="rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #0A183A, #173D68)", border: "1px solid rgba(52,140,203,0.18)" }}>
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#348CCB]" />
                <div>
                  <p className="font-mono font-black text-white text-lg tracking-wider">{selectedPlate}</p>
                  {vehicle && <p className="text-xs text-white/50">{vehicle.tipovhc} — {tires.length} llantas</p>}
                </div>
              </div>
            </div>

            {/* Kilometraje */}
            {vehicle && (
              <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)" }}>
                <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1.5">
                  <Timer className="w-3.5 h-3.5 inline mr-1" />Kilometraje actual
                </label>
                <input
                  type="number"
                  value={newKilometraje}
                  onChange={(e) => setNewKilometraje(Number(e.target.value))}
                  className={inputCls}
                  min={0}
                />
              </div>
            )}

            {/* Vehicle diagram */}
            {tires.length > 0 && (
              <VehicleDiagram
                tires={tires}
                tireUpdates={tireUpdates}
                configuracion={vehicle?.configuracion}
              />
            )}

            {/* Tire inspection cards */}
            {tires.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-xs font-bold text-[#1E76B6] uppercase tracking-wider">
                  Llantas ({filledCount}/{tires.length} completadas)
                </p>

                {tires.map((tire) => (
                  <TireCard
                    key={tire.id}
                    tire={tire}
                    update={tireUpdates[tire.id] ?? { profundidadInt: "", profundidadCen: "", profundidadExt: "", presionPsi: "", observacion: "", image: null }}
                    onChange={(f, v) => handleInputChange(tire.id, f, v)}
                  />
                ))}

                <button
                  type="submit"
                  disabled={submitting || filledCount === 0}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Guardando...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 inline mr-2" />Guardar Inspecciones ({filledCount})</>
                  )}
                </button>
              </form>
            )}

            {vehicle && tires.length === 0 && !loading && (
              <div className="text-center py-12 bg-[#F0F7FF] rounded-xl text-[#348CCB] text-sm">
                No se encontraron llantas para este vehículo.
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#1E76B6]" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserPlateInspection;
