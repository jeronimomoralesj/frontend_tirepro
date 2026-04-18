"use client";

import { useState, useEffect, useMemo, useRef, useDeferredValue, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BarChart3, Calendar } from "lucide-react";
import FilterFab from "../components/FilterFab";
import type { FilterOption } from "../components/FilterFab";
import LazyMount from "@/shared/LazyMount";

import SemaforoPie from "../cards/semaforoPie";
import SemaforoTabla from "../cards/semaforoTabla";
import TablaCpk from "../cards/tablaCpk";
import PorMarca from "../cards/porMarca";
import PorBanda from "../cards/porBanda";
import PorVida from "../cards/porVida";
import PromedioEje from "../cards/promedioEje";
import TipoVehiculo from "../cards/tipoVehiculo";
import HistoricChart from "../cards/historicChart";
import ReencaucheHistorico from "../cards/reencaucheHistorico";
import TanqueMilimetro from "../cards/tanqueMilimetro";
import ProyeccionVida from "../cards/ProyeccionVida";

/* -- API ------------------------------------------------------------------- */

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

/* -- Raw types (API shape) ------------------------------------------------- */

type RawCosto = { valor: number; fecha: string | Date };
type RawInspeccion = {
  id: string; tireId: string; fecha: string | Date;
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  cpk: number | null; cpkProyectado: number | null; cpt: number | null; cptProyectado: number | null;
  diasEnUso: number | null; mesesEnUso: number | null;
  kilometrosEstimados: number | null; kmActualVehiculo: number | null;
  kmEfectivos: number | null; kmProyectado: number | null;
  imageUrl: string | null;
};
type RawEvento = {
  id: string; tireId: string; tipo: string; fecha: string | Date;
  notas: string | null; metadata: Record<string, unknown> | null;
};

/* -- Normalized types (card-component shape) ------------------------------- */

type Tire = {
  id: string; marca: string; diseno: string; dimension: string; eje: string;
  posicion: number; vehicleId?: string | null; profundidadInicial: number;
  kilometrosRecorridos: number;
  costo: { valor: number; fecha: string }[];
  inspecciones: {
    cpk: number; cpkProyectado: number; cpt: number; cptProyectado: number;
    fecha: string; imageUrl: string; profundidadCen: number;
    profundidadExt: number; profundidadInt: number;
    kilometrosEstimados?: number; kmActualVehiculo?: number;
    kmEfectivos?: number; kmProyectado?: number; vidaAlMomento?: string;
  }[];
  vida: { valor: string; fecha: string }[];
  [key: string]: unknown;
};

type Vehicle = {
  id: string; placa: string; cliente?: string; tipovhc?: string;
  _count?: { tires: number };
};

/* -- Normalization helpers -------------------------------------------------- */

