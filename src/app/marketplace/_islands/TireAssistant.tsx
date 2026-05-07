"use client";

// =============================================================================
// TireAssistant — guided chat to find the right tire.
//
// Lazy-loaded "island" component: rendered only when MarketplaceClient
// mounts on a public marketplace page, dynamic-imported with
// ssr:false so its ~14 KB of vehicle-DB + chat-state code stays out
// of the initial /marketplace bundle. Users who never click the
// floating "¿Necesitas ayuda?" CTA never download it.
//
// The collapsed-state floating button itself is rendered in
// MarketplaceClient as a static fallback while this module loads, so
// there's no flash of nothing — the button shows immediately and the
// upgrade to the full assistant happens transparently when the user
// clicks.
// =============================================================================

import React, { useState } from "react";
import Image from "next/image";
import { MessageCircle, X, Send, Package, ArrowRight } from "lucide-react";
import { productHref } from "../product/_lib/url";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

// Common Colombian vehicles → tire dimensions
const VEHICLE_DB: Record<string, { dims: string[]; type: string }> = {
  // City cars
  "kia picanto": { dims: ["165/65R14", "175/65R14"], type: "City car" },
  "chevrolet spark": { dims: ["155/80R13", "165/65R14"], type: "City car" },
  "renault kwid": { dims: ["165/70R14"], type: "City car" },
  "suzuki alto": { dims: ["155/65R14"], type: "City car" },
  // Sedans
  "renault logan": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  "chevrolet onix": { dims: ["195/65R15", "205/55R16"], type: "Sedan" },
  "kia rio": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  "hyundai accent": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  "hyundai i25": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  "toyota corolla": { dims: ["205/55R16", "215/45R17"], type: "Sedan" },
  "mazda 3": { dims: ["205/60R16", "215/45R18"], type: "Sedan" },
  "honda civic": { dims: ["205/55R16", "215/50R17"], type: "Sedan" },
  "kia cerato": { dims: ["205/55R16", "215/45R17"], type: "Sedan" },
  "volkswagen jetta": { dims: ["205/55R16", "215/45R17"], type: "Sedan" },
  "nissan versa": { dims: ["185/65R15", "195/55R16"], type: "Sedan" },
  // Hatchbacks
  "renault sandero": { dims: ["185/65R15", "195/55R16"], type: "Hatchback" },
  "mazda 2": { dims: ["185/65R15", "195/55R16"], type: "Hatchback" },
  "honda fit": { dims: ["185/55R16", "175/65R15"], type: "Hatchback" },
  "volkswagen polo": { dims: ["185/65R15", "195/55R16"], type: "Hatchback" },
  "suzuki swift": { dims: ["185/55R16", "195/45R17"], type: "Hatchback" },
  // SUV / Crossover
  "hyundai tucson": { dims: ["225/60R17", "235/55R18"], type: "SUV" },
  "kia sportage": { dims: ["225/60R17", "235/55R18"], type: "SUV" },
  "toyota rav4": { dims: ["225/65R17", "235/55R18"], type: "SUV" },
  "mazda cx-5": { dims: ["225/65R17", "225/55R19"], type: "SUV" },
  "nissan qashqai": { dims: ["215/65R16", "225/55R18"], type: "SUV" },
  "renault duster": { dims: ["215/65R16", "215/60R17"], type: "SUV" },
  "chevrolet tracker": { dims: ["215/55R17", "215/50R18"], type: "SUV" },
  "ford escape": { dims: ["225/65R17", "235/55R18"], type: "SUV" },
  "hyundai creta": { dims: ["205/65R16", "215/60R17"], type: "SUV" },
  "kia seltos": { dims: ["215/60R17", "235/45R18"], type: "SUV" },
  // Campero / 4x4
  "toyota prado": { dims: ["265/65R17", "265/60R18"], type: "Campero" },
  "toyota fortuner": { dims: ["265/65R17", "265/60R18"], type: "Campero" },
  "toyota land cruiser": { dims: ["265/65R17", "285/60R18"], type: "Campero" },
  "nissan patrol": { dims: ["265/70R17", "275/60R20"], type: "Campero" },
  "chevrolet trailblazer": { dims: ["265/65R17", "265/60R18"], type: "Campero" },
  "ford bronco": { dims: ["255/70R16", "265/70R17"], type: "Campero" },
  // Pickup / Camioneta
  "toyota hilux": { dims: ["265/65R17", "265/60R18"], type: "Pickup" },
  "nissan frontier": { dims: ["255/70R16", "265/65R17"], type: "Pickup" },
  "chevrolet d-max": { dims: ["245/70R16", "265/65R17"], type: "Pickup" },
  "ford ranger": { dims: ["265/65R17", "265/60R18"], type: "Pickup" },
  "mitsubishi l200": { dims: ["245/70R16", "265/65R17"], type: "Pickup" },
  "mazda bt-50": { dims: ["255/70R16", "265/65R17"], type: "Pickup" },
  // Vans
  "hyundai h1": { dims: ["215/70R16", "225/70R16"], type: "Van" },
  "mercedes vito": { dims: ["225/65R16C", "235/60R17"], type: "Van" },
  "renault kangoo": { dims: ["185/65R15", "195/65R15"], type: "Van" },
  // Premium / Electric / European
  "volvo xc40": { dims: ["235/55R18", "245/45R19"], type: "SUV" },
  "volvo xc60": { dims: ["235/55R19", "255/45R20"], type: "SUV" },
  "volvo xc90": { dims: ["255/50R19", "275/45R20"], type: "SUV" },
  "volvo s60": { dims: ["225/50R17", "235/45R18"], type: "Sedan" },
  "tesla model 3": { dims: ["235/45R18", "235/40R19"], type: "Sedan electrico" },
  "tesla model y": { dims: ["255/45R19", "255/40R20"], type: "SUV electrico" },
  "tesla model s": { dims: ["245/45R19", "265/35R21"], type: "Sedan electrico" },
  "tesla model x": { dims: ["255/45R20", "265/40R21"], type: "SUV electrico" },
  "bmw x1": { dims: ["225/55R17", "225/50R18"], type: "SUV" },
  "bmw x3": { dims: ["245/50R19", "245/45R20"], type: "SUV" },
  "bmw x5": { dims: ["265/50R19", "275/45R20"], type: "SUV" },
  "bmw serie 3": { dims: ["225/50R17", "225/45R18"], type: "Sedan" },
  "audi q3": { dims: ["215/65R17", "235/55R18"], type: "SUV" },
  "audi q5": { dims: ["235/60R18", "255/45R20"], type: "SUV" },
  "audi a3": { dims: ["225/50R17", "225/45R18"], type: "Sedan" },
  "audi a4": { dims: ["225/50R17", "245/40R18"], type: "Sedan" },
  "mercedes glc": { dims: ["235/60R18", "255/45R20"], type: "SUV" },
  "mercedes gle": { dims: ["255/55R19", "275/45R21"], type: "SUV" },
  "mercedes clase c": { dims: ["225/50R17", "225/45R18"], type: "Sedan" },
  "mercedes clase a": { dims: ["225/45R17", "225/40R18"], type: "Sedan" },
  "jeep wrangler": { dims: ["245/75R17", "255/70R18"], type: "Campero" },
  "jeep grand cherokee": { dims: ["265/60R18", "265/50R20"], type: "SUV" },
  "jeep renegade": { dims: ["215/65R16", "225/55R18"], type: "SUV" },
  "subaru forester": { dims: ["225/60R17", "225/55R18"], type: "SUV" },
  "subaru outback": { dims: ["225/60R18", "225/65R17"], type: "SUV" },
  "mini cooper": { dims: ["195/55R16", "205/45R17"], type: "Hatchback" },
  "peugeot 208": { dims: ["195/55R16", "205/45R17"], type: "Hatchback" },
  "peugeot 2008": { dims: ["215/60R17", "215/55R18"], type: "SUV" },
  "peugeot 3008": { dims: ["225/55R18", "235/55R19"], type: "SUV" },
  "citroen c3": { dims: ["195/65R15", "205/55R16"], type: "Hatchback" },
  "fiat 500": { dims: ["185/55R15", "195/45R16"], type: "City car" },
  "chery tiggo 4": { dims: ["215/55R18", "215/60R17"], type: "SUV" },
  "chery tiggo 7": { dims: ["225/60R18", "235/55R19"], type: "SUV" },
  "jac s3": { dims: ["205/55R17", "215/55R17"], type: "SUV" },
  "great wall haval h6": { dims: ["225/60R18", "235/55R19"], type: "SUV" },
  "mg zs": { dims: ["215/55R17", "215/50R18"], type: "SUV" },
  "mg hs": { dims: ["225/55R19", "235/50R19"], type: "SUV" },
  "ssangyong rexton": { dims: ["265/60R18", "255/55R19"], type: "SUV" },
  "ssangyong tivoli": { dims: ["215/60R17", "225/45R18"], type: "SUV" },
  "dfsk glory 580": { dims: ["225/60R18", "215/60R17"], type: "SUV" },
  // Motorcycles
  "honda cb190": { dims: ["120/80-17", "100/80-17"], type: "Motocicleta" },
  "yamaha fz": { dims: ["140/60R17", "100/80-17"], type: "Motocicleta" },
  "bajaj pulsar": { dims: ["130/70-17", "100/80-17"], type: "Motocicleta" },
  "suzuki gixxer": { dims: ["140/60R17", "100/80-17"], type: "Motocicleta" },
  "honda navi": { dims: ["120/80-12", "90/90-12"], type: "Motocicleta" },
  "yamaha nmax": { dims: ["130/70-13", "110/70-13"], type: "Scooter" },
  "akt ak125": { dims: ["90/90-18", "2.75-18"], type: "Motocicleta" },
  // Trucks
  "chevrolet nhr": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  "chevrolet nqr": { dims: ["215/75R17.5", "235/75R17.5"], type: "Camion mediano" },
  "hino fc": { dims: ["215/75R17.5", "235/75R17.5"], type: "Camion mediano" },
  "hino 500": { dims: ["295/80R22.5", "11R22.5"], type: "Camion pesado" },
  "jac x350": { dims: ["215/75R17.5", "235/75R17.5"], type: "Camion mediano" },
  "hyundai hd65": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  "hyundai hd45": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  "foton aumark": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  "jmc carrying": { dims: ["7.00R16", "7.50R16"], type: "Camion liviano" },
  // Tractomulas
  "kenworth t680": { dims: ["295/80R22.5", "11R22.5", "315/80R22.5"], type: "Tractomula" },
  "kenworth t800": { dims: ["295/80R22.5", "11R22.5", "12R22.5"], type: "Tractomula" },
  "freightliner cascadia": { dims: ["295/80R22.5", "11R22.5", "315/80R22.5"], type: "Tractomula" },
  "international lt": { dims: ["295/80R22.5", "11R22.5"], type: "Tractomula" },
  "international prostar": { dims: ["295/80R22.5", "11R22.5"], type: "Tractomula" },
  "mack anthem": { dims: ["295/80R22.5", "11R22.5"], type: "Tractomula" },
  "volvo fh": { dims: ["295/80R22.5", "315/80R22.5"], type: "Tractomula" },
  "scania r": { dims: ["295/80R22.5", "315/80R22.5"], type: "Tractomula" },
  // Volquetas
  "kenworth t800 volqueta": { dims: ["12R24.5", "11R24.5", "315/80R22.5"], type: "Volqueta" },
  "international 7600": { dims: ["12R24.5", "11R24.5"], type: "Volqueta" },
  "mack granite": { dims: ["12R24.5", "11R24.5"], type: "Volqueta" },
  // Buses
  "mercedes of": { dims: ["275/80R22.5", "295/80R22.5"], type: "Bus" },
  "mercedes o500": { dims: ["295/80R22.5", "275/80R22.5"], type: "Bus" },
  "marcopolo": { dims: ["295/80R22.5", "275/80R22.5"], type: "Bus" },
  "chevrolet lv150": { dims: ["215/75R17.5", "235/75R17.5"], type: "Bus urbano" },
  "hino ak": { dims: ["275/80R22.5", "295/80R22.5"], type: "Bus" },
};

