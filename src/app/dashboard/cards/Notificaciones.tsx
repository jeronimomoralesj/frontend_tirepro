"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthProvider";
import { 
  Bell, 
  X, 
  Calendar, 
  AlertTriangle, 
  ChevronRight, 
  FileDown, 
  Loader2, 
  TrendingDown 
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Inspeccion {
  fecha: string;
  profundidad_cen?: number;
  profundidad_ext?: number;
  profundidad_int?: number;
}

interface Tire {
  id: string;
  placa: string;
  eje: string;
  marca?: string;
  dimension?: string;
  diseno?: string;
  inspecciones?: Inspeccion[];
}

export default function Notificaciones() {
  const auth = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [cambioInmediatoTires, setCambioInmediatoTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Improved function to calculate minimum depth - memoized to avoid recalculations
  const calculateMinDepth = useCallback((inspection: Inspeccion): number => {
    const depths = [
      inspection.profundidad_cen ?? Infinity,
      inspection.profundidad_ext ?? Infinity,
      inspection.profundidad_int ?? Infinity
    ].filter(depth => depth !== Infinity);
    
    return depths.length ? Math.min(...depths) : 0;
  }, []);

  // Memoized function to fetch tires data
  const fetchTires = useCallback(async () => {
    if (!auth.user?.companyId || !auth.token) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:6001/api/tires/company/${auth.user.companyId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Error al obtener datos");

      const tireData: Tire[] = await response.json();

      // Filter tires that need immediate replacement (depth ≤ 2mm)
      const cambioInmediato = tireData.filter(tire => {
        if (!tire.inspecciones?.length) return false;
        
        const lastInspection = tire.inspecciones[tire.inspecciones.length - 1];
        const minProfundidad = calculateMinDepth(lastInspection);
        
        return minProfundidad <= 2;
      });

      setCambioInmediatoTires(cambioInmediato);
    } catch (error) {
      console.error("Error fetching tires:", error);
      setError("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [auth.user?.companyId, auth.token, calculateMinDepth]);

  useEffect(() => {
    fetchTires();
  }, [fetchTires]);

  // Use memoization to avoid recreating this function on each render
  const generatePDF = useCallback(() => {
    const doc = new jsPDF();
    doc.text("Llantas con Cambio Inmediato", 14, 10);

    doc.autoTable({
      head: [["Placa", "Eje", "Marca", "Dimensión", "Diseño", "Última Profundidad (mm)"]],
      body: cambioInmediatoTires.map((tire) => {
        const lastInspection = tire.inspecciones?.at(-1);
        const minDepth = lastInspection ? calculateMinDepth(lastInspection) : 0;

        return [
          tire.placa,
          tire.eje,
          tire.marca || "N/A",
          tire.dimension || "N/A",
          tire.diseno || "N/A",
          `${minDepth.toFixed(1)} mm`,
        ];
      }),
    });

    doc.save("Llantas_Cambio_Inmediato.pdf");
  }, [cambioInmediatoTires, calculateMinDepth]);

  // Memoize notification count to avoid recalculations
  const notificationCount = useMemo(() => cambioInmediatoTires.length, [cambioInmediatoTires]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showPopup && !target.closest('.notification-popup') && !target.closest('.notification-trigger')) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopup]);

  return (
    <div className="relative">
      {/* Notification Bell Icon */}
      <button
        onClick={() => setShowPopup(!showPopup)}
        className="notification-trigger relative px-4 py-2 bg-[#173D68] text-white rounded-xl text-sm font-medium hover:bg-[#1E76B6] transition-colors flex items-center justify-center shadow-md"
      >
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {notificationCount}
          </span>
        )}
      </button>

      {/* Notification Popup */}
      {showPopup && (
        <div className="notification-popup absolute top-12 right-0 w-96 bg-white shadow-xl rounded-xl border border-gray-200 z-50 overflow-hidden transition-all">
          <div className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white p-4 flex justify-between items-center">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </h4>
            <button onClick={() => setShowPopup(false)} className="text-white/80 hover:text-white rounded-full p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Notification Content */}
          <div className="p-5 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-2 text-[#1E76B6]" />
                <p>Cargando datos...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-lg text-red-600 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            ) : notificationCount > 0 ? (
              <>
                <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-4 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <p>
                    <strong>{notificationCount}</strong> {notificationCount === 1 ? 'llanta requiere' : 'llantas requieren'} reemplazo inmediato
                  </p>
                </div>

              </>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <div className="bg-green-50 p-4 rounded-lg inline-flex items-center gap-2 text-green-700">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  No hay llantas con desgaste crítico
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {notificationCount > 0 && (
            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <a href="/dashboard/analista">
                <button className="px-4 py-2 bg-gradient-to-r from-[#173D68] to-[#1E76B6] text-white font-medium rounded-lg flex items-center gap-2 hover:opacity-90 transition shadow-sm">
                  Ver reporte completo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}