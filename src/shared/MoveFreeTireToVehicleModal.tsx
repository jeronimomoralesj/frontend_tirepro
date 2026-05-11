"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Truck, X, AlertCircle, CheckCircle2 } from "lucide-react";

// -----------------------------------------------------------------------------
// Move a freed tire (currently in the inspection's "free pool", i.e. still
// attached to the source vehicle on the server) onto a DIFFERENT vehicle's
// position. Mirrors the existing /dashboard/inventario AssignToVehicleModal
// but trimmed for the inspection surface:
//
//   1. Placa search (scoped to the source vehicle's company so a distribuidor
//      moving a tire stays inside the client's fleet).
//   2. Position pick (numeric — same convention as the inventory modal).
//   3. Blocker detection: if the target position already has a tire, the
//      user picks where THAT tire should go (Disponible or a specific
//      inventory bucket). Reencauche / fin paths are left to the dedicated
//      inventory flow — the inspection surface shouldn't grow the heavy
//      reencauche form. The user can desmontar the blocker to inventario
//      first if they want those advanced paths.
//
// Server work, executed in order so the destination position is physically
// free when the assign runs:
//   - POST /tires/:id/desmount-data   (anchor the source vehicle's km)
//   - POST /tires/unassign-vehicle    (free this tire from the source)
//   - POST /tires/unassign-vehicle    (free the blocker, if any)
//   - POST /inventory-buckets/move    (route blocker to chosen bucket, if any)
//   - POST /inventory-buckets/batch-return (assign this tire to target)
// -----------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): HeadersInit {
  let token: string | null = null;
  try {
    if (typeof window !== "undefined") token = localStorage.getItem("token");
  } catch { /* SSR / blocked storage */ }
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type FreeTireMeta = {
  id: string;
  marca: string;
  diseno?: string | null;
  placa?: string | null;
};

export type SourceVehicleMeta = {
  id: string;
  placa: string;
  kilometrajeActual?: number | null;
  companyId: string | null;
};

export type BucketOption = {
  id: string;
  nombre: string;
  color?: string | null;
  icono?: string | null;
};

type VehicleHit = {
  id: string;
  placa: string;
  tipovhc?: string | null;
};

type Blocker = {
  id:        string;
  posicion:  number;
  marca:     string;
  diseno?:   string | null;
};

