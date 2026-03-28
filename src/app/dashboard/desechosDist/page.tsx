"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
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
  Users,
  Trash2,
  BarChart3,
  ChevronDown,
  Search,
  X,
  FileText,
  Building2,
  Clock,
  Camera,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import FastModeDesechos from "./FastModeDesechos";
import FilterFab from "../components/FilterFab";
import type { FilterOption } from "../components/FilterFab";
import AgentCardHeader from "../../../components/AgentCardHeader";
import { AGENTS } from "../../../lib/agents";

import { ArcElement } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

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
  companyId?: string;
}

interface Company {
  id: string;
  name: string;
}

type EnrichedDesecho = DesechoData & {
  companyId: string;
  companyName: string;
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

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("es-CO")}`;
}

function MetricCard({
  icon: Icon, title, value, sub, variant = "primary", loading,
}: {
  icon: React.ElementType; title: string; value: string | number;
  sub?: string; variant?: "primary" | "secondary" | "accent" | "mid"; loading?: boolean;
}) {
  const bgs: Record<string, string> = {
    primary:   "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
    secondary: "linear-gradient(135deg, #173D68 0%, #1E76B6 100%)",
    mid:       "linear-gradient(135deg, #1E76B6 0%, #348CCB 100%)",
    accent:    "linear-gradient(135deg, #348CCB 0%, #1E76B6 100%)",
  };
  const strVal = String(value);
  const textSize = strVal.length > 10 ? "text-lg" : strVal.length > 7 ? "text-xl" : "text-2xl";
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden"
      style={{ background: bgs[variant], minHeight: 110, boxShadow: "0 4px 20px rgba(10,24,58,0.18)" }}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando…</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{title}</p>
          </div>
          <p className={`${textSize} font-black text-white tracking-tight leading-none truncate`}>{value}</p>
          {sub && <p className="text-[10px] font-medium text-white/50 mt-1.5 truncate">{sub}</p>}
        </>
      )}
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: value !== options[0]?.value ? "rgba(30,118,182,0.08)" : "white",
          border: value !== options[0]?.value ? "1.5px solid rgba(30,118,182,0.3)" : "1.5px solid rgba(52,140,203,0.2)",
          color: value !== options[0]?.value ? "#1E76B6" : "#0A183A",
          minWidth: 148,
        }}
      >
        <span className="truncate max-w-[130px] flex-1 text-left">{selected?.label ?? label}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-[#1E76B6] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(""); }} />
          <div
            className="absolute left-0 mt-1 w-60 rounded-xl overflow-hidden z-20"
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

const DOUGHNUT_COLORS = ["#0A183A", "#1E76B6", "#348CCB", "#5BA3D9", "#8BBDE0", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#eab308"];

function DoughnutCard({ title, icon: Icon, data }: { title: string; icon: React.ElementType; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const hasData = entries.length > 0;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}><Icon className="w-4 h-4 text-[#1E76B6]" /></div>
        <h3 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h3>
      </div>
      <div className="p-5">
        {hasData ? (
          <div className="flex items-center gap-6">
            <div className="w-48 h-48 flex-shrink-0">
              <Doughnut
                data={{ labels: entries.map(([k]) => k), datasets: [{ data: entries.map(([, v]) => v), backgroundColor: DOUGHNUT_COLORS.slice(0, entries.length), borderWidth: 0, hoverOffset: 6 }] }}
                options={{ responsive: true, maintainAspectRatio: true, cutout: "65%", plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0A183A", padding: 10, cornerRadius: 8, callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} (${Math.round((ctx.parsed / total) * 100)}%)` } } } }}
              />
            </div>
            <div className="flex-1 space-y-1.5 max-h-48 overflow-y-auto">
              {entries.map(([label, val], i) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DOUGHNUT_COLORS[i % DOUGHNUT_COLORS.length] }} />
                  <span className="flex-1 text-[#0A183A] truncate">{label}</span>
                  <span className="font-bold text-[#0A183A]">{val}</span>
                  <span className="text-gray-400 w-8 text-right">{Math.round((val / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-gray-300 gap-2"><BarChart3 className="w-10 h-10 opacity-40" /><p className="text-sm text-gray-400">Sin datos</p></div>
        )}
      </div>
    </Card>
  );
}