function findVehicleDims(input: string): { match: string; type: string; dims: string[] } | null {
  const q = input.toLowerCase().trim();
  if (VEHICLE_DB[q]) return { match: q, type: VEHICLE_DB[q].type, dims: VEHICLE_DB[q].dims };
  for (const [key, val] of Object.entries(VEHICLE_DB)) {
    if (key.includes(q) || q.includes(key)) return { match: key, type: val.type, dims: val.dims };
  }
  for (const [key, val] of Object.entries(VEHICLE_DB)) {
    const words = q.split(/\s+/);
    if (words.some(w => w.length >= 3 && key.includes(w))) return { match: key, type: val.type, dims: val.dims };
  }
  return null;
}

const VEHICLE_TIRE_MAP: Record<string, { label: string; dimensions: string[] }> = {
  tractocamion: { label: "Tractocamion / Tractomula", dimensions: ["295/80R22.5", "11R22.5", "315/80R22.5"] },
  camion:       { label: "Camion", dimensions: ["295/80R22.5", "11R22.5", "12R22.5"] },
  volqueta:     { label: "Volqueta", dimensions: ["12R24.5", "11R24.5", "315/80R22.5"] },
  bus:          { label: "Bus", dimensions: ["295/80R22.5", "275/80R22.5", "11R22.5"] },
  buseta:       { label: "Buseta / Microbus", dimensions: ["215/75R17.5", "235/75R17.5", "7.50R16"] },
  camioneta:    { label: "Camioneta / Pickup", dimensions: ["235/75R15", "265/70R16", "245/70R16"] },
  campero:      { label: "Campero / SUV", dimensions: ["265/70R16", "245/70R16", "235/75R15"] },
  automovil:    { label: "Automovil / Sedan", dimensions: ["195/65R15", "205/55R16", "215/60R16"] },
  furgon:       { label: "Furgon", dimensions: ["215/75R17.5", "235/75R17.5", "7.50R16"] },
};

