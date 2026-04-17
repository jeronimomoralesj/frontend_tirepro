"use client";

import React, { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus } from "lucide-react";

// =============================================================================
// Types
// =============================================================================
export type VidaEntry = { valor: string; fecha: string };

export type Inspection = {
  fecha: string;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk: number | null;
  cpkProyectado: number | null;
  kilometrosEstimados: number | null;
  vidaAlMomento?: string | null;
};

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  diseno?: string;
  banda?: string;
  dimension?: string;
  posicion: number;
  kilometrosRecorridos?: number;
  vida: VidaEntry[];
  inspecciones: Inspection[];
};

// =============================================================================
// Vida tabs — reencauche1/2/3 collapse into a single "reencauche" tab because
// the ranking compares products (nueva casings vs retread bands), not which
// retread attempt number the tire is on.
// =============================================================================
type VidaKey = "nueva" | "reencauche";

const VIDA_TABS: { key: VidaKey; label: string; color: string; border: string }[] = [
  { key: "nueva",      label: "Nueva",       color: "#10b981", border: "rgba(16,185,129,0.3)" },
  { key: "reencauche", label: "Reencauche",  color: "#3b82f6", border: "rgba(59,130,246,0.3)" },
];

const REENCAUCHE_RAW_VIDAS = new Set(["reencauche1", "reencauche2", "reencauche3"]);

// =============================================================================
// Fuzzy normalisation — collapses typos like "Continental" vs "Continetal"
// =============================================================================
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Levenshtein distance (capped at 3 for speed)
function lev(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  // Allow 1 edit per 6 chars, max 2
  const tolerance = Math.min(2, Math.floor(Math.max(na.length, nb.length) / 6));
  return lev(na, nb, tolerance) <= tolerance;
}

// Canonical key for grouping — uses the first seen spelling
function groupKey(marca: string, dimension: string, diseno: string): string {
  return `${norm(marca)}__${norm(dimension)}__${norm(diseno)}`;
}

// =============================================================================
// Per-vida inspection helpers
// =============================================================================
function normalizeVidaValue(value?: string | null): VidaKey | null {
  const v = (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (v === "nueva") return "nueva";
  if (REENCAUCHE_RAW_VIDAS.has(v)) return "reencauche";
  return null;
}

function tireHasVida(tire: Tire, vida: VidaKey): boolean {
  return tire.vida.some(v => normalizeVidaValue(v.valor) === vida);
}

function isReencaucheVida(vida: VidaKey): boolean {
  return vida === "reencauche";
}

function getGroupingDesign(tire: Tire, vida: VidaKey): string {
  if (isReencaucheVida(vida)) {
    // After the retread brand fix, tire.diseno reflects the current banda.
    return tire.diseno?.trim() || tire.banda?.trim() || "Sin banda";
  }
  return tire.diseno?.trim() || tire.banda?.trim() || "Sin diseño";
}

// Earliest event matching the vida (for nueva: the nueva event; for
// reencauche: the first retread event the tire ever went through).
function getVidaStart(tire: Tire, vida: VidaKey): Date | null {
  const evt = tire.vida
    .filter(v => normalizeVidaValue(v.valor) === vida)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];

  return evt ? new Date(evt.fecha) : null;
}

function getInspeccionesForVida(tire: Tire, vida: VidaKey): Inspection[] {
  const sortedAll = [...tire.inspecciones].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  // Prefer the inspection-level tag — every inspection records the vida
  // it belongs to. For reencauche this aggregates across retread #1/2/3.
  const tagged = sortedAll.filter(
    (i) => normalizeVidaValue(i.vidaAlMomento) === vida
  );
  if (tagged.length > 0) return tagged;

  // Fallback: use the date window between the earliest matching event and
  // (for nueva) the first reencauche event that ended this phase.
  const start = getVidaStart(tire, vida);
  if (vida === "nueva") {
    const firstReenc = getVidaStart(tire, "reencauche");
    if (start) {
      const ranged = sortedAll.filter((i) => {
        const d = new Date(i.fecha);
        return d >= start && (!firstReenc || d < firstReenc);
      });
      if (ranged.length > 0) return ranged;
    }
  } else if (start) {
    const ranged = sortedAll.filter((i) => new Date(i.fecha) >= start);
    if (ranged.length > 0) return ranged;
  }

  // Last-resort: return all inspections so the tire doesn't vanish.
  return sortedAll;
}
// =============================================================================
// Group rows
// =============================================================================
interface GroupRow {
  key: string;
  marca: string;
  dimension: string;
  diseno: string;
  count: number;
  avgCpk: number;
  minCpk: number;
  maxCpk: number;
  avgCpkProy: number | null;
  avgDepth: number | null;
  totalKm: number;
  tires: { tire: Tire; cpk: number; cpkProy: number | null; depth: number | null; insps: Inspection[] }[];
}

