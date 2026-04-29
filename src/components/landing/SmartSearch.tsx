"use client";

// Hero search — tabs over plate / dimension / category. The only client
// component on the new landing page; everything else server-renders so the
// HTML reaches Googlebot fully populated and Core Web Vitals stay tight.
import { useState } from "react";
import { Search, Loader2, Truck, Car, Bus } from "lucide-react";
import { trackPlateSearch, trackPlateVehicleSelect } from "@/lib/marketplaceAnalytics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

// Mirrors marketplace's vehicle-type → tire dimension map. Lifted here so
// the landing page is self-contained and doesn't pull from the 2k-line
// MarketplaceClient bundle.
const VEHICLE_TIRE_MAP: Record<string, { label: string; dimensions: string[]; emoji: string }> = {
  tractomula:    { label: "Tractomula",      dimensions: ["295/80R22.5", "11R22.5", "315/80R22.5", "12R22.5"], emoji: "🚛" },
  bus:           { label: "Bus / Buseta",    dimensions: ["295/80R22.5", "275/80R22.5", "11R22.5"],            emoji: "🚌" },
  camion_pesado: { label: "Camión Pesado",   dimensions: ["295/80R22.5", "11R22.5", "12R22.5"],                emoji: "🚚" },
  camion_mediano:{ label: "Camión Mediano",  dimensions: ["235/75R17.5", "215/75R17.5", "9.5R17.5"],           emoji: "🚐" },
  camion_liviano:{ label: "Camión Liviano",  dimensions: ["7.50R16", "215/75R17.5", "225/70R19.5"],            emoji: "🚙" },
  volqueta:      { label: "Volqueta",        dimensions: ["12R24.5", "11R24.5", "315/80R22.5"],                emoji: "🛻" },
  furgon:        { label: "Furgón",          dimensions: ["215/75R17.5", "235/75R17.5", "7.50R16"],            emoji: "🚐" },
};

type Tab = "placa" | "medida" | "tipo";

