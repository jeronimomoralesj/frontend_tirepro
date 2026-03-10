"use client";

import { useState, useEffect } from "react";
import {
  Search, Timer, FileText, Camera, AlertTriangle,
  Download, X, Link, Loader2, CheckCircle,
} from "lucide-react";
import jsPDF from "jspdf";

// =============================================================================
// Types
// =============================================================================

type Vehicle = {
  id: string;
  placa: string;
  tipovhc: string;
  tireCount: number;
  kilometrajeActual: number;
  union?: string;
};

type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  imageUrl: string;
  cpk: string;
  cpkProyectado: string;
  fecha: string;
};

type Tire = {
  id: string;
  placa: string;
  marca: string;
  posicion: number;
  profundidadInicial: number;
  kilometrosRecorridos: number;
  costo: Array<{ valor: number }>;
  inspecciones: Inspection[];
  vehicleId: string;
};

type TireUpdate = {
  profundidadInt: number | "";
  profundidadCen: number | "";
  profundidadExt: number | "";
  image: File | null;
};

type InspectionData = {
  vehicle: Vehicle;
  unionVehicle?: Vehicle;
  tires: Array<{
    id: string; placa: string; marca: string; posicion: number;
    profundidadInicial: number; kilometrosRecorridos: number;
    costo: Array<{ valor: number }>;
    updates: { profundidadInt: number; profundidadCen: number; profundidadExt: number; image: File | null };
    avgDepth: number; minDepth: number;
    cpk: string; cpkProyectado: string; projectedKm: number;
    imageBase64: string | null; vehicleId: string;
  }>;
  date: string;
  kmDiff: number;
};

// =============================================================================
// Constants
// =============================================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

// =============================================================================
// Helpers
// =============================================================================

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload  = () => res(r.result as string);
    r.onerror = (e) => rej(e);
  });
}

function calcCpk(tire: Tire, minDepth: number, kmDiff: number) {
  const newKm       = tire.kilometrosRecorridos + kmDiff;
  const totalCost   = (tire.costo ?? []).reduce((s, e) => s + e.valor, 0);
  const cpk         = newKm > 0 ? totalCost / newKm : 0;
  const profIni     = tire.profundidadInicial || 8;
  const denom       = (newKm / (profIni - minDepth)) * profIni;
  const cpkProy     = denom > 0 ? totalCost / denom : 0;
  const wearRate    = newKm > 0 ? (profIni - minDepth) / newKm : 0;
  const projectedKm = minDepth > 2 && wearRate > 0 ? Math.round((minDepth - 2) / wearRate) : 0;
  return { cpk: cpk.toFixed(3), cpkProyectado: cpkProy.toFixed(3), projectedKm };
}