function buildGroups(tires: Tire[], vida: VidaKey): GroupRow[] {
  // canonical label store: norm key → first seen human label
  const marcaLabels: Record<string, string>     = {};
  const dimensionLabels: Record<string, string> = {};
  const disenoLabels: Record<string, string>    = {};

  // Map: canonical group key → tires
  const buckets: Record<string, {
    tire: Tire; cpk: number; cpkProy: number | null; depth: number | null; insps: Inspection[];
  }[]> = {};

  const normKeys: Record<string, string> = {}; // norm(marca)__norm(dim)__norm(dis) → bucket key

  for (const tire of tires) {
    if (!tireHasVida(tire, vida)) continue;
    const insps = getInspeccionesForVida(tire, vida);
    const last = insps.length ? insps[insps.length - 1] : null;
    if (!last) continue;

    const effectiveCpk =
      last.cpk ??
      last.cpkProyectado ??
      null;

    if (effectiveCpk == null) continue;

    const m = tire.marca?.trim() || "";
    const d = tire.dimension?.trim() || "";
    const s = getGroupingDesign(tire, vida);

    const nm = norm(m), nd = norm(d), ns = norm(s);

    // Find an existing bucket whose keys fuzzy-match this tire
    let bucketKey: string | null = null;
    for (const existingKey of Object.keys(normKeys)) {
      const [em, ed, es] = existingKey.split("__");
      if (fuzzyMatch(nm, em) && fuzzyMatch(nd, ed) && fuzzyMatch(ns, es)) {
        bucketKey = normKeys[existingKey];
        break;
      }
    }

    if (!bucketKey) {
      bucketKey = `${nm}__${nd}__${ns}`;
      normKeys[`${nm}__${nd}__${ns}`] = bucketKey;
      marcaLabels[bucketKey]     = m;
      dimensionLabels[bucketKey] = d;
      disenoLabels[bucketKey]    = s;
      buckets[bucketKey]         = [];
    }

    const depthValues = [
      last.profundidadInt,
      last.profundidadCen,
      last.profundidadExt,
    ].filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

    const depth = depthValues.length
      ? depthValues.reduce((a, b) => a + b, 0) / depthValues.length
      : null;
    buckets[bucketKey].push({
      tire,
      cpk: effectiveCpk,
      cpkProy: last.cpkProyectado ?? null,
      depth,
      insps,
    });
  }

  return Object.entries(buckets).map(([key, rows]): GroupRow => {
    const cpks    = rows.map(r => r.cpk);
    const proys   = rows.map(r => r.cpkProy).filter((v): v is number => v != null);
    const depths  = rows.map(r => r.depth).filter((v): v is number => v != null);
    const kms     = rows.flatMap(r => r.insps.map(i => i.kilometrosEstimados ?? 0));

    return {
      key,
      marca: marcaLabels[key],
      dimension: dimensionLabels[key],
      diseno: disenoLabels[key],
      count: rows.length,
      avgCpk: cpks.reduce((a, b) => a + b, 0) / cpks.length,
      minCpk: Math.min(...cpks),
      maxCpk: Math.max(...cpks),
      avgCpkProy: proys.length ? proys.reduce((a, b) => a + b, 0) / proys.length : null,
      avgDepth: depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : null,
      totalKm: kms.length ? Math.max(...kms) : 0,
      tires: rows.sort((a, b) => a.cpk - b.cpk),
    };
  }).sort((a, b) => a.avgCpk - b.avgCpk);
}

// =============================================================================
// CPK color helpers
// =============================================================================
function cpkColor(cpk: number): string {
  if (cpk < 8)  return "#10b981";
  if (cpk < 15) return "#f59e0b";
  return "#ef4444";
}

// =============================================================================
// Trend icon
// =============================================================================
function Trend({ cpks }: { cpks: number[] }) {
  if (cpks.length < 2) return <Minus className="w-3 h-3 text-gray-300" />;
  const d = cpks[cpks.length - 1] - cpks[0];
  if (d < -0.5) return <TrendingDown className="w-3 h-3 text-emerald-500" />;
  if (d >  0.5) return <TrendingUp   className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-gray-300" />;
}

// =============================================================================
// Component
// =============================================================================
interface TablaCpkProps { tires: Tire[] }

