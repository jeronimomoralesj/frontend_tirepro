// =============================================================================
// Advanced numeric filters — user-defined predicates on tire fields.
//
// Supports operators: >, <, >=, <=, =, between.
// Extractor is permissive about tire shape so the same helper works across
// detalle (NormTire), resumen (RawTire) and distribuidor (NormTire+extras).
// Each page passes its own array of AdvancedCondition objects and we apply
// them AFTER the existing marca/eje/vida/alert filters.
// =============================================================================

export type NumericField =
  | "cpk"            // lifetime/current CPK — falls back to last inspection
  | "cpkProyectado"  // last inspection's projected CPK
  | "km"             // tire.kilometrosRecorridos
  | "kmProyectado"   // last inspection's projected km to EOL
  | "kmEstimados"    // last inspection's kilometrosEstimados
  | "depthMin"       // min of last inspection's int/cen/ext
  | "depthInicial"   // tire.profundidadInicial
  | "desgastePct"    // % worn = (inicial - min actual) / inicial * 100
  | "costoTotal"     // sum of costos[].valor
  | "diasEnUso"      // days the tire has been mounted (last inspection)
  | "diasSinInspeccion" // days since the most recent inspection
  | "inspecciones";  // count of inspections

export type Operator = "gt" | "lt" | "gte" | "lte" | "eq" | "between";

export interface AdvancedCondition {
  id: string;
  field: NumericField;
  op:    Operator;
  value: number;
  /** Upper bound when op === "between". */
  value2?: number;
}

export interface FieldMeta {
  label: string;
  unit?: string;
  /** Placeholder suggestion for the numeric input. */
  placeholder?: string;
}

export const FIELD_META: Record<NumericField, FieldMeta> = {
  cpk:               { label: "CPK",                 unit: "$/km", placeholder: "50" },
  cpkProyectado:     { label: "CPK Proyectado",      unit: "$/km", placeholder: "50" },
  km:                { label: "Km recorridos",       unit: "km",   placeholder: "50000" },
  kmProyectado:      { label: "Km Proyectados",      unit: "km",   placeholder: "100000" },
  kmEstimados:       { label: "Km Estimados",        unit: "km",   placeholder: "80000" },
  depthMin:          { label: "Profundidad mín.",    unit: "mm",   placeholder: "5" },
  depthInicial:      { label: "Profundidad inicial", unit: "mm",   placeholder: "20" },
  desgastePct:       { label: "% Desgaste",          unit: "%",    placeholder: "60" },
  costoTotal:        { label: "Costo total",         unit: "$",    placeholder: "1000000" },
  diasEnUso:         { label: "Días en uso",         unit: "días", placeholder: "180" },
  diasSinInspeccion: { label: "Días sin inspección", unit: "días", placeholder: "30" },
  inspecciones:      { label: "Inspecciones",        unit: "#",    placeholder: "3" },
};

export const OP_LABELS: Record<Operator, string> = {
  gt:      "Mayor que >",
  lt:      "Menor que <",
  gte:     "Mayor o igual ≥",
  lte:     "Menor o igual ≤",
  eq:      "Igual a =",
  between: "Entre …",
};

// ---------------------------------------------------------------------------
// Field extraction — resilient to shape variation across page types.
// Returns null when the tire legitimately has no value for that field; the
// caller treats null as "exclude" (stricter = safer).
// ---------------------------------------------------------------------------

function pickInspectionsArray(tire: any): any[] {
  return tire?.inspecciones ?? [];
}

function pickLastInspection(tire: any): any | null {
  const arr = pickInspectionsArray(tire);
  return arr.length ? arr[arr.length - 1] : null;
}