type AssistantStep = "closed" | "vehicle" | "dimension" | "budget" | "results";
type ChatMsg = { from: "bot" | "user"; text: string };

export default function TireAssistant({ onSearch }: { onSearch: (q: string) => void }) {
  const [step, setStep] = useState<AssistantStep>("closed");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [vehicleInput, setVehicleInput] = useState("");
  const [selectedDim, setSelectedDim] = useState("");
  const [budget, setBudget] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [foundDims, setFoundDims] = useState<string[]>([]);

  function open() {
    setStep("vehicle");
    setMsgs([{ from: "bot", text: "Hola! Te ayudo a encontrar la llanta perfecta. ¿Que vehiculo tienes? (ej: Kia Picanto, Toyota Hilux, Renault Logan...)" }]);
    setVehicleInput(""); setSelectedDim(""); setBudget(""); setResults([]); setFoundDims([]);
  }

  function close() {
    setStep("closed"); setMsgs([]);
  }

  function searchVehicle() {
    if (!vehicleInput.trim()) return;
    const result = findVehicleDims(vehicleInput);
    if (result) {
      setFoundDims(result.dims);
      setMsgs(prev => [...prev,
        { from: "user", text: vehicleInput },
        { from: "bot", text: `${result.match.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} (${result.type}) usa estas medidas. ¿Cual necesitas?` },
      ]);
      setStep("dimension");
    } else {
      setMsgs(prev => [...prev,
        { from: "user", text: vehicleInput },
        { from: "bot", text: `No tengo "${vehicleInput}" en mi base de datos. Puedes seleccionar el tipo de vehiculo o escribir la dimension directamente (ej: 225/55R18):` },
      ]);
      setFoundDims([]);
      setStep("dimension");
    }
    setVehicleInput("");
  }

  function pickVehicleType(key: string) {
    const v = VEHICLE_TIRE_MAP[key];
    if (!v) return;
    setFoundDims(v.dimensions);
    setMsgs(prev => [...prev,
      { from: "user", text: v.label },
      { from: "bot", text: `${v.label} — estas son las dimensiones mas comunes. ¿Cual necesitas?` },
    ]);
  }

  function pickDimension(dim: string) {
    setSelectedDim(dim);
    setMsgs(prev => [...prev,
      { from: "user", text: dim },
      { from: "bot", text: `Perfecto, ${dim}. ¿Cual es tu presupuesto maximo por llanta? (en pesos COP)` },
    ]);
    setStep("budget");
  }

  async function submitBudget() {
    const maxPrice = parseInt(budget.replace(/\D/g, ""));
    if (!maxPrice || maxPrice < 10000) return;

    setMsgs(prev => [...prev,
      { from: "user", text: `$${maxPrice.toLocaleString("es-CO")}` },
      { from: "bot", text: "Buscando las mejores opciones..." },
    ]);
    setLoading(true);

    try {
      const dimNoSpace = selectedDim.replace(/\s+/g, "");
      const dimWithSpace = dimNoSpace.replace(/(\d)R(\d)/g, "$1 R$2");
      const p = new URLSearchParams({ search: dimNoSpace === "custom" ? budget : dimWithSpace, limit: "20", sortBy: "price_asc" });
      const res = await fetch(`${API_BASE}/marketplace/listings?${p}`);
      if (res.ok) {
        const data = await res.json();
        const listings = (data.listings ?? []).filter((l: any) => l.precioCop <= maxPrice);

        listings.sort((a: any, b: any) => {
          const aKm = a.catalog?.kmEstimadosReales ?? 0;
          const bKm = b.catalog?.kmEstimadosReales ?? 0;
          if (bKm !== aKm) return bKm - aKm;
          return a.precioCop - b.precioCop;
        });

        setResults(listings.slice(0, 5));

        if (listings.length === 0) {
          setMsgs(prev => [...prev.slice(0, -1),
            { from: "bot", text: `No encontre llantas ${selectedDim} por menos de $${maxPrice.toLocaleString("es-CO")}. Intenta con un presupuesto mayor o busca directamente.` },
          ]);
        } else {
          const best = listings[0];
          const bestKm = best.catalog?.kmEstimadosReales;
          const recText = bestKm
            ? `Encontre ${listings.length} opciones. Te recomiendo ${best.marca} ${best.modelo} a $${best.precioCop.toLocaleString("es-CO")} — tiene ${bestKm.toLocaleString("es-CO")} km estimados de vida, el mejor rendimiento en tu rango.`
            : `Encontre ${listings.length} opciones. La mas economica es ${best.marca} ${best.modelo} a $${best.precioCop.toLocaleString("es-CO")}.`;
          setMsgs(prev => [...prev.slice(0, -1), { from: "bot", text: recText }]);
        }
        setStep("results");
      }
    } catch { /* */ }
    setLoading(false);
  }

  const fmtCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

  if (step === "closed") {
    return (
      <button onClick={open}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        style={{ background: "#0A183A", color: "white" }}>
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs font-bold">¿Necesitas ayuda?</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: "70vh", border: "1px solid rgba(10,24,58,0.1)" }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#62b8f0]" />
          <span className="text-sm font-bold text-white">Asistente TirePro</span>
        </div>
        <button onClick={close} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ minHeight: 200 }}>
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              m.from === "user"
                ? "bg-[#1E76B6] text-white rounded-br-sm"
                : "bg-gray-100 text-[#0A183A] rounded-bl-sm"
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {step === "results" && results.length > 0 && (
          <div className="space-y-2 pt-1">
            {results.map((l) => {
              const cover = l.imageUrls?.[l.coverIndex ?? 0] ?? l.imageUrls?.[0];
              return (
                <a key={l.id} href={productHref(l)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-[#1E76B6]/30 hover:shadow-sm transition-all">
                  <div className="relative w-12 h-12 rounded-lg bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {cover ? <Image src={cover} alt={`${l.marca} ${l.modelo}`} fill sizes="48px" style={{ objectFit: "contain", padding: "4px" }} /> : <Package className="w-5 h-5 text-gray-200" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase">{l.marca}</p>
                    <p className="text-xs font-bold text-[#0A183A] truncate">{l.modelo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-black text-[#0A183A]">{fmtCOP(l.precioCop)}</span>
                      {l.catalog?.kmEstimadosReales && (
                        <span className="text-[9px] text-green-600 font-bold">{Math.round(l.catalog.kmEstimadosReales / 1000)}K km</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}>
        {step === "vehicle" && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={vehicleInput}
              onChange={(e) => setVehicleInput(e.target.value)}
              placeholder="Ej: Kia Picanto, Toyota Hilux..."
              autoFocus
              className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-gray-50 border border-gray-200 text-[#0A183A] placeholder-gray-400 focus:outline-none focus:border-[#1E76B6]"
              onKeyDown={(e) => { if (e.key === "Enter") searchVehicle(); }}
            />
            <button onClick={searchVehicle} disabled={!vehicleInput.trim()}
              className="p-2.5 rounded-xl text-white disabled:opacity-30 transition-all" style={{ background: "#1E76B6" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "dimension" && (
          <div className="space-y-2">
            {foundDims.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {foundDims.map((dim) => (
                  <button key={dim} onClick={() => pickDimension(dim)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "#1E76B6" }}>
                    {dim}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Dimension (ej: 225/55R18)"
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-gray-50 border border-gray-200 text-[#0A183A] placeholder-gray-400 focus:outline-none focus:border-[#1E76B6]"
                    onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) pickDimension(v); } }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(VEHICLE_TIRE_MAP).map(([key, val]) => (
                    <button key={key} onClick={() => pickVehicleType(key)}
                      className="px-2 py-2 rounded-lg text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-[#1E76B6]/5 hover:border-[#1E76B6]/20 hover:text-[#0A183A] transition-all text-center">
                      {val.label.split(" / ")[0]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === "budget" && (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Ej: 800000"
                autoFocus
                className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm bg-gray-50 border border-gray-200 text-[#0A183A] placeholder-gray-400 focus:outline-none focus:border-[#1E76B6]"
                onKeyDown={(e) => { if (e.key === "Enter") submitBudget(); }}
              />
            </div>
            <button onClick={submitBudget} disabled={loading || !budget}
              className="p-2.5 rounded-xl text-white disabled:opacity-30 transition-all"
              style={{ background: "#1E76B6" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "results" && (
          <div className="flex gap-2">
            <button onClick={() => { onSearch(selectedDim.replace(/\s+/g, "").replace(/(\d)R(\d)/g, "$1 R$2")); close(); }}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
              style={{ background: "#1E76B6" }}>
              Ver todos en {selectedDim}
            </button>
            <button onClick={open}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
              Reiniciar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
