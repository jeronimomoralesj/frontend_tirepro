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
  ArcElement,
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
  Zap,
} from "lucide-react";
import FastModeDesechos from "./FastModeDesechos";
import FilterFab from "../components/FilterFab";
import type { FilterOption } from "../components/FilterFab";
import AgentCardHeader from "../../../components/AgentCardHeader";
import { AGENTS } from "../../../lib/agents";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

// =============================================================================
// Types
// =============================================================================

interface DesechoData {
  fecha: string;
  causales: string;
  remanente: number; // mm of tread that was still left when the tire was discarded
  milimetrosDesechados: number;
  /** COP value of the wasted tread (server-calculated, present on rows
   *  written after the dinero-perdido fix). Older rows fall back to a
   *  client-side estimate below. */
  dineroPerdido?: number;
  imageUrls?: string[];
}

interface TireWithDesecho {
  id: string;
  desechos?: DesechoData | null;
  marca?: string;
  placa?: string;
  eje?: string;
  dimension?: string;
  profundidadInicial?: number;
  costos?: Array<{ valor: number }> | null;
}

type EnrichedDesecho = DesechoData & {
  tireId: string;
  marca: string;
  eje: string;
  dimension: string;
  vehiclePlaca: string;
  /** Money lost because of the remaining mm: (remanente / profundidadInicial) * tireCost */
  remanenteCop: number;
  tireCost: number;
  profundidadInicial: number;
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

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("es-CO")}`;
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
  const strVal = String(value);
  const textSize = strVal.length > 10 ? "text-lg" : strVal.length > 7 ? "text-xl" : "text-2xl";
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden"
      style={{ background: bgs[variant], minHeight: 110, boxShadow: "0 4px 20px rgba(10,24,58,0.18)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{title}</p>
      </div>
      <p className={`${textSize} font-black text-white tracking-tight leading-none truncate`}>{value}</p>
      {sub && <p className="text-[10px] font-medium text-white/50 mt-1.5 truncate">{sub}</p>}
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
          <div className="h-48 flex flex-col items-center justify-center text-gray-300 gap-2">
            <BarChart3 className="w-10 h-10 opacity-40" />
            <p className="text-sm text-gray-400">Sin datos</p>
          </div>
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
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 800, easing: "easeOutQuart" },
                plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0A183A", padding: 12, cornerRadius: 8, displayColors: false, callbacks: { label: (ctx) => fmt(ctx.parsed.y) } } },
                scales: {
                  y: { beginAtZero: true, grid: { color: "rgba(52,140,203,0.06)" }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => fmt(Number(v)) } },
                  x: { grid: { display: false }, border: { display: false }, ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 40 } },
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

  // Single data point: show as a styled bar instead of a lonely dot
  if (isSingle) {
    return (
      <Card className="overflow-hidden">
        {chartHeader}
        <div className="p-5 h-64">
          <Bar
            data={{
              labels,
              datasets: [{
                label: title,
                data: values,
                backgroundColor: color,
                hoverBackgroundColor: "#0A183A",
                borderRadius: 8,
                barPercentage: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 800, easing: "easeOutQuart" },
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: "#0A183A", padding: 12, cornerRadius: 8, displayColors: false, callbacks: { label: (ctx) => fmt(ctx.parsed.y) } },
              },
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

  // Multiple points: area line chart with gradient fill
  return (
    <Card className="overflow-hidden">
      {chartHeader}
      <div className="p-5 h-64">
        <Line
          data={{
            labels,
            datasets: [{
              label: title,
              data: values,
              borderColor: color,
              borderWidth: 2.5,
              pointBackgroundColor: color,
              pointRadius: 0,
              pointHoverRadius: 5,
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
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 10, right: 10 } },
            animation: { duration: 800, easing: "easeOutQuart" },
            plugins: {
              legend: { display: false },
              tooltip: { backgroundColor: "#0A183A", padding: 12, cornerRadius: 8, titleFont: { size: 12, weight: "bold" }, bodyFont: { size: 12 }, displayColors: false, callbacks: { label: (ctx) => fmt(ctx.parsed.y) } },
            },
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
  const [mode, setMode] = useState<"stats" | "fast">("stats");
  const [allDesechos, setAllDesechos] = useState<EnrichedDesecho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters (unified for FilterFab)
  const [fv, setFv] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const setFilter = (key: string, value: string) => setFv((p) => ({ ...p, [key]: value }));

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Lightbox
  const [lightboxUrls, setLightboxUrls] = useState<string[] | null>(null);

  // -- Fetch -----------------------------------------------------------------
  const fetchDesechos = useCallback(async () => {
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
          // Prefer the server-persisted dineroPerdido
          //   = mm_remaining × (costo_vida / profundidad_inicial_vida).
          // Fall back to a client-side estimate for legacy rows written
          // before the fix landed.
          const profundidadInicial = Number(tire.profundidadInicial) || 0;
          const lastCosto = Array.isArray(tire.costos) && tire.costos.length > 0
            ? Number(tire.costos[tire.costos.length - 1]?.valor) || 0
            : 0;
          const serverDineroPerdido = Number(tire.desechos.dineroPerdido);
          const remanenteCop = Number.isFinite(serverDineroPerdido) && serverDineroPerdido > 0
            ? serverDineroPerdido
            : profundidadInicial > 0 && lastCosto > 0
            ? (Number(tire.desechos.remanente) / profundidadInicial) * lastCosto
            : 0;
          desechos.push({
            ...tire.desechos,
            tireId: tire.id,
            marca: tire.marca ?? "—",
            vehiclePlaca: tire.placa ?? "—",
            eje: tire.eje ?? "—",
            dimension: tire.dimension ?? "—",
            remanenteCop,
            tireCost: lastCosto,
            profundidadInicial,
          });
        }
      });
      setAllDesechos(desechos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDesechos();
  }, []);

  // -- Filter options (for FilterFab) ---------------------------------------
  const filterOptions: FilterOption[] = useMemo(() => {
    const years = [...new Set(allDesechos.map((d) => new Date(d.fecha).getFullYear().toString()))].sort().reverse();
    const marcas = [...new Set(allDesechos.map((d) => d.marca))].sort();
    const ejes = [...new Set(allDesechos.map((d) => d.eje))].sort();
    const dims = [...new Set(allDesechos.map((d) => d.dimension))].sort();
    const causales = [...new Set(allDesechos.map((d) => d.causales.trim()))].sort();
    return [
      { key: "year", label: "Año", options: ["Todos", ...years] },
      { key: "month", label: "Mes", options: ["Todos", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] },
      { key: "marca", label: "Marca", options: ["Todos", ...marcas] },
      { key: "eje", label: "Eje", options: ["Todos", ...ejes] },
      { key: "dimension", label: "Dimensión", options: ["Todos", ...dims] },
      { key: "causal", label: "Causal", options: ["Todos", ...causales] },
    ];
  }, [allDesechos]);

  // -- Filtered data ---------------------------------------------------------
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fy = fv.year, fm = fv.month, fc = fv.causal, fma = fv.marca, fe = fv.eje, fd = fv.dimension;
    return allDesechos.filter((d) => {
      const date = new Date(d.fecha);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      if (fy && fy !== "Todos" && year !== fy) return false;
      if (fm && fm !== "Todos" && month !== fm) return false;
      if (fc && fc !== "Todos" && d.causales.trim() !== fc) return false;
      if (fma && fma !== "Todos" && d.marca !== fma) return false;
      if (fe && fe !== "Todos" && d.eje !== fe) return false;
      if (fd && fd !== "Todos" && d.dimension !== fd) return false;
      if (q && !d.vehiclePlaca.toLowerCase().includes(q) && !d.tireId.toLowerCase().includes(q) && !d.marca.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allDesechos, fv, searchQuery]);

  useEffect(() => { setCurrentPage(1); }, [filtered]);

  // -- Aggregations ----------------------------------------------------------
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
    () => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanenteCop, "average"),
    [groupBy]
  );

  const totalRemanenteByMonth = useMemo(
    () => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanenteCop, "sum"),
    [groupBy]
  );

  const avgMilimetrosByMonth = useMemo(
    () => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.milimetrosDesechados, "average"),
    [groupBy]
  );

  const avgGeneral = useMemo(
    () => filtered.length === 0 ? "0" : (filtered.reduce((a, d) => a + d.remanenteCop, 0) / filtered.length).toFixed(0),
    [filtered]
  );

  const totalMilimetros = useMemo(
    () => filtered.reduce((a, d) => a + d.milimetrosDesechados, 0).toFixed(1),
    [filtered]
  );

  // -- LINEX deep analysis -----------------------------------------------------
  const linexAnalysis = useMemo(() => {
    if (filtered.length === 0) return { insight: "", cards: [] as { icon: string; title: string; value: string; detail: string; color: string }[] };

    const lines: string[] = [];
    const cards: { icon: string; title: string; value: string; detail: string; color: string }[] = [];

    // 1. Top causals breakdown
    const sortedCausales = Object.entries(dataCausales).sort((a, b) => b[1] - a[1]);
    const topCausal = sortedCausales[0];
    const top3 = sortedCausales.slice(0, 3);
    if (topCausal) {
      const pct = Math.round((topCausal[1] / filtered.length) * 100);
      lines.push(`Causal #1: "${topCausal[0]}" representa el ${pct}% de todos los desechos (${topCausal[1]} de ${filtered.length}).${pct > 40 ? " Esta concentracion es alta — un programa preventivo enfocado en esta causal podria reducir desechos significativamente." : ""}`);
    }

    // 2. Remanente analysis — money left on the table
    const avg = parseFloat(avgGeneral);
    const totalMm = parseFloat(totalMilimetros);
    if (avg > 0) {
      if (avg > 4) {
        lines.push(`Remanente promedio: ${avgGeneral} mm. Esto es CRITICO — se estan desechando llantas con ${avg.toFixed(1)}mm de profundidad restante. A 3mm de retiro optimo, se desperdician ~${(avg - 3).toFixed(1)}mm por llanta. Revisa si los operadores estan retirando prematuramente.`);
        cards.push({ icon: "🔴", title: "Desperdicio Alto", value: `${avg.toFixed(1)} mm`, detail: `${(avg - 3).toFixed(1)}mm sobre el retiro optimo por llanta`, color: "#ef4444" });
      } else if (avg > 3) {
        lines.push(`Remanente promedio: ${avgGeneral} mm. Hay margen de mejora — cada mm de mas que se desecha es dinero perdido. Objetivo: acercarse a 3mm.`);
        cards.push({ icon: "🟡", title: "Desperdicio Moderado", value: `${avg.toFixed(1)} mm`, detail: "Cerca del optimo pero aun hay oportunidad", color: "#eab308" });
      } else {
        lines.push(`Remanente promedio: ${avgGeneral} mm. Excelente control — las llantas se retiran cerca del punto optimo de 3mm.`);
        cards.push({ icon: "🟢", title: "Retiro Eficiente", value: `${avg.toFixed(1)} mm`, detail: "Llantas retiradas cerca del optimo", color: "#22c55e" });
      }
    }

    // 3. Brand analysis — which brands waste more
    const byBrand: Record<string, { count: number; totalRem: number; totalMm: number }> = {};
    filtered.forEach((d) => {
      if (!byBrand[d.marca]) byBrand[d.marca] = { count: 0, totalRem: 0, totalMm: 0 };
      byBrand[d.marca].count++;
      byBrand[d.marca].totalRem += d.remanenteCop;
      byBrand[d.marca].totalMm += d.milimetrosDesechados;
    });
    const brandEntries = Object.entries(byBrand).filter(([, v]) => v.count >= 2).sort((a, b) => (b[1].totalRem / b[1].count) - (a[1].totalRem / a[1].count));
    if (brandEntries.length > 0) {
      const worst = brandEntries[0];
      const worstAvg = (worst[1].totalRem / worst[1].count).toFixed(1);
      const best = brandEntries[brandEntries.length - 1];
      const bestAvg = (best[1].totalRem / best[1].count).toFixed(1);
      if (brandEntries.length >= 2 && worst[0] !== best[0]) {
        lines.push(`Marca con mas desperdicio: ${worst[0]} (${worstAvg} mm prom. remanente en ${worst[1].count} desechos). Marca mas eficiente: ${best[0]} (${bestAvg} mm). Evalua si el problema es la marca o el uso.`);
      }
      cards.push({ icon: "📊", title: "Marca + Desperdicio", value: worst[0], detail: `${worstAvg} mm remanente prom. en ${worst[1].count} desechos`, color: "#8b5cf6" });
    }

    // 4. Axle analysis — which axle generates most waste
    const byEje: Record<string, { count: number; totalRem: number }> = {};
    filtered.forEach((d) => {
      if (!byEje[d.eje]) byEje[d.eje] = { count: 0, totalRem: 0 };
      byEje[d.eje].count++;
      byEje[d.eje].totalRem += d.remanenteCop;
    });
    const ejeEntries = Object.entries(byEje).sort((a, b) => b[1].count - a[1].count);
    if (ejeEntries.length > 0) {
      const topEje = ejeEntries[0];
      const ejePct = Math.round((topEje[1].count / filtered.length) * 100);
      lines.push(`Eje con mas desechos: ${topEje[0]} (${ejePct}% del total, ${topEje[1].count} llantas). ${ejePct > 50 ? "Concentracion alta en este eje — revisa alineacion, presion o condiciones de operacion." : ""}`);
      cards.push({ icon: "🛞", title: "Eje Critico", value: topEje[0], detail: `${topEje[1].count} desechos (${ejePct}% del total)`, color: "#f97316" });
    }

    // 5. Trend analysis — is waste increasing or decreasing?
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
            ? `Tendencia negativa: el remanente promedio subio ${diff.toFixed(1)}mm en los ultimos 3 meses vs los 3 anteriores. Se esta desperdiciando mas vida util. Investiga cambios en operacion o personal.`
            : `Tendencia positiva: el remanente promedio bajo ${Math.abs(diff).toFixed(1)}mm en los ultimos 3 meses. Las llantas se estan retirando de forma mas eficiente.`
          );
        }
      }
    }

    // 6. Causal + eje cross-analysis
    const causalEje: Record<string, Record<string, number>> = {};
    filtered.forEach((d) => {
      const c = d.causales.trim();
      if (!causalEje[c]) causalEje[c] = {};
      causalEje[c][d.eje] = (causalEje[c][d.eje] ?? 0) + 1;
    });
    if (topCausal) {
      const ejesForTop = Object.entries(causalEje[topCausal[0]] ?? {}).sort((a, b) => b[1] - a[1]);
      if (ejesForTop.length > 0 && ejesForTop[0][1] > 1) {
        const dominantEje = ejesForTop[0];
        const crossPct = Math.round((dominantEje[1] / topCausal[1]) * 100);
        if (crossPct > 50) {
          lines.push(`Patron detectado: "${topCausal[0]}" ocurre ${crossPct}% en eje ${dominantEje[0]}. Esto sugiere un problema especifico de esa posicion — no solo desgaste general.`);
        }
      }
    }

    // 7. Dimension analysis
    const byDim: Record<string, number> = {};
    filtered.forEach((d) => { byDim[d.dimension] = (byDim[d.dimension] ?? 0) + 1; });
    const dimEntries = Object.entries(byDim).sort((a, b) => b[1] - a[1]);
    if (dimEntries.length > 0 && dimEntries[0][1] >= 3) {
      cards.push({ icon: "📐", title: "Dimension + Desechos", value: dimEntries[0][0], detail: `${dimEntries[0][1]} desechos en esta medida`, color: "#06b6d4" });
    }

    // 8. Photo coverage
    const withImages = filtered.filter((d) => d.imageUrls && d.imageUrls.length > 0).length;
    const photoPct = Math.round((withImages / filtered.length) * 100);
    if (photoPct < 50) {
      lines.push(`Solo ${photoPct}% de los desechos tienen fotos. Las fotos son evidencia clave para reclamos y analisis de causales. Meta: >80%.`);
    }
    cards.push({ icon: "📷", title: "Cobertura de Fotos", value: `${photoPct}%`, detail: `${withImages} de ${filtered.length} con evidencia`, color: photoPct >= 80 ? "#22c55e" : photoPct >= 50 ? "#eab308" : "#ef4444" });

    // 9. Preventability score
    const PREVENTABLE = new Set(["baja presion", "sobrecarga", "desalineacion", "mala rotacion", "golpe", "pinchadura", "pinchazo", "corte lateral", "desgaste irregular"]);
    const preventable = filtered.filter((d) => {
      const c = d.causales.trim().toLowerCase();
      return [...PREVENTABLE].some((p) => c.includes(p));
    }).length;
    if (preventable > 0) {
      const prevPct = Math.round((preventable / filtered.length) * 100);
      lines.push(`${prevPct}% de los desechos (${preventable}) son potencialmente prevenibles (baja presion, desalineacion, golpes, etc). Un programa de mantenimiento preventivo podria evitar estos retiros prematuros.`);
      cards.push({ icon: "🛡️", title: "Prevenibles", value: `${prevPct}%`, detail: `${preventable} desechos evitables con mantenimiento`, color: prevPct > 30 ? "#ef4444" : "#eab308" });
    }

    return { insight: lines.join("\n\n"), cards };
  }, [filtered, dataCausales, avgGeneral, totalMilimetros, avgRemanenteByMonth]);

  const hasActiveFilters = Object.values(fv).some((v) => v && v !== "Todos") || searchQuery.trim() !== "";

  const clearFilters = () => {
    setFv({}); setSearchQuery("");
  };

  // -- Pagination ------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(
    () => filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE),
    [filtered, currentPage]
  );

  // -- Download CSV ----------------------------------------------------------
  const downloadCSV = () => {
    const headers = ["ID Neumático", "Placa Vehículo", "Marca", "Fecha", "Causal", "Remanente (mm)", "Dinero perdido (COP)", "Milímetros Desechados", "Fotos"];
    const rows = filtered.map((d) => [
      d.tireId, d.vehiclePlaca, d.marca,
      new Date(d.fecha).toLocaleDateString("es-CO"),
      d.causales, d.remanente, Math.round(d.remanenteCop), d.milimetrosDesechados,
      (d.imageUrls ?? []).join(" | "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `desechos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // -- Download HTML Report --------------------------------------------------
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
    <div class="kpi"><div class="label">Prom. Dinero Perdido</div><div class="value">${fmtCompact(parseFloat(avgGeneral) || 0)}</div></div>
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
      <thead><tr><th>Fecha</th><th>Placa Vehículo</th><th>ID Neumático</th><th>Marca</th><th>Causal</th><th>Dinero Perdido</th><th>mm Desechados</th><th>Fotos</th></tr></thead>
      <tbody>${filtered.slice(0, 200).map((d) =>
        `<tr>
          <td>${new Date(d.fecha).toLocaleDateString("es-CO")}</td>
          <td><strong style="font-family:monospace">${d.vehiclePlaca.toUpperCase()}</strong></td>
          <td style="font-family:monospace;font-size:11px">${d.tireId.slice(0, 8)}…</td>
          <td>${d.marca}</td>
          <td>${d.causales}</td>
          <td>${fmtCompact(d.remanenteCop)}</td>
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

        {/* -- Page header --------------------------------------------------- */}
        <div
          className="px-4 sm:px-6 py-5 sm:py-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
            boxShadow: "0 8px 32px rgba(10,24,58,0.22)",
          }}
        >
          <div className="flex items-center gap-3">
            <AgentCardHeader agent="linex" insight={linexAnalysis.insight} />
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
          {mode === "fast" && <span className="text-[10px] text-[#348CCB] ml-1">Busque y deseche llantas masivamente</span>}
        </div>

        {mode === "fast" ? (
          <FastModeDesechos onDone={() => { setMode("stats"); fetchDesechos(); }} />
        ) : (
        <>

        <FilterFab
          filters={filterOptions}
          values={fv}
          onChange={setFilter}
          search={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Placa o ID neumático…"
        />

        {/* -- KPI Cards ----------------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={Trash2}     title="Total Desechos"  value={filtered.length.toLocaleString("es-CO")} sub={`de ${allDesechos.length} totales`} variant="primary"   />
          <MetricCard icon={Target}     title="Prom. Dinero Perdido" value={fmtCompact(parseFloat(avgGeneral) || 0)} sub="por desecho con remanente" variant="secondary" />
          <MetricCard icon={TrendingUp} title="mm Desechados"   value={`${parseFloat(totalMilimetros).toLocaleString("es-CO")} mm`} sub="profundidad total descartada" variant="mid"       />
          <MetricCard icon={BarChart3}  title="Causales"         value={Object.keys(dataCausales).length} sub={`tipos en ${filtered.length} registros`} variant="accent"    />
        </div>

        {/* -- LINEX deep analysis cards ---------------------------------------- */}
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

        {/* -- Charts -------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DoughnutCard title="Desechos por Causal" icon={BarChart3} data={dataCausales} />
          <LineChartCard title="Dinero Perdido Total por Mes"   icon={TrendingUp} data={totalRemanenteByMonth} formatValue={fmtCompact} />
          <ChartCard title="Dinero Perdido Promedio por Mes"     icon={Target}     data={avgRemanenteByMonth} formatValue={fmtCompact} />
          <ChartCard title="Prom. Milímetros Desechados por Mes" icon={Target}     data={avgMilimetrosByMonth} formatValue={(n) => `${n.toFixed(1)} mm`} />
        </div>

        {/* -- Records table ------------------------------------------------- */}
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
                  <th className="px-3 py-2.5 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap text-[10px]">Dinero perdido</th>
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

                    {/* Remanente — money lost */}
                    <td className="px-3 py-2.5 font-bold text-[#0A183A] whitespace-nowrap text-[11px]" title={`${d.remanente} mm restantes`}>{fmtCompact(d.remanenteCop)}</td>

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

export default DesechosPage;