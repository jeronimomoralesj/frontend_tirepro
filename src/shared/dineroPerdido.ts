// -----------------------------------------------------------------------------
// dineroPerdido — single source of truth for the "wasted tread value" of a
// scrapped (fin de vida) tire.
//
// The figure is the still-usable fraction of the tire's tread, valued at the
// tire's TOTAL cost: (remaining depth / initial depth) × Σ all costos. The
// resumen dashboard card, the PDF report builder and the Desechos tab all run
// this same function so their "dinero perdido" can never drift apart again.
//
// Depth source mirrors the resumen card: prefer the projected depth, fall back
// to the current measured depth. Cost basis is the SUM of every cost on the
// tire (purchase + retreads + repairs), NOT just the last one.
// -----------------------------------------------------------------------------

export type DineroPerdidoTire = {
  profundidadInicial?: number | null;
  currentProfundidad?: number | null;
  projectedProfundidad?: number | null;
  costos?: Array<{ valor: number }> | null;
};

/** COP value of the tread wasted when a tire is scrapped. 0 when undeterminable. */
export function tireDineroPerdido(t: DineroPerdidoTire): number {
  const depth = t.projectedProfundidad ?? t.currentProfundidad;
  if (!depth || !t.profundidadInicial || t.profundidadInicial <= 0) return 0;
  const totalCost = (t.costos ?? []).reduce((s, c) => s + (c?.valor ?? 0), 0);
  const waste = (depth / t.profundidadInicial) * totalCost;
  return waste > 0 ? waste : 0;
}