export function extractField(tire: any, field: NumericField): number | null {
  switch (field) {
    case "cpk": {
      if (tire?.lifetimeCpk && tire.lifetimeCpk > 0) return tire.lifetimeCpk;
      if (tire?.currentCpk  && tire.currentCpk  > 0) return tire.currentCpk;
      const last = pickLastInspection(tire);
      const cpk = last?.cpkProyectado || last?.cpk;
      return cpk && cpk > 0 ? cpk : null;
    }
    case "cpkProyectado": {
      const last = pickLastInspection(tire);
      return last?.cpkProyectado && last.cpkProyectado > 0 ? last.cpkProyectado : null;
    }
    case "km":
      return typeof tire?.kilometrosRecorridos === "number"
        ? tire.kilometrosRecorridos : null;
    case "kmProyectado": {
      // Projected km until the tire reaches legal tread limit — the most
      // recent inspection's computed value. Falls back to the tire-level
      // cached `projectedKmRemaining` if no inspection is loaded (slim mode).
      const last = pickLastInspection(tire);
      if (last?.kmProyectado && last.kmProyectado > 0) return last.kmProyectado;
      if (tire?.projectedKmRemaining && tire.projectedKmRemaining > 0) return tire.projectedKmRemaining;
      return null;
    }
    case "kmEstimados": {
      const last = pickLastInspection(tire);
      return last?.kilometrosEstimados && last.kilometrosEstimados > 0
        ? last.kilometrosEstimados : null;
    }
    case "depthMin": {
      const last = pickLastInspection(tire);
      if (last) {
        const mins = [last.profundidadInt, last.profundidadCen, last.profundidadExt]
          .filter((v: any) => typeof v === "number" && !Number.isNaN(v));
        return mins.length ? Math.min(...mins) : null;
      }
      return typeof tire?.currentProfundidad === "number" ? tire.currentProfundidad : null;
    }
    case "depthInicial":
      return typeof tire?.profundidadInicial === "number" ? tire.profundidadInicial : null;
    case "desgastePct": {
      // % worn: (initial - min current) / initial × 100. Useful for
      // "muéstrame todas las llantas con más del 70 % de desgaste" —
      // direct proxy for retirement urgency.
      const initial = tire?.profundidadInicial;
      if (typeof initial !== "number" || initial <= 0) return null;
      const last = pickLastInspection(tire);
      let minNow: number | null = null;
      if (last) {
        const mins = [last.profundidadInt, last.profundidadCen, last.profundidadExt]
          .filter((v: any) => typeof v === "number" && !Number.isNaN(v));
        if (mins.length) minNow = Math.min(...mins);
      }
      if (minNow === null && typeof tire?.currentProfundidad === "number") {
        minNow = tire.currentProfundidad;
      }
      if (minNow === null) return null;
      if (minNow <= 0) return 100;
      return Math.max(0, Math.min(100, ((initial - minNow) / initial) * 100));
    }
    case "costoTotal": {
      // Support both field names (detalle uses `costo`, resumen uses `costos`).
      const list = (tire?.costos ?? tire?.costo ?? []) as Array<{ valor?: number }>;
      if (!Array.isArray(list) || list.length === 0) return 0;
      let sum = 0;
      for (const c of list) sum += (c?.valor ?? 0);
      return sum;
    }
    case "diasEnUso": {
      const last = pickLastInspection(tire);
      if (last?.diasEnUso && last.diasEnUso > 0) return last.diasEnUso;
      // Fallback: derive from fechaInstalacion if present.
      if (tire?.fechaInstalacion) {
        const inst = new Date(tire.fechaInstalacion).getTime();
        if (!Number.isNaN(inst)) {
          return Math.max(0, Math.floor((Date.now() - inst) / 86_400_000));
        }
      }
      return null;
    }
    case "diasSinInspeccion": {
      const last = pickLastInspection(tire);
      const fecha = last?.fecha;
      if (!fecha) return null;
      const t = new Date(fecha).getTime();
      if (Number.isNaN(t)) return null;
      return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
    }
    case "inspecciones":
      return pickInspectionsArray(tire).length;
  }
}

export function matchesCondition(tire: any, cond: AdvancedCondition): boolean {
  const val = extractField(tire, cond.field);
  if (val === null) return false;
  switch (cond.op) {
    case "gt":  return val >  cond.value;
    case "lt":  return val <  cond.value;
    case "gte": return val >= cond.value;
    case "lte": return val <= cond.value;
    case "eq":  return val === cond.value;
    case "between": {
      if (cond.value2 == null) return false;
      const lo = Math.min(cond.value, cond.value2);
      const hi = Math.max(cond.value, cond.value2);
      return val >= lo && val <= hi;
    }
  }
}

/** AND semantics — tire must satisfy every condition. Empty list = pass-through. */
export function passAllAdvanced(tire: any, conds: AdvancedCondition[]): boolean {
  if (!conds || conds.length === 0) return true;
  for (const c of conds) if (!matchesCondition(tire, c)) return false;
  return true;
}

/** Stable id generator so React keys stay consistent across renders. */
export function newConditionId(): string {
  return `adv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Convenience factory for adding a new default condition in the UI. */
export function newCondition(): AdvancedCondition {
  return { id: newConditionId(), field: "cpk", op: "lt", value: 50 };
}