export default function MoveFreeTireToVehicleModal({
  freeTire,
  sourceVehicle,
  inspectionKm,
  buckets,
  onClose,
  onDone,
}: {
  freeTire:      FreeTireMeta;
  sourceVehicle: SourceVehicleMeta;
  // Pre-fill for the desmount km — the inspection's "nuevo kilometraje"
  // field if the technician already updated it, else the vehicle's
  // current odometer. Required field; we won't submit without it.
  inspectionKm:  number | string | null | undefined;
  buckets:       BucketOption[];
  onClose:       () => void;
  onDone:        () => void;
}) {
  const [query, setQuery]                 = useState("");
  const [results, setResults]             = useState<VehicleHit[]>([]);
  const [searching, setSearching]         = useState(false);
  const [chosen, setChosen]               = useState<VehicleHit | null>(null);
  const [posicion, setPosicion]           = useState<string>("");
  const [vehicleKm, setVehicleKm]         = useState<string>(String(inspectionKm ?? sourceVehicle.kilometrajeActual ?? ""));
  const [checking, setChecking]           = useState(false);
  const [blocker, setBlocker]             = useState<Blocker | null>(null);
  const [step, setStep]                   = useState<"pick" | "blocker">("pick");
  const [blockerBucketId, setBlockerBucketId] = useState<string>("__disponible__");
  const [submitting, setSubmitting]       = useState(false);
  const [err, setErr]                     = useState("");
  const [success, setSuccess]             = useState("");

  // Debounced vehicle search by placa, scoped to the source's company so a
  // distribuidor moving a tire stays inside the active client's fleet.
  useEffect(() => {
    const q = query.trim();
    if (!q || chosen?.placa.toLowerCase() === q.toLowerCase()) {
      setResults([]);
      return;
    }
    if (!sourceVehicle.companyId) return;
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/vehicles?companyId=${encodeURIComponent(sourceVehicle.companyId!)}`,
          { headers: authHeaders() },
        );
        if (!res.ok) return;
        const all = (await res.json()) as Array<{ id: string; placa: string; tipovhc?: string | null }>;
        const lc = q.toLowerCase();
        const matches = (Array.isArray(all) ? all : [])
          .filter((v) =>
            v.placa.toLowerCase().includes(lc) && v.id !== sourceVehicle.id,
          )
          .slice(0, 8)
          .map((v) => ({ id: v.id, placa: v.placa, tipovhc: v.tipovhc ?? null }));
        if (!cancelled) setResults(matches);
      } catch { /* */ }
      finally { if (!cancelled) setSearching(false); }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, sourceVehicle.companyId, sourceVehicle.id, chosen]);

  function pickVehicle(v: VehicleHit) {
    setChosen(v);
    setQuery(v.placa);
    setResults([]);
    setBlocker(null);
    setStep("pick");
  }

  // Step 1: check if the destination position is occupied. If yes, jump to
  // the blocker resolution step; if no, jump straight to the submit path.
  async function verifyAndMaybeBlock() {
    setErr("");
    if (!chosen) { setErr("Selecciona un vehículo de destino"); return; }
    const pos = parseInt(posicion, 10);
    if (!Number.isFinite(pos) || pos < 1) { setErr("Posición inválida"); return; }
    if (!Number.isFinite(Number(vehicleKm)) || Number(vehicleKm) <= 0) {
      setErr("Ingresa el km del vehículo de origen al desmontar la llanta");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(
        `${API_BASE}/tires/vehicle?vehicleId=${encodeURIComponent(chosen.id)}`,
        { headers: authHeaders() },
      );
      if (!res.ok) {
        setErr("No se pudieron leer las llantas del vehículo de destino");
        return;
      }
      const occupied = (await res.json()) as Array<{
        id: string; posicion: number | string; marca?: string | null; diseno?: string | null;
      }>;
      const hit = (Array.isArray(occupied) ? occupied : [])
        .map((t) => ({
          id: t.id,
          posicion: Number(t.posicion),
          marca: t.marca ?? "Llanta",
          diseno: t.diseno ?? null,
        }))
        .find((t) => t.posicion === pos && t.id !== freeTire.id);
      if (hit) {
        setBlocker(hit);
        setStep("blocker");
      } else {
        // Position is free — straight to execute.
        executeMove(null);
      }
    } finally {
      setChecking(false);
    }
  }

  // Step 2: do the work. With an `active` blocker we route it to a bucket
  // first (or Disponible) so the position is physically free when the
  // batch-return below assigns the moving tire.
  async function executeMove(active: Blocker | null) {
    setErr("");
    if (!chosen) return;
    const pos = parseInt(posicion, 10);
    setSubmitting(true);
    try {
      // 1. Record desmount data on the moving tire so the source vehicle's
      //    km is anchored. We always pass the vehicle km here — the user
      //    can't get to this point without filling it. No "skip" path —
      //    moving to another vehicle is a deliberate action, not a hurry.
      const km = Number(vehicleKm);
      await fetch(`${API_BASE}/tires/${freeTire.id}/desmount-data`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({ vehicleKmAtDesmount: km }),
      });

      // 2. Unassign the moving tire from the source vehicle.
      await fetch(`${API_BASE}/tires/unassign-vehicle`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({ tireIds: [freeTire.id] }),
      });

      // 3. Resolve the blocker (if any). Same shape as the inventory
      //    AssignToVehicleModal's move_bucket path — unassign then move
      //    to a specific bucket, or leave bucket-less for "Disponible".
      if (active) {
        await fetch(`${API_BASE}/tires/unassign-vehicle`, {
          method:  "POST",
          headers: authHeaders(),
          body:    JSON.stringify({ tireIds: [active.id] }),
        });
        if (blockerBucketId !== "__disponible__") {
          await fetch(`${API_BASE}/inventory-buckets/move`, {
            method:  "POST",
            headers: authHeaders(),
            body:    JSON.stringify({
              tireId:    active.id,
              bucketId:  blockerBucketId,
              companyId: sourceVehicle.companyId,
            }),
          });
        }
      }

      // 4. Assign the moving tire to the target vehicle's position.
      const r = await fetch(`${API_BASE}/inventory-buckets/batch-return`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({
          returns:         [{ tireId: freeTire.id, vehicleId: chosen.id, posicion: pos }],
          fallbackTireIds: [],
          companyId:       sourceVehicle.companyId,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({} as { message?: string }));
        throw new Error(body?.message ?? "Error al asignar la llanta al vehículo destino");
      }

      const blockerName = active
        ? `${active.marca}${active.diseno ? ` ${active.diseno}` : ""}`
        : null;
      let msg = `Llanta movida a ${chosen.placa} P${pos}.`;
      if (blockerName) {
        if (blockerBucketId === "__disponible__") {
          msg += ` ${blockerName} movida a Disponible.`;
        } else {
          const b = buckets.find((x) => x.id === blockerBucketId);
          msg += ` ${blockerName} movida a "${b?.nombre ?? "inventario"}".`;
        }
      }
      setSuccess(msg);
      setTimeout(() => { onDone(); }, 900);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.55)" }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ border: "1px solid rgba(52,140,203,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#348CCB]/15">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#0A183A]">
              Mover {freeTire.marca}{freeTire.diseno ? ` ${freeTire.diseno}` : ""} a otro vehículo
            </h3>
            <p className="text-[11px] text-[#93b8d4] mt-0.5">
              Desde {sourceVehicle.placa.toUpperCase()}
              {freeTire.placa ? ` · serie ${freeTire.placa}` : ""}
            </p>
          </div>
          <button type="button" disabled={submitting} onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0F7FF] transition-colors">
            <X className="w-4 h-4 text-[#1E76B6]" />
          </button>
        </div>

        {success ? (
          <div className="p-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#0A183A]">Movimiento completado</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{success}</p>
            </div>
          </div>
        ) : step === "pick" ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider">
                Vehículo de destino
              </label>
              <div className="relative mt-1.5">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setChosen(null); }}
                  placeholder="Buscar por placa…"
                  className="w-full pl-9 pr-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
                />
              </div>
              {searching && (
                <p className="text-[10px] text-gray-400 mt-1">Buscando…</p>
              )}
              {results.length > 0 && (
                <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                  {results.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => pickVehicle(v)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-[#F0F7FF] transition-all"
                      style={{ border: "1px solid rgba(52,140,203,0.15)" }}
                    >
                      <Truck className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#0A183A] font-mono">{v.placa.toUpperCase()}</p>
                        {v.tipovhc && <p className="text-[10px] text-gray-400 truncate">{v.tipovhc}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {chosen && (
                <p className="text-[11px] text-emerald-700 font-bold mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {chosen.placa.toUpperCase()} seleccionado
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider">
                  Posición destino
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={posicion}
                  onChange={(e) => setPosicion(e.target.value)}
                  placeholder="ej. 3"
                  className="w-full mt-1.5 px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider">
                  Km vehículo origen
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={vehicleKm}
                  onChange={(e) => setVehicleKm(e.target.value)}
                  placeholder="ej. 123450"
                  className="w-full mt-1.5 px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
                />
              </div>
            </div>

            {err && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-800">{err}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-[#1E76B6] disabled:opacity-40 hover:bg-[#F0F7FF]"
                style={{ border: "1px solid rgba(30,118,182,0.3)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!chosen || checking || submitting}
                onClick={verifyAndMaybeBlock}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#1E76B6,#173D68)" }}
              >
                {checking || submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Mover"}
              </button>
            </div>
          </div>
        ) : (
          // Blocker step — position is occupied, choose where the
          // displaced tire goes (Disponible or specific inventory bucket).
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                P{posicion} en <strong>{chosen?.placa.toUpperCase()}</strong> está ocupada por{" "}
                <strong>
                  {blocker?.marca}{blocker?.diseno ? ` ${blocker.diseno}` : ""}
                </strong>. ¿Dónde quieres dejarla?
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#1E76B6] uppercase tracking-wider">
                Destino de la llanta desplazada
              </label>
              <select
                value={blockerBucketId}
                onChange={(e) => setBlockerBucketId(e.target.value)}
                className="w-full mt-1.5 px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
              >
                <option value="__disponible__">✅ Disponible (sin grupo)</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.icono ?? "📦"} {b.nombre}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                Para enviarla a reencauche o marcar fin de vida, ve a Inventario después de este movimiento.
              </p>
            </div>

            {err && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-800">{err}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep("pick")}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-[#1E76B6] disabled:opacity-40 hover:bg-[#F0F7FF]"
                style={{ border: "1px solid rgba(30,118,182,0.3)" }}
              >
                Atrás
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => executeMove(blocker)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#1E76B6,#173D68)" }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Confirmar movimiento"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
