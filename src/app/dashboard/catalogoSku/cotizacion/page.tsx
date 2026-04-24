"use client";

// -----------------------------------------------------------------------------
// Quote builder — the cart screen.
// Lists every tire the rep added via the detail page's "Agregar a cotización"
// button. Per-line qty + unit price. Global knobs for IVA mode + display
// mode (individual = comparative, total = purchase) + rep / client info.
// Generate button produces a multi-tire PDF via buildQuotePdf and logs one
// download event per tire against the shared tracking endpoint.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Download, Trash2, Plus, Minus, FileDown,
  Image as ImageIcon, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import { useCatalogCart, type CartItem } from "../cart";
import { buildQuotePdf, type QuoteInput, type QuoteIncludeFields } from "../pdf";

// Master list of toggleable ficha fields shown on the cotización page.
// Ordering matches the order the PDF renders each segment — keeping
// them lockstep so what the user sees in the checklist is what prints.
const FICHA_FIELDS: Array<{ key: keyof QuoteIncludeFields; label: string; defaultOn?: boolean }> = [
  { key: "dimension",       label: "Dimensión",        defaultOn: false }, // already in the title, optional to repeat
  { key: "categoria",       label: "Nueva / Reencauche", defaultOn: true },
  { key: "terreno",         label: "Terreno",          defaultOn: true },
  { key: "ejeTirePro",      label: "Eje",              defaultOn: true },
  { key: "indiceCarga",     label: "Índice de carga",  defaultOn: true },
  { key: "indiceVelocidad", label: "Índice de velocidad" },
  { key: "rtdMm",           label: "Profundidad inicial" },
  { key: "psiRecomendado",  label: "PSI recomendado" },
  { key: "pesoKg",          label: "Peso" },
  { key: "cinturones",      label: "Cinturones" },
  { key: "pr",              label: "PR (ply rating)" },
  { key: "reencauchable",   label: "Reencauchabilidad", defaultOn: true },
  { key: "tipoBanda",       label: "Tipo de banda",    defaultOn: true },
  { key: "construccion",    label: "Construcción" },
  { key: "segmento",        label: "Segmento" },
  { key: "tipo",            label: "Tipo" },
];
function defaultFichaToggles(): QuoteIncludeFields {
  return FICHA_FIELDS.reduce<QuoteIncludeFields>((acc, f) => {
    if (f.defaultOn) acc[f.key] = true;
    return acc;
  }, {});
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

type CompanyCtx = {
  name: string;
  profileImage: string | null;
  colorMarca:   string | null;
  sitioWeb:     string | null;
  ciudad:       string | null;
  telefono:     string | null;
};

export default function CotizacionPage() {
  const router = useRouter();
  const { items, update, remove, clear } = useCatalogCart();

  const [companyCtx, setCompanyCtx] = useState<CompanyCtx | null>(null);
  const [repName,    setRepName]    = useState("");
  const [repPhone,   setRepPhone]   = useState("");
  const [clientName, setClientName] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [priceMode,  setPriceMode]   = useState<"none" | "sin_iva" | "con_iva">("sin_iva");
  const [displayMode, setDisplayMode] = useState<"individual" | "total">("total");
  // What ficha fields to print under each tire in the PDF. Seeded with a
  // sensible "scan-sheet" default; rep can flip extras on for a more
  // detailed quote (indiceCarga, rtd, psi, cinturones, pr, …).
  const [fichaFields, setFichaFields] = useState<QuoteIncludeFields>(defaultFichaToggles);
  const [generating, setGenerating]  = useState(false);
  const [toast,      setToast]       = useState("");
  const [error,      setError]       = useState("");

  useEffect(() => {
    try {
      const userRaw = localStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (user?.name) setRepName(user.name);
      if (user?.companyId) {
        authFetch(`${API_BASE}/companies/${user.companyId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((c) => {
            if (!c) return;
            setCompanyCtx({
              name:         c.name ?? "",
              profileImage: c.profileImage ?? null,
              colorMarca:   c.colorMarca   ?? null,
              sitioWeb:     c.sitioWeb     ?? null,
              ciudad:       c.ciudad       ?? null,
              telefono:     c.telefono     ?? null,
            });
            if (c.telefono) setRepPhone(c.telefono);
          })
          .catch(() => {});
      }
    } catch { /* ignore */ }
  }, []);

  // Totals displayed in the sidebar summary.
  const ivaMul = priceMode === "con_iva" ? 1.19 : 1;
  const lineTotal = useCallback((it: CartItem) => {
    if (it.unitPriceCop == null || it.unitPriceCop <= 0) return 0;
    return Math.round(it.unitPriceCop * ivaMul) * Math.max(1, it.quantity || 1);
  }, [ivaMul]);
  const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const totalUnits = items.reduce((s, it) => s + Math.max(1, it.quantity || 1), 0);

  async function onGenerate() {
    if (items.length === 0) return;
    setGenerating(true); setError(""); setToast("");
    try {
      const proxyFetcher = async (u: string): Promise<Blob | null> => {
        if (!/amazonaws\.com/.test(u)) return null;
        const r = await authFetch(`${API_BASE}/catalog/dist/asset-proxy?url=${encodeURIComponent(u)}`);
        if (!r.ok) return null;
        return await r.blob();
      };

      const input: QuoteInput = {
        companyName:    companyCtx?.name ?? null,
        companyLogoUrl: companyCtx?.profileImage ?? null,
        companyColor:   companyCtx?.colorMarca ?? null,
        companyWebsite: companyCtx?.sitioWeb ?? null,
        companyCity:    companyCtx?.ciudad ?? null,
        repName:        repName.trim() || companyCtx?.name || null,
        repPhone:       repPhone.trim() || companyCtx?.telefono || null,
        clientName:     clientName.trim() || null,
        clientNotes:    clientNotes.trim() || null,
        items: items.map((it) => ({
          catalogId:       it.catalogId,
          marca:           it.marca,
          modelo:          it.modelo,
          dimension:       it.dimension,
          categoria:       it.categoria,
          terreno:         it.terreno,
          ejeTirePro:      it.ejeTirePro,
          imageUrl:        it.imageUrl,
          // Full ficha snapshot — renderer only draws what fichaFields enables.
          indiceCarga:     it.indiceCarga     ?? null,
          indiceVelocidad: it.indiceVelocidad ?? null,
          rtdMm:           it.rtdMm           ?? null,
          psiRecomendado:  it.psiRecomendado  ?? null,
          pesoKg:          it.pesoKg          ?? null,
          cinturones:      it.cinturones      ?? null,
          pr:              it.pr              ?? null,
          reencauchable:   it.reencauchable   ?? null,
          tipoBanda:       it.tipoBanda       ?? null,
          construccion:    it.construccion    ?? null,
          segmento:        it.segmento        ?? null,
          tipo:            it.tipo            ?? null,
          quantity:        Math.max(1, it.quantity || 1),
          unitPriceCop:    it.unitPriceCop,
        })),
        priceMode,
        displayMode,
        includeFields: fichaFields,
        fetchViaProxy: proxyFetcher,
      };

      const blob = await buildQuotePdf(input);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `cotizacion-${(companyCtx?.name ?? "TirePro").replace(/\s+/g, "-")}-${stamp}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Log one track-download event per tire — the sales-manager stats
      // page already tallies per-SKU counts and a quote is effectively N
      // downloads of N tires.
      for (const it of items) {
        authFetch(`${API_BASE}/catalog/dist/${it.catalogId}/track-download`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceMode,
            priceCop: it.unitPriceCop,
            fieldsIncluded: {
              quote: true,
              displayMode,
              quantity: Math.max(1, it.quantity || 1),
            },
          }),
        }).catch(() => {});
      }

      setToast("Cotización descargada");
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando la cotización");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 px-3 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}>
        <Link href="/dashboard/catalogoSku" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 text-[#0A183A]" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none">Cotización</h1>
          <p className="text-xs text-[#348CCB] mt-0.5">
            {items.length === 0
              ? "Agrega llantas desde la ficha para armar la cotización"
              : `${items.length} llanta${items.length === 1 ? "" : "s"} · ${totalUnits} unidad${totalUnits === 1 ? "" : "es"}`}
          </p>
        </div>
        {items.length > 0 && (
          <button onClick={() => { if (confirm("¿Vaciar cotización?")) clear(); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-red-50"
            style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Vaciar</span>
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm text-red-700"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {toast && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-emerald-700"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <CheckCircle2 className="w-4 h-4" />
            {toast}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <FileDown className="w-10 h-10 opacity-40" />
            <p className="text-sm font-medium text-[#0A183A]">Tu cotización está vacía</p>
            <p className="text-xs text-gray-500 max-w-xs text-center">
              Abre la ficha de una llanta y presiona "Agregar a cotización" para armar un PDF con varias llantas a la vez.
            </p>
            <Link href="/dashboard/catalogoSku"
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: items list */}
            <div className="lg:col-span-2 space-y-2">
              {items.map((it) => (
                <CartRow key={it.catalogId} item={it}
                  lineTotal={lineTotal(it)}
                  priceMode={priceMode}
                  onQty={(q) => update(it.catalogId, { quantity: q })}
                  onPrice={(p) => update(it.catalogId, { unitPriceCop: p })}
                  onRemove={() => remove(it.catalogId)}
                />
              ))}
            </div>

            {/* Right: settings */}
            <aside className="space-y-4">
              <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}>
                <h2 className="text-sm font-black text-[#0A183A] mb-3">Configuración</h2>

                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1.5">Precio</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {([
                      { k: "none",    l: "Sin precio" },
                      { k: "sin_iva", l: "Sin IVA" },
                      { k: "con_iva", l: "Con IVA" },
                    ] as const).map((opt) => {
                      const active = priceMode === opt.k;
                      return (
                        <button key={opt.k} onClick={() => setPriceMode(opt.k)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{
                            background: active ? "#1E76B6" : "white",
                            color: active ? "white" : "#0A183A",
                            border: active ? "1px solid #1E76B6" : "1px solid rgba(52,140,203,0.2)",
                          }}>{opt.l}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1.5">Formato</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setDisplayMode("total")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-left flex-1"
                      style={{
                        background: displayMode === "total" ? "#1E76B6" : "white",
                        color: displayMode === "total" ? "white" : "#0A183A",
                        border: displayMode === "total" ? "1px solid #1E76B6" : "1px solid rgba(52,140,203,0.2)",
                      }}>
                      <div>Compra</div>
                      <div className="text-[9px] opacity-80 font-normal">Cantidad × precio, total al final</div>
                    </button>
                    <button onClick={() => setDisplayMode("individual")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-left flex-1"
                      style={{
                        background: displayMode === "individual" ? "#1E76B6" : "white",
                        color: displayMode === "individual" ? "white" : "#0A183A",
                        border: displayMode === "individual" ? "1px solid #1E76B6" : "1px solid rgba(52,140,203,0.2)",
                      }}>
                      <div>Comparativo</div>
                      <div className="text-[9px] opacity-80 font-normal">Precio unitario, sin total</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1">Vendedor</p>
                    <input type="text" value={repName} onChange={(e) => setRepName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                      style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)" }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1">Teléfono</p>
                    <input type="text" value={repPhone} onChange={(e) => setRepPhone(e.target.value)}
                      placeholder="300 123 4567"
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                      style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)" }} />
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1">Cliente (opcional)</p>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nombre del cliente o empresa"
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                    style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)" }} />
                </div>

                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1">Notas</p>
                  <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Ej: validez 15 días, entrega en bodega…"
                    rows={2}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6] resize-none"
                    style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)" }} />
                </div>

                {/* Ficha fields — per-PDF picker for what each tire row
                    shows below its name. Defaults match the previous
                    compact layout; toggling extras on gives the PDF a
                    richer specs line (wraps to multiple lines if needed). */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#348CCB] mb-1.5">
                    Ficha técnica en el PDF
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {FICHA_FIELDS.map((f) => {
                      const on = !!fichaFields[f.key];
                      return (
                        <label key={f.key}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] cursor-pointer transition-colors"
                          style={{
                            background: on ? "rgba(30,118,182,0.08)" : "white",
                            border: `1px solid ${on ? "rgba(30,118,182,0.25)" : "rgba(52,140,203,0.12)"}`,
                          }}>
                          <input type="checkbox" checked={on}
                            onChange={(e) => setFichaFields((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                            className="accent-[#1E76B6]" />
                          <span className="text-[#0A183A] truncate">{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Totals summary */}
              {priceMode !== "none" && (
                <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">Total ({priceMode === "con_iva" ? "con IVA" : "sin IVA"})</p>
                  <p className="text-2xl font-black text-white mt-1 tabular-nums">
                    {grandTotal > 0 ? fmtCOP(grandTotal) : "—"}
                  </p>
                  <p className="text-[10px] text-white/60 mt-1">
                    {totalUnits} unidad{totalUnits === 1 ? "" : "es"} · {items.length} referencia{items.length === 1 ? "" : "s"}
                  </p>
                </div>
              )}

              <button onClick={onGenerate} disabled={generating || items.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generating ? "Generando…" : "Descargar cotización"}
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Row — single cart item with qty stepper + unit price input
// =============================================================================

function CartRow({ item, lineTotal, priceMode, onQty, onPrice, onRemove }: {
  item: CartItem;
  lineTotal: number;
  priceMode: "none" | "sin_iva" | "con_iva";
  onQty:   (q: number) => void;
  onPrice: (p: number | null) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3"
      style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)" }}>
      <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ background: "radial-gradient(circle at 30% 20%, #ffffff 0%, #f0f7ff 60%, #dbeafe 100%)" }}>
        {item.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.imageUrl} alt="" className="w-full h-full object-contain p-0.5" />
          : <ImageIcon className="w-6 h-6 text-gray-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase text-[#348CCB]">{item.marca}</span>
          <span className="text-sm font-black text-[#0A183A] truncate">{item.modelo}</span>
          <span className="text-[11px] text-gray-500 font-mono">{item.dimension}</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
          {[item.categoria, item.terreno, item.ejeTirePro].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* Qty stepper */}
      <div className="flex items-center rounded-lg" style={{ border: "1px solid rgba(52,140,203,0.25)" }}>
        <button onClick={() => onQty(Math.max(1, item.quantity - 1))}
          className="p-1.5 hover:bg-[#F0F7FF]"><Minus className="w-3 h-3 text-[#0A183A]" /></button>
        <input type="number" min="1" value={item.quantity}
          onChange={(e) => onQty(Math.max(1, Number(e.target.value) || 1))}
          className="w-10 text-center text-sm font-bold text-[#0A183A] bg-transparent focus:outline-none" />
        <button onClick={() => onQty(item.quantity + 1)}
          className="p-1.5 hover:bg-[#F0F7FF]"><Plus className="w-3 h-3 text-[#0A183A]" /></button>
      </div>

      {/* Unit price (hidden when priceMode=none) */}
      {priceMode !== "none" && (
        <div className="w-32">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input type="text" inputMode="numeric"
              value={item.unitPriceCop ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                onPrice(Number.isFinite(n) && n > 0 ? n : null);
              }}
              placeholder="Precio unit."
              className="w-full pl-6 pr-2 py-1.5 rounded-lg text-xs text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              style={{ background: "white", border: "1px solid rgba(52,140,203,0.25)" }} />
          </div>
          {lineTotal > 0 && (
            <p className="text-[9px] text-gray-400 text-right mt-0.5 tabular-nums">
              Total: {fmtCOP(lineTotal)}
            </p>
          )}
        </div>
      )}

      <button onClick={onRemove}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function fmtCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}