// =============================================================================
// Design-system micro-components
// =============================================================================

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "white",
        border: "1px solid rgba(52,140,203,0.15)",
        boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <div>
        <p className="text-sm font-black text-[#0A183A] leading-none">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl text-sm font-medium text-[#0A183A] bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all";
const inputStyle = { border: "1.5px solid rgba(52,140,203,0.2)" };

// =============================================================================
// TireSection — must be defined OUTSIDE the page component to avoid remounting
// on every state change (which would steal focus from inputs)
// =============================================================================

type TireSectionProps = {
  tiresData: Tire[];
  label: string;
  accent?: boolean;
  tireUpdates: Record<string, TireUpdate>;
  onField: (id: string, field: "profundidadInt" | "profundidadCen" | "profundidadExt" | "image", value: number | File | null) => void;
};

function TireSection({ tiresData, label, accent, tireUpdates, onField }: TireSectionProps) {
  if (!tiresData.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg" style={{ background: accent ? "rgba(30,118,182,0.1)" : "rgba(10,24,58,0.06)" }}>
          <Link className="w-3.5 h-3.5" style={{ color: accent ? "#1E76B6" : "#173D68" }} />
        </div>
        <p className="text-xs font-black text-[#0A183A] uppercase tracking-wide">{label}</p>
      </div>

      {tiresData.map((tire) => (
        <Card key={tire.id} className="overflow-hidden">
          <div
            className="px-4 py-2 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)", borderBottom: "1px solid rgba(52,140,203,0.12)" }}
          >
            <span className="text-xs font-black text-white uppercase tracking-widest">Posición {tire.posicion}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
              {tire.marca}
            </span>
          </div>

          <div className="p-4 grid sm:grid-cols-2 gap-4">
            {/* Tire info */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <div className="p-1 rounded-md" style={{ background: "rgba(30,118,182,0.08)" }}>
                  <Camera className="w-3 h-3 text-[#1E76B6]" />
                </div>
                <p className="text-[11px] font-black text-[#0A183A] uppercase tracking-wide">Detalles</p>
              </div>
              <div className="space-y-1 text-xs text-[#173D68]">
                <p><span className="font-bold text-[#0A183A]">ID:</span> {tire.placa}</p>
                <p><span className="font-bold text-[#0A183A]">Marca:</span> {tire.marca}</p>
                <p><span className="font-bold text-[#0A183A]">Posición:</span> {tire.posicion}</p>
              </div>
            </div>

            {/* Depth inputs */}
            <div>
              <p className="text-[11px] font-black text-[#0A183A] uppercase tracking-wide mb-2">Profundidades (mm)</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(["profundidadInt", "profundidadCen", "profundidadExt"] as const).map((field, fi) => (
                  <div key={field} className="text-center">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">
                      {fi === 0 ? "Interior" : fi === 1 ? "Central" : "Exterior"}
                    </label>
                    <input
                      type="number" min={0} max={30}
                      value={tireUpdates[tire.id]?.[field] ?? ""}
                      onChange={(e) => onField(tire.id, field, e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-2 py-2 rounded-xl text-sm font-bold text-center text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all"
                      style={{ border: "1.5px solid rgba(52,140,203,0.2)" }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">Imagen (opcional)</label>
                <input
                  type="file" accept="image/*"
                  onChange={(e) => onField(tire.id, "image", e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-[#173D68]
                    file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                    file:text-xs file:font-bold file:text-white file:cursor-pointer
                    hover:file:opacity-90 transition-all"
                />
                {tireUpdates[tire.id]?.image && (
                  <p className="text-[10px] text-[#1E76B6] font-bold mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {(tireUpdates[tire.id].image as File).name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Page component
// =============================================================================

export default function InspeccionPage() {
  const [placaInput,     setPlacaInput]     = useState("");
  const [newKilometraje, setNewKilometraje] = useState<number>(0);

  const [vehicle,      setVehicle]      = useState<Vehicle | null>(null);
  const [unionVehicle, setUnionVehicle] = useState<Vehicle | null>(null);
  const [tires,        setTires]        = useState<Tire[]>([]);
  const [unionTires,   setUnionTires]   = useState<Tire[]>([]);
  const [tireUpdates,  setTireUpdates]  = useState<Record<string, TireUpdate>>({});

  const [error,           setError]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [inspectionData,  setInspectionData]  = useState<InspectionData | null>(null);

  // ── Search ─────────────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setVehicle(null); setUnionVehicle(null);
    setTires([]); setUnionTires([]); setTireUpdates({});

    if (!placaInput.trim()) { setError("Por favor ingrese la placa del vehículo."); return; }

    setLoading(true);
    try {
      const companyId = localStorage.getItem("companyId") ?? "";
      if (!companyId) throw new Error("No se encontró el companyId. Inicie sesión nuevamente.");
      const vRes = await authFetch(
        `${API_BASE}/vehicles/placa?placa=${encodeURIComponent(placaInput.trim().toLowerCase())}${companyId ? `&companyId=${companyId}` : ""}`
      );
      if (!vRes.ok) throw new Error("Vehículo no encontrado");
      const vData: Vehicle = await vRes.json();
      setVehicle(vData);
      setNewKilometraje(vData.kilometrajeActual);

      // Union vehicle
      let unionVData: Vehicle | null = null;
      if (vData.union) {
        try {
          const uvRes = await authFetch(
            `${API_BASE}/vehicles/placa?placa=${encodeURIComponent(vData.union)}${companyId ? `&companyId=${companyId}` : ""}`
          );
          if (uvRes.ok) { unionVData = await uvRes.json(); setUnionVehicle(unionVData); }
        } catch { /* skip */ }
      }

      // Main tires
      const tRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${vData.id}`);
      if (!tRes.ok) throw new Error("Error al obtener las llantas");
      const tData: Tire[] = await tRes.json();
      tData.sort((a, b) => a.posicion - b.posicion);
      setTires(tData);

      // Union tires
      let utData: Tire[] = [];
      if (unionVData) {
        try {
          const utRes = await authFetch(`${API_BASE}/tires/vehicle?vehicleId=${unionVData.id}`);
          if (utRes.ok) { utData = await utRes.json(); utData.sort((a, b) => a.posicion - b.posicion); setUnionTires(utData); }
        } catch { /* skip */ }
      }

      // Init updates
      const init: Record<string, TireUpdate> = {};
      [...tData, ...utData].forEach((t) => {
        init[t.id] = { profundidadInt: "", profundidadCen: "", profundidadExt: "", image: null };
      });
      setTireUpdates(init);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  // ── Update tire field ──────────────────────────────────────────────────────
  function handleTireField(
    tireId: string,
    field: "profundidadInt" | "profundidadCen" | "profundidadExt" | "image",
    value: number | "" | File | null
  ) {
    setTireUpdates((prev) => ({ ...prev, [tireId]: { ...prev[tireId], [field]: value } }));
  }

  // ── Submit inspections ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    try {
      const allTires = [...tires, ...unionTires];

      const invalid = allTires.filter((t) => {
        const u = tireUpdates[t.id];
        return u.profundidadInt === "" || u.profundidadCen === "" || u.profundidadExt === "" ||
          isNaN(Number(u.profundidadInt)) || isNaN(Number(u.profundidadCen)) || isNaN(Number(u.profundidadExt));
      });
      if (invalid.length > 0) throw new Error("Por favor ingrese valores numéricos válidos para todas las profundidades.");

      const zeros = allTires.reduce((n, t) => {
        const u = tireUpdates[t.id];
        return n + [u.profundidadInt, u.profundidadCen, u.profundidadExt].filter((v) => Number(v) === 0).length;
      }, 0);
      if (zeros > 0 && !window.confirm(`${zeros} campo(s) con valor 0. ¿Desea continuar?`)) {
        setLoading(false); return;
      }

      const kmDiff = vehicle ? Number(newKilometraje) - vehicle.kilometrajeActual : 0;

      await Promise.all(allTires.map(async (tire) => {
        const u = tireUpdates[tire.id];
        const tireKm = unionVehicle && tire.vehicleId === unionVehicle.id
          ? unionVehicle.kilometrajeActual + kmDiff
          : Number(newKilometraje);

        const payload = {
          profundidadInt: Number(u.profundidadInt),
          profundidadCen: Number(u.profundidadCen),
          profundidadExt: Number(u.profundidadExt),
          newKilometraje: tireKm,
          imageUrl: u.image ? await fileToBase64(u.image) : "",
        };
        const res = await authFetch(`${API_BASE}/tires/${tire.id}/inspection`, {
          method: "PATCH", body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Error actualizando neumático ${tire.placa}: ${txt}`);
        }
      }));

      const data: InspectionData = {
        vehicle: vehicle!,
        unionVehicle: unionVehicle ?? undefined,
        tires: allTires.map((tire) => {
          const u   = tireUpdates[tire.id];
          const pi  = Number(u.profundidadInt);
          const pc  = Number(u.profundidadCen);
          const pe  = Number(u.profundidadExt);
          const avg = (pi + pc + pe) / 3;
          const min = Math.min(pi, pc, pe);
          const cpkData = calcCpk(tire, min, kmDiff);
          return { ...tire, updates: { profundidadInt: pi, profundidadCen: pc, profundidadExt: pe, image: u.image }, avgDepth: avg, minDepth: min, ...cpkData, imageBase64: null, vehicleId: tire.vehicleId };
        }),
        date: new Date().toISOString().split("T")[0],
        kmDiff,
      };
      setInspectionData(data);
      setShowExportPopup(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  // ── Generate PDF ───────────────────────────────────────────────────────────
  async function generatePDF() {
    if (!inspectionData || !vehicle) return;
    setLoading(true);
    try {
      const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const BLUE = [10, 24, 58] as const;
      const MID  = [30, 118, 182] as const;
      const GREY = [60, 60, 60] as const;

      function header(page: number, total: number) {
        doc.setFillColor(...BLUE); doc.rect(0, 0, 210, 25, "F");
        doc.setFillColor(...MID); doc.roundedRect(15, 5, 40, 15, 3, 3, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("TirePro", 35, 14, { align: "center" });
        doc.setFontSize(16); doc.text("Reporte de Inspección", 130, 14, { align: "center" });
        doc.setFillColor(240, 240, 240); doc.rect(0, 282, 210, 15, "F");
        doc.setTextColor(...GREY); doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Página ${page} de ${total}`, 105, 290, { align: "center" });
        doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 15, 290);
        return 35;
      }

      const totalPages = Math.ceil(2 + inspectionData.tires.length / 5);
      let y = header(1, totalPages);
      let page = 1;

      // Vehicle summary box
      doc.setFillColor(245, 245, 245); doc.roundedRect(15, y, 180, 45, 3, 3, "F");
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLUE);
      doc.text("Vehículo Principal", 20, y + 8);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...GREY);
      y += 8;
      doc.text(`Placa: ${vehicle.placa.toUpperCase()}`, 25, y + 10);
      doc.text(`Tipo: ${vehicle.tipovhc}`, 25, y + 18);
      doc.text(`Llantas: ${vehicle.tireCount}`, 25, y + 26);
      doc.text(`Fecha: ${inspectionData.date}`, 110, y + 10);
      doc.text(`Km anterior: ${vehicle.kilometrajeActual}`, 110, y + 18);
      doc.text(`Km actual: ${newKilometraje}`, 110, y + 26);
      doc.text(`Diferencia: ${inspectionData.kmDiff} km`, 110, y + 34);
      y += 55;

      if (unionVehicle) {
        doc.setFillColor(235, 245, 255); doc.roundedRect(15, y, 180, 40, 3, 3, "F");
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...MID);
        doc.text("Vehículo en Unión", 20, y + 8);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...GREY);
        y += 8;
        doc.text(`Placa: ${unionVehicle.placa.toUpperCase()}`, 25, y + 10);
        doc.text(`Tipo: ${unionVehicle.tipovhc}`, 25, y + 18);
        doc.text(`Km anterior: ${unionVehicle.kilometrajeActual}`, 110, y + 10);
        doc.text(`Km actual: ${unionVehicle.kilometrajeActual + inspectionData.kmDiff}`, 110, y + 18);
        y += 50;
      }

      async function renderTireBlock(tire: InspectionData["tires"][number], yPos: number): Promise<number> {
        const blockH = tire.updates.image ? 100 : 62;
        if (yPos + blockH > 270) {
          doc.addPage(); page++; yPos = header(page, totalPages);
        }
        doc.setFillColor(245, 245, 245); doc.roundedRect(15, yPos, 180, blockH, 3, 3, "F");
        doc.setFillColor(...MID); doc.roundedRect(15, yPos, 50, 10, 2, 2, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text(`POSICIÓN ${tire.posicion}`, 40, yPos + 7, { align: "center" });
        yPos += 15;
        doc.setTextColor(...BLUE); doc.setFontSize(12); doc.text(tire.marca, 25, yPos);
        doc.setTextColor(...GREY); doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`ID: ${tire.placa}`, 25, yPos + 8);
        doc.setFillColor(255, 255, 255); doc.roundedRect(25, yPos + 12, 75, 35, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.text("Profundidades", 62.5, yPos + 19, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.text(`Interior: ${tire.updates.profundidadInt} mm`, 35, yPos + 27);
        doc.text(`Central: ${tire.updates.profundidadCen} mm`, 35, yPos + 34);
        doc.text(`Exterior: ${tire.updates.profundidadExt} mm`, 35, yPos + 41);
        doc.setFillColor(255, 255, 255); doc.roundedRect(110, yPos + 12, 75, 35, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.text("Análisis", 147.5, yPos + 19, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.text(`Prom. Profundidad: ${tire.avgDepth.toFixed(2)} mm`, 120, yPos + 27);
        doc.text(`CPK: ${tire.cpk}`, 120, yPos + 34);
        if (tire.updates.image) {
          try {
            const img = await fileToBase64(tire.updates.image);
            doc.addImage(img, "JPEG", 65, yPos + 50, 80, 40);
          } catch { /* skip */ }
        }
        return yPos + blockH + 10;
      }

      const mainTires  = inspectionData.tires.filter((t) => t.vehicleId === vehicle.id);
      const unionTires_ = inspectionData.tires.filter((t) => unionVehicle && t.vehicleId === unionVehicle.id);

      if (mainTires.length > 0) {
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLUE);
        doc.text(`Neumáticos — ${vehicle.placa.toUpperCase()}`, 20, y); y += 10;
        for (const t of mainTires) { y = await renderTireBlock(t, y); }
      }
      if (unionTires_.length > 0) {
        y += 5;
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...MID);
        doc.text(`Neumáticos — ${unionVehicle!.placa.toUpperCase()}`, 20, y); y += 10;
        for (const t of unionTires_) { y = await renderTireBlock(t, y); }
      }

      const fname = unionVehicle
        ? `inspeccion_${vehicle.placa}_${unionVehicle.placa}_${inspectionData.date}.pdf`
        : `inspeccion_${vehicle.placa}_${inspectionData.date}.pdf`;
      doc.save(fname);
    } catch (err) {
      console.error(err);
      setError("Error al generar el PDF");
    } finally {
      setLoading(false);
    }
  }

  function resetAfterExport() {
    setShowExportPopup(false);
    if (vehicle) setNewKilometraje(vehicle.kilometrajeActual);
    const init: Record<string, TireUpdate> = {};
    [...tires, ...unionTires].forEach((t) => {
      init[t.id] = { profundidadInt: "", profundidadCen: "", profundidadExt: "", image: null };
    });
    setTireUpdates(init);
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen" style={{ background: "white" }}>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-5">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div
          className="px-4 sm:px-6 py-5 rounded-2xl"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)", boxShadow: "0 8px 32px rgba(10,24,58,0.22)" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-none tracking-tight">Sistema de Inspección</h1>
              <p className="text-xs text-white/60 mt-0.5">Registre mediciones y genere reportes detallados</p>
            </div>
          </div>
        </div>

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* ── Search card ───────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5">
          <CardTitle icon={Search} title="Buscar Vehículo" sub="Ingrese la placa para cargar las llantas" />
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text" value={placaInput}
              onChange={(e) => setPlacaInput(e.target.value)}
              placeholder="Ej. abc-123"
              className={`${inputCls} flex-1`} style={inputStyle}
            />
            <button
              type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando…</>
                : <><Search className="w-4 h-4" /> Buscar</>
              }
            </button>
          </form>
        </Card>

        {/* ── Vehicle info ──────────────────────────────────────────────── */}
        {vehicle && (
          <Card className="p-4 sm:p-5">
            <CardTitle icon={FileText} title="Información del Vehículo" />
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {/* Main vehicle */}
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(10,24,58,0.02)", border: "1px solid rgba(52,140,203,0.12)" }}
              >
                <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest mb-2">Vehículo Principal</p>
                <div className="space-y-1 text-xs text-[#173D68]">
                  <p><span className="font-bold text-[#0A183A]">Placa:</span> {vehicle.placa.toUpperCase()}</p>
                  <p><span className="font-bold text-[#0A183A]">Tipo:</span> {vehicle.tipovhc}</p>
                  <p><span className="font-bold text-[#0A183A]">Llantas:</span> {vehicle.tireCount}</p>
                  <p><span className="font-bold text-[#0A183A]">Km actual:</span> {vehicle.kilometrajeActual.toLocaleString()} km</p>
                  {vehicle.union && <p><span className="font-bold text-[#0A183A]">Unión:</span> {String(vehicle.union).toUpperCase()}</p>}
                </div>
              </div>

              {/* Union vehicle */}
              {unionVehicle && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(30,118,182,0.2)" }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Link className="w-3 h-3 text-[#1E76B6]" />
                    <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">Vehículo en Unión</p>
                  </div>
                  <div className="space-y-1 text-xs text-[#173D68]">
                    <p><span className="font-bold text-[#0A183A]">Placa:</span> {unionVehicle.placa.toUpperCase()}</p>
                    <p><span className="font-bold text-[#0A183A]">Tipo:</span> {unionVehicle.tipovhc}</p>
                    <p><span className="font-bold text-[#0A183A]">Llantas:</span> {unionVehicle.tireCount}</p>
                    <p><span className="font-bold text-[#0A183A]">Km actual:</span> {unionVehicle.kilometrajeActual.toLocaleString()} km</p>
                  </div>
                </div>
              )}
            </div>

            {/* Kilometraje input */}
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(30,118,182,0.04)", border: "1px solid rgba(52,140,203,0.15)" }}
            >
              <label className="flex items-center gap-2 text-xs font-black text-[#0A183A] uppercase tracking-wide mb-2">
                <Timer className="w-3.5 h-3.5 text-[#1E76B6]" />
                Nuevo Kilometraje
              </label>
              <input
                type="number"
                value={newKilometraje}
                onChange={(e) => setNewKilometraje(Number(e.target.value))}
                min={vehicle.kilometrajeActual}
                className={inputCls} style={inputStyle}
              />
              <p className="text-[10px] text-[#1E76B6] font-bold mt-1.5">
                Diferencia: +{(newKilometraje - vehicle.kilometrajeActual).toLocaleString()} km
              </p>
            </div>
          </Card>
        )}

        {/* ── Tire forms ────────────────────────────────────────────────── */}
        {(tires.length > 0 || unionTires.length > 0) && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {tires.length > 0 && (
              <TireSection tiresData={tires} label={`Neumáticos — ${vehicle!.placa.toUpperCase()}`} tireUpdates={tireUpdates} onField={handleTireField} />
            )}
            {unionVehicle && unionTires.length > 0 && (
              <TireSection tiresData={unionTires} label={`Neumáticos — ${unionVehicle.placa.toUpperCase()} (Unión)`} accent tireUpdates={tireUpdates} onField={handleTireField} />
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)", boxShadow: "0 4px 20px rgba(10,24,58,0.25)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Actualizando…</>
                : "Actualizar Inspecciones"
              }
            </button>
          </form>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {vehicle && tires.length === 0 && !loading && (
          <Card className="py-12 flex flex-col items-center text-center px-6">
            <div className="p-3 rounded-xl mb-3" style={{ background: "rgba(30,118,182,0.06)" }}>
              <Camera className="w-6 h-6 text-[#1E76B6] opacity-50" />
            </div>
            <p className="text-sm font-bold text-[#0A183A]">No se encontraron llantas para este vehículo.</p>
          </Card>
        )}
      </div>

      {/* ── Export modal ────────────────────────────────────────────────── */}
      {showExportPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,24,58,0.5)" }}>
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: "rgba(22,163,74,0.1)" }}>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm font-black text-[#0A183A]">Inspección Guardada</p>
              </div>
              <button onClick={resetAfterExport}>
                <X className="w-4 h-4 text-gray-400 hover:text-[#0A183A] transition-colors" />
              </button>
            </div>

            <p className="text-xs text-[#173D68] mb-5 leading-relaxed">
              La inspección ha sido guardada exitosamente. Puede exportar un reporte en PDF con todos los datos incluyendo CPK y proyecciones.
            </p>

            <button
              onClick={generatePDF} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando PDF…</>
                : <><Download className="w-4 h-4" /> Exportar a PDF</>
              }
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}