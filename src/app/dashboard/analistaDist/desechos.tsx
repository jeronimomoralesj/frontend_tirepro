import React, { useMemo } from "react";
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
  PieChart,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// --- Types --------------------------------------------------------------------
interface DesechoData {
  fecha: string;
  causales: string;
  remanente: number;
  milimetrosDesechados: number;
}

interface Tire {
  desechos?: DesechoData | null;
}

interface Vehicle {
  id: string;
  placa: string;
}

interface DesechosProps {
  /** Full tire list already fetched by the parent (dist or regular page) */
  tires: Tire[];
  vehicles: Vehicle[];
  loading: boolean;
  error: string;
}

// --- Component ----------------------------------------------------------------
const Desechos: React.FC<DesechosProps> = ({ tires, loading, error }) => {
  // Extract desechos from the supplied tire list
  const desechos = useMemo(
    () => tires.map((t) => t.desechos).filter(Boolean) as DesechoData[],
    [tires]
  );

  // -- Aggregation helpers --------------------------------------------------
  const groupBy = (
    keyFn: (d: DesechoData) => string,
    valueFn: (d: DesechoData) => number,
    aggregate: "average" | "sum"
  ) => {
    const result: Record<string, number[]> = {};
    desechos.forEach((d) => {
      const key = keyFn(d);
      const value = valueFn(d);
      if (!result[key]) result[key] = [];
      result[key].push(value);
    });
    const output: Record<string, number> = {};
    for (const key in result) {
      const values = result[key];
      const total = values.reduce((a, b) => a + b, 0);
      output[key] =
        aggregate === "average"
          ? Number((total / values.length).toFixed(2))
          : Number(total.toFixed(2));
    }
    return output;
  };

  const dataCausales = () => {
    const count: Record<string, number> = {};
    desechos.forEach((d) => {
      const key = d.causales.trim();
      count[key] = (count[key] || 0) + 1;
    });
    return count;
  };

  const avgRemanente = groupBy(
    (d) => new Date(d.fecha).toISOString().slice(0, 7),
    (d) => d.remanente,
    "average"
  );
  const totalRemanente = groupBy(
    (d) => new Date(d.fecha).toISOString().slice(0, 7),
    (d) => d.remanente,
    "sum"
  );
  const avgMilimetros = groupBy(
    (d) => new Date(d.fecha).toISOString().slice(0, 7),
    (d) => d.milimetrosDesechados,
    "average"
  );

  // -- Chart helpers --------------------------------------------------------
  const getChartIcon = (index: number) => {
    const icons = [PieChart, TrendingUp, Calendar, Target];
    return icons[index % icons.length];
  };

  const renderBar = (
    title: string,
    data: Record<string, number>,
    color: string = "#1E76B6",
    index: number = 0
  ) => {
    const IconComponent = getChartIcon(index);
    const hasData = Object.keys(data).length > 0;

    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
        </div>

        <div className="p-6">
          {hasData ? (
            <div className="h-[350px]">
              <Bar
                data={{
                  labels: Object.keys(data),
                  datasets: [
                    {
                      label: title,
                      data: Object.values(data),
                      backgroundColor: color,
                      borderRadius: 8,
                      barPercentage: 0.7,
                      categoryPercentage: 0.8,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: "#0A183A",
                      titleColor: "white",
                      bodyColor: "white",
                      cornerRadius: 8,
                      displayColors: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { color: "#64748b", font: { size: 11 } },
                      grid: { color: "rgba(226,232,240,0.4)" },
                    },
                    x: {
                      ticks: { color: "#64748b", font: { size: 11 }, maxRotation: 45 },
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <IconComponent className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No hay datos disponibles</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // -- States ---------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-12 text-center">
          <LoaderCircle className="animate-spin w-12 h-12 text-[#1E76B6] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#0A183A] mb-2">Cargando estadísticas</h3>
          <p className="text-gray-600">Obteniendo datos de desechos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-red-100 shadow-lg p-12 text-center">
          <div className="bg-red-50 rounded-full p-4 w-fit mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-red-800 mb-2">Error al cargar datos</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const causalesData = dataCausales();
  const generalAvg =
    desechos.length > 0
      ? (desechos.reduce((acc, d) => acc + d.remanente, 0) / desechos.length).toFixed(1)
      : "0";

  // -- Render ---------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0A183A] mb-2">Estadísticas de Desechos</h1>
          <p className="text-gray-600">Análisis completo de los datos de desechos de llantas</p>
        </div>

        {/* Summary KPIs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#0A183A]/10 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-[#0A183A]" />
            </div>
            <h3 className="text-lg font-bold text-[#0A183A]">Resumen</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#0A183A] to-[#173D68] rounded-lg p-4 text-white">
              <p className="text-sm opacity-90">Total Registros</p>
              <p className="text-2xl font-bold">{desechos.length}</p>
            </div>
            <div className="bg-gradient-to-br from-[#173D68] to-[#1E76B6] rounded-lg p-4 text-white">
              <p className="text-sm opacity-90">Causales Únicas</p>
              <p className="text-2xl font-bold">{Object.keys(causalesData).length}</p>
            </div>
            <div className="bg-gradient-to-br from-[#1E76B6] to-[#348CCB] rounded-lg p-4 text-white">
              <p className="text-sm opacity-90">Meses Analizados</p>
              <p className="text-2xl font-bold">{Object.keys(avgRemanente).length}</p>
            </div>
            <div className="bg-gradient-to-br from-[#348CCB] to-[#1E76B6] rounded-lg p-4 text-white">
              <p className="text-sm opacity-90">Promedio General</p>
              <p className="text-2xl font-bold">{generalAvg}</p>
            </div>
          </div>
        </div>

        <br />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderBar("Desechos por Causal", causalesData, "#0A183A", 0)}
          {renderBar("Promedio Remanente por Mes", avgRemanente, "#173D68", 1)}
          {renderBar("Total Remanente por Mes", totalRemanente, "#1E76B6", 2)}
          {renderBar("Promedio Milímetros Desechados por Mes", avgMilimetros, "#348CCB", 3)}
        </div>
      </div>
    </div>
  );
};

export default Desechos;