function ChartCard({ title, icon: Icon, data, formatValue }: { title: string; icon: React.ElementType; data: Record<string, number>; formatValue?: (n: number) => string }) {
  const hasData = Object.keys(data).length > 0;
  const labels = Object.keys(data).map((k) => (k.includes("-") ? formatMonth(k) : k));
  const values = Object.values(data);
  const fmt = formatValue ?? ((n: number) => String(n));
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}><Icon className="w-4 h-4 text-[#1E76B6]" /></div>
        <h3 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h3>
      </div>
      <div className="p-5">
        {hasData ? (
          <div className="h-64">
            <Bar
              data={{ labels, datasets: [{ label: title, data: values, backgroundColor: "rgba(30,118,182,0.75)", hoverBackgroundColor: "#0A183A", borderRadius: 6, barPercentage: 0.65, categoryPercentage: 0.75 }] }}
              options={{
                responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: "easeOutQuart" },
                plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0A183A", padding: 12, cornerRadius: 8, displayColors: false, callbacks: { label: (ctx) => fmt(ctx.parsed.y) } } },
                scales: {
                  y: { beginAtZero: true, grid: { color: "rgba(52,140,203,0.06)" }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => fmt(Number(v)) } },
                  x: { grid: { display: false }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 40 } },
                },
              }}
            />
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-300 gap-2"><BarChart3 className="w-10 h-10 opacity-40" /><p className="text-sm text-gray-400">Sin datos</p></div>
        )}
      </div>
    </Card>
  );
}

function LineChartCard({ title, icon: Icon, data, formatValue, color = "#1E76B6" }: {
  title: string; icon: React.ElementType; data: Record<string, number>; formatValue?: (n: number) => string; color?: string;
}) {
  const entries = Object.entries(data);
  const hasData = entries.length > 0;
  const isSingle = entries.length === 1;
  const labels = entries.map(([k]) => (k.includes("-") ? formatMonth(k) : k));
  const values = entries.map(([, v]) => v);
  const fmt = formatValue ?? ((n: number) => String(n));

  const chartHeader = (
    <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
      <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <h3 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h3>
    </div>
  );

  if (!hasData) {
    return (
      <Card className="overflow-hidden">
        {chartHeader}
        <div className="p-5 h-64 flex flex-col items-center justify-center text-gray-300 gap-2">
          <BarChart3 className="w-10 h-10 opacity-40" />
          <p className="text-sm text-gray-400">Sin datos para mostrar</p>
        </div>
      </Card>
    );
  }

  if (isSingle) {
    return (
      <Card className="overflow-hidden">
        {chartHeader}
        <div className="p-5 h-64">
          <Bar
            data={{ labels, datasets: [{ label: title, data: values, backgroundColor: color, hoverBackgroundColor: "#0A183A", borderRadius: 8, barPercentage: 0.4 }] }}
            options={{
              responsive: true, maintainAspectRatio: false,
              animation: { duration: 800, easing: "easeOutQuart" },
              plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0A183A", padding: 12, cornerRadius: 8, displayColors: false, callbacks: { label: (ctx) => fmt(ctx.parsed.y) } } },
              scales: {
                y: { grid: { color: "rgba(52,140,203,0.06)" }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => fmt(Number(v)) } },
                x: { grid: { display: false }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 } } },
              },
            }}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {chartHeader}
      <div className="p-5 h-64">
        <Line
          data={{
            labels,
            datasets: [{
              label: title, data: values, borderColor: color, borderWidth: 2.5,
              pointBackgroundColor: color, pointRadius: 0, pointHoverRadius: 5,
              fill: "origin",
              backgroundColor: (ctx) => {
                const { ctx: c } = ctx.chart;
                const h = c.canvas.clientHeight || 256;
                const g = c.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, color === "#f97316" ? "rgba(249,115,22,0.30)" : "rgba(30,118,182,0.30)");
                g.addColorStop(0.6, color === "#f97316" ? "rgba(249,115,22,0.08)" : "rgba(30,118,182,0.08)");
                g.addColorStop(1, "rgba(255,255,255,0)");
                return g;
              },
              tension: 0.4,
            }],
          }}
          options={{
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 10, right: 10 } },
            animation: { duration: 800, easing: "easeOutQuart" },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0A183A", padding: 12, cornerRadius: 8, titleFont: { size: 12, weight: "bold" }, bodyFont: { size: 12 }, displayColors: false, callbacks: { label: (ctx) => fmt(ctx.parsed.y) } } },
            scales: {
              y: { grid: { color: "rgba(52,140,203,0.06)" }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => fmt(Number(v)) } },
              x: { grid: { display: false }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 0 } },
            },
          }}
        />
      </div>
    </Card>
  );
}