export default function SmartSearch() {
  const [tab, setTab] = useState<Tab>("placa");

  // Plate search state
  const [placa, setPlaca] = useState("");
  const [step, setStep] = useState<"input" | "loading" | "select" | "results">("input");
  const [vehicleInfo, setVehicleInfo] = useState<{ marca?: string; linea?: string; modelo?: string; clase?: string; source?: string }>({});
  const [foundDimensions, setFoundDimensions] = useState<string[]>([]);

  // Dimension/free-text search state
  const [q, setQ] = useState("");

  async function handlePlateSearch() {
    if (placa.length < 4) return;
    setStep("loading");
    try {
      const res = await fetch(`${API_BASE}/marketplace/plate-lookup/${encodeURIComponent(placa)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.dimensions?.length > 0) {
          setVehicleInfo({ marca: data.marca, linea: data.linea, modelo: data.modelo, clase: data.clase, source: data.source });
          setFoundDimensions(data.dimensions);
          trackPlateSearch(placa, true);
          setStep("results");
          return;
        }
      }
    } catch { /* fall through */ }
    trackPlateSearch(placa, false);
    setStep("select");
  }

  function handleTypeSelect(type: string) {
    const match = VEHICLE_TIRE_MAP[type];
    if (!match) return;
    setVehicleInfo({ clase: match.label });
    setFoundDimensions(match.dimensions);
    trackPlateVehicleSelect(placa || "—", type);
    setStep("results");
    if (placa) {
      fetch(`${API_BASE}/marketplace/plate-lookup/${encodeURIComponent(placa)}/community`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clase: type.toUpperCase() }),
      }).catch(() => { /* fire-and-forget — community contribution */ });
    }
  }

  function goToMarketplace(dim: string) {
    window.location.href = `/marketplace?q=${encodeURIComponent(dim)}`;
  }

  function handleFreeSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    window.location.href = `/marketplace?q=${encodeURIComponent(term)}`;
  }

  const vehicleLabel =
    [vehicleInfo.marca, vehicleInfo.linea, vehicleInfo.modelo].filter(Boolean).join(" ") ||
    vehicleInfo.clase ||
    "Vehículo";

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tab strip */}
      <div
        className="flex items-center gap-1 p-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 mb-3 mx-auto w-fit"
        role="tablist"
        aria-label="Tipo de búsqueda"
      >
        {([
          { key: "placa",  label: "Por placa" },
          { key: "medida", label: "Por medida" },
          { key: "tipo",   label: "Por vehículo" },
        ] as { key: Tab; label: string }[]).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => { setTab(t.key); setStep("input"); }}
              className="px-3.5 sm:px-5 py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all"
              style={{
                background: active ? "#1E76B6" : "transparent",
                color: active ? "white" : "rgba(255,255,255,0.7)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div className="rounded-2xl bg-white/95 backdrop-blur-md p-3 sm:p-4 shadow-2xl border border-white/40">
        {tab === "placa" && step === "input" && (
          <form
            onSubmit={(e) => { e.preventDefault(); handlePlateSearch(); }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-[#F0F7FF] border border-[#348CCB]/20 px-3 py-2.5 sm:py-3 focus-within:border-[#1E76B6]">
              <Search className="w-4 h-4 text-[#348CCB] flex-shrink-0" />
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="ABC123"
                aria-label="Placa del vehículo"
                maxLength={6}
                className="flex-1 bg-transparent outline-none text-base sm:text-lg font-bold tracking-[0.25em] text-[#0A183A] placeholder-[#93b8d4]"
                style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={placa.length < 4}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 hover:opacity-90 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
            >
              Buscar
            </button>
          </form>
        )}

        {tab === "placa" && step === "loading" && (
          <div className="flex items-center justify-center gap-2 py-3 text-[#1E76B6]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Consultando placa <strong>{placa}</strong>…</span>
          </div>
        )}

        {tab === "placa" && step === "select" && (
          <div>
            <p className="text-xs text-[#173D68] text-center mb-2.5">
              <strong className="tracking-wider">{placa}</strong> — selecciona tu tipo de vehículo
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.entries(VEHICLE_TIRE_MAP).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleTypeSelect(key)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#0A183A] bg-[#F0F7FF] border border-[#348CCB]/20 hover:border-[#1E76B6] hover:bg-white transition-all text-left"
                >
                  <span aria-hidden>{val.emoji}</span>
                  <span className="truncate">{val.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setStep("input"); setPlaca(""); }}
              className="mt-2 text-[10px] text-[#348CCB] hover:text-[#1E76B6] mx-auto block"
            >
              ← Cambiar placa
            </button>
          </div>
        )}

        {tab === "placa" && step === "results" && (
          <div>
            <div className="text-center mb-2.5">
              <p className="text-[10px] text-[#348CCB]">
                <strong className="tracking-wider text-[#0A183A]">{placa}</strong>
                {vehicleInfo.source === "runt" && (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">RUNT</span>
                )}
                {vehicleInfo.source === "tirepro" && (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#1E76B6] font-bold">TirePro</span>
                )}
              </p>
              <p className="text-sm font-bold text-[#0A183A] mt-0.5">{vehicleLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {foundDimensions.map((dim) => (
                <button
                  key={dim}
                  onClick={() => goToMarketplace(dim)}
                  className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)", boxShadow: "0 4px 12px rgba(30,118,182,0.25)" }}
                >
                  Ver {dim}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setStep("input"); setPlaca(""); setVehicleInfo({}); }}
              className="mt-2 text-[10px] text-[#348CCB] hover:text-[#1E76B6] mx-auto block"
            >
              ← Otra placa
            </button>
          </div>
        )}

        {tab === "medida" && (
          <form onSubmit={handleFreeSearch} className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-[#F0F7FF] border border-[#348CCB]/20 px-3 py-2.5 sm:py-3 focus-within:border-[#1E76B6]">
              <Search className="w-4 h-4 text-[#348CCB] flex-shrink-0" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="295/80R22.5, Michelin XZE2, 215/55R17…"
                aria-label="Medida o marca de llanta"
                className="flex-1 bg-transparent outline-none text-sm sm:text-base font-medium text-[#0A183A] placeholder-[#93b8d4]"
              />
            </div>
            <button
              type="submit"
              disabled={!q.trim()}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 hover:opacity-90 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
            >
              Buscar
            </button>
          </form>
        )}

        {tab === "tipo" && (
          <div>
            <p className="text-[11px] text-[#348CCB] text-center mb-2.5">
              ¿Qué vehículo manejas?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.entries(VEHICLE_TIRE_MAP).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleTypeSelect(key)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#0A183A] bg-[#F0F7FF] border border-[#348CCB]/20 hover:border-[#1E76B6] hover:bg-white transition-all text-left"
                >
                  <span aria-hidden>{val.emoji}</span>
                  <span className="truncate">{val.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick links — long-tail SEO + zero-click options for users who know what they want */}
      <p className="mt-3 text-center text-[11px] text-white/70">
        Populares:{" "}
        {["295/80R22.5", "11R22.5", "215/55R17", "175/65R14"].map((d, i) => (
          <span key={d}>
            {i > 0 && <span className="text-white/30 mx-1">·</span>}
            <a
              href={`/marketplace?q=${encodeURIComponent(d)}`}
              className="text-white/90 hover:text-white underline-offset-2 hover:underline font-semibold"
            >
              {d}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}

export { VEHICLE_TIRE_MAP };
