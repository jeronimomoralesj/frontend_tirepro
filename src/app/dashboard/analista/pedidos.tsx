"use client";

import React, {
  useState, useCallback, useEffect, useRef, useMemo, memo,
} from "react";
import {
  ShoppingCart, AlertTriangle, Clock, Download, FileText,
  FileSpreadsheet, Info, Loader2, X, AlertCircle, CheckCircle2,
  Zap, RotateCcw, Package, DollarSign, Pencil, ChevronDown,
  ChevronUp, Save, RefreshCw, Filter, Search, TrendingDown,
  Gauge, Wind, Activity, Eye, Target, BarChart2,
  ChevronLeft, ChevronRight, Send, Layers, Check, Warehouse,
  ArrowRight, Truck,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  LIMITE_LEGAL_MM:          2,
  KM_POR_MES:               6_000,
  MS_POR_DIA:               86_400_000,
  PRESSURE_UNDER_WARN_PSI:  10,
  PRESSURE_UNDER_CRIT_PSI:  20,
  REENCAUCHE_COST_COP:      650_000,
  FALLBACK_TIRE_PRICE:      1_900_000,
  DEPTH_CRITICAL_MM:        3,
  DEPTH_WATCH_MM:           6,
  DEPTH_PLAN_MM:            9,
  IRREGULAR_WEAR_DELTA:     3,
  ALIGNMENT_WARN_MM:        1.5,  // Unilateral shoulder delta → alignment needed
  OPTIMAL_RETIREMENT_MM:    3,    // Casing preservation threshold
  CPK_POOR_MULTIPLIER:      1.3,
  CPK_GREAT_MULTIPLIER:     0.85,
  CONF_W_DEPTH:             0.30,
  CONF_W_PRESSURE:          0.25,
  CONF_W_BENCHMARK:         0.20,
  CONF_W_TREND:             0.15,
  CONF_W_BRAND:             0.10,
  KM_ANUAL:                 72_000,
} as const;

const VIDA_SEQUENCE = ["nueva","reencauche1","reencauche2","reencauche3","fin"] as const;
type VidaValue = typeof VIDA_SEQUENCE[number];
const VIDA_SET = new Set<string>(VIDA_SEQUENCE);

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RawInspeccion {
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  fecha: string | Date; cpk: number | null; cpkProyectado: number | null;
  cpt: number | null; cptProyectado: number | null;
  kmActualVehiculo: number | null; imageUrl: string | null;
  presionPsi?: number | null; presionRecomendadaPsi?: number | null;
  presionDelta?: number | null; vidaAlMomento?: string | null;
}
interface RawCosto  { valor: number; fecha: string | Date; concepto?: string | null }
interface RawEvento { id: string; tipo: string; fecha: string | Date; notas: string | null; metadata: Record<string, unknown> | null }
interface RawBenchmark {
  marca: string; diseno: string; dimension: string;
  avgCpk: number | null; medianCpk: number | null;
  cpkNueva: number | null; cpkReencauche1: number | null; cpkReencauche2: number | null;
  retreadRoiRatio: number | null;
  precioPromedio: number | null;
  pressureSensitivity: number | null;
  sampleSize: number;
}
interface RawTire {
  id: string; placa: string; marca: string; diseno: string; dimension: string;
  eje: string; posicion: number; profundidadInicial: number;
  vehicleId?: string | null; companyId?: string | null;
  currentCpk: number | null; currentCpt: number | null;
  currentProfundidad: number | null; currentPresionPsi?: number | null;
  projectedKmRemaining: number | null; projectedDateEOL: string | Date | null;
  alertLevel: string; cpkTrend: number | null; healthScore: number | null;
  vidaActual: string | null;
  primeraVida: unknown[];
  costos: RawCosto[]; inspecciones: RawInspeccion[]; eventos: RawEvento[];
}

interface Inspeccion {
  profundidadInt: number; profundidadCen: number; profundidadExt: number;
  fecha: string; cpk: number; cpkProyectado: number; cpt: number;
  cptProyectado: number; kmActualVehiculo: number;
  presionPsi: number | null; presionRecomendadaPsi: number | null;
  presionDelta: number | null; vidaAlMomento: string;
}
interface TireCosto  { valor: number; fecha: string; concepto: string }
interface VidaEntry  { valor: string; fecha: string }

interface Tire {
  id: string; placa: string; marca: string; diseno: string; dimension: string;
  eje: string; posicion: number; profundidadInicial: number;
  inspecciones: Inspeccion[]; costos: TireCosto[]; vida: VidaEntry[];
  rawEventos: RawEvento[]; vehicleId: string | null; companyId: string | null;
  currentCpk: number; currentCpt: number; currentProfundidad: number;
  currentPresionPsi: number | null;
  projectedKmRemaining: number | null; projectedDateEOL: string | null;
  alertLevel: string; cpkTrend: number | null; healthScore: number | null;
  vidaActual: VidaValue;
  primeraVida: unknown[];
}

interface VehicleGap {
  vehicleId:         string;
  placa:             string;
  tipovhc:           string;
  missingPositions:  number[];
  occupiedPositions: number[];
  expectedTotal:     number;
}

type RecommendationType = "reencauche" | "nueva" | "ajustar_presion" | "rotar" | "evaluar";
type UrgencyLevel       = "critical" | "immediate" | "next_month" | "plan";

interface CpkSignals {
  currentCpk:    number;
  benchmarkCpk:  number | null;
  projectedCpk:  number | null;
  savingsAnual:  number;
  cpkVsBenchmark: number | null;
}

interface TireRecommendation {
  tire:             Tire;
  urgency:          UrgencyLevel;
  minDepth:         number;
  avgDepth:         number;
  recommendationType:   RecommendationType;
  recommendationReason: string;
  reencaucheCount:  number;
  maxReencauches:   number;
  brandTier:        string;
  brandStrength:    string;
  brandRisk:        string;
  estimatedPrice:   number;
  confidence:       number;
  cpkSignals:       CpkSignals;
  pressureAlert:    boolean;
  irregularWear:    boolean;
  projectedMonths:  number | null;
  vidaActual:       VidaValue;
  benchmark:        RawBenchmark | null;
}

interface RowEdits {
  recommendationType: RecommendationType;
  estimatedPrice:     number;
  notes:              string;
  recMarca:           string;
  recBanda:           string;
  recDimension:       string;
}

interface PedidosData {
  critical:    TireRecommendation[];
  immediate:   TireRecommendation[];
  nextMonth:   TireRecommendation[];
  plan:        TireRecommendation[];
  totalEstimatedCost: number;
  totalSavingsAnual:  number;
  analyzedAt:  string;
}

interface CompanyInfo { name: string; profileImage: string }

// ─── Inventory types ──────────────────────────────────────────────────────────

interface InventoryBucket {
  id:             string;
  nombre:         string;
  color:          string;
  icono:          string;
  excluirDeFlota: boolean;
  tireCount:      number;
}

interface InventoryTire {
  id: string; placa: string; marca: string; diseno: string;
  dimension: string; eje: string;
  vidaActual?: string;
  inventoryBucketId: string | null;
  currentProfundidad?: number;
  costos?: Array<{ valor: number }>;
}

interface InventoryMatch {
  rec:         TireRecommendation;
  matches:     InventoryTire[];
  totalInDim:  number;
}

// ─── Send Group modal types ───────────────────────────────────────────────────

type SendGroupAction = "fin_vida" | "move_bucket" | "reencauche_bucket";