// =============================================================================
// Image Lightbox
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

const DesechosDistribuidor: React.FC = () => {
  const [mode, setMode] = useState<"stats" | "fast">("stats");
  const [companies,        setCompanies]        = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [allDesechos,      setAllDesechos]      = useState<EnrichedDesecho[]>([]);
  const [loadingDesechos,  setLoadingDesechos]  = useState(false);
  const [error,            setError]            = useState("");

  // Filters
  const [fv, setFv] = useState<Record<string, string>>({});
  const setFilter = (key: string, value: string) => setFv((p) => ({ ...p, [key]: value }));
  const selectedCompany = fv.company ?? "Todos";

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Lightbox
  const [lightboxUrls, setLightboxUrls] = useState<string[] | null>(null);

  // -- Fetch companies --------------------------------------------------------
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingCompanies(true);
        const res = await authFetch(`${API_BASE}/companies/me/clients`);
        if (!res.ok) throw new Error("Error al obtener clientes");
        const data = await res.json();
        setCompanies(data.map((a: any) => ({ id: a.company.id, name: a.company.name })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando clientes");
      } finally {
        setLoadingCompanies(false);
      }
    };
    run();
  }, []);

  const companyNameToId = useMemo(() => {
    const m: Record<string, string> = {};
    companies.forEach((c) => { m[c.name] = c.id; });
    return m;
  }, [companies]);

  // -- Fetch desechos ---------------------------------------------------------
  const fetchDesechos = useCallback(async () => {
    if (!companies.length) return;
    setLoadingDesechos(true);
    try {
      const selectedId = companyNameToId[selectedCompany] ?? null;
      const targets = (!selectedCompany || selectedCompany === "Todos" || !selectedId)
        ? companies
        : companies.filter((c) => c.id === selectedId);

      const results: EnrichedDesecho[] = [];
      await Promise.all(
        targets.map(async (company) => {
          try {
            const res = await authFetch(`${API_BASE}/tires?companyId=${company.id}`);
            if (!res.ok) return;
            const tires: TireWithDesecho[] = await res.json();
            tires.forEach((tire) => {
              if (tire.desechos) {
                results.push({
                  ...tire.desechos,
                  companyId: company.id,
                  companyName: company.name,
                  tireId: tire.id,
                  marca: tire.marca ?? "—",
                  vehiclePlaca: tire.placa ?? "—",
                });
              }
            });
          } catch {/* skip */}
        })
      );
      setAllDesechos(results);
    } catch {
      setError("Error al cargar datos de desechos");
    } finally {
      setLoadingDesechos(false);
    }
  }, [companies, selectedCompany, companyNameToId]);

  useEffect(() => { fetchDesechos(); }, [fetchDesechos]);

  // -- Filter option lists ----------------------------------------------------
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

  const filterOptions: FilterOption[] = useMemo(() => {
    const years = [...new Set(allDesechos.map((d) => new Date(d.fecha).getFullYear().toString()))].sort().reverse();
    const causales = [...new Set(allDesechos.map((d) => d.causales.trim()))].sort();
    return [
      { key: "company", label: "Cliente", options: ["Todos", ...companies.map((c) => c.name)] },
      { key: "year", label: "Año", options: ["Todos", ...years] },
      { key: "month", label: "Mes", options: ["Todos", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] },
      { key: "causal", label: "Causal", options: ["Todos", ...causales] },
    ];
  }, [allDesechos, companies]);

  // -- Filtered data ----------------------------------------------------------
  const filtered = useMemo(() => {
    const fy = fv.year, fm = fv.month, fc = fv.causal, fco = fv.company;
    const compId = fco && fco !== "Todos" ? companyNameToId[fco] : null;
    return allDesechos.filter((d) => {
      const date = new Date(d.fecha);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      if (compId && d.companyId !== compId) return false;
      if (fy && fy !== "Todos" && year !== fy) return false;
      if (fm && fm !== "Todos" && month !== fm) return false;
      if (fc && fc !== "Todos" && d.causales.trim() !== fc) return false;
      return true;
    });
  }, [allDesechos, fv, companyNameToId]);

  useEffect(() => { setCurrentPage(1); }, [filtered]);

  // -- Aggregations -----------------------------------------------------------
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

  const dataCausales         = useMemo(() => { const c: Record<string, number> = {}; filtered.forEach((d) => { const k = d.causales.trim(); c[k] = (c[k] || 0) + 1; }); return c; }, [filtered]);
  const dataByCompany        = useMemo(() => { const c: Record<string, number> = {}; filtered.forEach((d) => { c[d.companyName] = (c[d.companyName] || 0) + 1; }); return c; }, [filtered]);
  const avgRemanenteByMonth  = useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "average"), [groupBy]);
  const totalRemanenteByMonth= useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "sum"), [groupBy]);
  const avgMilimetrosByMonth = useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.milimetrosDesechados, "average"), [groupBy]);

  const avgGeneral      = useMemo(() => filtered.length === 0 ? 0 : (filtered.reduce((a, d) => a + d.remanente, 0) / filtered.length).toFixed(1), [filtered]);
  const totalMilimetros = useMemo(() => filtered.reduce((a, d) => a + d.milimetrosDesechados, 0).toFixed(1), [filtered]);

  // -- LINEX deep analysis -----------------------------------------------------
  const linexAnalysis = useMemo(() => {
    if (filtered.length === 0) return { insight: "", cards: [] as { icon: string; title: string; value: string; detail: string; color: string }[] };

    const lines: string[] = [];
    const cards: { icon: string; title: string; value: string; detail: string; color: string }[] = [];

    // 1. Top causals
    const sortedCausales = Object.entries(dataCausales).sort((a, b) => b[1] - a[1]);
    const topCausal = sortedCausales[0];
    if (topCausal) {
      const pct = Math.round((topCausal[1] / filtered.length) * 100);
      lines.push(`Causal #1: "${topCausal[0]}" representa el ${pct}% de todos los desechos (${topCausal[1]} de ${filtered.length}).${pct > 40 ? " Concentracion alta — un programa preventivo enfocado en esta causal reduciria desechos." : ""}`);
    }

    // 2. Remanente analysis
    const avg = parseFloat(String(avgGeneral));
    if (avg > 4) {
      lines.push(`Remanente promedio: ${avgGeneral} mm — CRITICO. Se desperdician ~${(avg - 3).toFixed(1)}mm por llanta sobre el retiro optimo. Revisa si los operadores retiran prematuramente.`);
      cards.push({ icon: "🔴", title: "Desperdicio Alto", value: `${avg.toFixed(1)} mm`, detail: `${(avg - 3).toFixed(1)}mm sobre el optimo por llanta`, color: "#ef4444" });
    } else if (avg > 3) {
      lines.push(`Remanente promedio: ${avgGeneral} mm. Hay margen de mejora — cada mm extra es dinero perdido.`);
      cards.push({ icon: "🟡", title: "Desperdicio Moderado", value: `${avg.toFixed(1)} mm`, detail: "Cerca del optimo pero aun hay oportunidad", color: "#eab308" });
    } else if (avg > 0) {
      lines.push(`Remanente promedio: ${avgGeneral} mm. Excelente — retiro cerca del optimo de 3mm.`);
      cards.push({ icon: "🟢", title: "Retiro Eficiente", value: `${avg.toFixed(1)} mm`, detail: "Llantas retiradas cerca del optimo", color: "#22c55e" });
    }

    // 3. Brand analysis
    const byBrand: Record<string, { count: number; totalRem: number }> = {};
    filtered.forEach((d) => {
      if (!byBrand[d.marca]) byBrand[d.marca] = { count: 0, totalRem: 0 };
      byBrand[d.marca].count++;
      byBrand[d.marca].totalRem += d.remanente;
    });
    const brandEntries = Object.entries(byBrand).filter(([, v]) => v.count >= 2).sort((a, b) => (b[1].totalRem / b[1].count) - (a[1].totalRem / a[1].count));
    if (brandEntries.length >= 2) {
      const worst = brandEntries[0];
      const best = brandEntries[brandEntries.length - 1];
      lines.push(`Marca con mas desperdicio: ${worst[0]} (${(worst[1].totalRem / worst[1].count).toFixed(1)} mm prom). Mas eficiente: ${best[0]} (${(best[1].totalRem / best[1].count).toFixed(1)} mm).`);
      cards.push({ icon: "📊", title: "Marca + Desperdicio", value: worst[0], detail: `${(worst[1].totalRem / worst[1].count).toFixed(1)} mm remanente prom.`, color: "#8b5cf6" });
    }

    // 4. Client analysis
    const byCompany: Record<string, { count: number; totalRem: number; name: string }> = {};
    filtered.forEach((d) => {
      if (!byCompany[d.companyId]) byCompany[d.companyId] = { count: 0, totalRem: 0, name: d.companyName };
      byCompany[d.companyId].count++;
      byCompany[d.companyId].totalRem += d.remanente;
    });
    const companyEntries = Object.entries(byCompany).sort((a, b) => b[1].count - a[1].count);
    if (companyEntries.length >= 2) {
      const top = companyEntries[0];
      lines.push(`Cliente con mas desechos: ${top[1].name} (${top[1].count} llantas, prom. ${(top[1].totalRem / top[1].count).toFixed(1)} mm remanente).`);
      cards.push({ icon: "🏢", title: "Cliente Top", value: top[1].name, detail: `${top[1].count} desechos`, color: "#06b6d4" });
    }

    // 5. Trend
    const monthKeys = Object.keys(avgRemanenteByMonth).sort();
    if (monthKeys.length >= 3) {
      const recent3 = monthKeys.slice(-3);
      const older3 = monthKeys.slice(-6, -3);
      if (older3.length >= 2) {
        const recentAvg = recent3.reduce((s, k) => s + (avgRemanenteByMonth[k] ?? 0), 0) / recent3.length;
        const olderAvg = older3.reduce((s, k) => s + (avgRemanenteByMonth[k] ?? 0), 0) / older3.length;
        const diff = recentAvg - olderAvg;
        if (Math.abs(diff) > 0.3) {
          lines.push(diff > 0
            ? `Tendencia negativa: remanente subio ${diff.toFixed(1)}mm en ultimos 3 meses. Se desperdicia mas vida util.`
            : `Tendencia positiva: remanente bajo ${Math.abs(diff).toFixed(1)}mm en ultimos 3 meses. Mejora en eficiencia.`
          );
        }
      }
    }

    // 6. Preventability
    const PREVENTABLE = new Set(["baja presion", "sobrecarga", "desalineacion", "mala rotacion", "golpe", "pinchadura", "pinchazo", "corte lateral", "desgaste irregular"]);
    const preventable = filtered.filter((d) => [...PREVENTABLE].some((p) => d.causales.trim().toLowerCase().includes(p))).length;
    if (preventable > 0) {
      const prevPct = Math.round((preventable / filtered.length) * 100);
      lines.push(`${prevPct}% de los desechos (${preventable}) son potencialmente prevenibles. Mantenimiento preventivo podria evitar estos retiros.`);
      cards.push({ icon: "🛡️", title: "Prevenibles", value: `${prevPct}%`, detail: `${preventable} desechos evitables`, color: prevPct > 30 ? "#ef4444" : "#eab308" });
    }

    // 7. Photo coverage
    const withImages = filtered.filter((d) => d.imageUrls && d.imageUrls.length > 0).length;
    const photoPct = Math.round((withImages / filtered.length) * 100);
    cards.push({ icon: "📷", title: "Cobertura Fotos", value: `${photoPct}%`, detail: `${withImages} de ${filtered.length} con evidencia`, color: photoPct >= 80 ? "#22c55e" : photoPct >= 50 ? "#eab308" : "#ef4444" });
    if (photoPct < 50) lines.push(`Solo ${photoPct}% tiene fotos. Meta: >80% para reclamos y trazabilidad.`);

    return { insight: lines.join("\n\n"), cards };
  }, [filtered, dataCausales, avgGeneral, avgRemanenteByMonth]);

  const hasActiveFilters = Object.values(fv).some((v) => v && v !== "Todos");
  const clearFilters = () => setFv({});

  // -- Pagination -------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(
    () => filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE),
    [filtered, currentPage]
  );

  // -- Download CSV -----------------------------------------------------------
  const downloadCSV = () => {
    const headers = ["Cliente", "ID Llanta", "ID Neumático", "Marca", "Fecha", "Causal", "Remanente (mm)", "Milímetros Desechados", "Fotos"];
    const rows = filtered.map((d) => [
      d.companyName, d.vehiclePlaca, d.tireId, d.marca,
      new Date(d.fecha).toLocaleDateString("es-CO"),
      d.causales, d.remanente, d.milimetrosDesechados,
      (d.imageUrls ?? []).join(" | "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `desechos_distribuidor_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // -- Download HTML Report ---------------------------------------------------
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
  <div class="header"><h1>📊 Reporte de Desechos</h1><p>Generado el ${now} · TirePro Distribuidores</p></div>
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
  ${(!selectedCompany || selectedCompany === "Todos") ? `
  <div class="section">
    <h2>Por Cliente</h2>
    <table>
      <thead><tr><th>Cliente</th><th>Desechos</th><th>%</th></tr></thead>
      <tbody>${Object.entries(dataByCompany).sort((a, b) => b[1] - a[1]).map(([name, n]) =>
        `<tr><td>${name}</td><td>${n}</td><td>${filtered.length > 0 ? ((n / filtered.length) * 100).toFixed(1) : 0}%</td></tr>`
      ).join("")}</tbody>
    </table>
  </div>` : ""}
  <div class="section">
    <h2>Detalle de Registros</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Cliente</th><th>ID Llanta</th><th>Causal</th><th>Remanente</th><th>mm Desechados</th><th>Fotos</th></tr></thead>
      <tbody>${filtered.slice(0, 200).map((d) =>
        `<tr>
          <td>${new Date(d.fecha).toLocaleDateString("es-CO")}</td>
          <td>${d.companyName}</td>
          <td><strong style="font-family:monospace">${d.vehiclePlaca.toUpperCase()}</strong></td>
          <td>${d.causales}</td>
          <td>${d.remanente} mm</td>
          <td>${d.milimetrosDesechados} mm</td>
          <td>${(d.imageUrls ?? []).map((url) => `<img src="${url}" class="thumb" />`).join("")}</td>
        </tr>`
      ).join("")}
      ${filtered.length > 200 ? `<tr><td colspan="7" style="text-align:center;color:rgba(10,24,58,0.3);padding:12px;">… y ${filtered.length - 200} registros más</td></tr>` : ""}
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

  if (loadingCompanies) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "white" }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1E76B6] animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-[#0A183A]">Cargando clientes…</p>
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
    <div className="min-h-screen" style={{ background: "white" }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">

        {/* -- Page header ------------------------------------------------- */}
        <div
          className="px-4 sm:px-6 py-5 sm:py-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)", boxShadow: "0 8px 32px rgba(10,24,58,0.22)" }}
        >
          <div className="flex items-center gap-3">
            <AgentCardHeader agent="linex" insight={linexAnalysis.insight} />
            <div>
              <h1 className="font-black text-white text-lg leading-none tracking-tight">Estadísticas de Desechos</h1>
              <div className="flex items-center gap-3 mt-1 text-white/60 text-xs">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date().toLocaleDateString("es-CO")}</span>
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{companies.length} cliente{companies.length !== 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: AGENTS.linex.color }} />
                  <span className="font-bold" style={{ color: AGENTS.linex.color }}>{AGENTS.linex.codename}</span>
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

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          {(["stats", "fast"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: mode === m ? "linear-gradient(135deg, #0A183A, #173D68)" : "white", color: mode === m ? "#fff" : "#173D68", border: mode === m ? "1px solid #0A183A" : "1px solid rgba(52,140,203,0.2)" }}>
              {m === "fast" && <Zap className="w-3.5 h-3.5" />}
              {m === "stats" ? "Estadísticas" : "Modo Rápido"}
            </button>
          ))}
        </div>

        {mode === "fast" ? (
          <FastModeDesechos onDone={() => { setMode("stats"); fetchDesechos(); }} />
        ) : (
        <>

        <FilterFab
          filters={filterOptions}
          values={fv}
          onChange={setFilter}
        />

        {/* -- KPI Cards --------------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={Trash2}     title="Total Desechos"  value={filtered.length.toLocaleString("es-CO")} sub={`de ${allDesechos.length} totales`} variant="primary"   loading={loadingDesechos} />
          <MetricCard icon={Target}     title="Prom. Remanente" value={fmtCompact(parseFloat(avgGeneral) || 0)} sub="valor promedio perdido"         variant="secondary" loading={loadingDesechos} />
          <MetricCard icon={TrendingUp} title="mm Desechados"   value={`${parseFloat(totalMilimetros).toLocaleString("es-CO")} mm`} sub="profundidad total descartada" variant="mid" loading={loadingDesechos} />
          <MetricCard icon={Users}      title="Causales"         value={Object.keys(dataCausales).length} sub={`tipos · ${companies.length} clientes`} variant="accent" loading={loadingDesechos} />
        </div>

        {/* -- LINEX deep analysis cards -------------------------------------- */}
        {linexAnalysis.cards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {linexAnalysis.cards.map((card, i) => (
              <div
                key={i}
                className="rounded-xl p-4 relative overflow-hidden"
                style={{ background: "white", border: `1px solid ${card.color}20`, boxShadow: `0 2px 12px ${card.color}08` }}
              >
                <span className="text-lg">{card.icon}</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">{card.title}</p>
                <p className="text-lg font-black mt-0.5 truncate" style={{ color: card.color }}>{card.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{card.detail}</p>
              </div>
            ))}
          </div>
        )}

        {/* -- Charts ------------------------------------------------------ */}
        {loadingDesechos ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                  <div className="h-4 rounded-lg animate-pulse" style={{ background: "rgba(30,118,182,0.08)", width: "60%" }} />
                </div>
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[#1E76B6] animate-spin" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DoughnutCard title="Desechos por Causal"              icon={BarChart3}  data={dataCausales} />
            {(!selectedCompany || selectedCompany === "Todos") && (
              <ChartCard title="Desechos por Cliente"              icon={Building2}  data={dataByCompany} />
            )}
            <ChartCard title="Promedio Remanente por Mes"          icon={TrendingUp} data={avgRemanenteByMonth} formatValue={fmtCompact} />
            <LineChartCard title="Total Remanente por Mes"         icon={Calendar}   data={totalRemanenteByMonth} formatValue={fmtCompact} />
            <ChartCard title="Prom. Milímetros Desechados por Mes" icon={Target}     data={avgMilimetrosByMonth} formatValue={(n) => `${n.toFixed(1)} mm`} />
          </div>
        )}

        {/* -- Records table ----------------------------------------------- */}
        <Card className="overflow-hidden">
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}
          >
            <CardTitle icon={Clock} title="Detalle de Registros" />
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full ml-auto"
              style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
            >
              {filtered.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: "rgba(10,24,58,0.03)", borderBottom: "1px solid rgba(52,140,203,0.12)" }}>
                  {["Fecha", "Cliente", "ID Llanta", "Causal", "Remanente", "mm Desechados", "Fotos"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <Trash2 className="w-8 h-8 mx-auto mb-3 opacity-20 text-[#1E76B6]" />
                      <p className="text-sm text-gray-400">No hay registros para los filtros seleccionados</p>
                    </td>
                  </tr>
                ) : paginatedRows.map((d, i) => (
                  <tr
                    key={`${d.tireId}-${i}`}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(52,140,203,0.08)", background: i % 2 === 0 ? "rgba(10,24,58,0.01)" : "white" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(30,118,182,0.04)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "rgba(10,24,58,0.01)" : "white"; }}
                  >
                    <td className="px-4 py-3 font-medium text-[#0A183A] whitespace-nowrap">
                      {new Date(d.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#1E76B6" }} />
                        <span className="font-bold text-[#0A183A]">{d.companyName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-black tracking-widest text-[#0A183A]" style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>
                        {d.vehiclePlaca.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
                        style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}
                      >
                        {d.causales}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0A183A]">{d.remanente} mm</td>
                    <td className="px-4 py-3 font-bold text-[#0A183A]">{d.milimetrosDesechados} mm</td>
                    <td className="px-4 py-3">
                      {d.imageUrls && d.imageUrls.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {d.imageUrls.slice(0, 3).map((url, imgIdx) => (
                            <button
                              key={imgIdx}
                              onClick={() => setLightboxUrls(d.imageUrls!)}
                              className="relative flex-shrink-0 rounded-lg overflow-hidden group"
                              style={{ width: 36, height: 36, border: "1.5px solid rgba(52,140,203,0.25)" }}
                              title="Ver fotos"
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <ZoomIn className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          ))}
                          {d.imageUrls.length > 3 && (
                            <button
                              onClick={() => setLightboxUrls(d.imageUrls!)}
                              className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold"
                              style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6", border: "1.5px solid rgba(52,140,203,0.2)" }}
                            >
                              +{d.imageUrls.length - 3}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(10,24,58,0.25)" }}>
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
        </Card>

      {/* -- Lightbox ------------------------------------------------------- */}
      {lightboxUrls && (
        <ImageLightbox urls={lightboxUrls} onClose={() => setLightboxUrls(null)} />
      )}

        </>
        )}

      </div>
    </div>
  );
};

export default DesechosDistribuidor;