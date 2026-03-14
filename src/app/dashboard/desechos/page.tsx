"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Target,
  Download,
  Filter,
  Trash2,
  BarChart3,
  ChevronDown,
  Search,
  X,
  FileText,
  Clock,
  Hash,
  ChevronLeft,
  ChevronRight,
  Camera,
  ZoomIn,
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// =============================================================================
// Types
// =============================================================================

interface DesechoData {
  fecha: string;
  causales: string;
  remanente: number;
  milimetrosDesechados: number;
  imageUrls?: string[];
}

interface TireWithDesecho {
  id: string;
  desechos?: DesechoData | null;
  marca?: string;
  placa?: string;
}

type EnrichedDesecho = DesechoData & {
  tireId: string;
  marca: string;
  vehiclePlaca: string;
};

// =============================================================================
// Constants
// =============================================================================

const API_BASE =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "https://api.tirepro.com.co/api";

const MESES_ES: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

const formatMonth = (iso: string) => {
  const [year, month] = iso.split("-");
  return `${MESES_ES[month] ?? month} ${year}`;
};

const ROWS_PER_PAGE = 20;

// =============================================================================
// Helpers
// =============================================================================

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token =
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function getCompanyIdFromToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.companyId ?? payload.sub ?? null;
  } catch {
    return null;
  }
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

function CardTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <h2 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h2>
    </div>
  );
}