function toISO(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

const VIDA_VALUES = new Set(["nueva", "reencauche1", "reencauche2", "reencauche3", "fin"]);

function extractVida(eventos: RawEvento[]): { valor: string; fecha: string }[] {
  return eventos
    .filter((e) => e.notas && VIDA_VALUES.has(e.notas.toLowerCase()))
    .map((e) => ({ valor: e.notas!.toLowerCase(), fecha: toISO(e.fecha) }));
}

function normaliseTire(raw: any): Tire {
  // slim API delivers costos/inspecciones in fecha-desc order already; the UI
  // wants fecha-asc. .reverse() is O(n) vs .sort() O(n log n) — saves real
  // time across 10k tires.
  const srcCostos = (raw.costos ?? []) as any[];
  const costo = srcCostos.length
    ? srcCostos.map((c) => ({ valor: c.valor ?? 0, fecha: toISO(c.fecha) })).reverse()
    : [];

  const srcInsps = (raw.inspecciones ?? []) as any[];
  const inspecciones = srcInsps.length
    ? srcInsps.map((i) => ({
        fecha: toISO(i.fecha),
        profundidadInt: i.profundidadInt ?? 0,
        profundidadCen: i.profundidadCen ?? 0,
        profundidadExt: i.profundidadExt ?? 0,
        cpk: i.cpk ?? 0,
        cpkProyectado: i.cpkProyectado ?? 0,
        cpt: i.cpt ?? 0,
        cptProyectado: i.cptProyectado ?? 0,
        imageUrl: i.imageUrl ?? "",
        kilometrosEstimados: i.kilometrosEstimados,
        kmActualVehiculo: i.kmActualVehiculo,
        kmEfectivos: i.kmEfectivos,
        kmProyectado: i.kmProyectado,
      })).reverse()
    : [];

  const vida = extractVida(raw.eventos ?? []);
  return { ...raw, costo, inspecciones, vida } as unknown as Tire;
}

/* -- Alert classification -------------------------------------------------- */

type AlertKey = "ok" | "watch" | "warning" | "critical" | "none";

function classifyAlert(tire: Tire): AlertKey {
  if (!tire.inspecciones.length) return "none";
  const last = tire.inspecciones[tire.inspecciones.length - 1];
  const minDepth = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
  // Thresholds must match SemaforoPie exactly
  if (minDepth > 7) return "ok";       // Óptimo
  if (minDepth > 6) return "watch";    // 60 Días
  if (minDepth > 3) return "warning";  // 30 Días
  return "critical";                    // Urgente
}

const ALERT_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  ok: { label: "Optimo", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  watch: { label: "60 Dias", color: "#eab308", bg: "rgba(234,179,8,0.08)" },
  warning: { label: "30 Dias", color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  critical: { label: "Urgente", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  none: { label: "Sin Inspeccion", color: "#64748b", bg: "rgba(100,116,139,0.08)" },
};

/* -- Streaming progress bar — sticky thin bar + numeric pill ----------------
 * Mirrors the resumen/distribuidor component so the UX is consistent across
 * the three dashboards.
 * ---------------------------------------------------------------------------- */

function LoadProgressBar({
  streaming, loaded, expected,
}: {
  streaming: boolean; loaded: number; expected: number;
}) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (streaming) {
      setVisible(true);
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    } else if (visible) {
      hideTimer.current = setTimeout(() => setVisible(false), 800);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [streaming, visible]);

  if (!visible) return null;

  const hasExpected = expected > 0;
  const pct = hasExpected ? Math.min(100, Math.round((loaded / expected) * 100)) : 0;
  const isDone = !streaming && hasExpected;

  return (
    <>
      {/* Fixed strip at the very top of the viewport — z-50 keeps it above
          the sticky page header (z-40) which was painting over the 1px
          sticky-z-30 version and making it invisible. */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-gray-100/80 overflow-hidden pointer-events-none">
        <div
          className={hasExpected ? "h-full transition-all duration-300" : "h-full animate-pulse"}
          style={{
            width: hasExpected ? `${isDone ? 100 : Math.max(pct, 3)}%` : "40%",
            background: "linear-gradient(90deg, #1E76B6 0%, #348CCB 50%, #7DC5F0 100%)",
            boxShadow: "0 0 12px rgba(52,140,203,0.55)",
            marginLeft: hasExpected ? "0" : "30%",
          }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
        <div
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-[11px]"
          style={{
            background: "linear-gradient(135deg, rgba(30,118,182,0.06), rgba(52,140,203,0.04))",
            border: "1px solid rgba(52,140,203,0.2)",
          }}
        >
          <Loader2 className={`w-3.5 h-3.5 text-[#1E76B6] ${streaming ? "animate-spin" : ""}`} />
          <span className="font-bold text-[#0A183A]">
            {isDone
              ? "Listo"
              : hasExpected
                ? `Cargando ${loaded.toLocaleString("es-CO")} de ${expected.toLocaleString("es-CO")} llantas`
                : `Cargando ${loaded.toLocaleString("es-CO")} llantas…`}
          </span>
          {hasExpected && (
            <span className="ml-auto text-[#1E76B6] font-black tabular-nums">
              {isDone ? "100%" : `${pct}%`}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/* -- Section header -------------------------------------------------------- */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#348CCB]">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

/* =========================================================================== */
/* Page                                                                       */
/* =========================================================================== */

export default function DetallePage() {
  const router = useRouter();
  // `allTires` is the unthrottled accumulator; `tires` is a frozen snapshot
  // updated only on first chunk + stream completion so charts don't
  // re-render 8 times for 16k-tire clients. Same pattern as resumen.
  const [allTires, setAllTires]   = useState<Tire[]>([]);
  const [tires, setTires]         = useState<Tire[]>([]);
  const [vehicles, setVehicles]   = useState<Vehicle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [loadedTires, setLoadedTires]     = useState(0);
  const [expectedTires, setExpectedTires] = useState(0);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    alert: "Todos", marca: "Todos", eje: "Todos", vida: "Todos",
  });
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedEje, setSelectedEje] = useState("");

  /* -- Fetch --------------------------------------------------------------- */

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    let user: { companyId?: string };
    try { user = JSON.parse(stored); } catch { router.push("/login"); return; }
    if (!user.companyId) return;

    setLoading(true);
    setStreaming(true);
    setLoadedTires(0);

    // Expected tire count for the progress bar denominator. Uses the
    // shared cache so RouteGuard/sidebar/here all share one network call.
    import("@/shared/fetchCompany")
      .then(({ fetchCompany }) => fetchCompany(user.companyId!))
      .then((c) => {
        const total = c?._count?.tires ?? c?.stats?.tires ?? 0;
        if (typeof total === "number" && total > 0) setExpectedTires(total);
      })
      .catch(() => {});

    (async () => {
      try {
        const { fetchTiresProgressive } = await import('@/shared/fetchTiresPaged');
        // Kick off the vehicles fetch in parallel — it's small enough to be
        // fire-and-forget against the incoming tire stream.
        const vehiclesPromise = authFetch(`${API_BASE}/vehicles?companyId=${user.companyId}`)
          .then((r) => r.ok ? r.json() : [])
          .then((v) => setVehicles(v))
          .catch(() => {});

        // Incremental normalisation: only normalise the NEW tires in each
        // chunk, not the full accumulator. Saves ~100ms per 1k tires.
        const normalisedAcc: Tire[] = [];
        let lastIdx = 0;

        await fetchTiresProgressive<any>(user.companyId!, {
          // Unthrottled — keeps the progress bar smooth.
          onProgress: (loaded) => setLoadedTires(loaded),
          // Throttled (750ms default).
          onChunk: (soFar) => {
            const arr = soFar as any[];
            for (let i = lastIdx; i < arr.length; i++) {
              normalisedAcc.push(normaliseTire(arr[i]));
            }
            lastIdx = arr.length;
            const snapshot = normalisedAcc.slice();
            startTransition(() => {
              setAllTires(snapshot);
            });
            setLoading(false);
          },
        });
        await vehiclesPromise;
      } catch {/* silent */}
      setLoading(false);
      setStreaming(false);
    })();
  }, [router]);

  /* -- Chart data snapshot (first chunk + stream end only) ---------------- */
  useEffect(() => {
    if (allTires.length === 0) {
      if (tires.length !== 0) setTires([]);
      return;
    }
    if (tires.length === 0) {
      setTires(allTires);
      return;
    }
    if (!streaming && tires !== allTires) {
      setTires(allTires);
    }
  }, [allTires, streaming, tires]);

  /* -- Vehicle map --------------------------------------------------------- */

  const vehicleMap = useMemo(() => {
    const m: Record<string, string> = {};
    vehicles.forEach((v) => { m[v.id] = v.placa; });
    return m;
  }, [vehicles]);

  /* -- Filter options ------------------------------------------------------ */

  const ALERT_OPTIONS = ["Todos", "ok", "watch", "warning", "critical", "none"];

  const filterOptions: FilterOption[] = useMemo(() => [
    { key: "alert", label: "Estado", options: ALERT_OPTIONS.map((a) => a === "Todos" ? "Todos" : ALERT_META[a]?.label ?? a) },
    { key: "marca", label: "Marca", options: ["Todos", ...Array.from(new Set(tires.map((t) => t.marca))).sort()] },
    { key: "eje", label: "Eje", options: ["Todos", ...Array.from(new Set(tires.map((t) => t.eje))).sort()] },
    { key: "vida", label: "Vida", options: ["Todos", "nueva", "reencauche1", "reencauche2", "reencauche3", "fin"] },
  ], [tires]);

  /* -- Filtered tires ------------------------------------------------------ */

  // Defer filter values so the FilterFab pill updates instantly while the
  // heavy memo chain (alert classify + 4 filters + 6 downstream useMemos)
  // runs at idle priority. Toggling a filter off no longer freezes the UI.
  const deferredFilterValues = useDeferredValue(filterValues);
  const deferredFilterSearch = useDeferredValue(filterSearch);
  const filterPending =
    filterValues !== deferredFilterValues || filterSearch !== deferredFilterSearch;

  const filtered = useMemo(() => {
    let result = tires;

    // Exclude fin de vida unless explicitly selected
    if (!deferredFilterValues.vida || deferredFilterValues.vida === "Todos")
      result = result.filter((t) => ((t as any).vidaActual ?? "nueva") !== "fin");
    else
      result = result.filter((t) => ((t as any).vidaActual ?? "nueva") === deferredFilterValues.vida);

    // Alert filter
    const alertVal = deferredFilterValues.alert;
    if (alertVal && alertVal !== "Todos") {
      const alertKey = Object.entries(ALERT_META).find(([, v]) => v.label === alertVal)?.[0];
      if (alertKey) result = result.filter((t) => classifyAlert(t) === alertKey);
    }

    if (deferredFilterValues.marca && deferredFilterValues.marca !== "Todos")
      result = result.filter((t) => t.marca === deferredFilterValues.marca);
    if (deferredFilterValues.eje && deferredFilterValues.eje !== "Todos")
      result = result.filter((t) => t.eje === deferredFilterValues.eje);

    if (deferredFilterSearch.trim()) {
      const q = deferredFilterSearch.trim().toLowerCase();
      result = result.filter((t) => {
        const tirePlaca = ((t as any).placa ?? "").toLowerCase();
        const vPlaca = t.vehicleId ? (vehicleMap[t.vehicleId] ?? "").toLowerCase() : "";
        return tirePlaca.includes(q) || vPlaca.includes(q);
      });
    }

    return result;
  }, [tires, deferredFilterValues, deferredFilterSearch, vehicleMap]);

  /* -- Alert counts (same filtered set as all cards) --------------------- */

  const counts = useMemo(() => {
    const c: Record<AlertKey, number> = { ok: 0, watch: 0, warning: 0, critical: 0, none: 0 };
    filtered.forEach((t) => { c[classifyAlert(t)]++; });
    return c;
  }, [filtered]);

  /* -- Derived data for distribution cards --------------------------------- */

  const marcaData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((t) => { m[t.marca] = (m[t.marca] ?? 0) + 1; });
    return m;
  }, [filtered]);

  const bandaData = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((t) => { m[t.diseno] = (m[t.diseno] ?? 0) + 1; });
    return m;
  }, [filtered]);

  const vehiclesWithCount = useMemo(() => {
    // Count tires per vehicle from the FILTERED set, not the raw DB count
    const countByVehicle: Record<string, number> = {};
    filtered.forEach((t) => {
      if (t.vehicleId) countByVehicle[t.vehicleId] = (countByVehicle[t.vehicleId] ?? 0) + 1;
    });
    return vehicles
      .map((v) => ({ ...v, tireCount: countByVehicle[v.id] ?? 0 }))
      .filter((v) => v.tireCount > 0);
  }, [vehicles, filtered]);

  /* -- Render -------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-white">
      {/* -- Header ---------------------------------------------------------- */}
      <div
        className="sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center justify-between gap-3"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(52,140,203,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-[#0A183A] text-lg leading-none tracking-tight">
              Detalle de Flota
            </h1>
            <p className="text-xs text-[#348CCB] mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Actualizado: {new Date().toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>
      </div>

      {/* Streaming progress bar — sticky under the header while tires load */}
      <LoadProgressBar streaming={streaming} loaded={loadedTires} expected={expectedTires} />

      {/* -- Content --------------------------------------------------------- */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 transition-opacity duration-200"
        style={{
          opacity: filterPending ? 0.55 : 1,
          pointerEvents: filterPending ? "none" : "auto",
        }}
      >
        {/* Summary badges */}
        {!loading && (
          <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["ok", "watch", "warning", "critical", "none"] as const).map((key) => {
              const m = ALERT_META[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: m.bg }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-[10px] font-bold" style={{ color: m.color }}>
                    {m.label}
                  </span>
                  <span className="text-sm font-black ml-auto" style={{ color: m.color }}>
                    {counts[key]}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        )}
        {loading ? (
          // Progress-aware loading state — shows live tire count so the user
          // gets motion instead of a stuck spinner while the first chunk
          // arrives.
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-[#1E76B6]/15" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1E76B6] animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-[#0A183A]">
                {loadedTires > 0
                  ? `Cargando ${loadedTires.toLocaleString("es-CO")} llantas…`
                  : "Preparando el detalle…"}
              </p>
              {expectedTires > 0 && (
                <p className="text-[11px] text-gray-500 mt-1 tabular-nums">
                  {Math.min(100, Math.round((loadedTires / expectedTires) * 100))}% de {expectedTires.toLocaleString("es-CO")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Each section is wrapped in <LazyMount> so the 12-card tree
                doesn't all re-aggregate on every filter click. Only the
                first section paints eagerly; the rest mount as the user
                scrolls toward them (400px pre-mount margin). For a
                16k-tire filter toggle, this drops the re-compute from
                ~300k iterations down to the ~50-80k the visible cards
                actually need. */}

            <LazyMount eager minHeight={420}>
              <section>
                <SectionHeader title="Semaforo" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <SemaforoPie tires={filtered} language="es" />
                  <SemaforoTabla vehicles={vehicles} tires={filtered} />
                </div>
              </section>
            </LazyMount>

            <LazyMount minHeight={520}>
              <section>
                <SectionHeader title="Analisis CPK" />
                <TablaCpk tires={filtered as any} />
              </section>
            </LazyMount>

            <LazyMount minHeight={360}>
              <section>
                <SectionHeader title="Distribucion" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <PorMarca groupData={marcaData} />
                  <PorBanda groupData={bandaData} />
                  <PorVida tires={filtered} />
                </div>
              </section>
            </LazyMount>

            <LazyMount minHeight={380}>
              <section>
                <SectionHeader title="Analisis por Eje y Vehiculo" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <PromedioEje
                    tires={filtered}
                    onSelectEje={(eje: string | null) => setSelectedEje(eje ?? "")}
                    selectedEje={selectedEje}
                  />
                  <TipoVehiculo vehicles={vehiclesWithCount as any} />
                </div>
              </section>
            </LazyMount>

            <LazyMount minHeight={360}>
              <section>
                <SectionHeader title="Tendencias" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <HistoricChart tires={filtered} language="es" />
                  <ReencaucheHistorico tires={filtered} language="es" />
                </div>
              </section>
            </LazyMount>

            <LazyMount minHeight={360}>
              <section>
                <SectionHeader title="Profundidad y Proyeccion" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <TanqueMilimetro tires={filtered} language="es" />
                  <ProyeccionVida tires={filtered} />
                </div>
              </section>
            </LazyMount>
          </div>
        )}
      </div>

      {!loading && (
        <FilterFab
          filters={filterOptions}
          values={filterValues}
          onChange={(key, value) => setFilterValues((prev) => ({ ...prev, [key]: value }))}
          search={filterSearch}
          onSearchChange={setFilterSearch}
          searchPlaceholder="Buscar por placa..."
        />
      )}
    </div>
  );
}