const TablaCpk: React.FC<TablaCpkProps> = ({ tires }) => {
  const [activeVida, setActiveVida] = useState<VidaKey>("nueva");
  const [search, setSearch]         = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);

  const vida = VIDA_TABS.find(v => v.key === activeVida)!;

  const groups = useMemo(() => buildGroups(tires, activeVida), [tires, activeVida]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(g =>
      (g.marca || "").toLowerCase().includes(q) ||
      (g.dimension || "").toLowerCase().includes(q) ||
      (g.diseno || "").toLowerCase().includes(q)
    );
  }, [groups, search]);

  // Counts per tab
  const counts = useMemo(() => {
    const out: Partial<Record<VidaKey, number>> = {};
    VIDA_TABS.forEach(v => {
      out[v.key] = buildGroups(tires, v.key).length;
    });
    return out;
  }, [tires]);

  function rowKey(g: GroupRow) {
    return `${g.marca}__${g.dimension}__${g.diseno}`;
  }

  return (
    <div className="bg-white rounded-2xl border overflow-hidden w-full"
      style={{ borderColor: "rgba(10,24,58,0.09)", boxShadow: "0 2px 12px rgba(10,24,58,0.05)" }}>

      {/* Header */}
      <div className="px-4 py-4"
        style={{ background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)" }}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-white font-black text-base tracking-tight">Ranking CPK</h2>
            <p className="text-white/50 text-xs mt-0.5">
              {activeVida === "nueva"
                ? "Agrupado por marca · dimensión · diseño"
                : "Agrupado por marca · dimensión · banda"}
            </p>
          </div>
          <div className="relative sm:w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar…"
              value={search}
              onChange={e => { setSearch(e.target.value); setExpanded(null); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-1"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
              }}
            />
          </div>
        </div>

        {/* Vida tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {VIDA_TABS.map(v => {
            const n = counts[v.key] ?? 0;
            const active = activeVida === v.key;
            return (
              <button key={v.key}
                onClick={() => { setActiveVida(v.key); setExpanded(null); setSearch(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: active ? v.color : "rgba(255,255,255,0.07)",
                  color: active ? "white" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${active ? v.color : "rgba(255,255,255,0.1)"}`,
                }}>
                {v.label}
                {n > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", color: "white" }}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid gap-0 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400"
        style={{ gridTemplateColumns: "1fr auto auto auto auto", borderBottom: "1px solid rgba(10,24,58,0.07)", background: "rgba(10,24,58,0.02)" }}>
        <span>
          {activeVida === "nueva"
            ? "Marca · Dimensión · Diseño"
            : "Marca · Dimensión · Banda"}
        </span>
        <span className="text-right w-16">CPK Prom.</span>
        <span className="text-right w-16 hidden sm:block">CPK Proy.</span>
        <span className="text-right w-16 hidden md:block">Prof. Prom.</span>
        <span className="text-right w-12">Llantas</span>
      </div>

      {/* Rows */}
      <div
        className="divide-y overflow-y-auto"
        style={{
          borderColor: "rgba(10,24,58,0.05)",
          maxHeight: "28rem",
        }}
      >
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">
            {search ? "Sin resultados" : `No hay datos para ${vida.label}`}
          </p>
        )}

        {filtered.map((g, rank) => {
          const key = g.key;
          const isOpen = expanded === key;

          return (
            <div key={key}>
              {/* Summary row */}
              <button
                onClick={() => setExpanded(isOpen ? null : key)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors focus:outline-none"
                style={{ background: isOpen ? `${vida.color}06` : undefined }}>
                <div className="grid items-center gap-0"
                  style={{ gridTemplateColumns: "1fr auto auto auto auto" }}>

                  {/* Identity */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Rank number */}
                    <span className="text-[11px] font-black w-5 flex-shrink-0 text-gray-400">
                      {rank + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0A183A] leading-tight truncate">
                        {g.marca || "—"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {[g.dimension, g.diseno].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Avg CPK */}
                  <div className="w-16 text-right">
                    <span className="text-sm font-black tabular-nums"
                      style={{ color: cpkColor(g.avgCpk) }}>
                      ${Math.round(g.avgCpk).toLocaleString("es-CO")}
                    </span>
                    {g.minCpk !== g.maxCpk && (
                      <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                        {Math.round(g.minCpk)}–{Math.round(g.maxCpk)}
                      </p>
                    )}
                  </div>

                  {/* Projected CPK */}
                  <div className="w-16 text-right hidden sm:block">
                    {g.avgCpkProy != null
                      ? <span className="text-xs text-gray-500 tabular-nums font-medium">
                          ${Math.round(g.avgCpkProy).toLocaleString("es-CO")}
                        </span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </div>

                  {/* Avg depth */}
                  <div className="w-16 text-right hidden md:block">
                    {g.avgDepth != null
                      ? <span className="text-xs font-bold tabular-nums"
                          style={{ color: g.avgDepth > 4 ? "#10b981" : g.avgDepth > 2 ? "#f97316" : "#ef4444" }}>
                          {g.avgDepth.toFixed(1)} mm
                        </span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </div>

                  {/* Count + chevron */}
                  <div className="w-12 flex items-center justify-end gap-1">
                    <span className="text-xs font-bold text-gray-500">{g.count}</span>
                    {isOpen
                      ? <ChevronUp  className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                  </div>
                </div>
              </button>

              {/* Expanded: individual tires in this group */}
              {isOpen && (
                <div   className="px-4 pb-4 pt-2 space-y-2 max-h-80 overflow-y-auto"
                  style={{ background: `${vida.color}04`, borderTop: `1px solid ${vida.color}18` }}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                    Llantas individuales — {g.count} en esta combinación
                  </p>

                  {/* Sub-header */}
                  <div className="grid gap-0 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-gray-400"
                    style={{ gridTemplateColumns: "1fr auto auto auto auto", background: "rgba(10,24,58,0.04)" }}>
                    <span>Placa · Posición</span>
                    <span className="w-20 text-right">CPK</span>
                    <span className="w-20 text-right hidden sm:block">CPK Proy.</span>
                    <span className="w-20 text-right hidden sm:block">Prof. Int/Cen/Ext</span>
                    <span className="w-12 text-right">Insps.</span>
                  </div>

                  {g.tires.map(({ tire, cpk, cpkProy, depth, insps }, ti) => {
                    const lastInsp = insps.length ? insps[insps.length - 1] : null;
                    const cpkList  = insps.map(i => i.cpk).filter((v): v is number => v != null && v > 0);
                    return (
                      <div key={tire.id}
                        className="grid items-center gap-0 px-3 py-2 rounded-xl"
                        style={{
                          gridTemplateColumns: "1fr auto auto auto auto",
                          background: "white",
                          border: "1px solid rgba(10,24,58,0.07)",
                        }}>

                        {/* Identity */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-gray-300 w-4 flex-shrink-0">{ti + 1}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#0A183A] leading-none">
                              {tire.placa.toUpperCase()}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Pos. {tire.posicion}</p>
                          </div>
                        </div>

                        {/* CPK */}
                        <div className="w-20 text-right flex items-center justify-end gap-1">
                          <Trend cpks={cpkList} />
                          <span className="text-xs font-black tabular-nums"
                            style={{ color: cpkColor(cpk) }}>
                            ${Math.round(cpk).toLocaleString("es-CO")}
                          </span>
                        </div>

                        {/* Projected */}
                        <div className="w-20 text-right hidden sm:block">
                          {cpkProy != null
                            ? <span className="text-xs text-gray-500 tabular-nums font-medium">
                                ${Math.round(cpkProy).toLocaleString("es-CO")}
                              </span>
                            : <span className="text-xs text-gray-300">—</span>}
                        </div>

                        {/* Depth trio */}
                        <div className="w-20 text-right hidden sm:flex items-center justify-end gap-0.5">
                          {lastInsp ? (
                            <>
                              {[lastInsp.profundidadInt, lastInsp.profundidadCen, lastInsp.profundidadExt].map((v, vi) => (
                                <span key={vi}
                                  className="inline-block px-1 py-0.5 rounded text-[10px] font-bold tabular-nums"
                                  style={{ color: v > 4 ? "#10b981" : v > 2 ? "#f97316" : "#ef4444", background: v > 4 ? "rgba(16,185,129,0.08)" : v > 2 ? "rgba(249,115,22,0.08)" : "rgba(239,68,68,0.08)" }}>
                                  {v.toFixed(0)}
                                </span>
                              ))}
                            </>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </div>

                        {/* Inspection count */}
                        <div className="w-12 text-right">
                          <span className="text-xs text-gray-500 font-medium">{insps.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(10,24,58,0.06)", background: "rgba(10,24,58,0.02)" }}>
          <span className="text-[11px] text-gray-400">
            {filtered.length} combinacion{filtered.length !== 1 ? "es" : ""} · {vida.label}
          </span>
          <span className="text-[11px] text-gray-400">CPK menor = mejor rendimiento</span>
        </div>
      )}
    </div>
  );
};

export default TablaCpk;