"use client";

import { HelpCircle } from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Define types for Vehicle, Inspection, and Tire.
export interface Vehicle {
  id: string;
  placa: string;
}

export interface Inspection {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
}

export interface Tire {
  id: string;
  vehicleId?: string | null;
  posicion: number;
  inspecciones?: Inspection[];
}

interface SemaforoTablaProps {
  vehicles: Vehicle[];
  tires: Tire[];
}

// Define the positions (adjust if needed)
const positions = [1, 2, 3, 4, 5, 6];

// Translations
const translations = {
  es: {
    title: "Semáforo Tabla",
    tooltip: "Este gráfico muestra tus llantas por posición en cada uno de sus vehículos y su profundidad actual.",
    placa: "Placa",
    pos: "Pos"
  },
  en: {
    title: "Traffic Light Table",
    tooltip: "This chart shows your tires by position in each of your vehicles and their current depth.",
    placa: "Plate",
    pos: "Pos"
  }
};

const SemaforoTabla: React.FC<SemaforoTablaProps> = ({ vehicles, tires }) => {
  const router = useRouter();
  
  // Language detection state
  const [language, setLanguage] = useState<'en'|'es'>('es');

  // Language detection effect
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = localStorage.getItem('preferredLanguage') as 'en'|'es';
      if (saved) {
        setLanguage(saved);
        return;
      }
      
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject('no geo');
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
        );
        
        if (resp.ok) {
          const { countryCode } = await resp.json();
          const lang = (countryCode === 'US' || countryCode === 'CA') ? 'en' : 'es';
          setLanguage(lang);
          localStorage.setItem('preferredLanguage', lang);
          return;
        }
      } catch {
        // fallback to browser language detection
      }
      
      // Browser fallback
      const browser = navigator.language || navigator.languages?.[0] || 'es';
      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };

    detectAndSetLanguage();
  }, []);

  // Get current translations
  const t = translations[language];

  // Filter out vehicles with placa "fin"
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => vehicle.placa.toLowerCase() !== "fin");
  }, [vehicles]);

  // Prepare table data: for each vehicle, build a row where each cell (by position)
  // shows the smallest depth (in mm) from the last inspection of tires matching that position.
  const tableData = useMemo(() => {
    // First, identify vehicles that have at least one tire
    const vehiclesWithTires = filteredVehicles.filter(vehicle => 
      tires.some(tire => tire.vehicleId === vehicle.id)
    );

    return vehiclesWithTires.map((vehicle) => {
      const row = {
        placa: vehicle.placa,
        depths: {} as { [position: number]: number | null },
      };

      positions.forEach((pos) => {
        // Filter tires that belong to this vehicle with the given position and have at least one inspection.
        const tiresForPos = tires.filter(
          (tire) =>
            tire.vehicleId === vehicle.id &&
            tire.posicion === pos &&
            tire.inspecciones &&
            tire.inspecciones.length > 0
        );

        if (tiresForPos.length > 0) {
          // For each matching tire, get the minimal depth from its latest inspection.
          const depthValues = tiresForPos.map((tire) => {
            const lastInspection = tire.inspecciones![tire.inspecciones!.length - 1];
            return Math.min(
              lastInspection.profundidadInt,
              lastInspection.profundidadCen,
              lastInspection.profundidadExt
            );
          });
          // Store the smallest depth among all tires for this vehicle and position.
          row.depths[pos] = Math.min(...depthValues);
        } else {
          row.depths[pos] = null;
        }
      });

      return row;
    });
  }, [filteredVehicles, tires]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
      {/* Card Title */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.title}</h2>
        <div className="group relative cursor-pointer">
          <HelpCircle
            className="text-white hover:text-gray-200 transition-colors"
            size={24}
          />
          <div className="
            absolute z-10 -top-2 right-full 
            bg-[#0A183A] text-white 
            text-xs p-3 rounded-lg 
            opacity-0 group-hover:opacity-100 
            transition-opacity duration-300 
            w-60 pointer-events-none
          ">
            <p>
              {t.tooltip}
            </p>
          </div>
        </div>
      </div>
      
      {/* Table container with both horizontal and vertical scroll */}
      <div className="overflow-auto relative" style={{ maxHeight: "70vh" }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-0">
            <tr>
              {/* Fixed column header (top-left corner) */}
              <th className="px-4 py-2 text-left sticky left-0 z-0 bg-gray-100 min-w-[120px]">
                {t.placa}
              </th>
              {/* Regular headers (sticky top) */}
              {positions.map((pos) => (
                <th key={pos} className="px-4 py-2 text-center bg-gray-100 min-w-[80px]">
                  {t.pos} {pos}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx} className="border-t">
                {/* Fixed first column */}
                <td className="px-4 py-2 sticky left-0 bg-white font-bold z-0 min-w-[120px]">
                  {row.placa.toUpperCase()}
                </td>
                {/* Regular cells */}
                {positions.map((pos) => {
                  const value = row.depths[pos];
                  let bg = "bg-gray-200 text-gray-700"; // default
                  if (value !== null) {
                    if (value <= 3) bg = "bg-red-100 text-red-800";
                    else if (value <= 6) bg = "bg-yellow-100 text-yellow-800";
                    else bg = "bg-green-100 text-green-800";
                  }

                  return (
                    <td key={pos} className="px-4 py-2 text-center min-w-[80px]">
                      {value !== null ? (
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${bg}`}>
                          {value}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SemaforoTabla;