interface SendGroupState {
  open:   boolean;
  recs:   TireRecommendation[];
  action: SendGroupAction | null;
  // For fin_vida
  finCausales:    string;
  finMilimetros:  string;
  // For move_bucket / reencauche_bucket
  targetBucketId: string;
  // For reencauche_bucket
  proveedor:         string;
  profundidadNueva:  string;
  costoReencauche:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND TABLE
// ─────────────────────────────────────────────────────────────────────────────

interface BrandInfo {
  tier:           string;
  maxReencauches: number;
  strength:       string;
  risk:           string;
  cpkMultiplier:  number;
}

const BRAND_TABLE: Record<string, BrandInfo> = {
  michelin:      { tier:"premium",   maxReencauches:3, cpkMultiplier:1.35, strength:"Tecnología Infinicoil. Huella plana en curvas. Acepta 4 reencauches Bandag.", risk:"Precio inicial alto; sensible a cortes laterales en vías destapadas." },
  bridgestone:   { tier:"premium",   maxReencauches:3, cpkMultiplier:1.30, strength:"Cinturones extra-gruesos. Resisten golpes de huecos.", risk:"Más pesadas; generan calor si la presión no se controla." },
  continental:   { tier:"premium",   maxReencauches:3, cpkMultiplier:1.25, strength:"Baja generación de calor. Ideal para rutas montaña-costa.", risk:"Costados algo delgados para reducir peso." },
  goodyear:      { tier:"premium",   maxReencauches:3, cpkMultiplier:1.25, strength:"Compuestos Duralife. Alta resistencia a la fatiga.", risk:"Fatiga por flexión en rutas montaña extrema." },
  pirelli:       { tier:"premium",   maxReencauches:3, cpkMultiplier:1.20, strength:"Serie 01. Buena resistencia a la fatiga en curvas sinuosas.", risk:"Temperatura extrema algo problemática en rutas largas." },
  firestone:     { tier:"premium",   maxReencauches:3, cpkMultiplier:1.18, strength:"Carcasas ultra-resistentes. Muy usada en volquetas.", risk:"Más rígidas; mayor desgaste de suspensión." },
  "bf goodrich": { tier:"premium",   maxReencauches:3, cpkMultiplier:1.15, strength:"Segunda marca Michelin. Buen off-road.", risk:"Excelente para camiones medianos." },
  hankook:       { tier:"mid",       maxReencauches:2, cpkMultiplier:1.00, strength:"Carcasa elástica y balanceada.", risk:"Menor cantidad de hilos/pulgada que Premium." },
  yokohama:      { tier:"mid",       maxReencauches:2, cpkMultiplier:0.98, strength:"Estabilidad térmica superior.", risk:"Carcasas a veces difíciles en plantas multimarca." },
  falken:        { tier:"mid",       maxReencauches:2, cpkMultiplier:0.95, strength:"Ingeniería japonesa. El caucho envejece lento.", risk:"Menos servicio técnico en zonas remotas." },
  "general tire":{ tier:"mid",       maxReencauches:2, cpkMultiplier:0.95, strength:"Grupo Continental. Carcasas robustas.", risk:"Menor resistencia a cortes que marcas premium." },
  nexen:         { tier:"economic",  maxReencauches:1, cpkMultiplier:0.80, strength:"Estructura uniforme. Precio competitivo.", risk:"La carcasa se debilita tras el primer ciclo de calor." },
  "double coin":  { tier:"china_pro", maxReencauches:1, cpkMultiplier:0.85, strength:"La mejor china para Colombia. Estructura pesada.", risk:"Muy pesadas; aumentan consumo de combustible." },
  sailun:        { tier:"china_pro", maxReencauches:1, cpkMultiplier:0.82, strength:"Buena uniformidad de fabricación.", risk:"Solo un reencauche seguro." },
  westlake:      { tier:"economic",  maxReencauches:1, cpkMultiplier:0.70, strength:"Precio imbatible. Cumplen primera vida en terrenos planos.", risk:"Oxidación rápida en clima húmedo." },
  linglong:      { tier:"economic",  maxReencauches:1, cpkMultiplier:0.70, strength:"Precio imbatible.", risk:"Oxidación rápida en clima húmedo." },
  gremax:        { tier:"generic",   maxReencauches:1, cpkMultiplier:0.60, strength:"Precio muy bajo.", risk:"Alta tasa de rechazo NDT." },
};
const DEFAULT_BRAND: BrandInfo = {
  tier:"economic", maxReencauches:1, cpkMultiplier:0.75,
  strength:"Información de marca no disponible.", risk:"Asumir comportamiento conservador.",
};

function getBrandInfo(marca: string): BrandInfo {
  if (!marca) return DEFAULT_BRAND;
  const key = marca.toLowerCase().trim();
  if (BRAND_TABLE[key]) return BRAND_TABLE[key];
  for (const [k,v] of Object.entries(BRAND_TABLE)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return DEFAULT_BRAND;
}

const TIER_LABELS: Record<string,string> = {
  premium:"Premium", mid:"Mid-Tier", china_pro:"China Pro", economic:"Económica", generic:"Genérica",
};
const TIER_COLORS: Record<string,string> = {
  premium:"#1E76B6", mid:"#0891b2", china_pro:"#7c3aed", economic:"#d97706", generic:"#dc2626",
};


// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

function toISO(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function extractVida(eventos: RawEvento[]): VidaEntry[] {
  return eventos
    .filter(e => e.notas && VIDA_SET.has(e.notas.toLowerCase()))
    .map(e => ({ valor: e.notas!.toLowerCase(), fecha: toISO(e.fecha) }));
}

function resolveVidaActual(tire: RawTire): VidaValue {
  if (tire.vidaActual && VIDA_SET.has(tire.vidaActual)) return tire.vidaActual as VidaValue;
  const vida = extractVida(tire.eventos);
  if (vida.length) return vida[vida.length-1].valor as VidaValue;
  return "nueva";
}

function normaliseRawTire(raw: RawTire): Tire {
  const costos = [...raw.costos]
    .sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map(c => ({ valor: typeof c.valor==="number"?c.valor:0, fecha: toISO(c.fecha), concepto: c.concepto ?? "compra_nueva" }));

  const inspecciones = [...raw.inspecciones]
    .sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map(i => ({
      fecha: toISO(i.fecha),
      profundidadInt: i.profundidadInt??0, profundidadCen: i.profundidadCen??0, profundidadExt: i.profundidadExt??0,
      cpk: i.cpk??0, cpkProyectado: i.cpkProyectado??0,
      cpt: i.cpt??0, cptProyectado: i.cptProyectado??0,
      kmActualVehiculo: i.kmActualVehiculo??0,
      presionPsi: i.presionPsi??null,
      presionRecomendadaPsi: i.presionRecomendadaPsi??null,
      presionDelta: i.presionDelta??null,
      vidaAlMomento: i.vidaAlMomento ?? "nueva",
    }));

  return {
    id: raw.id, placa: raw.placa, marca: raw.marca, diseno: raw.diseno,
    dimension: raw.dimension, eje: raw.eje, posicion: raw.posicion,
    profundidadInicial: raw.profundidadInicial,
    inspecciones, costos, vida: extractVida(raw.eventos), rawEventos: raw.eventos,
    vehicleId: raw.vehicleId??null, companyId: raw.companyId??null,
    currentCpk: raw.currentCpk??0, currentCpt: raw.currentCpt??0,
    currentProfundidad: raw.currentProfundidad??0,
    currentPresionPsi: raw.currentPresionPsi??null,
    projectedKmRemaining: raw.projectedKmRemaining??null,
    projectedDateEOL: raw.projectedDateEOL ? toISO(raw.projectedDateEOL) : null,
    alertLevel: raw.alertLevel, cpkTrend: raw.cpkTrend??null,
    healthScore: raw.healthScore??null,
    vidaActual: resolveVidaActual(raw),
    primeraVida: raw.primeraVida??[],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function getMinDepth(i: Inspeccion): number {
  const vals = [i.profundidadInt, i.profundidadCen, i.profundidadExt].map(v => (v==null||v===0?99:v));
  return Math.min(...vals);
}
function getAvgDepth(i: Inspeccion): number {
  const vals = [i.profundidadInt, i.profundidadCen, i.profundidadExt].filter(v => v!=null && v>0);
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
}
function getMaxZoneDelta(i: Inspeccion): number {
  return Math.max(
    Math.abs(i.profundidadInt - i.profundidadCen),
    Math.abs(i.profundidadCen - i.profundidadExt),
    Math.abs(i.profundidadInt - i.profundidadExt),
  );
}

function countReencauches(tire: Tire): number {
  if (tire.vida?.length > 0) {
    const last = tire.vida[tire.vida.length-1].valor.toLowerCase();
    if (last==="reencauche3") return 3;
    if (last==="reencauche2") return 2;
    if (last==="reencauche1") return 1;
    if (last==="fin")         return 99;
    return 0;
  }
  return tire.rawEventos?.filter(e=>e.notas&&/^reencauche\d+$/i.test(e.notas.trim())).length ?? 0;
}

function getEstimatedPrice(tire: Tire, benchmark: RawBenchmark|null): number {
  if (benchmark?.precioPromedio && benchmark.precioPromedio > 0) return Math.round(benchmark.precioPromedio * 1.05);
  if (tire.costos?.length > 0) {
    const latest = tire.costos[tire.costos.length-1];
    if (latest.valor > 0) return Math.round(latest.valor * 1.05);
  }
  return C.FALLBACK_TIRE_PRICE;
}

function calcConfidence(minDepth: number, presionDelta: number | null, benchmarkCpk: number | null, currentCpk: number, cpkTrend: number | null, brandTier: string): number {
  const depthConf = minDepth <= C.DEPTH_CRITICAL_MM ? 100 : minDepth <= C.DEPTH_WATCH_MM ? 80 : minDepth <= C.DEPTH_PLAN_MM ? 60 : 40;
  const pressConf = presionDelta === null ? 50 : presionDelta <= -C.PRESSURE_UNDER_CRIT_PSI ? 100 : presionDelta <= -C.PRESSURE_UNDER_WARN_PSI ? 80 : 50;
  const benchConf = (!benchmarkCpk || !currentCpk || benchmarkCpk === 0) ? 50 : currentCpk / benchmarkCpk > C.CPK_POOR_MULTIPLIER ? 90 : currentCpk / benchmarkCpk < C.CPK_GREAT_MULTIPLIER ? 40 : 65;
  const trendConf = cpkTrend === null ? 50 : cpkTrend > 0.2 ? 90 : cpkTrend > 0.05 ? 70 : cpkTrend < 0 ? 30 : 50;
  const brandConf = brandTier==="premium" ? 90 : brandTier==="mid" ? 70 : 50;
  return Math.round(depthConf*C.CONF_W_DEPTH + pressConf*C.CONF_W_PRESSURE + benchConf*C.CONF_W_BENCHMARK + trendConf*C.CONF_W_TREND + brandConf*C.CONF_W_BRAND);
}

function calcCpkSignals(tire: Tire, recType: RecommendationType, benchmark: RawBenchmark | null, brandInfo: BrandInfo): CpkSignals {
  const currentCpk = tire.currentCpk || 0;
  let benchmarkCpk: number | null = null;
  if (benchmark) {
    if (tire.vidaActual === "nueva") benchmarkCpk = benchmark.cpkNueva ?? benchmark.avgCpk;
    else if (tire.vidaActual === "reencauche1") benchmarkCpk = benchmark.cpkReencauche1 ?? benchmark.avgCpk;
    else if (tire.vidaActual === "reencauche2") benchmarkCpk = benchmark.cpkReencauche2 ?? benchmark.avgCpk;
    else benchmarkCpk = benchmark.avgCpk;
  }
  let projectedCpk: number | null = null;
  if (recType === "ajustar_presion") projectedCpk = currentCpk > 0 ? currentCpk * 0.75 : null;
  else if (recType === "reencauche" && benchmark?.cpkReencauche1 != null) projectedCpk = benchmark.cpkReencauche1;
  else if (recType === "nueva" && benchmark?.cpkNueva != null) projectedCpk = benchmark.cpkNueva;
  else if (benchmarkCpk != null) projectedCpk = benchmarkCpk * brandInfo.cpkMultiplier;
  const savingsAnual = (projectedCpk != null && currentCpk > 0 && projectedCpk < currentCpk) ? Math.max(Math.round((currentCpk - projectedCpk) * C.KM_ANUAL), 0) : 0;
  const cpkVsBenchmark = (benchmarkCpk && currentCpk > 0) ? Math.round(((currentCpk - benchmarkCpk) / benchmarkCpk) * 100) : null;
  return { currentCpk, benchmarkCpk, projectedCpk, savingsAnual, cpkVsBenchmark };
}

function determineRecommendationType(tire: Tire, minDepth: number, avgDepth: number, presionDelta: number | null, maxDelta: number, reencaucheCount: number, maxReencauches: number): { type: RecommendationType; reason: string } {
  if (presionDelta !== null && presionDelta <= -C.PRESSURE_UNDER_CRIT_PSI) return { type:"ajustar_presion", reason:`🔴 Presión crítica: ${Math.abs(Math.round(presionDelta))} PSI bajo lo recomendado. Riesgo de falla estructural.` };

  // Check alignment: unilateral shoulder wear
  const lastInsp = tire.inspecciones?.[0];
  if (lastInsp) {
    const shoulderDelta = Math.abs(lastInsp.profundidadInt - lastInsp.profundidadExt);
    if (shoulderDelta >= C.ALIGNMENT_WARN_MM && maxDelta <= C.IRREGULAR_WEAR_DELTA) {
      const side = lastInsp.profundidadInt < lastInsp.profundidadExt ? 'interior' : 'exterior';
      if (minDepth > C.DEPTH_CRITICAL_MM) {
        return { type:"rotar", reason:`🟡 Desalineación: Δ${shoulderDelta.toFixed(1)}mm hombro ${side}. Alinear ejes y rotar cruzado antes de que destruya el casco.` };
      }
    }
  }

  if (minDepth <= C.LIMITE_LEGAL_MM) {
    if (reencaucheCount >= maxReencauches) return { type:"nueva", reason:`🔴 Límite legal (${minDepth.toFixed(1)}mm). Casco posiblemente dañado. Llanta nueva requerida.` };
    return { type:"reencauche", reason:`🔴 Límite legal (${minDepth.toFixed(1)}mm). Casco en riesgo — evaluar si aún es reencauchable.` };
  }
  if (minDepth <= C.OPTIMAL_RETIREMENT_MM) {
    // Optimal retirement zone — preserve casing
    if (reencaucheCount >= maxReencauches) return { type:"nueva", reason:`🔴 Retiro óptimo (${minDepth.toFixed(1)}mm). Retirar ahora. Llanta nueva requerida.` };
    return { type:"reencauche", reason:`🔴 Retiro óptimo (${minDepth.toFixed(1)}mm). Retirar AHORA preserva casco para 2-3 reencauches.` };
  }
  if (minDepth <= C.DEPTH_WATCH_MM) {
    if (reencaucheCount >= maxReencauches) return { type:"nueva", reason:`🟡 Profundidad baja (${minDepth.toFixed(1)}mm). Límite de reencauches alcanzado.` };
    return { type:"reencauche", reason:`🟡 Profundidad baja (${minDepth.toFixed(1)}mm). Reencauche recomendado.` };
  }
  if (maxDelta > C.IRREGULAR_WEAR_DELTA && minDepth <= C.DEPTH_PLAN_MM) return { type:"rotar", reason:`🟡 Desgaste irregular: ${maxDelta.toFixed(1)}mm entre zonas. Rotar y revisar mecánica.` };
  if (minDepth <= C.DEPTH_PLAN_MM) {
    if (reencaucheCount >= maxReencauches) return { type:"nueva", reason:`🔵 Planificar compra nueva (${minDepth.toFixed(1)}mm).` };
    return { type:"reencauche", reason:`🔵 Planificar reencauche en 30–60 días (${minDepth.toFixed(1)}mm).` };
  }
  return { type:"evaluar", reason:"Evaluar condición física detallada." };
}

function determineUrgency(minDepth: number, alertLevel: string, presionDelta: number|null): UrgencyLevel {
  if (alertLevel==="critical" || minDepth <= C.LIMITE_LEGAL_MM || (presionDelta !== null && presionDelta <= -C.PRESSURE_UNDER_CRIT_PSI)) return "critical";
  if (minDepth <= C.DEPTH_CRITICAL_MM) return "immediate";
  if (minDepth <= C.DEPTH_WATCH_MM)    return "next_month";
  return "plan";
}

function analyzeTires(tires: Tire[], benchmarks: Map<string, RawBenchmark>): PedidosData {
  const critical: TireRecommendation[]  = [];
  const immediate: TireRecommendation[] = [];
  const nextMonth: TireRecommendation[] = [];
  const plan: TireRecommendation[]      = [];

  for (const tire of tires) {
    if (tire.vidaActual === "fin") continue;
    if (!tire.inspecciones?.length) continue;
    // inspecciones come sorted desc from API — [0] is the latest
    const lastInsp = tire.inspecciones[0];
    const minDepth = getMinDepth(lastInsp);
    const avgDepth = getAvgDepth(lastInsp);
    const maxDelta = getMaxZoneDelta(lastInsp);
    const pressureAlert = lastInsp.presionDelta !== null && lastInsp.presionDelta <= -C.PRESSURE_UNDER_WARN_PSI;
    if (minDepth > C.DEPTH_PLAN_MM && !pressureAlert) continue;

    const brandInfo       = getBrandInfo(tire.marca);
    const reencaucheCount = countReencauches(tire);
    const benchKey        = `${tire.marca.toLowerCase()}|${tire.diseno.toLowerCase()}|${tire.dimension.toLowerCase()}`;
    const benchmark       = benchmarks.get(benchKey) ?? null;
    const presionDelta    = lastInsp.presionDelta ?? null;

    const { type: recType, reason } = determineRecommendationType(tire, minDepth, avgDepth, presionDelta, maxDelta, reencaucheCount, brandInfo.maxReencauches);
    const urgency    = determineUrgency(minDepth, tire.alertLevel, presionDelta);
    const cpkSignals = calcCpkSignals(tire, recType, benchmark, brandInfo);
    const confidence = calcConfidence(minDepth, presionDelta, cpkSignals.benchmarkCpk, tire.currentCpk, tire.cpkTrend, brandInfo.tier);
    const projectedMonths = tire.projectedDateEOL ? Math.max(0, Math.round((new Date(tire.projectedDateEOL).getTime() - Date.now()) / (C.MS_POR_DIA * 30))) : null;

    const rec: TireRecommendation = {
      tire, urgency, minDepth, avgDepth,
      recommendationType: recType, recommendationReason: reason,
      reencaucheCount, maxReencauches: brandInfo.maxReencauches,
      brandTier: TIER_LABELS[brandInfo.tier] ?? brandInfo.tier,
      brandStrength: brandInfo.strength, brandRisk: brandInfo.risk,
      estimatedPrice: getEstimatedPrice(tire, benchmark),
      confidence, cpkSignals, pressureAlert,
      irregularWear: maxDelta > C.IRREGULAR_WEAR_DELTA,
      projectedMonths, vidaActual: tire.vidaActual, benchmark,
    };

    if      (urgency==="critical")   critical.push(rec);
    else if (urgency==="immediate")  immediate.push(rec);
    else if (urgency==="next_month") nextMonth.push(rec);
    else                             plan.push(rec);
  }

  const sortFn = (a: TireRecommendation, b: TireRecommendation) =>
    a.minDepth !== b.minDepth ? a.minDepth - b.minDepth : b.confidence - a.confidence;

  critical.sort(sortFn); immediate.sort(sortFn); nextMonth.sort(sortFn); plan.sort(sortFn);

  const all = [...critical, ...immediate, ...nextMonth, ...plan];
  return {
    critical, immediate, nextMonth, plan,
    totalEstimatedCost: all.reduce((s,r) => s + r.estimatedPrice, 0),
    totalSavingsAnual:  all.reduce((s,r) => s + r.cpkSignals.savingsAnual, 0),
    analyzedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API LAYER
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function getCompanyIdFromToken(): string | null {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return null;
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replace(/-/g,"+").replace(/_/g,"/")));
    return claims.companyId ?? claims.company_id ?? claims.sub?.companyId ?? null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

function formatCOP(val: number): string {
  if (!val || val === 0) return "N/D";
  return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(val);
}
function formatCOPCompact(val: number): string {
  if (!val || val === 0) return "—";
  if (val >= 1_000_000) return `$${(val/1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val/1_000).toFixed(0)}K`;
  return `$${val}`;
}
function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}); }
  catch { return iso; }
}
function formatDepth(mm: number): string { return `${mm.toFixed(1)}mm`; }
function formatCpk(v: number | null): string {
  if (!v || v === 0) return "—";
  return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(v)+"/km";
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildExportRows(recs: TireRecommendation[], edits: Record<string, RowEdits>, includePrices: boolean, includeConfidence: boolean) {
  return recs.map((r, i) => {
    const e = edits[r.tire.id] ?? { recommendationType:r.recommendationType, estimatedPrice:r.estimatedPrice, notes:"", recMarca:r.tire.marca, recBanda:r.tire.diseno, recDimension:r.tire.dimension };
    const tipoOrden = e.recommendationType==="reencauche"?"Reencauche":e.recommendationType==="nueva"?"Llanta Nueva":e.recommendationType==="ajustar_presion"?"Ajustar Presión":e.recommendationType==="rotar"?"Rotar":"Evaluar";
    const row: Record<string, string|number> = {
      "#":i+1, Placa:r.tire.placa, "Pos.":r.tire.posicion, Eje:r.tire.eje, "Vida Actual":r.vidaActual,
      "Marca Actual":r.tire.marca, "Diseño Actual":r.tire.diseno, "Dimensión":r.tire.dimension,
      "Prof. Mín (mm)":r.minDepth.toFixed(1), "Tipo de Orden":tipoOrden,
      "Marca Recomendada":e.recMarca||r.tire.marca, "Banda / Diseño Rec.":e.recBanda||r.tire.diseno,
      "Dimensión a Pedir":e.recDimension||r.tire.dimension,
      "CPK Actual":r.cpkSignals.currentCpk>0?r.cpkSignals.currentCpk.toFixed(2):"",
      "CPK Benchmark":r.cpkSignals.benchmarkCpk?.toFixed(2)??"",
      "Ahorro Anual Est. (COP)":r.cpkSignals.savingsAnual>0?r.cpkSignals.savingsAnual:"",
      Notas:e.notes,
    };
    if (includePrices)    row["Precio Estimado (COP)"] = e.estimatedPrice||"";
    if (includeConfidence) row["Confianza (%)"] = r.confidence;
    return row;
  });
}

async function doExportXLSX(data: PedidosData, edits: Record<string, RowEdits>, company: CompanyInfo, includePrices: boolean, includeConfidence: boolean) {
  const XLSX = await import("xlsx" as never).catch(()=>null) as any;
  if (!XLSX) { alert("SheetJS no disponible."); return; }
  const wb = XLSX.utils.book_new();
  const sections: [string, TireRecommendation[]][] = [["Crítico",data.critical],["Inmediato",data.immediate],["Próximo Mes",data.nextMonth],["Planificación",data.plan]];
  for (const [name,recs] of sections) if (recs.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildExportRows(recs,edits,includePrices,includeConfidence)), name);
  const editedTotal = [...data.critical,...data.immediate,...data.nextMonth,...data.plan].reduce((s,r)=>s+((edits[r.tire.id]?.estimatedPrice)??r.estimatedPrice),0);
  const summary = [["Empresa",company.name||"—"],["Fecha",formatDate(data.analyzedAt)],["Total Llantas",data.critical.length+data.immediate.length+data.nextMonth.length+data.plan.length],...(includePrices?[["Costo Total Est. (COP)",editedTotal],["Ahorro Anual Est. (COP)",data.totalSavingsAnual]]:[])];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),"Resumen");
  XLSX.writeFile(wb,`pedido_llantas_${new Date().toISOString().split("T")[0]}.xlsx`);
}

