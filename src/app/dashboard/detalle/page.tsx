"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BarChart3, Calendar } from "lucide-react";
import FilterFab from "../components/FilterFab";
import type { FilterOption } from "../components/FilterFab";
import { OtisWrapper } from "../../../components/Otis";

import SemaforoPie from "../cards/SemaforoPie";
import SemaforoTabla from "../cards/SemaforoTabla";
import TablaCpk from "../cards/TablaCpk";
import PorMarca from "../cards/PorMarca";
import PorBanda from "../cards/PorBanda";
import PorVida from "../cards/PorVida";
import PromedioEje from "../cards/PromedioEje";
import TipoVehiculo from "../cards/TipoVehiculo";
import HistoricChart from "../cards/HistoricChart";
import ReencaucheHistorico from "../cards/ReencaucheHistorico";
import TanqueMilimetro from "../cards/TanqueMilimetro";
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
  const costo = [...(raw.costos ?? [])]
    .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((c: any) => ({ valor: c.valor ?? 0, fecha: toISO(c.fecha) }));

  const inspecciones = [...(raw.inspecciones ?? [])]
    .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((i: any) => ({
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
    }));

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
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
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
    Promise.all([
      authFetch(`${API_BASE}/tires?companyId=${user.companyId}`).then((r) =>
        r.ok ? r.json() : [],
      ),
      authFetch(`${API_BASE}/vehicles?companyId=${user.companyId}`).then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(([rawTires, rawVehicles]) => {
        setTires((rawTires as any[]).map(normaliseTire));
        setVehicles(rawVehicles);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

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

  const filtered = useMemo(() => {
    let result = [...tires];

    // Exclude fin de vida unless explicitly selected
    if (!filterValues.vida || filterValues.vida === "Todos")
      result = result.filter((t) => ((t as any).vidaActual ?? "nueva") !== "fin");
    else
      result = result.filter((t) => ((t as any).vidaActual ?? "nueva") === filterValues.vida);

    // Alert filter
    const alertVal = filterValues.alert;
    if (alertVal && alertVal !== "Todos") {
      const alertKey = Object.entries(ALERT_META).find(([, v]) => v.label === alertVal)?.[0];
      if (alertKey) result = result.filter((t) => classifyAlert(t) === alertKey);
    }

    if (filterValues.marca && filterValues.marca !== "Todos")
      result = result.filter((t) => t.marca === filterValues.marca);
    if (filterValues.eje && filterValues.eje !== "Todos")
      result = result.filter((t) => t.eje === filterValues.eje);

    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      result = result.filter((t) => {
        const tirePlaca = ((t as any).placa ?? "").toLowerCase();
        const vPlaca = t.vehicleId ? (vehicleMap[t.vehicleId] ?? "").toLowerCase() : "";
        return tirePlaca.includes(q) || vPlaca.includes(q);
      });
    }

    return result;
  }, [tires, filterValues, filterSearch, vehicleMap]);

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

  /* -- Otis insights (per card) ------------------------------------------- */

  const insights = useMemo(() => {
    const total = filtered.length;
    const veh = vehiclesWithCount.length;

    // Average CPK from latest inspections
    let cpkSum = 0, cpkN = 0, cpkProySum = 0, cpkProyN = 0;
    for (const t of filtered) {
      const last = t.inspecciones[t.inspecciones.length - 1];
      if (last) {
        if (last.cpk > 0)          { cpkSum += last.cpk; cpkN++; }
        if (last.cpkProyectado > 0){ cpkProySum += last.cpkProyectado; cpkProyN++; }
      }
    }
    const avgCpk = cpkN ? Math.round(cpkSum / cpkN) : 0;
    const avgCpkProy = cpkProyN ? Math.round(cpkProySum / cpkProyN) : 0;

    // Vida distribution
    const vidaCounts: Record<string, number> = {};
    filtered.forEach((t) => {
      const v = (t as any).vidaActual ?? "nueva";
      vidaCounts[v] = (vidaCounts[v] ?? 0) + 1;
    });
    const reenc = (vidaCounts.reencauche1 ?? 0) + (vidaCounts.reencauche2 ?? 0) + (vidaCounts.reencauche3 ?? 0);
    const nuevas = vidaCounts.nueva ?? 0;
    const fin = vidaCounts.fin ?? 0;
    const pctReenc = total ? Math.round((reenc / total) * 100) : 0;

    // Top brand
    const brands = Object.entries(marcaData).sort((a,b) => b[1] - a[1]);
    const topBrand = brands[0];

    // Top banda
    const bands = Object.entries(bandaData).sort((a,b) => b[1] - a[1]);
    const topBanda = bands[0];

    // Promedio profundidad por eje
    const ejeMap: Record<string, { sum: number; n: number }> = {};
    for (const t of filtered) {
      const last = t.inspecciones[t.inspecciones.length - 1];
      if (!last) continue;
      const minD = Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
      if (!ejeMap[t.eje]) ejeMap[t.eje] = { sum: 0, n: 0 };
      ejeMap[t.eje].sum += minD;
      ejeMap[t.eje].n += 1;
    }
    const ejeAvgs = Object.entries(ejeMap)
      .map(([k, v]) => ({ eje: k, avg: v.sum / Math.max(1, v.n) }))
      .sort((a, b) => a.avg - b.avg);
    const peorEje = ejeAvgs[0];

    // Mejor / peor vehiculo por #llantas
    const sortedVeh = [...vehiclesWithCount].sort((a, b) => (b as any).tireCount - (a as any).tireCount);

    // Profundidad promedio global
    let depthSum = 0, depthN = 0;
    for (const t of filtered) {
      const last = t.inspecciones[t.inspecciones.length - 1];
      if (!last) continue;
      depthSum += Math.min(last.profundidadInt, last.profundidadCen, last.profundidadExt);
      depthN++;
    }
    const avgDepth = depthN ? (depthSum / depthN) : 0;

    return {
      semaforoPie: total === 0
        ? "Sin llantas en el filtro actual. Ajusta los filtros para que Otis pueda analizar."
        : `De ${total} llantas: ${counts.critical} urgentes, ${counts.warning} a 30 días, ${counts.watch} a 60 días, ${counts.ok} óptimas.\n` +
          (counts.critical > 0
            ? `Las ${counts.critical} urgentes son tu prioridad #1 — actúa hoy para evitar paradas no planificadas.`
            : counts.warning > 0
            ? `Sin urgencias inmediatas, pero tienes ${counts.warning} llantas que entran a la zona crítica este mes — planifica reemplazo.`
            : `Toda la flota está fuera de la zona crítica. Mantén el ritmo de inspecciones.`),
      semaforoTabla: total === 0
        ? "Sin datos."
        : `${veh} vehículos en la flota filtrada. ` +
          (counts.critical > 0
            ? `Los vehículos con llantas urgentes deben ir primero al taller. Usa esta tabla para crear órdenes de trabajo agrupadas por placa.`
            : `No hay vehículos en zona crítica. Aprovecha para programar mantenimientos preventivos por placa.`),
      cpk: cpkN === 0
        ? "Aún no hay datos suficientes de CPK. Registra inspecciones con kilometraje para que Otis calcule rendimiento."
        : `CPK actual promedio: $${avgCpk.toLocaleString("es-CO")} por km.\n` +
          (avgCpkProy > 0 ? `CPK proyectado: $${avgCpkProy.toLocaleString("es-CO")} — ` +
            (avgCpkProy < avgCpk
              ? `tu costo por km va a la baja, buena señal.`
              : avgCpkProy > avgCpk * 1.1
              ? `el proyectado sube ${Math.round(((avgCpkProy - avgCpk) / avgCpk) * 100)}%, revisa qué llantas están bajando rendimiento.`
              : `estable.`)
            : ""),
      porMarca: !topBrand
        ? "Sin datos de marcas."
        : `${brands.length} marcas activas. ${topBrand[0]} domina con ${topBrand[1]} llantas (${Math.round((topBrand[1] / total) * 100)}%). ` +
          (brands.length === 1
            ? `Considera diversificar para comparar rendimiento real entre marcas.`
            : `Cruza este dato con CPK por marca para ver cuál te rinde más por peso invertido.`),
      porBanda: !topBanda
        ? "Sin datos de bandas/diseños."
        : `${bands.length} diseños activos. El más usado es "${topBanda[0]}" (${topBanda[1]} llantas). Si una banda concentra >40% de tu flota y tiene CPK alto, vale la pena probar alternativas.`,
      porVida: total === 0
        ? "Sin llantas registradas."
        : `${nuevas} nuevas (${Math.round((nuevas / total) * 100)}%), ${reenc} reencauchadas (${pctReenc}%)${fin > 0 ? `, ${fin} en fin de vida` : ""}. ` +
          (pctReenc < 30
            ? `Estás reencauchando muy poco. Subir al 50%+ recorta CPK significativamente.`
            : pctReenc > 60
            ? `Excelente nivel de reencauche — aprovechas muy bien los cascos.`
            : `Buen balance nuevas/reencauche.`),
      promedioEje: !peorEje
        ? "Sin datos por eje."
        : `Eje con menor profundidad promedio: ${peorEje.eje} (${peorEje.avg.toFixed(1)}mm). ` +
          (peorEje.avg <= 4
            ? `Está cerca del retiro óptimo (3mm) — empieza a planear reemplazos para ese eje.`
            : `Margen sano. Sigue rotando para igualar el desgaste entre posiciones.`),
      tipoVehiculo: sortedVeh.length === 0
        ? "Sin vehículos asignados."
        : `${veh} vehículos con llantas activas. Vehículo con más llantas: ${(sortedVeh[0] as any).placa} (${(sortedVeh[0] as any).tireCount}). Los vehículos con más llantas concentran tu inversión — vigílalos primero.`,
      historico: total === 0
        ? "Sin histórico para analizar."
        : `Histórico de profundidad de la flota filtrada. Si la curva baja más rápido de lo esperado, hay sobrecarga, sobreinflado o desalineación. Compara periodos similares para detectar desviaciones.`,
      reencaucheHistorico: reenc === 0
        ? "Aún no tienes llantas reencauchadas. Considera reencauchar marcas premium para reducir CPK."
        : `Has acumulado ${reenc} llantas reencauchadas (${pctReenc}% del total). Cada reencauche bien hecho cuesta ~30% de una nueva — vigila que las marcas premium lleguen al menos a un reencauche.`,
      tanqueMilimetro: depthN === 0
        ? "Sin inspecciones recientes."
        : `Profundidad promedio actual: ${avgDepth.toFixed(1)}mm. ` +
          (avgDepth <= 4
            ? `La flota está cerca del límite de retiro. Prioriza inspecciones y prepara pedidos.`
            : avgDepth >= 8
            ? `Flota con buen casco. Aprovecha para sostener inspecciones preventivas.`
            : `Profundidad media saludable, pero vigila las llantas en cola del rango.`),
      proyeccion: total === 0
        ? "Sin datos para proyectar."
        : `Otis proyecta vida útil restante con base en el ritmo actual de desgaste. Las llantas con proyección <60 días ya deberían estar en tu próximo pedido.`,
    };
  }, [filtered, counts, vehiclesWithCount, marcaData, bandaData]);

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

      {/* -- Content --------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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
          <div className="flex items-center justify-center gap-2 py-32 text-[#1E76B6]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Cargando datos...</span>
          </div>
        ) : (
          <div className="space-y-10">
            {/* -- 1. Semaforo ----------------------------------------------- */}
            <section>
              <SectionHeader title="Semaforo" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <OtisWrapper cardKey="detalle.semaforo-pie" capability="wear" title="Semáforo de la flota" insight={insights.semaforoPie}>
                  <SemaforoPie tires={filtered} language="es" />
                </OtisWrapper>
                <OtisWrapper cardKey="detalle.semaforo-tabla" capability="wear" title="Semáforo por vehículo" insight={insights.semaforoTabla}>
                  <SemaforoTabla vehicles={vehicles} tires={filtered} />
                </OtisWrapper>
              </div>
            </section>

            {/* -- 2. Analisis CPK ------------------------------------------- */}
            <section>
              <SectionHeader title="Analisis CPK" />
              <OtisWrapper cardKey="detalle.cpk" capability="prediction" title="Análisis de CPK" insight={insights.cpk}>
                <TablaCpk tires={filtered as any} />
              </OtisWrapper>
            </section>

            {/* -- 3. Distribucion ------------------------------------------- */}
            <section>
              <SectionHeader title="Distribucion" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <OtisWrapper cardKey="detalle.por-marca" capability="orders" title="Por marca" insight={insights.porMarca}>
                  <PorMarca groupData={marcaData} />
                </OtisWrapper>
                <OtisWrapper cardKey="detalle.por-banda" capability="orders" title="Por banda" insight={insights.porBanda}>
                  <PorBanda groupData={bandaData} />
                </OtisWrapper>
                <OtisWrapper cardKey="detalle.por-vida" capability="prediction" title="Por vida" insight={insights.porVida}>
                  <PorVida tires={filtered} />
                </OtisWrapper>
              </div>
            </section>

            {/* -- 4. Analisis por Eje y Vehiculo --------------------------- */}
            <section>
              <SectionHeader title="Analisis por Eje y Vehiculo" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <OtisWrapper cardKey="detalle.promedio-eje" capability="wear" title="Promedio por eje" insight={insights.promedioEje}>
                  <PromedioEje
                    tires={filtered}
                    onSelectEje={(eje: string | null) => setSelectedEje(eje ?? "")}
                    selectedEje={selectedEje}
                  />
                </OtisWrapper>
                <OtisWrapper cardKey="detalle.tipo-vehiculo" capability="wear" title="Por vehículo" insight={insights.tipoVehiculo}>
                  <TipoVehiculo vehicles={vehiclesWithCount as any} />
                </OtisWrapper>
              </div>
            </section>

            {/* -- 5. Tendencias --------------------------------------------- */}
            <section>
              <SectionHeader title="Tendencias" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <OtisWrapper cardKey="detalle.historico" capability="prediction" title="Histórico" insight={insights.historico}>
                  <HistoricChart tires={filtered} language="es" />
                </OtisWrapper>
                <OtisWrapper cardKey="detalle.reencauche-hist" capability="prediction" title="Reencauche histórico" insight={insights.reencaucheHistorico}>
                  <ReencaucheHistorico tires={filtered} language="es" />
                </OtisWrapper>
              </div>
            </section>

            {/* -- 6. Profundidad y Proyeccion --------------------------------- */}
            <section>
              <SectionHeader title="Profundidad y Proyeccion" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <OtisWrapper cardKey="detalle.tanque-mm" capability="wear" title="Tanque por milímetro" insight={insights.tanqueMilimetro}>
                  <TanqueMilimetro tires={filtered} language="es" />
                </OtisWrapper>
                <OtisWrapper cardKey="detalle.proyeccion" capability="prediction" title="Proyección de vida" insight={insights.proyeccion}>
                  <ProyeccionVida tires={filtered} />
                </OtisWrapper>
              </div>
            </section>
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
