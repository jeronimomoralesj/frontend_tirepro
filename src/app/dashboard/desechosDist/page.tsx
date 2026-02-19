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
  LoaderCircle,
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

// ─── Types ─────────────────────────────────────────────────────────────────────
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
  companyName?: string;
}

interface Company {
  id: string;
  name: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
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

// ─── Dropdown Component ────────────────────────────────────────────────────────
const Dropdown = ({
  label, value, options, onChange, searchable = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  searchable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, searchable]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl
                   text-sm font-medium text-slate-700 hover:border-[#1E76B6] hover:text-[#1E76B6]
                   transition-all duration-200 shadow-sm min-w-[160px] justify-between"
      >
        <span className="truncate max-w-[140px]">{selected?.label ?? label}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(""); }} />
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 z-20 overflow-hidden">
            {searchable && (
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/30"
                  />
                </div>
              </div>
            )}
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400 text-center">Sin resultados</p>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.value}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${value === o.value ? "bg-[#EBF5FF] text-[#1E76B6] font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                    onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                  >
                    {o.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({
  icon, title, value, sub, gradient,
}: {
  icon: React.ReactNode; title: string; value: string | number; sub?: string; gradient: string;
}) => (
  <div className={`rounded-2xl p-5 text-white shadow-lg ${gradient} relative overflow-hidden`}>
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 -mr-8 -mt-8" />
    <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-white/5 -ml-4 -mb-4" />
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-white/20 p-2 rounded-lg">{icon}</div>
        <span className="text-xs font-medium text-white/70 uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-3xl font-bold leading-none">{value}</p>
      {sub && <p className="text-sm text-white/70 mt-1">{sub}</p>}
    </div>
  </div>
);

// ─── Chart Card ────────────────────────────────────────────────────────────────
const ChartCard = ({
  title, icon, data, color, index,
}: {
  title: string; icon: React.ReactNode; data: Record<string, number>; color: string; index: number;
}) => {
  const hasData = Object.keys(data).length > 0;
  const labels = Object.keys(data).map((k) => (k.includes("-") ? formatMonth(k) : k));
  const values = Object.values(data);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] px-5 py-4 flex items-center gap-3">
        <div className="bg-white/15 p-2 rounded-lg">{icon}</div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
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
                  backgroundColor: color,
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
                    ticks: { color: "#94a3b8", font: { size: 11 } },
                    grid: { color: "rgba(226,232,240,0.5)" },
                  },
                  x: {
                    ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 40 },
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              <p className="text-sm">Sin datos para mostrar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DesechosDistribuidor: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [allDesechos, setAllDesechos] = useState<(DesechoData & { companyId: string; companyName: string })[]>([]);
  const [loadingDesechos, setLoadingDesechos] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [selectedCompany, setSelectedCompany] = useState("todas");
  const [selectedYear, setSelectedYear] = useState("todos");
  const [selectedMonth, setSelectedMonth] = useState("todos");
  const [selectedCausal, setSelectedCausal] = useState("todos");

  // ── Fetch companies (same pattern as distribuidorPage) ─────────────────────
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const token = localStorage.getItem("token");
        if (!token) { setError("No se encontró token de autenticación"); return; }

        const res = await fetch(`${API_BASE}/companies/me/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Error al obtener clientes");
        const data = await res.json();
        const list: Company[] = data.map((access: any) => ({
          id: access.company.id,
          name: access.company.name,
        }));
        setCompanies(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando clientes");
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // ── Fetch tires/desechos for all (or selected) companies ──────────────────
  useEffect(() => {
    if (companies.length === 0) return;

    const fetchDesechos = async () => {
      setLoadingDesechos(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) { setError("No se encontró token"); return; }

        const targets =
          selectedCompany === "todas"
            ? companies
            : companies.filter((c) => c.id === selectedCompany);

        const results: (DesechoData & { companyId: string; companyName: string })[] = [];

        await Promise.all(
          targets.map(async (company) => {
            try {
              const res = await fetch(`${API_BASE}/tires?companyId=${company.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) return;
              const tires: TireWithDesecho[] = await res.json();
              tires.forEach((tire) => {
                if (tire.desechos) {
                  results.push({
                    ...tire.desechos,
                    companyId: company.id,
                    companyName: company.name,
                  });
                }
              });
            } catch { /* skip company on error */ }
          })
        );

        setAllDesechos(results);
      } catch (e) {
        setError("Error al cargar datos de desechos");
      } finally {
        setLoadingDesechos(false);
      }
    };

    fetchDesechos();
  }, [companies, selectedCompany]);

  // ── Derived filter options ─────────────────────────────────────────────────
  const yearOptions = useMemo(() => {
    const years = [...new Set(allDesechos.map((d) => new Date(d.fecha).getFullYear().toString()))].sort().reverse();
    return [{ value: "todos", label: "Todos los años" }, ...years.map((y) => ({ value: y, label: y }))];
  }, [allDesechos]);

  const monthOptions = useMemo(() => {
    const all = [
      { value: "todos", label: "Todos los meses" },
      { value: "01", label: "Enero" }, { value: "02", label: "Febrero" },
      { value: "03", label: "Marzo" }, { value: "04", label: "Abril" },
      { value: "05", label: "Mayo" }, { value: "06", label: "Junio" },
      { value: "07", label: "Julio" }, { value: "08", label: "Agosto" },
      { value: "09", label: "Septiembre" }, { value: "10", label: "Octubre" },
      { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
    ];
    return all;
  }, []);

  const causalOptions = useMemo(() => {
    const causales = [...new Set(allDesechos.map((d) => d.causales.trim()))].sort();
    return [{ value: "todos", label: "Todas las causales" }, ...causales.map((c) => ({ value: c, label: c }))];
  }, [allDesechos]);

  const companyOptions = useMemo(() => [
    { value: "todas", label: "Todos los clientes" },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ], [companies]);

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allDesechos.filter((d) => {
      const date = new Date(d.fecha);
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      if (selectedYear !== "todos" && year !== selectedYear) return false;
      if (selectedMonth !== "todos" && month !== selectedMonth) return false;
      if (selectedCausal !== "todos" && d.causales.trim() !== selectedCausal) return false;
      return true;
    });
  }, [allDesechos, selectedYear, selectedMonth, selectedCausal]);

  // ── Aggregations ───────────────────────────────────────────────────────────
  const groupBy = useCallback(
    (keyFn: (d: DesechoData) => string, valueFn: (d: DesechoData) => number, agg: "sum" | "average") => {
      const map: Record<string, number[]> = {};
      filtered.forEach((d) => {
        const k = keyFn(d);
        if (!map[k]) map[k] = [];
        map[k].push(valueFn(d));
      });
      const out: Record<string, number> = {};
      const sortedKeys = Object.keys(map).sort();
      sortedKeys.forEach((k) => {
        const vals = map[k];
        const total = vals.reduce((a, b) => a + b, 0);
        out[k] = agg === "average"
          ? Number((total / vals.length).toFixed(2))
          : Number(total.toFixed(2));
      });
      return out;
    },
    [filtered]
  );

  const dataCausales = useMemo(() => {
    const count: Record<string, number> = {};
    filtered.forEach((d) => {
      const k = d.causales.trim();
      count[k] = (count[k] || 0) + 1;
    });
    return count;
  }, [filtered]);

  const avgRemanenteByMonth = useMemo(() =>
    groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "average"),
    [groupBy]);

  const totalRemanenteByMonth = useMemo(() =>
    groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "sum"),
    [groupBy]);

  const avgMilimetrosByMonth = useMemo(() =>
    groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.milimetrosDesechados, "average"),
    [groupBy]);

  const dataByCompany = useMemo(() => {
    const count: Record<string, number> = {};
    filtered.forEach((d: any) => {
      const k = d.companyName;
      count[k] = (count[k] || 0) + 1;
    });
    return count;
  }, [filtered]);

  const avgGeneral = useMemo(() => {
    if (filtered.length === 0) return 0;
    return (filtered.reduce((a, d) => a + d.remanente, 0) / filtered.length).toFixed(1);
  }, [filtered]);

  const totalMilimetros = useMemo(() =>
    filtered.reduce((a, d) => a + d.milimetrosDesechados, 0).toFixed(1),
    [filtered]);

  const hasActiveFilters = selectedCompany !== "todas" || selectedYear !== "todos" || selectedMonth !== "todos" || selectedCausal !== "todos";

  const clearFilters = () => {
    setSelectedCompany("todas");
    setSelectedYear("todos");
    setSelectedMonth("todos");
    setSelectedCausal("todos");
  };

  // ── Download CSV ───────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = ["Cliente", "Fecha", "Causal", "Remanente (mm)", "Milímetros Desechados"];
    const rows = (filtered as any[]).map((d) => [
      d.companyName,
      new Date(d.fecha).toLocaleDateString("es-CO"),
      d.causales,
      d.remanente,
      d.milimetrosDesechados,
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `desechos_distribuidor_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download HTML Report ───────────────────────────────────────────────────
  const downloadReport = () => {
    const now = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
    const totalDesechos = filtered.length;
    const topCausal = Object.entries(dataCausales).sort((a, b) => b[1] - a[1])[0];
    const topCliente = Object.entries(dataByCompany).sort((a, b) => b[1] - a[1])[0];

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Desechos - TirePro</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
    .header { background: linear-gradient(135deg, #0A183A 0%, #1E76B6 100%); color: white; padding: 40px; border-radius: 16px; margin-bottom: 32px; }
    .header h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
    .header p { font-size: 14px; opacity: 0.8; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .kpi { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .kpi .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 8px; }
    .kpi .value { font-size: 28px; font-weight: 800; color: #0A183A; }
    .kpi .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .section { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .section h2 { font-size: 16px; font-weight: 700; color: #0A183A; margin-bottom: 16px; border-bottom: 2px solid #EBF5FF; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #0A183A; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
    td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-blue { background: #EBF5FF; color: #1E76B6; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Reporte de Desechos</h1>
    <p>Generado el ${now} · TirePro Distribuidores</p>
    ${hasActiveFilters ? `<p style="margin-top:8px;font-size:12px;opacity:0.7;">Filtros activos: ${[
      selectedCompany !== "todas" ? `Cliente: ${companyOptions.find(c => c.value === selectedCompany)?.label}` : "",
      selectedYear !== "todos" ? `Año: ${selectedYear}` : "",
      selectedMonth !== "todos" ? `Mes: ${monthOptions.find(m => m.value === selectedMonth)?.label}` : "",
      selectedCausal !== "todos" ? `Causal: ${selectedCausal}` : "",
    ].filter(Boolean).join(" · ")}</p>` : ""}
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="label">Total Desechos</div>
      <div class="value">${totalDesechos}</div>
    </div>
    <div class="kpi">
      <div class="label">Promedio Remanente</div>
      <div class="value">${avgGeneral}</div>
      <div class="sub">milímetros</div>
    </div>
    <div class="kpi">
      <div class="label">Total mm Desechados</div>
      <div class="value">${totalMilimetros}</div>
      <div class="sub">milímetros</div>
    </div>
    <div class="kpi">
      <div class="label">Causales únicas</div>
      <div class="value">${Object.keys(dataCausales).length}</div>
    </div>
  </div>

  ${topCausal ? `
  <div class="section">
    <h2>Resumen de Causales</h2>
    <table>
      <thead><tr><th>Causal</th><th>Cantidad</th><th>%</th></tr></thead>
      <tbody>
        ${Object.entries(dataCausales).sort((a, b) => b[1] - a[1]).map(([causal, count]) => `
          <tr>
            <td>${causal}</td>
            <td><span class="badge badge-blue">${count}</span></td>
            <td>${totalDesechos > 0 ? ((count / totalDesechos) * 100).toFixed(1) : 0}%</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${selectedCompany === "todas" ? `
  <div class="section">
    <h2>Desechos por Cliente</h2>
    <table>
      <thead><tr><th>Cliente</th><th>Desechos</th><th>Participación</th></tr></thead>
      <tbody>
        ${Object.entries(dataByCompany).sort((a, b) => b[1] - a[1]).map(([name, count]) => `
          <tr>
            <td>${name}</td>
            <td>${count}</td>
            <td>${totalDesechos > 0 ? ((count / totalDesechos) * 100).toFixed(1) : 0}%</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="section">
    <h2>Detalle de Registros</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Causal</th><th>Remanente</th><th>mm Desechados</th></tr></thead>
      <tbody>
        ${(filtered as any[]).slice(0, 100).map((d) => `
          <tr>
            <td>${new Date(d.fecha).toLocaleDateString("es-CO")}</td>
            <td>${d.companyName}</td>
            <td>${d.causales}</td>
            <td>${d.remanente} mm</td>
            <td>${d.milimetrosDesechados} mm</td>
          </tr>
        `).join("")}
        ${filtered.length > 100 ? `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:12px;">... y ${filtered.length - 100} registros más</td></tr>` : ""}
      </tbody>
    </table>
  </div>

  <div class="footer">Reporte generado automáticamente por TirePro · ${now}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_desechos_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingCompanies) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-16 text-center">
          <LoaderCircle className="w-12 h-12 text-[#1E76B6] animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#0A183A] mb-2">Cargando clientes</h3>
          <p className="text-slate-500 text-sm">Obteniendo información de sus clientes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-16 text-center">
          <div className="bg-red-50 rounded-full p-4 w-fit mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-red-800 mb-2">Error al cargar datos</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#0A183A] via-[#173D68] to-[#1E76B6] rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/15 p-2.5 rounded-xl">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Estadísticas de Desechos</h1>
              </div>
              <p className="text-blue-200 text-sm">
                Panel distribuidor · Análisis consolidado de todos sus clientes
              </p>
              <div className="flex items-center gap-2 mt-2 text-blue-300 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}</span>
                <span className="mx-1">·</span>
                <Building2 className="w-3.5 h-3.5" />
                <span>{companies.length} cliente{companies.length !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20
                           border border-white/20 text-white text-sm font-medium rounded-xl
                           transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#0A183A]
                           text-sm font-semibold rounded-xl hover:bg-blue-50
                           transition-all duration-200 shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Descargar Reporte</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm flex-shrink-0">
              <Filter className="w-4 h-4 text-[#1E76B6]" />
              <span>Filtros</span>
            </div>

            <Dropdown
              label="Todos los clientes"
              value={selectedCompany}
              options={companyOptions}
              onChange={setSelectedCompany}
              searchable
            />
            <Dropdown
              label="Todos los años"
              value={selectedYear}
              options={yearOptions}
              onChange={setSelectedYear}
            />
            <Dropdown
              label="Todos los meses"
              value={selectedMonth}
              options={monthOptions}
              onChange={setSelectedMonth}
            />
            <Dropdown
              label="Todas las causales"
              value={selectedCausal}
              options={causalOptions}
              onChange={setSelectedCausal}
              searchable
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50
                           hover:bg-red-100 rounded-xl transition-all duration-200 font-medium"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}

            {loadingDesechos && (
              <div className="flex items-center gap-2 text-slate-500 text-sm ml-auto">
                <LoaderCircle className="w-4 h-4 animate-spin text-[#1E76B6]" />
                <span>Cargando datos...</span>
              </div>
            )}

            {!loadingDesechos && (
              <span className="ml-auto text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1.5 rounded-lg">
                {filtered.length} registro{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Trash2 className="w-5 h-5 text-white" />}
            title="Total Desechos"
            value={filtered.length}
            sub={`de ${allDesechos.length} totales`}
            gradient="bg-gradient-to-br from-[#0A183A] to-[#173D68]"
          />
          <KpiCard
            icon={<Target className="w-5 h-5 text-white" />}
            title="Prom. Remanente"
            value={`${avgGeneral} mm`}
            gradient="bg-gradient-to-br from-[#173D68] to-[#1E76B6]"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            title="mm Desechados"
            value={`${totalMilimetros}`}
            sub="milímetros totales"
            gradient="bg-gradient-to-br from-[#1E76B6] to-[#348CCB]"
          />
          <KpiCard
            icon={<Users className="w-5 h-5 text-white" />}
            title="Causales"
            value={Object.keys(dataCausales).length}
            sub={`${companies.length} clientes`}
            gradient="bg-gradient-to-br from-[#348CCB] to-[#1E76B6]"
          />
        </div>

        {/* ── Charts Grid ─────────────────────────────────────────────────── */}
        {loadingDesechos ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] px-5 py-4">
                  <div className="h-4 bg-white/20 rounded w-40 animate-pulse" />
                </div>
                <div className="p-5 h-64 flex items-center justify-center">
                  <LoaderCircle className="w-8 h-8 text-[#1E76B6] animate-spin" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard
              title="Desechos por Causal"
              icon={<BarChart3 className="w-5 h-5 text-white" />}
              data={dataCausales}
              color="#0A183A"
              index={0}
            />
            {selectedCompany === "todas" && (
              <ChartCard
                title="Desechos por Cliente"
                icon={<Building2 className="w-5 h-5 text-white" />}
                data={dataByCompany}
                color="#173D68"
                index={1}
              />
            )}
            <ChartCard
              title="Promedio Remanente por Mes"
              icon={<TrendingUp className="w-5 h-5 text-white" />}
              data={avgRemanenteByMonth}
              color="#1E76B6"
              index={2}
            />
            <ChartCard
              title="Total Remanente por Mes"
              icon={<Calendar className="w-5 h-5 text-white" />}
              data={totalRemanenteByMonth}
              color="#2d8dd4"
              index={3}
            />
            <ChartCard
              title="Promedio Milímetros Desechados por Mes"
              icon={<Target className="w-5 h-5 text-white" />}
              data={avgMilimetrosByMonth}
              color="#348CCB"
              index={4}
            />
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold">Detalle de Registros</h3>
            </div>
            <span className="text-blue-200 text-sm">{filtered.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Causal</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Remanente</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">mm Desechados</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <Trash2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="text-sm">No hay registros para los filtros seleccionados</p>
                    </td>
                  </tr>
                ) : (
                  (filtered as any[]).slice(0, 50).map((d, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(d.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#1E76B6]" />
                          <span className="font-medium text-slate-800">{d.companyName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 bg-[#EBF5FF] text-[#1E76B6] text-xs font-semibold rounded-full">
                          {d.causales}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{d.remanente} mm</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{d.milimetrosDesechados} mm</td>
                    </tr>
                  ))
                )}
                {filtered.length > 50 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 text-xs bg-slate-50/50">
                      Mostrando 50 de {filtered.length} registros · Descargue el CSV para ver todos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DesechosDistribuidor;