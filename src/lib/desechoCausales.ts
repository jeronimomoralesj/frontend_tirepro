/**
 * Canonical list of fin-de-vida (desecho) causales.
 * Shared by every web flow that captures scrapping reasons so analytics
 * in desechos/* don't fracture across near-duplicate free-form strings.
 *
 * When adding a new causal, append — don't rename — so historical records
 * keep matching. "otro" is the freeform fallback.
 */
export type DesechoCausal =
  | 'desgaste_normal'
  | 'desgaste_irregular'
  | 'pinchazo'
  | 'corte_lateral'
  | 'rotura_casco'
  | 'separacion_banda'
  | 'impacto'
  | 'rin_danado'
  | 'sobrecalentamiento'
  | 'sobrecarga'
  | 'falla_fabrica'
  | 'mal_uso'
  | 'vandalismo'
  | 'accidente'
  | 'vencimiento'
  | 'otro';

export interface DesechoCausalMeta {
  value: DesechoCausal;
  label: string;
  description?: string;
}

export const DESECHO_CAUSALES: DesechoCausalMeta[] = [
  { value: 'desgaste_normal',     label: 'Desgaste normal',        description: 'Fin de vida útil por uso estándar' },
  { value: 'desgaste_irregular',  label: 'Desgaste irregular',     description: 'Alineación, suspensión o presión fuera de rango' },
  { value: 'pinchazo',            label: 'Pinchazo',               description: 'Perforación no reparable' },
  { value: 'corte_lateral',       label: 'Corte lateral',          description: 'Daño en el flanco/costado' },
  { value: 'rotura_casco',        label: 'Rotura del casco',       description: 'Casco dañado, no reencauchable' },
  { value: 'separacion_banda',    label: 'Separación de banda',    description: 'Despegue de la banda de rodamiento' },
  { value: 'impacto',             label: 'Impacto / golpe',        description: 'Hueco, andén u objeto en la vía' },
  { value: 'rin_danado',          label: 'Rin dañado',             description: 'Falla en el rin asociada a la llanta' },
  { value: 'sobrecalentamiento', label: 'Sobrecalentamiento',     description: 'Temperatura excesiva por presión baja o sobrecarga' },
  { value: 'sobrecarga',          label: 'Sobrecarga',             description: 'Carga superior al índice de capacidad' },
  { value: 'falla_fabrica',       label: 'Falla de fábrica',       description: 'Defecto cubierto por garantía' },
  { value: 'mal_uso',             label: 'Mal uso',                description: 'Operación fuera de especificaciones' },
  { value: 'vandalismo',          label: 'Vandalismo',             description: 'Daño intencional' },
  { value: 'accidente',           label: 'Accidente',              description: 'Evento no operacional' },
  { value: 'vencimiento',         label: 'Vencimiento',            description: 'Retiro preventivo por edad' },
  { value: 'otro',                label: 'Otro',                   description: 'Describir manualmente' },
];

export const DESECHO_CAUSAL_LABELS: Record<string, string> = Object.fromEntries(
  DESECHO_CAUSALES.map((c) => [c.value, c.label]),
);

export function labelForCausal(v: string | null | undefined): string {
  if (!v) return '—';
  return DESECHO_CAUSAL_LABELS[v] ?? v;
}
