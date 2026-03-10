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
  Users,
  Trash2,
  BarChart3,
  ChevronDown,
  Search,
  X,
  FileText,
  Building2,
  Clock,
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

type EnrichedDesecho = DesechoData & { companyId: string; companyName: string };

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
// Design-system micro-components (matching DistribuidorPage)
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

/** Dark-gradient metric card — same as DistribuidorPage MetricCard */
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
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
      style={{ background: bgs[variant], minHeight: 100, boxShadow: "0 4px 20px rgba(10,24,58,0.18)" }}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">…</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none break-all">{value}</p>
          {sub && <p className="text-xs font-bold text-white/60 mt-0.5">{sub}</p>}
        </>
      )}
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
  const [open, setOpen]     = useState(false);
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

function ChartCard({
  title, icon: Icon, data,
}: {
  title: string; icon: React.ElementType; data: Record<string, number>;
}) {
  const hasData = Object.keys(data).length > 0;
  const labels  = Object.keys(data).map((k) => (k.includes("-") ? formatMonth(k) : k));
  const values  = Object.values(data);

  return (
    <Card className="overflow-hidden">
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(52,140,203,0.12)" }}
      >
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
// Main Component
// =============================================================================

const DesechosDistribuidor: React.FC = () => {
  const [companies,        setCompanies]        = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [allDesechos,      setAllDesechos]      = useState<EnrichedDesecho[]>([]);
  const [loadingDesechos,  setLoadingDesechos]  = useState(false);
  const [error,            setError]            = useState("");

  // Filters
  const [selectedCompany, setSelectedCompany] = useState("todas");
  const [selectedYear,    setSelectedYear]    = useState("todos");
  const [selectedMonth,   setSelectedMonth]   = useState("todos");
  const [selectedCausal,  setSelectedCausal]  = useState("todos");

  // ── Fetch companies ────────────────────────────────────────────────────────
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

  // ── Fetch desechos from tires ──────────────────────────────────────────────
  useEffect(() => {
    if (!companies.length) return;
    const run = async () => {
      setLoadingDesechos(true);
      try {
        const targets = selectedCompany === "todas"
          ? companies
          : companies.filter((c) => c.id === selectedCompany);

        const results: EnrichedDesecho[] = [];
        await Promise.all(
          targets.map(async (company) => {
            try {
              const res = await authFetch(`${API_BASE}/tires?companyId=${company.id}`);
              if (!res.ok) return;
              const tires: TireWithDesecho[] = await res.json();
              tires.forEach((tire) => {
                if (tire.desechos) {
                  results.push({ ...tire.desechos, companyId: company.id, companyName: company.name });
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
    };
    run();
  }, [companies, selectedCompany]);

  // ── Filter option lists ────────────────────────────────────────────────────
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

  const companyOptions = useMemo(() => [
    { value: "todas", label: "Todos los clientes" },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ], [companies]);

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => allDesechos.filter((d) => {
    const date  = new Date(d.fecha);
    const year  = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    if (selectedYear  !== "todos" && year  !== selectedYear)         return false;
    if (selectedMonth !== "todos" && month !== selectedMonth)        return false;
    if (selectedCausal !== "todos" && d.causales.trim() !== selectedCausal) return false;
    return true;
  }), [allDesechos, selectedYear, selectedMonth, selectedCausal]);

  // ── Aggregations ───────────────────────────────────────────────────────────
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

  const dataByCompany        = useMemo(() => { const c: Record<string, number> = {}; filtered.forEach((d) => { c[d.companyName] = (c[d.companyName] || 0) + 1; }); return c; }, [filtered]);
  const avgRemanenteByMonth  = useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "average"), [groupBy]);
  const totalRemanenteByMonth= useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "sum"),     [groupBy]);
  const avgMilimetrosByMonth = useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.milimetrosDesechados, "average"), [groupBy]);

  const avgGeneral    = useMemo(() => filtered.length === 0 ? 0 : (filtered.reduce((a, d) => a + d.remanente, 0) / filtered.length).toFixed(1), [filtered]);
  const totalMilimetros = useMemo(() => filtered.reduce((a, d) => a + d.milimetrosDesechados, 0).toFixed(1), [filtered]);

  const hasActiveFilters = selectedCompany !== "todas" || selectedYear !== "todos" || selectedMonth !== "todos" || selectedCausal !== "todos";

  const clearFilters = () => { setSelectedCompany("todas"); setSelectedYear("todos"); setSelectedMonth("todos"); setSelectedCausal("todos"); };

  // ── Download CSV ───────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = ["Cliente", "Fecha", "Causal", "Remanente (mm)", "Milímetros Desechados"];
    const rows = (filtered as EnrichedDesecho[]).map((d) => [
      d.companyName, new Date(d.fecha).toLocaleDateString("es-CO"), d.causales, d.remanente, d.milimetrosDesechados,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `desechos_distribuidor_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download HTML Report ───────────────────────────────────────────────────
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
    td { padding:9px 14px; border-bottom:1px solid rgba(52,140,203,0.08); color:#173D68; }
    tr:nth-child(even) td { background:rgba(30,118,182,0.03); }
    .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:11px; font-weight:700; background:rgba(30,118,182,0.1); color:#1E76B6; }
    .footer { text-align:center; font-size:11px; color:rgba(10,24,58,0.3); margin-top:32px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Reporte de Desechos</h1>
    <p>Generado el ${now} · TirePro Distribuidores</p>
  </div>
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
      <tbody>
        ${Object.entries(dataCausales).sort((a, b) => b[1] - a[1]).map(([c, n]) =>
          `<tr><td>${c}</td><td><span class="badge">${n}</span></td><td>${filtered.length > 0 ? ((n / filtered.length) * 100).toFixed(1) : 0}%</td></tr>`
        ).join("")}
      </tbody>
    </table>
  </div>
  ${selectedCompany === "todas" ? `
  <div class="section">
    <h2>Por Cliente</h2>
    <table>
      <thead><tr><th>Cliente</th><th>Desechos</th><th>%</th></tr></thead>
      <tbody>
        ${Object.entries(dataByCompany).sort((a, b) => b[1] - a[1]).map(([name, n]) =>
          `<tr><td>${name}</td><td>${n}</td><td>${filtered.length > 0 ? ((n / filtered.length) * 100).toFixed(1) : 0}%</td></tr>`
        ).join("")}
      </tbody>
    </table>
  </div>` : ""}
  <div class="section">
    <h2>Detalle de Registros</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Causal</th><th>Remanente</th><th>mm Desechados</th></tr></thead>
      <tbody>
        ${(filtered as EnrichedDesecho[]).slice(0, 100).map((d) =>
          `<tr><td>${new Date(d.fecha).toLocaleDateString("es-CO")}</td><td>${d.companyName}</td><td>${d.causales}</td><td>${d.remanente} mm</td><td>${d.milimetrosDesechados} mm</td></tr>`
        ).join("")}
        ${filtered.length > 100 ? `<tr><td colspan="5" style="text-align:center;color:rgba(10,24,58,0.3);padding:12px;">… y ${filtered.length - 100} registros más</td></tr>` : ""}
      </tbody>
    </table>
  </div>
  <div class="footer">Reporte generado por TirePro · ${now}</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
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

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div
          className="px-4 sm:px-6 py-5 sm:py-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)", boxShadow: "0 8px 32px rgba(10,24,58,0.22)" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-none tracking-tight">Estadísticas de Desechos</h1>
              <div className="flex items-center gap-3 mt-1 text-white/60 text-xs">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date().toLocaleDateString("es-CO")}</span>
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{companies.length} cliente{companies.length !== 1 ? "s" : ""}</span>
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

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.1)" }}>
                <Filter className="w-3.5 h-3.5 text-[#1E76B6]" />
              </div>
              <span className="text-xs font-black text-[#0A183A] uppercase tracking-wide">Filtros</span>
            </div>

            <Dropdown label="Todos los clientes" value={selectedCompany} options={companyOptions} onChange={setSelectedCompany} searchable />
            <Dropdown label="Todos los años"     value={selectedYear}    options={yearOptions}    onChange={setSelectedYear} />
            <Dropdown label="Todos los meses"    value={selectedMonth}   options={monthOptions}   onChange={setSelectedMonth} />
            <Dropdown label="Todas las causales" value={selectedCausal}  options={causalOptions}  onChange={setSelectedCausal} searchable />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }}
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {loadingDesechos && <Loader2 className="w-4 h-4 animate-spin text-[#1E76B6]" />}
              {!loadingDesechos && (
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6" }}
                >
                  {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={Trash2}    title="Total Desechos"   value={filtered.length}  sub={`de ${allDesechos.length} totales`} variant="primary"   loading={loadingDesechos} />
          <MetricCard icon={Target}    title="Prom. Remanente"  value={`${avgGeneral} mm`}                                          variant="secondary" loading={loadingDesechos} />
          <MetricCard icon={TrendingUp} title="mm Desechados"   value={totalMilimetros}   sub="milímetros totales"                  variant="mid"       loading={loadingDesechos} />
          <MetricCard icon={Users}     title="Causales únicas"  value={Object.keys(dataCausales).length} sub={`${companies.length} clientes`} variant="accent" loading={loadingDesechos} />
        </div>

        {/* ── Charts ────────────────────────────────────────────────────── */}
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
            <ChartCard title="Desechos por Causal"                  icon={BarChart3}  data={dataCausales} />
            {selectedCompany === "todas" && (
              <ChartCard title="Desechos por Cliente"               icon={Building2}  data={dataByCompany} />
            )}
            <ChartCard title="Promedio Remanente por Mes"           icon={TrendingUp} data={avgRemanenteByMonth} />
            <ChartCard title="Total Remanente por Mes"              icon={Calendar}   data={totalRemanenteByMonth} />
            <ChartCard title="Prom. Milímetros Desechados por Mes"  icon={Target}     data={avgMilimetrosByMonth} />
          </div>
        )}

        {/* ── Records table ─────────────────────────────────────────────── */}
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
                  {["Fecha", "Cliente", "Causal", "Remanente", "mm Desechados"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-black text-[#0A183A] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <Trash2 className="w-8 h-8 mx-auto mb-3 opacity-20 text-[#1E76B6]" />
                      <p className="text-sm text-gray-400">No hay registros para los filtros seleccionados</p>
                    </td>
                  </tr>
                ) : (
                  (filtered as EnrichedDesecho[]).slice(0, 50).map((d, i) => (
                    <tr
                      key={i}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid rgba(52,140,203,0.08)", background: i % 2 === 0 ? "rgba(10,24,58,0.01)" : "white" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(30,118,182,0.04)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "rgba(10,24,58,0.01)" : "white"; }}
                    >
                      <td className="px-4 py-3 font-medium text-[#0A183A]">
                        {new Date(d.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#1E76B6" }} />
                          <span className="font-bold text-[#0A183A]">{d.companyName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}
                        >
                          {d.causales}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#0A183A]">{d.remanente} mm</td>
                      <td className="px-4 py-3 font-bold text-[#0A183A]">{d.milimetrosDesechados} mm</td>
                    </tr>
                  ))
                )}
                {filtered.length > 50 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-xs" style={{ color: "rgba(10,24,58,0.3)", background: "rgba(30,118,182,0.02)" }}>
                      Mostrando 50 de {filtered.length} registros · Descargue el CSV para ver todos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default DesechosDistribuidor;