function MetricCard({
  icon: Icon, title, value, sub, variant = "primary",
}: {
  icon: React.ElementType; title: string; value: string | number;
  sub?: string; variant?: "primary" | "secondary" | "accent" | "mid";
}) {
  const bgs: Record<string, string> = {
    primary:   "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
    secondary: "linear-gradient(135deg, #173D68 0%, #1E76B6 100%)",
    mid:       "linear-gradient(135deg, #1E76B6 0%, #348CCB 100%)",
    accent:    "linear-gradient(135deg, #348CCB 0%, #1E76B6 100%)",
  };
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
      style={{ background: bgs[variant], minHeight: 100, boxShadow: "0 4px 20px rgba(10,24,58,0.18)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none break-all">{value}</p>
      {sub && <p className="text-xs font-bold text-white/60 mt-0.5">{sub}</p>}
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mt-2">{title}</p>
    </div>
  );
}

// =============================================================================
// Dropdown
// =============================================================================

function Dropdown({
  label, value, options, onChange, searchable = false,
}: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));
  }, [options, search, searchable]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: value !== options[0]?.value ? "rgba(30,118,182,0.08)" : "white",
          border: value !== options[0]?.value ? "1.5px solid rgba(30,118,182,0.3)" : "1.5px solid rgba(52,140,203,0.2)",
          color: value !== options[0]?.value ? "#1E76B6" : "#0A183A",
          whiteSpace: "nowrap",
        }}
      >
        <span className="truncate max-w-[110px] flex-1 text-left text-xs">{selected?.label ?? label}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-[#1E76B6] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(""); }} />
          <div
            className="absolute left-0 mt-1 w-52 rounded-xl overflow-hidden z-20"
            style={{ background: "white", border: "1px solid rgba(52,140,203,0.2)", boxShadow: "0 8px 32px rgba(10,24,58,0.15)" }}
          >
            {searchable && (
              <div className="p-2 border-b" style={{ borderColor: "rgba(52,140,203,0.12)" }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    autoFocus type="text" placeholder="Buscar…"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                    style={{ border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" }}
                  />
                </div>
              </div>
            )}
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Sin resultados</p>
              ) : filtered.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                  className="block w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#F0F7FF]"
                  style={{ color: value === o.value ? "#1E76B6" : "#0A183A", fontWeight: value === o.value ? 700 : 400 }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Chart Card
// =============================================================================

function ChartCard({ title, icon: Icon, data }: { title: string; icon: React.ElementType; data: Record<string, number> }) {
  const hasData = Object.keys(data).length > 0;
  const labels = Object.keys(data).map((k) => (k.includes("-") ? formatMonth(k) : k));
  const values = Object.values(data);

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
          <Icon className="w-4 h-4 text-[#1E76B6]" />
        </div>
        <h3 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h3>
      </div>
      <div className="p-5">
        {hasData ? (
          <div className="h-64">
            <Bar
              data={{
                labels,
                datasets: [{
                  label: title,
                  data: values,
                  backgroundColor: "rgba(30,118,182,0.75)",
                  hoverBackgroundColor: "#0A183A",
                  borderRadius: 6,
                  barPercentage: 0.65,
                  categoryPercentage: 0.75,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: "#0A183A",
                    titleColor: "white",
                    bodyColor: "rgba(255,255,255,0.8)",
                    cornerRadius: 8,
                    displayColors: false,
                    padding: 10,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { color: "rgba(10,24,58,0.4)", font: { size: 11 } },
                    grid: { color: "rgba(52,140,203,0.08)" },
                  },
                  x: {
                    ticks: { color: "rgba(10,24,58,0.4)", font: { size: 10 }, maxRotation: 40 },
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-300 gap-2">
            <BarChart3 className="w-10 h-10 opacity-40" />
            <p className="text-sm text-gray-400">Sin datos para mostrar</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Summary insight cards (3)
// =============================================================================

function SummaryCards({
  filtered,
  dataCausales,
}: {
  filtered: EnrichedDesecho[];
  dataCausales: Record<string, number>;
}) {
  const topCausal = useMemo(() => {
    const entries = Object.entries(dataCausales);
    if (!entries.length) return { name: "—", count: 0 };
    const [name, count] = entries.sort((a, b) => b[1] - a[1])[0];
    return { name, count };
  }, [dataCausales]);

  const avgMm = useMemo(
    () =>
      filtered.length
        ? (filtered.reduce((a, d) => a + d.milimetrosDesechados, 0) / filtered.length).toFixed(1)
        : "0",
    [filtered]
  );

  const withImages = useMemo(
    () => filtered.filter((d) => d.imageUrls && d.imageUrls.length > 0).length,
    [filtered]
  );

  const cards = [
    { gradient: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)", icon: "🔴", label: "Causal más frecuente", value: topCausal.name, sub: `${topCausal.count} neumáticos` },
    { gradient: "linear-gradient(135deg, #173D68 0%, #348CCB 100%)", icon: "📏", label: "Prom. mm desechados", value: `${avgMm} mm`, sub: "por neumático retirado" },
    { gradient: "linear-gradient(135deg, #1E76B6 0%, #0A183A 100%)", icon: "📷", label: "Registros con fotos", value: withImages, sub: `de ${filtered.length} total` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: card.gradient, boxShadow: "0 6px 28px rgba(10,24,58,0.22)", minHeight: 130 }}
        >
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10" style={{ background: "white" }} />
          <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full opacity-10" style={{ background: "white" }} />
          <span className="text-2xl">{card.icon}</span>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mt-3">{card.label}</p>
          <p className="text-xl font-black text-white mt-1 leading-tight truncate">{card.value}</p>
          <p className="text-xs text-white/60 mt-0.5">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Image lightbox
// =============================================================================

function ImageLightbox({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + urls.length) % urls.length);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % urls.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [urls.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,24,58,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={urls[idx]}
          alt={`Foto desecho ${idx + 1}`}
          className="w-full object-contain max-h-[70vh]"
          style={{ background: "#0A183A" }}
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <X className="w-4 h-4 text-white" />
        </button>
        {urls.length > 1 && (
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            {idx + 1} / {urls.length}
          </div>
        )}
        {urls.length > 1 && (
          <>
            <button
              onClick={() => setIdx((i) => (i - 1 + urls.length) % urls.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % urls.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}
        {urls.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === idx ? "white" : "rgba(255,255,255,0.4)" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

const DesechosPage: React.FC = () => {
  const [allDesechos, setAllDesechos] = useState<EnrichedDesecho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedYear, setSelectedYear] = useState("todos");
  const [selectedMonth, setSelectedMonth] = useState("todos");
  const [selectedCausal, setSelectedCausal] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Lightbox
  const [lightboxUrls, setLightboxUrls] = useState<string[] | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const companyId = getCompanyIdFromToken();
        if (!companyId) throw new Error("No se pudo obtener la empresa del token");
        const res = await authFetch(`${API_BASE}/tires?companyId=${companyId}`);
        if (!res.ok) throw new Error("Error al obtener neumáticos");
        const tires: TireWithDesecho[] = await res.json();
        const desechos: EnrichedDesecho[] = [];
        tires.forEach((tire) => {
          if (tire.desechos) {
            desechos.push({
              ...tire.desechos,
              tireId: tire.id,
              marca: tire.marca ?? "—",
              vehiclePlaca: tire.placa ?? "—",
            });
          }
        });
        setAllDesechos(desechos);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // ── Filter options ────────────────────────────────────────────────────────
  const yearOptions = useMemo(() => {
    const years = [...new Set(allDesechos.map((d) => new Date(d.fecha).getFullYear().toString()))].sort().reverse();
    return [{ value: "todos", label: "Todos los años" }, ...years.map((y) => ({ value: y, label: y }))];
  }, [allDesechos]);

  const monthOptions = useMemo(() => [
    { value: "todos", label: "Todos los meses" },
    { value: "01", label: "Enero" }, { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" }, { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" }, { value: "06", label: "Junio" },
    { value: "07", label: "Julio" }, { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" }, { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
  ], []);

  const causalOptions = useMemo(() => {
    const cs = [...new Set(allDesechos.map((d) => d.causales.trim()))].sort();
    return [{ value: "todos", label: "Todas las causales" }, ...cs.map((c) => ({ value: c, label: c }))];
  }, [allDesechos]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allDesechos.filter((d) => {
      const date = new Date(d.fecha);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      if (selectedYear !== "todos" && year !== selectedYear) return false;
      if (selectedMonth !== "todos" && month !== selectedMonth) return false;
      if (selectedCausal !== "todos" && d.causales.trim() !== selectedCausal) return false;
      if (q && !d.vehiclePlaca.toLowerCase().includes(q) && !d.tireId.toLowerCase().includes(q) && !d.marca.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allDesechos, selectedYear, selectedMonth, selectedCausal, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [filtered]);

  // ── Aggregations ──────────────────────────────────────────────────────────
  const groupBy = useCallback(
    (keyFn: (d: EnrichedDesecho) => string, valueFn: (d: EnrichedDesecho) => number, agg: "sum" | "average") => {
      const map: Record<string, number[]> = {};
      filtered.forEach((d) => { const k = keyFn(d); (map[k] ??= []).push(valueFn(d)); });
      const out: Record<string, number> = {};
      Object.keys(map).sort().forEach((k) => {
        const vals = map[k];
        const total = vals.reduce((a, b) => a + b, 0);
        out[k] = Number((agg === "average" ? total / vals.length : total).toFixed(2));
      });
      return out;
    },
    [filtered]
  );

  const dataCausales = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach((d) => { const k = d.causales.trim(); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [filtered]);

  const avgRemanenteByMonth = useMemo(
    () => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "average"),
    [groupBy]
  );

  const avgMilimetrosByMonth = useMemo(
    () => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.milimetrosDesechados, "average"),
    [groupBy]
  );

  const avgGeneral = useMemo(
    () => filtered.length === 0 ? "0" : (filtered.reduce((a, d) => a + d.remanente, 0) / filtered.length).toFixed(1),
    [filtered]
  );

  const totalMilimetros = useMemo(
    () => filtered.reduce((a, d) => a + d.milimetrosDesechados, 0).toFixed(1),
    [filtered]
  );

  const hasActiveFilters = selectedYear !== "todos" || selectedMonth !== "todos" || selectedCausal !== "todos" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setSelectedYear("todos"); setSelectedMonth("todos");
    setSelectedCausal("todos"); setSearchQuery("");
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(
    () => filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE),
    [filtered, currentPage]
  );

  // ── Download CSV ──────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = ["ID Neumático", "Placa Vehículo", "Marca", "Fecha", "Causal", "Remanente (mm)", "Milímetros Desechados", "Fotos"];
    const rows = filtered.map((d) => [
      d.tireId, d.vehiclePlaca, d.marca,
      new Date(d.fecha).toLocaleDateString("es-CO"),
      d.causales, d.remanente, d.milimetrosDesechados,
      (d.imageUrls ?? []).join(" | "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `desechos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download HTML Report ──────────────────────────────────────────────────
  const downloadReport = () => {
    const now = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Desechos - TirePro</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: system-ui, sans-serif; background:#f8fafc; color:#0A183A; padding:40px; }
    .header { background:linear-gradient(135deg,#0A183A,#1E76B6); color:white; padding:40px; border-radius:16px; margin-bottom:32px; }
    .header h1 { font-size:26px; font-weight:800; }
    .header p  { font-size:13px; opacity:0.75; margin-top:4px; }
    .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
    .kpi  { background:white; border:1px solid rgba(52,140,203,0.18); border-radius:12px; padding:20px; }
    .kpi .label { font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:rgba(10,24,58,0.4); margin-bottom:8px; }
    .kpi .value { font-size:28px; font-weight:900; color:#0A183A; }
    .section { background:white; border:1px solid rgba(52,140,203,0.18); border-radius:12px; padding:24px; margin-bottom:24px; }
    .section h2 { font-size:15px; font-weight:800; color:#0A183A; margin-bottom:16px; border-bottom:2px solid rgba(30,118,182,0.12); padding-bottom:8px; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th { background:#0A183A; color:white; padding:10px 14px; text-align:left; font-weight:700; }
    td { padding:9px 14px; border-bottom:1px solid rgba(52,140,203,0.08); color:#173D68; vertical-align:top; }
    tr:nth-child(even) td { background:rgba(30,118,182,0.03); }
    .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:11px; font-weight:700; background:rgba(30,118,182,0.1); color:#1E76B6; }
    .thumb { width:52px; height:52px; object-fit:cover; border-radius:6px; margin:2px; border:1px solid rgba(52,140,203,0.2); }
    .footer { text-align:center; font-size:11px; color:rgba(10,24,58,0.3); margin-top:32px; }
  </style>
</head>
<body>
  <div class="header"><h1>📊 Reporte de Desechos</h1><p>Generado el ${now} · TirePro</p></div>
  <div class="kpis">
    <div class="kpi"><div class="label">Total Desechos</div><div class="value">${filtered.length}</div></div>
    <div class="kpi"><div class="label">Prom. Remanente</div><div class="value">${avgGeneral} mm</div></div>
    <div class="kpi"><div class="label">mm Desechados</div><div class="value">${totalMilimetros}</div></div>
    <div class="kpi"><div class="label">Causales únicas</div><div class="value">${Object.keys(dataCausales).length}</div></div>
  </div>
  <div class="section">
    <h2>Causales</h2>
    <table>
      <thead><tr><th>Causal</th><th>Cantidad</th><th>%</th></tr></thead>
      <tbody>${Object.entries(dataCausales).sort((a, b) => b[1] - a[1]).map(([c, n]) =>
        `<tr><td>${c}</td><td><span class="badge">${n}</span></td><td>${filtered.length > 0 ? ((n / filtered.length) * 100).toFixed(1) : 0}%</td></tr>`
      ).join("")}</tbody>
    </table>
  </div>
  <div class="section">
    <h2>Detalle de Registros</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Placa Vehículo</th><th>ID Neumático</th><th>Marca</th><th>Causal</th><th>Remanente</th><th>mm Desechados</th><th>Fotos</th></tr></thead>
      <tbody>${filtered.slice(0, 200).map((d) =>
        `<tr>
          <td>${new Date(d.fecha).toLocaleDateString("es-CO")}</td>
          <td><strong style="font-family:monospace">${d.vehiclePlaca.toUpperCase()}</strong></td>
          <td style="font-family:monospace;font-size:11px">${d.tireId.slice(0, 8)}…</td>
          <td>${d.marca}</td>
          <td>${d.causales}</td>
          <td>${d.remanente} mm</td>
          <td>${d.milimetrosDesechados} mm</td>
          <td>${(d.imageUrls ?? []).map((url) => `<img src="${url}" class="thumb" />`).join("")}</td>
        </tr>`
      ).join("")}
      ${filtered.length > 200 ? `<tr><td colspan="8" style="text-align:center;color:rgba(10,24,58,0.3);padding:12px;">… y ${filtered.length - 200} registros más</td></tr>` : ""}
      </tbody>
    </table>
  </div>
  <div class="footer">Reporte generado por TirePro · ${now}</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reporte_desechos_${new Date().toISOString().slice(0, 10)}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================================================
  // Loading / Error states
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "white" }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1E76B6] animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-[#0A183A]">Cargando desechos…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "white" }}>
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-2xl text-sm"
          style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "white" }}>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6" style={{ minWidth: 0 }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div
          className="px-4 sm:px-6 py-5 sm:py-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
            boxShadow: "0 8px 32px rgba(10,24,58,0.22)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-none tracking-tight">
                Estadísticas de Desechos
              </h1>
              <div className="flex items-center gap-3 mt-1 text-white/60 text-xs">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date().toLocaleDateString("es-CO")}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {allDesechos.length} neumáticos retirados
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={downloadReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "rgba(255,255,255,0.95)", color: "#0A183A" }}
            >
              <FileText className="w-3.5 h-3.5" />
              Reporte
            </button>
          </div>
        </div>

        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                <Filter className="w-3.5 h-3.5 text-[#1E76B6]" />
              </div>
              <span className="text-xs font-black text-[#0A183A] uppercase tracking-wide">Filtros</span>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-0" style={{ minWidth: 140, maxWidth: 280 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Placa o ID neumático…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                style={{
                  background: searchQuery ? "rgba(30,118,182,0.08)" : "white",
                  border: searchQuery ? "1.5px solid rgba(30,118,182,0.3)" : "1.5px solid rgba(52,140,203,0.2)",
                  color: "#0A183A",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>

            <Dropdown label="Año"     value={selectedYear}    options={yearOptions}    onChange={setSelectedYear} />
            <Dropdown label="Mes"     value={selectedMonth}   options={monthOptions}   onChange={setSelectedMonth} />
            <Dropdown label="Causal"  value={selectedCausal}  options={causalOptions}  onChange={setSelectedCausal} searchable />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
                style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }}
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}

            <div className="ml-auto shrink-0">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
              >
                {filtered.length} reg.
              </span>
            </div>
          </div>
        </Card>

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={Trash2}     title="Total Desechos"  value={filtered.length}                  sub={`de ${allDesechos.length} totales`} variant="primary"   />
          <MetricCard icon={Target}     title="Prom. Remanente" value={`${avgGeneral} mm`}                                                        variant="secondary" />
          <MetricCard icon={TrendingUp} title="mm Desechados"   value={totalMilimetros}                  sub="milímetros totales"                  variant="mid"       />
          <MetricCard icon={BarChart3}  title="Causales únicas" value={Object.keys(dataCausales).length} sub={`en ${filtered.length} registros`}  variant="accent"    />
        </div>

        {/* ── Insight cards ────────────────────────────────────────────────── */}
        <SummaryCards filtered={filtered} dataCausales={dataCausales} />

        {/* ── Charts ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Desechos por Causal"                 icon={BarChart3}  data={dataCausales}         />
          <ChartCard title="Promedio Remanente por Mes"          icon={TrendingUp} data={avgRemanenteByMonth}  />
          <ChartCard title="Prom. Milímetros Desechados por Mes" icon={Target}     data={avgMilimetrosByMonth} />
        </div>

        {/* ── Records table ───────────────────────────────────────────────── */}
        <div
          className="rounded-2xl"
          style={{
            background: "white",
            border: "1px solid rgba(52,140,203,0.15)",
            boxShadow: "0 4px 24px rgba(10,24,58,0.05)",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                <Clock className="w-4 h-4 text-[#1E76B6]" />
              </div>
              <h2 className="text-sm font-black text-[#0A183A] tracking-tight">Detalle de Registros</h2>
            </div>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
            >
              {filtered.length} registros
            </span>
          </div>

          {/* Scroll wrapper — clips the table inside the card */}
          <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="text-xs border-collapse" style={{ minWidth: 640, width: "100%" }}>
              <thead>
                <tr style={{ background: "rgba(10,24,58,0.03)", borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">Placa</th>
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">ID Neumático</th>
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">Marca</th>
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">Causal</th>
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">Rem.</th>
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">mm Des.</th>
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">Fotos</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Trash2 className="w-8 h-8 mx-auto mb-3 opacity-20 text-[#1E76B6]" />
                      <p className="text-sm text-gray-400">No hay registros para los filtros seleccionados</p>
                    </td>
                  </tr>
                ) : paginatedRows.map((d, i) => (
                  <tr
                    key={`${d.tireId}-${i}`}
                    className="transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(52,140,203,0.08)",
                      background: i % 2 === 0 ? "rgba(10,24,58,0.01)" : "white",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(30,118,182,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "rgba(10,24,58,0.01)" : "white"; }}
                  >
                    {/* Fecha */}
                    <td className="px-3 py-2.5 font-medium text-[#0A183A] whitespace-nowrap text-[11px]">
                      {new Date(d.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })}
                    </td>

                    {/* Placa */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-black tracking-wider text-[#0A183A] text-[12px]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {d.vehiclePlaca.toUpperCase()}
                      </span>
                    </td>

                    {/* ID Neumático */}
                    <td className="px-3 py-2.5">
                      <span
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded-md select-all cursor-pointer whitespace-nowrap"
                        style={{ background: "rgba(10,24,58,0.05)", color: "#173D68" }}
                        title={d.tireId}
                        onClick={() => navigator.clipboard?.writeText(d.tireId)}
                      >
                        {d.tireId.slice(0, 8)}…
                      </span>
                    </td>

                    {/* Marca */}
                    <td className="px-3 py-2.5 text-[#173D68] font-medium text-[11px] whitespace-nowrap">{d.marca}</td>

                    {/* Causal */}
                    <td className="px-3 py-2.5" style={{ maxWidth: 160 }}>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6", display: "inline-block", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={d.causales}
                      >
                        {d.causales}
                      </span>
                    </td>

                    {/* Remanente */}
                    <td className="px-3 py-2.5 font-bold text-[#0A183A] whitespace-nowrap text-[11px]">{d.remanente} mm</td>

                    {/* mm desechados */}
                    <td className="px-3 py-2.5 font-bold text-[#0A183A] whitespace-nowrap text-[11px]">{d.milimetrosDesechados} mm</td>

                    {/* Fotos */}
                    <td className="px-3 py-2.5">
                      {d.imageUrls && d.imageUrls.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {d.imageUrls.slice(0, 2).map((url, imgIdx) => (
                            <button
                              key={imgIdx}
                              onClick={() => setLightboxUrls(d.imageUrls!)}
                              className="relative flex-shrink-0 rounded-md overflow-hidden group"
                              style={{ width: 30, height: 30, border: "1.5px solid rgba(52,140,203,0.25)" }}
                              title="Ver fotos"
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <ZoomIn className="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          ))}
                          {d.imageUrls.length > 2 && (
                            <button
                              onClick={() => setLightboxUrls(d.imageUrls!)}
                              className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold"
                              style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6", border: "1.5px solid rgba(52,140,203,0.2)" }}
                            >
                              +{d.imageUrls.length - 2}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(10,24,58,0.25)" }}>
                          <Camera className="w-3 h-3" />—
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(52,140,203,0.1)" }}
            >
              <span className="text-[11px] font-medium" style={{ color: "rgba(10,24,58,0.4)" }}>
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg disabled:opacity-30 transition-colors hover:bg-[#F0F7FF]"
                >
                  <ChevronLeft className="w-4 h-4 text-[#1E76B6]" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page =
                    totalPages <= 5 ? i + 1
                    : currentPage <= 3 ? i + 1
                    : currentPage >= totalPages - 2 ? totalPages - 4 + i
                    : currentPage - 2 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: page === currentPage ? "#1E76B6" : "transparent",
                        color: page === currentPage ? "white" : "rgba(10,24,58,0.5)",
                      }}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg disabled:opacity-30 transition-colors hover:bg-[#F0F7FF]"
                >
                  <ChevronRight className="w-4 h-4 text-[#1E76B6]" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxUrls && (
        <ImageLightbox urls={lightboxUrls} onClose={() => setLightboxUrls(null)} />
      )}
    </div>
  );
};

export default DesechosPage;