function doExportPDF(data: PedidosData, edits: Record<string, RowEdits>, company: CompanyInfo, includePrices: boolean, includeCompanyLogo: boolean, includeCurrentTire: boolean, includeConfidence: boolean) {
  const date = formatDate(data.analyzedAt);
  const allRecs = [...data.critical.map(r=>({...r,section:"Crítico"})),...data.immediate.map(r=>({...r,section:"Inmediato"})),...data.nextMonth.map(r=>({...r,section:"Próximo Mes"})),...data.plan.map(r=>({...r,section:"Planificación"}))];
  const editedTotal = allRecs.reduce((s,r)=>s+((edits[r.tire.id]?.estimatedPrice)??r.estimatedPrice),0);
  const colHeaders = ["#","ID Llanta","Pos·Eje","Vida","Prof.Mín",...(includeCurrentTire?["Marca Actual","Diseño","Dimensión"]:[]),"Tipo Orden","Marca Rec.","Banda","Dim. Rec.",...(includeConfidence?["Confianza"]:[]),...(includePrices?["Precio Est.","Ahorro/Año"]:[]),"Notas"];
  const rows = allRecs.map((r,i)=>{
    const e = edits[r.tire.id] ?? {recommendationType:r.recommendationType,estimatedPrice:r.estimatedPrice,notes:"",recMarca:r.tire.marca,recBanda:r.tire.diseno,recDimension:r.tire.dimension};
    const recLabel = e.recommendationType==="reencauche"?"Reencauche":e.recommendationType==="nueva"?"Llanta Nueva":e.recommendationType==="ajustar_presion"?"Ajustar Presión":e.recommendationType==="rotar"?"Rotar":"Evaluar";
    const recColor = e.recommendationType==="reencauche"?"#7c3aed":e.recommendationType==="nueva"?"#1d4ed8":e.recommendationType==="ajustar_presion"?"#dc2626":"#d97706";
    const recBg    = e.recommendationType==="reencauche"?"#ede9fe":e.recommendationType==="nueva"?"#dbeafe":e.recommendationType==="ajustar_presion"?"#fee2e2":"#fef3c7";
    const cells = [
      `<td style="text-align:center;color:#6b7280;padding:5px 6px;font-size:9px">${i+1}</td>`,
      `<td style="padding:5px 6px"><strong style="color:#0A183A;font-size:10px">${r.tire.placa}</strong></td>`,
      `<td style="padding:5px 6px;color:#6b7280;font-size:9px">P${r.tire.posicion}·${r.tire.eje}</td>`,
      `<td style="padding:5px 6px;color:#0A183A;font-size:9px">${r.vidaActual}</td>`,
      `<td style="padding:5px 6px;font-weight:700;color:${r.minDepth<=3?"#dc2626":"#d97706"};font-size:10px">${r.minDepth.toFixed(1)}mm</td>`,
      ...(includeCurrentTire?[`<td style="padding:5px 6px;font-size:9px">${r.tire.marca}</td>`,`<td style="padding:5px 6px;font-size:9px">${r.tire.diseno}</td>`,`<td style="padding:5px 6px;font-size:9px">${r.tire.dimension}</td>`]:[]),
      `<td style="padding:5px 6px"><span style="background:${recBg};color:${recColor};padding:1px 6px;border-radius:4px;font-weight:700;font-size:9px">${recLabel}</span></td>`,
      `<td style="padding:5px 6px;font-size:9px;font-weight:700">${e.recMarca||r.tire.marca}</td>`,
      `<td style="padding:5px 6px;font-size:9px">${e.recBanda||r.tire.diseno}</td>`,
      `<td style="padding:5px 6px;font-size:9px"><strong>${e.recDimension||r.tire.dimension}</strong></td>`,
      ...(includeConfidence?[`<td style="padding:5px 6px;font-size:9px;color:#1E76B6;font-weight:700">${r.confidence}%</td>`]:[]),
      ...(includePrices?[`<td style="padding:5px 6px;color:#15803d;font-weight:700;font-size:9px">${e.estimatedPrice>0?formatCOPCompact(e.estimatedPrice):"—"}</td>`,`<td style="padding:5px 6px;color:#7c3aed;font-weight:700;font-size:9px">${r.cpkSignals.savingsAnual>0?formatCOPCompact(r.cpkSignals.savingsAnual):"—"}</td>`]:[]),
      `<td style="padding:5px 6px;color:#6b7280;font-size:9px">${e.notes}</td>`,
    ];
    return `<tr style="background:${i%2===0?"#f9fafb":"white"}">${cells.join("")}</tr>`;
  }).join("");
  const thCells = colHeaders.map(h=>`<th style="background:#0A183A;color:white;padding:6px;text-align:left;font-weight:700;white-space:nowrap;font-size:9px">${h}</th>`).join("");
  const gridCols = 4+(includePrices?1:0);
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Pedido — ${company.name||"TirePro"}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0A183A;font-size:10px;padding:24px;background:white}.hdr{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:3px solid #1E76B6;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(${gridCols},1fr);gap:8px;background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:8px;padding:10px;margin-bottom:16px}.gi{text-align:center}.gn{font-size:17px;font-weight:900}.gl{font-size:8px;color:#6b7280;font-weight:600}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #e5e7eb}.ft{margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb;text-align:center;font-size:8px;color:#9ca3af}@media print{body{padding:14px}}</style></head><body>
<div class="hdr"><div style="display:flex;align-items:center;gap:10px">${includeCompanyLogo&&company.profileImage?`<img src="${company.profileImage}" alt="" style="height:32px;object-fit:contain"/>`:""}
<div><div style="font-size:17px;font-weight:900">${company.name||"TirePro"}</div><div style="font-size:9px;color:#6b7280">Gestión Inteligente de Llantas · TirePro</div></div></div>
<div style="text-align:right;font-size:9px;color:#6b7280"><p>Fecha: <strong>${date}</strong></p></div></div>
<div class="grid"><div class="gi"><div class="gn" style="color:#DC2626">${data.critical.length+data.immediate.length}</div><div class="gl">Urgente</div></div><div class="gi"><div class="gn" style="color:#D97706">${data.nextMonth.length}</div><div class="gl">Próximo Mes</div></div><div class="gi"><div class="gn">${data.critical.length+data.immediate.length+data.nextMonth.length+data.plan.length}</div><div class="gl">Total</div></div>${includePrices?`<div class="gi"><div class="gn" style="color:#15803d;font-size:12px">${formatCOPCompact(editedTotal)}</div><div class="gl">Costo Est.</div></div><div class="gi"><div class="gn" style="color:#7c3aed;font-size:12px">${formatCOPCompact(data.totalSavingsAnual)}</div><div class="gl">Ahorro Anual</div></div>`:""}</div>
<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>
<div class="ft">Generado con TirePro · ${date}</div></body></html>`;
  const blob = new Blob([html],{type:"text/html;charset=utf-8"});
  const url  = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  iframe.onload=()=>{ try{iframe.contentWindow?.focus();iframe.contentWindow?.print();}catch{const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}} setTimeout(()=>{document.body.removeChild(iframe);URL.revokeObjectURL(url);},60_000);};
  iframe.src=url;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function Card({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ background:"white", border:"1px solid rgba(52,140,203,0.15)", boxShadow:"0 4px 24px rgba(10,24,58,0.05)", width:"100%", maxWidth:"100%", minWidth:0, boxSizing:"border-box", overflow:"hidden" }}>
      {children}
    </div>
  );
}

const URGENCY_CONFIG: Record<UrgencyLevel,{label:string;color:string;bg:string;border:string}> = {
  critical:   { label:"Crítico",       color:"#DC2626", bg:"rgba(220,38,38,0.06)",  border:"rgba(220,38,38,0.2)"  },
  immediate:  { label:"Inmediato",     color:"#DC2626", bg:"rgba(220,38,38,0.04)",  border:"rgba(220,38,38,0.15)" },
  next_month: { label:"Próximo Mes",   color:"#D97706", bg:"rgba(217,119,6,0.06)",  border:"rgba(217,119,6,0.18)" },
  plan:       { label:"Planificación", color:"#1E76B6", bg:"rgba(30,118,182,0.04)", border:"rgba(30,118,182,0.15)"},
};

const REC_OPTIONS: { value: RecommendationType; label: string; color: string; bg: string }[] = [
  { value:"reencauche",     label:"Reencauche",     color:"#7c3aed", bg:"rgba(124,58,237,0.1)" },
  { value:"nueva",          label:"Llanta Nueva",   color:"#1E76B6", bg:"rgba(30,118,182,0.1)" },
  { value:"ajustar_presion",label:"Ajustar Presión",color:"#dc2626", bg:"rgba(220,38,38,0.1)"  },
  { value:"rotar",          label:"Rotar",           color:"#0891b2", bg:"rgba(8,145,178,0.1)"  },
  { value:"evaluar",        label:"Evaluar",         color:"#D97706", bg:"rgba(217,119,6,0.1)"  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY PANEL — shows matching inventory tires per recommendation
// ─────────────────────────────────────────────────────────────────────────────

const InventoryMatchPanel = memo(function InventoryMatchPanel({
  match, buckets,
}: {
  match: InventoryMatch;
  buckets: InventoryBucket[];
}) {
  const [open, setOpen] = useState(false);
  const count = match.matches.length;
  if (count === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
        style={{ background:"rgba(39,174,96,0.1)", color:"#15803d", border:"1px solid rgba(39,174,96,0.2)" }}
      >
        <Warehouse className="w-3 h-3"/>
        {count} en inventario
        {open ? <ChevronUp className="w-2.5 h-2.5"/> : <ChevronDown className="w-2.5 h-2.5"/>}
      </button>
      {open && (
        <div className="mt-1.5 rounded-xl overflow-hidden" style={{ border:"1px solid rgba(39,174,96,0.18)", background:"rgba(39,174,96,0.02)" }}>
          <div className="px-3 py-1.5 border-b border-green-100">
            <p className="text-[9px] font-black uppercase tracking-wider text-green-700">Llantas disponibles — misma dimensión</p>
          </div>
          <div className="divide-y divide-green-50">
            {match.matches.slice(0,5).map(inv => {
              const bucket = buckets.find(b => b.id === inv.inventoryBucketId);
              return (
                <div key={inv.id} className="px-3 py-2 flex items-center gap-2">
                  <Truck className="w-3 h-3 text-green-600 flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-[#0A183A] truncate" style={{ fontFamily:"'DM Mono',monospace" }}>
                      {inv.placa.toUpperCase()}
                    </p>
                    <p className="text-[9px] text-gray-400">{inv.marca} · {inv.dimension}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {inv.vidaActual && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background:"rgba(10,24,58,0.05)", color:"#6b7280" }}>
                        {inv.vidaActual}
                      </span>
                    )}
                    {bucket ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background:bucket.color }}>
                        {bucket.icono} {bucket.nombre}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:"rgba(30,118,182,0.1)", color:"#1E76B6" }}>
                        ✅ Disponible
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {match.matches.length > 5 && (
              <div className="px-3 py-2 text-[9px] text-green-600 font-bold">+{match.matches.length-5} más en inventario</div>
            )}
          </div>
          <div className="px-3 py-2 border-t border-green-100">
            <p className="text-[9px] text-green-700 font-medium">
              ✓ Considera usar {Math.min(count, 1)} de estas antes de comprar nueva
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SEND GROUP MODAL
// ─────────────────────────────────────────────────────────────────────────────

function SendGroupModal({
  state, buckets, onClose, onConfirm,
}: {
  state:     SendGroupState;
  buckets:   InventoryBucket[];
  onClose:   () => void;
  onConfirm: (s: SendGroupState) => void;
}) {
  if (!state.open) return null;

  const [local, setLocal] = useState<SendGroupState>(state);
  const patch = (p: Partial<SendGroupState>) => setLocal(prev => ({ ...prev, ...p }));

  const reencaucheCount = state.recs.filter(r => r.recommendationType === "reencauche").length;
  const otherCount      = state.recs.length - reencaucheCount;

  const canConfirm = ((): boolean => {
    if (!local.action) return false;
    if (local.action === "fin_vida") return !!local.finCausales && !!local.finMilimetros;
    if (local.action === "move_bucket") return !!local.targetBucketId;
    if (local.action === "reencauche_bucket") return !!local.targetBucketId && !!local.proveedor && !!local.profundidadNueva;
    return false;
  })();

  const ACTION_CARDS: Array<{ id: SendGroupAction; icon: React.ReactNode; title: string; sub: string; color: string; bg: string }> = [
    { id:"fin_vida",          icon:<X className="w-5 h-5"/>,       title:"Dar fin de vida",        sub:`Marca las ${state.recs.length} llantas como retiradas con sus datos actuales`,   color:"#dc2626", bg:"rgba(220,38,38,0.06)"  },
    { id:"reencauche_bucket", icon:<RotateCcw className="w-5 h-5"/>,title:"Enviar a reencauche",   sub:`Avanza la vida a reencauche y mueve a un grupo de inventario (${reencaucheCount} con rec. reencauche)`, color:"#7c3aed", bg:"rgba(124,58,237,0.06)" },
    { id:"move_bucket",       icon:<Layers className="w-5 h-5"/>,  title:"Mover a inventario",     sub:`Solo cambia el grupo sin modificar la vida. Útil para organizar (${otherCount} otras llantas)`, color:"#1E76B6", bg:"rgba(30,118,182,0.06)" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(10,24,58,0.65)", backdropFilter:"blur(8px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" style={{ border:"1px solid rgba(52,140,203,0.2)" }}>

        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0" style={{ background:"linear-gradient(135deg,#0A183A 0%,#1E76B6 100%)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-white"/>
              <div>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">Enviar Grupo</h3>
                <p className="text-white/55 text-xs mt-0.5">{state.recs.length} llanta{state.recs.length!==1?"s":""} seleccionada{state.recs.length!==1?"s":""}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white"/></button>
          </div>

          {/* Tire list preview */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {state.recs.slice(0,8).map(r => (
              <span key={r.tire.id} className="text-[10px] font-black px-2 py-0.5 rounded-md text-white/80" style={{ background:"rgba(255,255,255,0.12)", fontFamily:"'DM Mono',monospace" }}>
                {r.tire.placa.toUpperCase()}
              </span>
            ))}
            {state.recs.length > 8 && <span className="text-[10px] text-white/50 font-bold">+{state.recs.length-8} más</span>}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

          {/* Action selection */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">¿Qué deseas hacer con estas llantas?</p>
            <div className="space-y-2">
              {ACTION_CARDS.map(card => (
                <button
                  key={card.id}
                  onClick={() => patch({ action: card.id })}
                  className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                  style={{
                    background: local.action === card.id ? card.bg : "rgba(52,140,203,0.02)",
                    border: local.action === card.id ? `2px solid ${card.color}` : "2px solid rgba(52,140,203,0.12)",
                  }}
                >
                  <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5" style={{ background: local.action === card.id ? card.bg : "rgba(52,140,203,0.06)", color: card.color }}>
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-[#0A183A]">{card.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{card.sub}</p>
                  </div>
                  {local.action === card.id && <Check className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: card.color }}/>}
                </button>
              ))}
            </div>
          </div>

          {/* ── Fin de vida fields ── */}
          {local.action === "fin_vida" && (
            <div className="space-y-3 px-4 py-4 rounded-xl" style={{ background:"rgba(220,38,38,0.04)", border:"1px solid rgba(220,38,38,0.18)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5"/> Datos de retiro
              </p>
              <div>
                <label className="text-[10px] font-black text-[#0A183A] uppercase tracking-wide block mb-1.5">Causales de desecho *</label>
                <input
                  value={local.finCausales}
                  onChange={e => patch({ finCausales: e.target.value })}
                  placeholder="Ej: Desgaste natural, Daño mecánico…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-[#0A183A] bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all"
                  style={{ border:"1.5px solid rgba(220,38,38,0.3)" }}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-[#0A183A] uppercase tracking-wide block mb-1.5">Milímetros restantes al retirar *</label>
                <input
                  type="number" min="0" max="25" step="0.1"
                  value={local.finMilimetros}
                  onChange={e => patch({ finMilimetros: e.target.value })}
                  placeholder="Ej: 2.5"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-[#0A183A] bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all"
                  style={{ border:"1.5px solid rgba(220,38,38,0.3)" }}
                />
              </div>
              <p className="text-[10px] text-red-500 font-medium">⚠️ Esta acción es permanente. Las llantas quedarán en estado "fin de vida" y saldrán de la flota activa.</p>
            </div>
          )}

          {/* ── Move to bucket fields ── */}
          {local.action === "move_bucket" && (
            <div className="space-y-3 px-4 py-4 rounded-xl" style={{ background:"rgba(30,118,182,0.04)", border:"1px solid rgba(30,118,182,0.18)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#1E76B6] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5"/> Grupo destino
              </p>
              <div>
                <label className="text-[10px] font-black text-[#0A183A] uppercase tracking-wide block mb-1.5">Mover a *</label>
                <div className="space-y-2">
                  {/* Disponible option */}
                  <button
                    onClick={() => patch({ targetBucketId: "__disponible__" })}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                    style={{ background: local.targetBucketId === "__disponible__" ? "rgba(30,118,182,0.1)" : "white", border: local.targetBucketId === "__disponible__" ? "1.5px solid #1E76B6" : "1.5px solid rgba(52,140,203,0.2)" }}
                  >
                    <span className="text-base">✅</span>
                    <span className="font-bold text-[#0A183A]">Disponible</span>
                    {local.targetBucketId === "__disponible__" && <Check className="w-3.5 h-3.5 ml-auto text-[#1E76B6]"/>}
                  </button>
                  {buckets.map(b => (
                    <button
                      key={b.id}
                      onClick={() => patch({ targetBucketId: b.id })}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                      style={{ background: local.targetBucketId === b.id ? `${b.color}12` : "white", border: local.targetBucketId === b.id ? `1.5px solid ${b.color}` : "1.5px solid rgba(52,140,203,0.2)" }}
                    >
                      <span className="text-base">{b.icono}</span>
                      <span className="font-bold text-[#0A183A]">{b.nombre}</span>
                      <span className="text-xs text-gray-400 ml-1">({b.tireCount})</span>
                      {local.targetBucketId === b.id && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: b.color }}/>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Reencauche + bucket fields ── */}
          {local.action === "reencauche_bucket" && (
            <div className="space-y-3 px-4 py-4 rounded-xl" style={{ background:"rgba(124,58,237,0.04)", border:"1px solid rgba(124,58,237,0.18)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color:"#7c3aed" }}>
                <RotateCcw className="w-3.5 h-3.5"/> Parámetros de reencauche
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-[#0A183A] uppercase tracking-wide block mb-1.5">Proveedor / Planta *</label>
                  <input
                    value={local.proveedor}
                    onChange={e => patch({ proveedor: e.target.value })}
                    placeholder="Ej: Bandag Bogotá"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-[#0A183A] bg-white placeholder-gray-300 focus:outline-none focus:ring-2 transition-all"
                    style={{ border:"1.5px solid rgba(124,58,237,0.3)", focusRingColor:"#7c3aed" } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#0A183A] uppercase tracking-wide block mb-1.5">Prof. Inicial Nueva (mm) *</label>
                  <input
                    type="number" min="1" max="30" step="0.5"
                    value={local.profundidadNueva}
                    onChange={e => patch({ profundidadNueva: e.target.value })}
                    placeholder="Ej: 22"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-[#0A183A] bg-white placeholder-gray-300 focus:outline-none focus:ring-2 transition-all"
                    style={{ border:"1.5px solid rgba(124,58,237,0.3)" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-[#0A183A] uppercase tracking-wide block mb-1.5">Grupo inventario destino *</label>
                <div className="space-y-2">
                  {buckets.map(b => (
                    <button
                      key={b.id}
                      onClick={() => patch({ targetBucketId: b.id })}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                      style={{ background: local.targetBucketId === b.id ? `${b.color}12` : "white", border: local.targetBucketId === b.id ? `1.5px solid ${b.color}` : "1.5px solid rgba(52,140,203,0.2)" }}
                    >
                      <span className="text-base">{b.icono}</span>
                      <span className="font-bold text-[#0A183A]">{b.nombre}</span>
                      {local.targetBucketId === b.id && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: b.color }}/>}
                    </button>
                  ))}
                  {buckets.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic px-2">No hay grupos creados. Crea uno en la página de Inventarios.</p>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-purple-600 font-medium">
                Solo se avanzará la vida de llantas cuya recomendación sea "reencauche" ({reencaucheCount} de {state.recs.length}).
                Las demás solo se moverán al inventario.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 flex-shrink-0" style={{ borderTop:"1px solid rgba(52,140,203,0.08)" }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#1E76B6] transition-colors hover:bg-[#F0F7FF]" style={{ border:"1px solid rgba(52,140,203,0.25)" }}>
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(local)}
            disabled={!canConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background:"linear-gradient(135deg,#1E76B6,#0A183A)" }}
          >
            <ArrowRight className="w-4 h-4"/> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────────────────────────────────────

interface FilterState { eje:string; alertLevel:string; vidaActual:string; urgency:string; recType:string }

const FILTER_OPTIONS = {
  eje:        ["Todos","direccion","traccion","libre","remolque","repuesto"],
  alertLevel: ["Todos","critical","warning","watch","ok"],
  vidaActual: ["Todos","nueva","reencauche1","reencauche2","reencauche3"],
  urgency:    ["Todos","critical","immediate","next_month","plan"],
  recType:    ["Todos","reencauche","nueva","ajustar_presion","rotar","evaluar"],
};

const FilterBar = memo(function FilterBar({ filters, onChange }: { filters:FilterState; onChange:(f:Partial<FilterState>)=>void }) {
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(filters).filter(v=>v!=="Todos").length;
  return (
    <div>
      <button onClick={()=>setOpen(o=>!o)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors hover:bg-gray-50" style={{ border:"1.5px solid rgba(52,140,203,0.2)", color:"#1E76B6" }}>
        <Filter className="w-3.5 h-3.5"/>Filtros
        {activeCount>0&&<span className="px-1.5 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background:"#1E76B6" }}>{activeCount}</span>}
        {open?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-xl" style={{ border:"1.5px solid rgba(52,140,203,0.15)", background:"rgba(10,24,58,0.02)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(Object.keys(FILTER_OPTIONS) as (keyof typeof FILTER_OPTIONS)[]).map(key => (
              <div key={key}>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wide block mb-1">{key==="eje"?"Eje":key==="alertLevel"?"Alerta":key==="vidaActual"?"Vida":key==="urgency"?"Urgencia":"Tipo Rec."}</label>
                <select value={filters[key]} onChange={e=>onChange({[key]:e.target.value})} className="w-full px-2 py-1.5 rounded-lg text-xs font-medium text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]" style={{ border:"1.5px solid rgba(52,140,203,0.2)", background:"white" }}>
                  {FILTER_OPTIONS[key].map(opt=><option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}
          </div>
          {activeCount>0&&<button onClick={()=>onChange({eje:"Todos",alertLevel:"Todos",vidaActual:"Todos",urgency:"Todos",recType:"Todos"})} className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700">✕ Limpiar filtros</button>}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface ExportModalState { open:boolean; format:"pdf"|"xlsx"|null; includePrices:boolean; includeCompanyLogo:boolean; includeCurrentTire:boolean; includeConfidence:boolean; generating:boolean }

function ExportModal({ state, onClose, onExport, onChange }: { state:ExportModalState; onClose:()=>void; onExport:()=>void; onChange:(p:Partial<ExportModalState>)=>void }) {
  if (!state.open) return null;
  const options = [{key:"includePrices",label:"Incluir precios estimados"},{key:"includeCompanyLogo",label:"Incluir logo de la empresa"},{key:"includeCurrentTire",label:"Incluir llanta actual"},{key:"includeConfidence",label:"Incluir puntaje de confianza"}];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(10,24,58,0.5)", backdropFilter:"blur(4px)" }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background:"white", boxShadow:"0 24px 64px rgba(10,24,58,0.2)", border:"1px solid rgba(52,140,203,0.2)" }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background:"linear-gradient(135deg,#0A183A,#1E76B6)" }}>
          <span className="font-black text-white text-sm flex items-center gap-2"><Download className="w-4 h-4"/>Exportar Pedido</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide mb-2">Formato</p>
            <div className="grid grid-cols-2 gap-2">
              {(["pdf","xlsx"] as const).map(fmt=>(
                <button key={fmt} onClick={()=>onChange({format:fmt})} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-bold" style={{ borderColor:state.format===fmt?"#1E76B6":"rgba(52,140,203,0.2)", background:state.format===fmt?"rgba(30,118,182,0.06)":"white", color:state.format===fmt?"#1E76B6":"#6b7280" }}>
                  {fmt==="pdf"?<><FileText className="w-4 h-4"/>PDF</>:<><FileSpreadsheet className="w-4 h-4"/>Excel</>}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {options.map(opt=>(
              <label key={opt.key} className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-xl hover:bg-gray-50" style={{ border:"1px solid rgba(52,140,203,0.1)" }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background:state[opt.key as keyof ExportModalState]?"linear-gradient(135deg,#0A183A,#1E76B6)":"white", border:state[opt.key as keyof ExportModalState]?"none":"1.5px solid rgba(52,140,203,0.3)" }}>
                  {state[opt.key as keyof ExportModalState]&&<CheckCircle2 className="w-3 h-3 text-white"/>}
                </div>
                <input type="checkbox" className="hidden" checked={!!state[opt.key as keyof ExportModalState]} onChange={e=>onChange({[opt.key]:e.target.checked})}/>
                <span className="text-sm text-[#0A183A] font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 border border-gray-200">Cancelar</button>
            <button onClick={onExport} disabled={!state.format||state.generating} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50" style={{ background:"linear-gradient(135deg,#0A183A,#1E76B6)" }}>
              {state.generating?<><Loader2 className="w-4 h-4 animate-spin"/>Generando…</>:<><Download className="w-4 h-4"/>Exportar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TABLE
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

interface SectionTableProps {
  recs:           TireRecommendation[];
  edits:          Record<string, RowEdits>;
  onEdit:         (id:string, p:Partial<RowEdits>)=>void;
  urgency:        UrgencyLevel;
  title:          string;
  color:          string;
  search:         string;
  inventoryMap:   Map<string, InventoryMatch>;
  buckets:        InventoryBucket[];
  onSendGroup:    (recs: TireRecommendation[]) => void;
  vehicles:       Array<{ id: string; placa: string; tipovhc: string }>; // ← ADD
}
const SectionTable = memo(function SectionTable({
  recs, edits, onEdit, urgency, title, color, search, inventoryMap, buckets, onSendGroup, vehicles,
}: SectionTableProps) {
  const [page, setPage]               = useState(0);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdown]   = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const q = search.toLowerCase();
  const filtered = useMemo(() =>
    !search ? recs : recs.filter(r =>
      r.tire.placa.toLowerCase().includes(q) ||
      r.tire.marca.toLowerCase().includes(q) ||
      r.tire.dimension.toLowerCase().includes(q) ||
      r.tire.eje.toLowerCase().includes(q) ||
      r.vidaActual.toLowerCase().includes(q)
    ),
  [recs, search, q]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible    = useMemo(() => filtered.slice(page*PAGE_SIZE, (page+1)*PAGE_SIZE), [filtered, page]);

  useEffect(() => setPage(0), [search]);
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  if (!filtered.length) return null;

  const allSelected  = visible.every(r => selected.has(r.tire.id));
  const someSelected = visible.some(r => selected.has(r.tire.id));
  const selectedRecs = filtered.filter(r => selected.has(r.tire.id));

  function toggleAll() {
    if (allSelected) setSelected(prev => { const n=new Set(prev); visible.forEach(r=>n.delete(r.tire.id)); return n; });
    else setSelected(prev => { const n=new Set(prev); visible.forEach(r=>n.add(r.tire.id)); return n; });
  }

  function toggleOne(id: string) {
    setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  }

  const COLS = ["","ID Llanta","Marca / Vida","CPK","Ahorro","Inventario","Tipo Orden","Marca Rec.","Banda","Precio","Notas"];

  return (
    <div style={{ width:"100%", minWidth:0 }}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-2 px-0.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:color }}/>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color }}>{title}</p>
          <span className="text-[11px] font-bold text-gray-400">— {filtered.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <div ref={dropRef} style={{ position:"relative" }}>
              <button
                onClick={() => setDropdown(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
                style={{ background:`linear-gradient(135deg,${color},#0A183A)` }}
              >
                <Send className="w-3.5 h-3.5"/>
                Enviar {selectedRecs.length} llanta{selectedRecs.length!==1?"s":""}
                <ChevronDown className="w-3 h-3 opacity-70"/>
              </button>
              {dropdownOpen && (
                <div className="rounded-xl overflow-hidden" style={{ position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:999, background:"white", border:"1px solid rgba(52,140,203,0.2)", boxShadow:"0 8px 24px rgba(10,24,58,0.12)", minWidth:220 }}>
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Enviar grupo a…</p>
                  </div>
                  <button onClick={()=>{setDropdown(false);onSendGroup(selectedRecs);}} className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-left hover:bg-gray-50 transition-colors">
                    <Send className="w-3.5 h-3.5 text-[#1E76B6]"/><span className="text-[#0A183A]">Configurar acción…</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="p-1 rounded-lg disabled:opacity-30 hover:bg-gray-100"><ChevronLeft className="w-3.5 h-3.5 text-gray-500"/></button>
              <span className="text-[10px] text-gray-400 font-bold">{page+1}/{totalPages}</span>
              <button disabled={page>=totalPages-1} onClick={()=>setPage(p=>p+1)} className="p-1 rounded-lg disabled:opacity-30 hover:bg-gray-100"><ChevronRight className="w-3.5 h-3.5 text-gray-500"/></button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ width:"100%", overflowX:"auto", WebkitOverflowScrolling:"touch", borderRadius:12, border:`1.5px solid ${color}28`, boxSizing:"border-box" }}>
        <table style={{ width:"max-content", minWidth:"100%", borderCollapse:"collapse", tableLayout:"auto" }}>
          <thead>
            <tr style={{ background:`${color}07`, borderBottom:`1.5px solid ${color}22` }}>
              {/* Select all */}
              <th className="px-3 py-2.5" style={{ width:36 }}>
                <button onClick={toggleAll} className="w-4 h-4 rounded flex items-center justify-center transition-all" style={{ background:allSelected?"#1E76B6":someSelected?"rgba(30,118,182,0.3)":"white", border:allSelected||someSelected?"none":"1.5px solid rgba(52,140,203,0.3)" }}>
                  {(allSelected||someSelected) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3}/>}
                </button>
              </th>
              {COLS.map(h=>(
                <th key={h} className="px-3 py-2.5 text-left uppercase" style={{ fontSize:10, fontWeight:900, color:"#0A183A", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(rec => {
              const e = edits[rec.tire.id] ?? { recommendationType:rec.recommendationType, estimatedPrice:rec.estimatedPrice, notes:"", recMarca:rec.tire.marca, recBanda:rec.tire.diseno, recDimension:rec.tire.dimension };
              const recOpt = REC_OPTIONS.find(o=>o.value===e.recommendationType)??REC_OPTIONS[0];
              const invMatch = inventoryMap.get(rec.tire.id);
              const urg = URGENCY_CONFIG[rec.urgency];
              const isSelected = selected.has(rec.tire.id);

              return (
                <tr key={rec.tire.id} style={{ borderBottom:"1px solid rgba(52,140,203,0.06)", background: isSelected ? "rgba(30,118,182,0.03)" : "transparent" }} className="hover:bg-blue-50/20 transition-colors">
                  {/* Checkbox */}
                  <td className="px-3 py-3">
                    <button onClick={() => toggleOne(rec.tire.id)} className="w-4 h-4 rounded flex items-center justify-center transition-all" style={{ background:isSelected?"#1E76B6":"white", border:isSelected?"none":"1.5px solid rgba(52,140,203,0.3)" }}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3}/>}
                    </button>
                  </td>
                  {/* Urgency stripe */}
                  <td className="py-3 pl-2 pr-1" style={{ width:8 }}>
                    <div className="w-1.5 h-8 rounded-full" style={{ background:urg.color }}/>
                  </td>
                  {/* ID + depth + vehicle */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    <p className="font-black text-[#0A183A] text-sm leading-tight">{rec.tire.placa}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background:rec.minDepth<=3?"rgba(220,38,38,0.1)":rec.minDepth<=6?"rgba(217,119,6,0.1)":"rgba(30,118,182,0.08)", color:rec.minDepth<=3?"#dc2626":rec.minDepth<=6?"#d97706":"#1E76B6" }}>
                        {formatDepth(rec.minDepth)}
                      </span>
                      <span className="text-[10px] text-gray-400">P{rec.tire.posicion}·{rec.tire.eje}</span>
                    </div>
                    {rec.tire.vehicleId && (() => {
                      const v = vehicles.find(v => v.id === rec.tire.vehicleId);
                      return v ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Truck className="w-2.5 h-2.5 text-[#348CCB]"/>
                          <span className="text-[9px] font-black text-[#348CCB]" style={{ fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em" }}>
                            {v.placa.toUpperCase()}
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </td>
                  {/* Brand + vida */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    <p className="font-bold text-[#0A183A] text-xs">{rec.tire.marca}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold" style={{ background:"rgba(10,24,58,0.05)", color:"#6b7280" }}>{rec.vidaActual}</span>
                  </td>
                  {/* CPK */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    <p className="text-xs font-black text-[#0A183A]">{formatCOPCompact(rec.cpkSignals.currentCpk)}</p>
                    {rec.cpkSignals.cpkVsBenchmark!==null && (
                      <p className="text-[9px] font-bold" style={{ color:rec.cpkSignals.cpkVsBenchmark>20?"#dc2626":rec.cpkSignals.cpkVsBenchmark<-10?"#15803d":"#6b7280" }}>
                        {rec.cpkSignals.cpkVsBenchmark>0?"+":""}{rec.cpkSignals.cpkVsBenchmark}% bm
                      </p>
                    )}
                  </td>
                  {/* Savings */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    {rec.cpkSignals.savingsAnual>0
                      ? <div className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-green-600"/><span className="text-xs font-black text-green-700">{formatCOPCompact(rec.cpkSignals.savingsAnual)}</span></div>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  {/* Inventory match */}
                  <td className="px-3 py-3" style={{ minWidth:120 }}>
                    {invMatch && invMatch.matches.length > 0
                      ? <InventoryMatchPanel match={invMatch} buckets={buckets}/>
                      : <span className="text-[10px] text-gray-300">Sin stock</span>}
                  </td>
                  {/* Rec type */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    <div className="relative inline-block">
                      <select
                        value={e.recommendationType}
                        onChange={ev => onEdit(rec.tire.id, { recommendationType: ev.target.value as RecommendationType })}
                        className="appearance-none pl-2.5 pr-7 py-1.5 rounded-lg text-[11px] font-black cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                        style={{ background:recOpt.bg, color:recOpt.color, border:"none" }}
                      >
                        {REC_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none" style={{ color:recOpt.color }}/>
                    </div>
                  </td>
                  {/* Marca rec */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    <input value={e.recMarca} onChange={ev=>onEdit(rec.tire.id,{recMarca:ev.target.value})} placeholder={rec.tire.marca} className="px-2 py-1 rounded-lg text-xs font-medium text-[#0A183A] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]" style={{ border:"1.5px solid rgba(52,140,203,0.18)", background:"rgba(30,118,182,0.02)", width:90 }}/>
                  </td>
                  {/* Banda */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    <input value={e.recBanda} onChange={ev=>onEdit(rec.tire.id,{recBanda:ev.target.value})} placeholder={e.recommendationType==="reencauche"?"Banda…":rec.tire.diseno} className="px-2 py-1 rounded-lg text-xs font-medium text-[#0A183A] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]" style={{ border:"1.5px solid rgba(52,140,203,0.18)", background:"rgba(30,118,182,0.02)", width:110 }}/>
                  </td>
                  {/* Price */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    <input type="number" value={e.estimatedPrice||""} onChange={ev=>onEdit(rec.tire.id,{estimatedPrice:parseInt(ev.target.value)||0})} placeholder="—" className="px-2 py-1 rounded-lg text-xs font-bold text-green-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-300" style={{ border:"1.5px solid rgba(34,197,94,0.25)", background:"rgba(34,197,94,0.02)", width:90 }}/>
                  </td>
                  {/* Notes */}
                  <td className="px-3 py-3" style={{ whiteSpace:"nowrap" }}>
                    <input value={e.notes} onChange={ev=>onEdit(rec.tire.id,{notes:ev.target.value})} placeholder="Notas…" className="px-2 py-1 rounded-lg text-xs font-medium text-[#0A183A] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]" style={{ border:"1.5px solid rgba(52,140,203,0.18)", background:"rgba(30,118,182,0.02)", width:110 }}/>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const VehicleGapsSection = memo(function VehicleGapsSection({
  gaps,
}: {
  gaps: VehicleGap[];
}) {
  if (gaps.length === 0) return null;

  const totalMissing = gaps.reduce((s, g) => s + g.missingPositions.length, 0);

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between flex-wrap gap-2"
        style={{
          padding: "12px 16px",
          borderBottom: "1.5px solid rgba(217,119,6,0.18)",
          background: "rgba(217,119,6,0.03)",
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg" style={{ background: "rgba(217,119,6,0.12)" }}>
            <Package className="w-4 h-4" style={{ color: "#d97706" }} />
          </div>
          <p className="text-sm font-black text-[#0A183A]">Vehículos con Posiciones Vacías</p>
          <span className="text-[11px] text-gray-400 font-bold">
            {gaps.length} vehículo{gaps.length !== 1 ? "s" : ""} ·{" "}
            {totalMissing} posición{totalMissing !== 1 ? "es" : ""} faltante{totalMissing !== 1 ? "s" : ""}
          </span>
        </div>
        <span
          className="text-[10px] font-black px-2.5 py-1 rounded-lg"
          style={{ background: "rgba(217,119,6,0.1)", color: "#d97706" }}
        >
          Requiere atención
        </span>
      </div>

      {/* Vehicle rows */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {gaps.map(gap => (
          <div
            key={gap.vehicleId}
            className="flex items-start gap-4 px-4 py-3 rounded-xl flex-wrap"
            style={{
              background: "rgba(217,119,6,0.025)",
              border: "1.5px solid rgba(217,119,6,0.14)",
            }}
          >
            {/* Vehicle identity */}
            <div className="flex-shrink-0" style={{ minWidth: 110 }}>
              <p
                className="font-black text-[#0A183A] text-sm"
                style={{ fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}
              >
                {gap.placa.toUpperCase()}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{gap.tipovhc || "—"}</p>
              <p className="text-[10px] font-bold mt-1" style={{ color: "#d97706" }}>
                {gap.occupiedPositions.length}/{gap.expectedTotal} ocupadas
              </p>
            </div>

            {/* Position grid */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">
                Mapa de posiciones
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: gap.expectedTotal }, (_, i) => i + 1).map(pos => {
                  const isOccupied = gap.occupiedPositions.includes(pos);
                  return (
                    <div
                      key={pos}
                      title={isOccupied ? `Pos ${pos}: ocupada` : `Pos ${pos}: VACÍA`}
                      className="flex items-center justify-center rounded-lg text-[11px] font-black transition-all"
                      style={{
                        width: 30,
                        height: 30,
                        background: isOccupied
                          ? "rgba(30,118,182,0.08)"
                          : "rgba(220,38,38,0.07)",
                        border: isOccupied
                          ? "1.5px solid rgba(30,118,182,0.28)"
                          : "1.5px dashed rgba(220,38,38,0.45)",
                        color: isOccupied ? "#1E76B6" : "#dc2626",
                      }}
                    >
                      {isOccupied ? pos : "?"}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Missing summary */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
              <span
                className="text-[11px] font-black px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
              >
                Faltan {gap.missingPositions.length}
              </span>
              <span className="text-[10px] text-gray-400 font-medium text-right">
                Pos: {gap.missingPositions.join(", ")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1.5px solid rgba(217,119,6,0.1)",
          background: "rgba(217,119,6,0.02)",
        }}
      >
        <p className="text-[10px] text-gray-400">
          Posiciones vacías generan desgaste irregular en ejes adyacentes.
          Considera incluir estas llantas en el pedido.
        </p>
      </div>
    </Card>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const PedidosPage: React.FC = () => {
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [data,        setData]        = useState<PedidosData | null>(null);
  const [company,     setCompany]     = useState<CompanyInfo>({ name:"", profileImage:"" });
  const [search,      setSearch]      = useState("");
  const [edits,       setEdits]       = useState<Record<string, RowEdits>>({});
  const [filters,     setFilters]     = useState<FilterState>({ eje:"Todos", alertLevel:"Todos", vidaActual:"Todos", urgency:"Todos", recType:"Todos" });
  const [vehicles,      setVehicles]      = useState<Array<{ id: string; placa: string; tipovhc: string }>>([]);
  const [allFleetTires, setAllFleetTires] = useState<Array<{ vehicleId: string | null; posicion: number; vidaActual: string }>>([]);

  // Inventory state
  const [inventory,   setInventory]   = useState<InventoryTire[]>([]);
  const [buckets,     setBuckets]     = useState<InventoryBucket[]>([]);
  const [companyId,   setCompanyId]   = useState<string | null>(null);

  // Send group modal
  const [sendGroup, setSendGroup] = useState<SendGroupState>({
    open:false, recs:[], action:null,
    finCausales:"", finMilimetros:"",
    targetBucketId:"", proveedor:"",
    profundidadNueva:"", costoReencauche:"",
  });
  const [sendingGroup, setSendingGroup] = useState(false);

  const [exportModal, setExportModal] = useState<ExportModalState>({
    open:false, format:"pdf", includePrices:true, includeCompanyLogo:true,
    includeCurrentTire:true, includeConfidence:true, generating:false,
  });

  // ── Inventory matching map ──────────────────────────────────────────────────
  // Per recommendation, find inventory tires with same dimension + eje
  const inventoryMap = useMemo<Map<string, InventoryMatch>>(() => {
    if (!data || !inventory.length) return new Map();
    const map = new Map<string, InventoryMatch>();
    const all = [...data.critical, ...data.immediate, ...data.nextMonth, ...data.plan];
    for (const rec of all) {
      const matches = inventory.filter(inv =>
        inv.dimension.toLowerCase() === rec.tire.dimension.toLowerCase() &&
        inv.eje.toLowerCase()       === rec.tire.eje.toLowerCase()
      );
      map.set(rec.tire.id, { rec, matches, totalInDim: matches.length });
    }
    return map;
  }, [data, inventory]);

  const vehicleGaps = useMemo<VehicleGap[]>(() => {
  if (!vehicles.length || !allFleetTires.length) return [];

  // Build vehicleId → occupied positions (skip fin tires and posicion 0)
  const occupiedMap = new Map<string, Set<number>>();
  for (const t of allFleetTires) {
    if (!t.vehicleId || t.vidaActual === "fin" || t.posicion <= 0) continue;
    if (!occupiedMap.has(t.vehicleId)) occupiedMap.set(t.vehicleId, new Set());
    occupiedMap.get(t.vehicleId)!.add(t.posicion);
  }

  const gaps: VehicleGap[] = [];

  for (const v of vehicles) {
    const occupied = occupiedMap.get(v.id);
    if (!occupied || occupied.size === 0) continue; // no tires at all → skip

    const maxPos      = Math.max(...occupied);
    // Round up to next even number — that is the minimum complete layout
    const expectedTotal = maxPos % 2 === 0 ? maxPos : maxPos + 1;

    const occupiedArr = [...occupied].sort((a, b) => a - b);
    const missing: number[] = [];
    for (let p = 1; p <= expectedTotal; p++) {
      if (!occupied.has(p)) missing.push(p);
    }

    if (missing.length === 0) continue;

    gaps.push({
      vehicleId:         v.id,
      placa:             v.placa,
      tipovhc:           v.tipovhc ?? "",
      missingPositions:  missing,
      occupiedPositions: occupiedArr,
      expectedTotal,
    });
  }

  return gaps.sort((a, b) => b.missingPositions.length - a.missingPositions.length);
}, [vehicles, allFleetTires]);

  const initEdits = useCallback((d: PedidosData) => {
    const init: Record<string, RowEdits> = {};
    [...d.critical,...d.immediate,...d.nextMonth,...d.plan].forEach(r => {
      init[r.tire.id] = { recommendationType:r.recommendationType, estimatedPrice:r.estimatedPrice, notes:"", recMarca:r.tire.marca, recBanda:r.tire.diseno, recDimension:r.tire.dimension };
    });
    setEdits(init);
  }, []);

  const patchEdit = useCallback((id: string, patch: Partial<RowEdits>) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const patchFilters = useCallback((f: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...f }));
  }, []);

  const loadCompany = useCallback(async (cid: string) => {
    try {
      const res = await authFetch(`${API_BASE}/companies/${cid}`);
      if (!res.ok) return;
      const c = await res.json();
      setCompany({ name:c.name??"", profileImage:c.profileImage??"" });
    } catch { /**/ }
  }, []);

  const loadInventory = useCallback(async (cid: string) => {
    try {
      const [tiresRes, bucketsRes, vehiclesRes] = await Promise.all([
        authFetch(`${API_BASE}/tires?companyId=${cid}`),
        authFetch(`${API_BASE}/inventory-buckets?companyId=${cid}`),
        authFetch(`${API_BASE}/vehicles?companyId=${cid}`),
      ]);
      if (tiresRes.ok) {
        const allTires: any[] = await tiresRes.json();
        setInventory(allTires.filter((t: any) => !t.vehicleId && t.vidaActual !== "fin"));
      }
      if (bucketsRes.ok) {
        const bd = await bucketsRes.json();
        setBuckets(bd.buckets ?? []);
      }
      if (vehiclesRes.ok) {
        const vd: any[] = await vehiclesRes.json();
        setVehicles(vd);
      }
    } catch { /**/ }
  }, []);

  const loadAndAnalyze = useCallback(async () => {
    setError(""); setData(null); setLoading(true);
    try {
      const cid = getCompanyIdFromToken();
      if (!cid) throw new Error("No se pudo obtener el ID de empresa. Inicia sesión nuevamente.");
      setCompanyId(cid);

      await Promise.all([loadCompany(cid), loadInventory(cid)]);

      const [tiresRes, benchRes] = await Promise.allSettled([
        authFetch(`${API_BASE}/tires?companyId=${encodeURIComponent(cid)}`),
        authFetch(`${API_BASE}/tire-benchmarks`),
      ]);

      if (tiresRes.status === "rejected") throw new Error("No se pudieron cargar las llantas.");
      const tiresHttp = (tiresRes as PromiseFulfilledResult<Response>).value;
      if (!tiresHttp.ok) throw new Error("Error al cargar llantas de la flota.");
      const raw: RawTire[] = await tiresHttp.json();
      if (!Array.isArray(raw) || raw.length === 0) throw new Error("No hay llantas registradas en la flota.");

      const benchmarks = new Map<string, RawBenchmark>();
      if (benchRes.status === "fulfilled" && (benchRes as PromiseFulfilledResult<Response>).value.ok) {
        try {
          const benchData: RawBenchmark[] = await (benchRes as PromiseFulfilledResult<Response>).value.json();
          if (Array.isArray(benchData)) benchData.forEach(b => benchmarks.set(`${b.marca.toLowerCase()}|${b.diseno.toLowerCase()}|${b.dimension.toLowerCase()}`, b));
        } catch { /**/ }
      }

      const tires    = raw.map(normaliseRawTire);
      setAllFleetTires(tires.map(t => ({          // ← ADD
        vehicleId:  t.vehicleId,
        posicion:   t.posicion,
        vidaActual: t.vidaActual,
      })));
      const analyzed = analyzeTires(tires, benchmarks);
      setData(analyzed);
      initEdits(analyzed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally { setLoading(false); }
  }, [loadCompany, loadInventory, initEdits]);

  useEffect(() => { loadAndAnalyze(); }, [loadAndAnalyze]);

  // ── Send group handler ──────────────────────────────────────────────────────

const handleSendGroup = useCallback(async (state: SendGroupState) => {
  if (!companyId) return;
  setSendingGroup(true);
  setError("");
  try {
    const tireIds = state.recs.map(r => r.tire.id);

    if (state.action === "fin_vida") {
      await Promise.all(state.recs.map(async r => {
        const res = await authFetch(`${API_BASE}/tires/${r.tire.id}/vida`, {
          method: "PATCH",
          body: JSON.stringify({
            valor: "fin",
            desechoData: {
              causales:             state.finCausales,
              milimetrosDesechados: parseFloat(state.finMilimetros),
            },
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(`Error al marcar fin de vida: ${body?.message ?? res.status}`);
        }
      }));
      setSuccess(`${state.recs.length} llanta${state.recs.length !== 1 ? "s" : ""} marcada${state.recs.length !== 1 ? "s" : ""} como fin de vida.`);

    } else if (state.action === "move_bucket") {
      const bucketId = state.targetBucketId === "__disponible__" ? null : state.targetBucketId;
      for (const tireId of tireIds) {
        const res = await authFetch(`${API_BASE}/inventory-buckets/move`, {
          method: "POST",
          body: JSON.stringify({ tireId, bucketId, companyId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(`Error al mover llanta: ${body?.message ?? res.status}`);
        }
      }
      const bucketName = bucketId
        ? buckets.find(b => b.id === bucketId)?.nombre ?? "inventario"
        : "Disponible";
      setSuccess(`${state.recs.length} llanta${state.recs.length !== 1 ? "s" : ""} movida${state.recs.length !== 1 ? "s" : ""} a "${bucketName}".`);

    } else if (state.action === "reencauche_bucket") {
      const reencaucheRecs = state.recs.filter(r => r.recommendationType === "reencauche");
      if (reencaucheRecs.length > 0) {
        await Promise.all(reencaucheRecs.map(async r => {
          const idx = VIDA_SEQUENCE.indexOf(r.vidaActual);
          const nextVida = VIDA_SEQUENCE[idx + 1];
          if (!nextVida || nextVida === "fin") return;
          const res = await authFetch(`${API_BASE}/tires/${r.tire.id}/vida`, {
            method: "PATCH",
            body: JSON.stringify({
              valor:              nextVida,
              banda:              edits[r.tire.id]?.recBanda || r.tire.diseno,
              profundidadInicial: parseFloat(state.profundidadNueva),
              proveedor:          state.proveedor,
              costo: edits[r.tire.id]?.estimatedPrice > 0 ? edits[r.tire.id].estimatedPrice : undefined,
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(`Error al avanzar vida: ${body?.message ?? res.status}`);
          }
        }));
      }
      for (const tireId of tireIds) {
        const res = await authFetch(`${API_BASE}/inventory-buckets/move`, {
          method: "POST",
          body: JSON.stringify({ tireId, bucketId: state.targetBucketId, companyId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(`Error al mover a inventario: ${body?.message ?? res.status}`);
        }
      }
      const bucketName = buckets.find(b => b.id === state.targetBucketId)?.nombre ?? "inventario";
      setSuccess(`${reencaucheRecs.length} llanta${reencaucheRecs.length !== 1 ? "s" : ""} avanzada${reencaucheRecs.length !== 1 ? "s" : ""} a reencauche y ${state.recs.length} enviada${state.recs.length !== 1 ? "s" : ""} a "${bucketName}".`);
    }

    setSendGroup(prev => ({ ...prev, open: false }));
    await loadAndAnalyze();

  } catch (e: any) {
    setError(e.message ?? "Error al procesar el grupo.");
  } finally {
    setSendingGroup(false);
  }
}, [companyId, buckets, edits, loadAndAnalyze]);

  // ── Filters ─────────────────────────────────────────────────────────────────

  const applyFilters = useCallback((recs: TireRecommendation[]) =>
    recs.filter(r => {
      if (filters.eje !== "Todos"        && r.tire.eje !== filters.eje)               return false;
      if (filters.alertLevel !== "Todos" && r.tire.alertLevel !== filters.alertLevel) return false;
      if (filters.vidaActual !== "Todos" && r.vidaActual !== filters.vidaActual)      return false;
      if (filters.urgency !== "Todos"    && r.urgency !== filters.urgency)            return false;
      if (filters.recType !== "Todos"    && r.recommendationType !== filters.recType) return false;
      return true;
    }),
  [filters]);

  const filtered = useMemo(() => data ? {
    critical:  applyFilters(data.critical),
    immediate: applyFilters(data.immediate),
    nextMonth: applyFilters(data.nextMonth),
    plan:      applyFilters(data.plan),
  } : null, [data, applyFilters]);

  const editedTotal = useMemo(() => {
    if (!data) return 0;
    return [...data.critical,...data.immediate,...data.nextMonth,...data.plan].reduce((s,r)=>s+((edits[r.tire.id]?.estimatedPrice)??r.estimatedPrice),0);
  }, [data, edits]);

  const totalTires = filtered
    ? (filtered.critical.length)+(filtered.immediate.length)+(filtered.nextMonth.length)+(filtered.plan.length)
    : 0;

  const inventoryTotal  = inventory.length;
  const inventoryCanFulfill = useMemo(() => {
    let count = 0;
    inventoryMap.forEach(m => { if (m.matches.length > 0) count++; });
    return count;
  }, [inventoryMap]);

  const handleExport = useCallback(async () => {
    if (!data || !exportModal.format) return;
    setExportModal(s=>({...s,generating:true}));
    try {
      if (exportModal.format==="xlsx") await doExportXLSX(data,edits,company,exportModal.includePrices,exportModal.includeConfidence);
      else doExportPDF(data,edits,company,exportModal.includePrices,exportModal.includeCompanyLogo,exportModal.includeCurrentTire,exportModal.includeConfidence);
    } finally { setExportModal(s=>({...s,generating:false,open:false})); }
  }, [data,edits,exportModal,company]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden" style={{ background:"white" }}>
      <div className="mx-auto space-y-4" style={{ padding:"16px 12px", maxWidth:"100%", boxSizing:"border-box" }}>

        {/* Header */}
        <div className="rounded-2xl" style={{ background:"linear-gradient(135deg,#0A183A 0%,#173D68 60%,#1E76B6 100%)", boxShadow:"0 8px 32px rgba(10,24,58,0.22)", padding:"16px 20px" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {company.profileImage
                ? <img src={company.profileImage} alt="" className="w-9 h-9 rounded-xl object-contain flex-shrink-0" style={{ background:"rgba(255,255,255,0.1)" }}/>
                : <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background:"rgba(255,255,255,0.12)" }}><ShoppingCart className="w-5 h-5 text-white"/></div>}
              <div className="min-w-0">
                <h1 className="font-black text-white text-base leading-none tracking-tight truncate">
                  Pedidos{company.name?` — ${company.name}`:""}
                </h1>
                <p className="text-[11px] text-white/60 mt-0.5">Motor predictivo · Cross-fleet benchmarks · Inventario integrado</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {data && (
                <>
                  <button onClick={()=>setExportModal(s=>({...s,open:true}))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white hover:opacity-90" style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)" }}>
                    <Download className="w-3 h-3"/>Exportar
                  </button>
                </>
              )}
              <button onClick={loadAndAnalyze} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white hover:opacity-90 disabled:opacity-50" style={{ background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)" }}>
                {loading?<><Loader2 className="w-3 h-3 animate-spin"/>Analizando…</>:<><Zap className="w-3 h-3"/>{data?"Actualizar":"Analizar"}</>}
              </button>
            </div>
          </div>
        </div>

        {/* Toasts */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.2)", color:"#DC2626" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0"/><span className="flex-1">{error}</span>
            <button onClick={()=>setError("")}><X className="w-4 h-4"/></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background:"rgba(39,174,96,0.06)", border:"1px solid rgba(39,174,96,0.2)", color:"#15803d" }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0"/><span className="flex-1">{success}</span>
            <button onClick={()=>setSuccess("")}><X className="w-4 h-4"/></button>
          </div>
        )}

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
            {[
              { label:"Urgente",          value:(data.critical.length+data.immediate.length), icon:AlertTriangle, color:"#DC2626", bg:"rgba(220,38,38,0.06)",   sub:"Crítico + Inmediato" },
              { label:"Próximo Mes",      value:data.nextMonth.length,                        icon:Clock,         color:"#D97706", bg:"rgba(217,119,6,0.06)",   sub:"Prof. 6–9mm"          },
              { label:"Costo Estimado",   value:formatCOPCompact(editedTotal),                icon:DollarSign,    color:"#15803d", bg:"rgba(34,197,94,0.06)",   sub:"Total flota", isText:true },
              { label:"Ahorro Anual",     value:formatCOPCompact(data.totalSavingsAnual),     icon:TrendingDown,  color:"#7c3aed", bg:"rgba(124,58,237,0.06)", sub:"CPK optimizado", isText:true },
              { label:"En Inventario",    value:inventoryTotal,                               icon:Warehouse,     color:"#0891b2", bg:"rgba(8,145,178,0.06)",   sub:"Llantas disponibles" },
              { label:"Cubiertas Inv.",   value:inventoryCanFulfill,                          icon:Check,         color:"#15803d", bg:"rgba(39,174,96,0.06)",   sub:"Rec. con stock" },
            ].map(c => (
              <Card key={c.label} className="p-3 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl flex-shrink-0" style={{ background:c.bg }}>
                    <c.icon className="w-4 h-4" style={{ color:c.color }}/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide leading-tight">{c.label}</p>
                    <p className={`font-black leading-none mt-0.5 ${"isText" in c?"text-sm":"text-2xl"}`} style={{ color:c.color }}>{c.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Inventory coverage banner */}
        {data && inventoryTotal > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background:"rgba(8,145,178,0.05)", border:"1.5px solid rgba(8,145,178,0.2)" }}>
            <Warehouse className="w-5 h-5 text-cyan-600 flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-[#0A183A]">
                Tienes <span className="text-cyan-700">{inventoryTotal} llantas</span> en inventario
              </p>
              <p className="text-xs text-cyan-600 mt-0.5">
                {inventoryCanFulfill} recomendaciones pueden cubrirse con stock existente — revisa las columnas <strong>"Inventario"</strong> antes de comprar
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-500 flex-shrink-0"/>
          </div>
        )}

        {/* Main table */}
        {data && totalTires > 0 && filtered && (
          <Card className="w-full min-w-0 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3" style={{ padding:"12px 16px", borderBottom:"1.5px solid rgba(52,140,203,0.1)" }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <BarChart2 className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0"/>
                <p className="text-sm font-black text-[#0A183A] truncate">Llantas a Ordenar</p>
                <span className="text-[11px] text-gray-400 font-bold flex-shrink-0">{totalTires} total</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <FilterBar filters={filters} onChange={patchFilters}/>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
                  <input type="text" placeholder="Buscar placa, marca…" value={search} onChange={e=>setSearch(e.target.value)}
                    className="pl-8 pr-8 py-2 rounded-xl text-xs font-medium text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                    style={{ border:"1.5px solid rgba(52,140,203,0.2)", width:180, minWidth:0 }}/>
                  {search && <button onClick={()=>setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
                </div>
              </div>
            </div>

            {/* Sections */}
            <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:24 }}>
              {(["critical","immediate","next_month","plan"] as UrgencyLevel[]).map(urg => {
                const sectionRecs = filtered[urg === "next_month" ? "nextMonth" : urg === "critical" ? "critical" : urg === "immediate" ? "immediate" : "plan"];
                const cfg = URGENCY_CONFIG[urg];
                const titles: Record<UrgencyLevel,string> = { critical:"Crítico", immediate:"Cambio Inmediato", next_month:"Próximo Mes", plan:"Planificación" };
                return (
                  <SectionTable
                    key={urg}
                    recs={sectionRecs}
                    edits={edits}
                    onEdit={patchEdit}
                    urgency={urg}
                    title={titles[urg]}
                    color={cfg.color}
                    search={search}
                    inventoryMap={inventoryMap}
                    buckets={buckets}
                    vehicles={vehicles}
                    onSendGroup={recs => setSendGroup(prev => ({ ...prev, open:true, recs, action:null, finCausales:"", finMilimetros:"", targetBucketId:"", proveedor:"", profundidadNueva:"", costoReencauche:"" }))}
                  />
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding:"10px 16px", borderTop:"1.5px solid rgba(52,140,203,0.1)", background:"rgba(30,118,182,0.02)" }}>
              <p className="text-xs text-gray-400">Selecciona llantas con el checkbox para acciones en grupo · Columna "Inventario" muestra stock disponible</p>
              <span className="text-sm font-black" style={{ color:"#15803d" }}>{formatCOP(editedTotal)}</span>
            </div>
          </Card>
        )}

        {/* Vehicle gaps section */}
{data && vehicleGaps.length > 0 && (
  <VehicleGapsSection gaps={vehicleGaps} />
)}

        {/* Empty states */}
        {!data && !loading && !error && (
          <Card className="p-10 flex flex-col items-center text-center">
            <div className="p-4 rounded-2xl mb-4" style={{ background:"rgba(30,118,182,0.06)" }}><ShoppingCart className="w-8 h-8 text-[#1E76B6] opacity-60"/></div>
            <p className="text-sm font-bold text-[#0A183A] mb-4">Cargando análisis de flota…</p>
            <button onClick={loadAndAnalyze} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white hover:opacity-90" style={{ background:"linear-gradient(135deg,#0A183A,#1E76B6)" }}>
              <Zap className="w-4 h-4"/>Analizar Flota
            </button>
          </Card>
        )}

        {data && totalTires === 0 && !loading && (
          <Card className="p-10 flex flex-col items-center text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-3 opacity-70"/>
            <p className="text-sm font-bold text-[#0A183A] mb-1">¡Flota en buen estado!</p>
            <p className="text-xs text-gray-400">No hay llantas que requieran atención con los filtros actuales.</p>
          </Card>
        )}

        {loading && (
          <div className="space-y-2">
            {[1,2,3,4].map(i=><div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background:"rgba(30,118,182,0.06)" }}/>)}
          </div>
        )}
      </div>

      {/* Modals */}
      <ExportModal
        state={exportModal}
        onClose={()=>setExportModal(s=>({...s,open:false}))}
        onExport={handleExport}
        onChange={p=>setExportModal(s=>({...s,...p}))}
      />

      {sendGroup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(10,24,58,0.65)", backdropFilter:"blur(8px)" }}>
          {sendingGroup ? (
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4" style={{ border:"1px solid rgba(52,140,203,0.2)" }}>
              <Loader2 className="w-8 h-8 text-[#1E76B6] animate-spin"/>
              <p className="text-sm font-black text-[#0A183A]">Procesando {sendGroup.recs.length} llantas…</p>
            </div>
          ) : (
            <SendGroupModal
              state={sendGroup}
              buckets={buckets}
              onClose={() => setSendGroup(prev => ({ ...prev, open:false }))}
              onConfirm={handleSendGroup}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PedidosPage;