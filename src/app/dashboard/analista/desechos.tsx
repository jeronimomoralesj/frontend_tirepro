import React, { useEffect, useState, useMemo } from "react";
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
  PieChart,
  TrendingUp,
  Calendar,
  Target,
  BarChart3,
} from "lucide-react";
import AgentCardHeader from "../../../components/AgentCardHeader";
import { AGENTS } from "../../../lib/agents";

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

interface Tire {
  desechos?: DesechoData | null;
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL
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

function MetricCard({
  icon: Icon, title, value, variant = "primary",
}: {
  icon: React.ElementType; title: string; value: string | number;
  variant?: "primary" | "secondary" | "mid" | "accent";
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
      style={{ background: bgs[variant], minHeight: 90, boxShadow: "0 4px 20px rgba(10,24,58,0.18)" }}
    >
      <div className="p-1.5 rounded-lg w-fit mb-2" style={{ background: "rgba(255,255,255,0.15)" }}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <p className="text-xl font-black text-white tracking-tight leading-none break-all">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1.5">{title}</p>
    </div>
  );
}

// =============================================================================
// Chart card
// =============================================================================

const CHART_ICONS = [PieChart, TrendingUp, Calendar, Target];

function ChartCard({ title, data, index }: { title: string; data: Record<string, number>; index: number }) {
  const Icon     = CHART_ICONS[index % CHART_ICONS.length];
  const hasData  = Object.keys(data).length > 0;
  const labels   = Object.keys(data).map((k) => k.includes("-") ? formatMonth(k) : k);
  const values   = Object.values(data);

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
                    ticks: { color: "rgba(10,24,58,0.4)", font: { size: 10 }, maxRotation: 45 },
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <BarChart3 className="w-8 h-8 opacity-20 text-[#1E76B6]" />
            <p className="text-sm text-gray-400">Sin datos disponibles</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Main component
// =============================================================================

const DesechosStats: React.FC = () => {
  const [desechos, setDesechos] = useState<DesechoData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    const run = async () => {
      const companyId = localStorage.getItem("companyId");
      if (!companyId) { setError("No se encontró el companyId"); setLoading(false); return; }
      try {
        const res = await authFetch(`${API_BASE}/tires?companyId=${companyId}&slim=true`);
        if (!res.ok) throw new Error("Error al cargar los datos");
        const tires: Tire[] = await res.json();
        setDesechos(tires.map((t) => t.desechos).filter(Boolean) as DesechoData[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al obtener las llantas");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // -- Aggregations -----------------------------------------------------------
  const groupBy = (keyFn: (d: DesechoData) => string, valueFn: (d: DesechoData) => number, agg: "average" | "sum") => {
    const map: Record<string, number[]> = {};
    desechos.forEach((d) => { const k = keyFn(d); (map[k] ??= []).push(valueFn(d)); });
    const out: Record<string, number> = {};
    Object.keys(map).sort().forEach((k) => {
      const vals = map[k], total = vals.reduce((a, b) => a + b, 0);
      out[k] = Number((agg === "average" ? total / vals.length : total).toFixed(2));
    });
    return out;
  };

  const dataCausales = useMemo(() => {
    const c: Record<string, number> = {};
    desechos.forEach((d) => { const k = d.causales.trim(); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [desechos]);

  const avgRemanente   = useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "average"),          [desechos]);
  const totalRemanente = useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.remanente, "sum"),               [desechos]);
  const avgMilimetros  = useMemo(() => groupBy((d) => new Date(d.fecha).toISOString().slice(0, 7), (d) => d.milimetrosDesechados, "average"), [desechos]);

  const avgGeneral = useMemo(() =>
    desechos.length > 0
      ? (desechos.reduce((a, d) => a + d.remanente, 0) / desechos.length).toFixed(1)
      : "0",
    [desechos]
  );

  const linexInsight = useMemo(() => {
    if (desechos.length === 0) return "";
    const lines: string[] = [];
    lines.push(`${desechos.length} llanta${desechos.length > 1 ? "s" : ""} rastreada${desechos.length > 1 ? "s" : ""} hasta fin de vida.`);
    const topCausal = Object.entries(dataCausales).sort((a, b) => b[1] - a[1])[0];
    if (topCausal) lines.push(`Causal principal: "${topCausal[0]}" (${topCausal[1]} casos).`);
    const avg = parseFloat(avgGeneral);
    if (avg > 3) lines.push(`Remanente promedio: ${avgGeneral} mm — se pierde vida util. Revisa criterios de retiro.`);
    return lines.join("\n\n");
  }, [desechos, dataCausales, avgGeneral]);

  // -- Loading / error --------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E76B6]" />
        <p className="text-sm font-bold text-[#0A183A]">Cargando estadísticas…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
        style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}
      >
        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-red-700">{error}</span>
      </div>
    );
  }

  // -- Render -----------------------------------------------------------------
  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Section label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AgentCardHeader agent="linex" insight={linexInsight} />
          <div>
            <p className="text-sm font-black text-[#0A183A] leading-none">Estadísticas de Desechos</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Análisis completo de desechos de llantas</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: AGENTS.linex.color }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: AGENTS.linex.color }}>{AGENTS.linex.codename}</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={BarChart3}  title="Total Registros"   value={desechos.length}                   variant="primary"   />
        <MetricCard icon={PieChart}   title="Causales Únicas"   value={Object.keys(dataCausales).length}  variant="secondary" />
        <MetricCard icon={Calendar}   title="Meses Analizados"  value={Object.keys(avgRemanente).length}  variant="mid"       />
        <MetricCard icon={Target}     title="Prom. Remanente"   value={`${avgGeneral} mm`}                variant="accent"    />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Desechos por Causal"                  data={dataCausales}   index={0} />
        <ChartCard title="Promedio Remanente por Mes"           data={avgRemanente}   index={1} />
        <ChartCard title="Total Remanente por Mes"              data={totalRemanente} index={2} />
        <ChartCard title="Prom. Milímetros Desechados por Mes"  data={avgMilimetros}  index={3} />
      </div>

    </div>
  );
};

export default DesechosStats;