"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2'; // ✅ FIX: Bar comes from react-chartjs-2

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

interface DesechoData {
  causales: string;
  milimetrosDesechados: number;
  remanente: number;
  fecha: string;
}

interface Tire {
  desechos: DesechoData | null;
}

const DesechosStats: React.FC = () => {
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'causales' | 'remanente' | 'milimetros'>('causales');

  useEffect(() => {
    const fetchTires = async () => {
      try {
        // 1. Get the companyId (assuming it's saved in localStorage)
        const companyId = localStorage.getItem("companyId");
        if (!companyId) {
          console.error("No companyId found in localStorage");
          return;
        }

        // 2. Fetch tires for this company
        const res = await axios.get(`/api/tires/company/${companyId}`);
        const allTires = res.data as Tire[];
        setTires(allTires);
      } catch (err) {
        console.error("Error fetching tires", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTires();
  }, []);

  const desechosList = tires
    .map(t => t.desechos)
    .filter((d): d is DesechoData => d !== null);

  const causalesMap: Record<string, number> = {};
  const remanenteByMonth: Record<string, number[]> = {};
  const mmByMonth: Record<string, number[]> = {};

  for (const d of desechosList) {
    const month = new Date(d.fecha).toLocaleDateString("default", { year: "numeric", month: "short" });

    // Group by causales
    if (d.causales in causalesMap) {
      causalesMap[d.causales]++;
    } else {
      causalesMap[d.causales] = 1;
    }

    // Group remanente
    if (!remanenteByMonth[month]) remanenteByMonth[month] = [];
    remanenteByMonth[month].push(d.remanente);

    // Group mm
    if (!mmByMonth[month]) mmByMonth[month] = [];
    mmByMonth[month].push(d.milimetrosDesechados);
  }

  const chartData = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: '#173D68',
        borderRadius: 6,
      },
    ],
  };

  if (view === 'causales') {
    chartData.labels = Object.keys(causalesMap);
    chartData.datasets[0].data = Object.values(causalesMap);
  } else {
    const targetMap = view === 'remanente' ? remanenteByMonth : mmByMonth;
    chartData.labels = Object.keys(targetMap);
    chartData.datasets[0].data = chartData.labels.map(month => {
      const values = targetMap[month];
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: '#000',
        font: { size: 12, weight: 'bold' },
        formatter: (val: number) => val.toFixed(1),
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 12 } },
        grid: { color: 'rgba(226, 232, 240, 0.3)' },
      },
      x: {
        ticks: { color: '#94a3b8', font: { size: 12 } },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Estadísticas de Desechos</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('causales')}
          className={`px-4 py-2 rounded-lg text-sm ${view === 'causales' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Causales
        </button>
        <button
          onClick={() => setView('remanente')}
          className={`px-4 py-2 rounded-lg text-sm ${view === 'remanente' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Prom. Remanente
        </button>
        <button
          onClick={() => setView('milimetros')}
          className={`px-4 py-2 rounded-lg text-sm ${view === 'milimetros' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Prom. mm Desechados
        </button>
      </div>

      <div style={{ height: '360px' }}>
        {!loading && desechosList.length > 0 ? (
          <Bar data={chartData} options={options} />
        ) : (
          <p className="text-gray-500">No hay datos disponibles.</p>
        )}
      </div>
    </div>
  );
};

export default DesechosStats;
