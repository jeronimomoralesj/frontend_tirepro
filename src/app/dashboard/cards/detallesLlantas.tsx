'use client';

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Download,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Search,
} from "lucide-react";
// Note: XLSX import would be needed in actual implementation
// import * as XLSX from "xlsx";

export type CostEntry = {
  valor: number;
  fecha: string;
};

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
  cpk?: number;
  cpkProyectado?: number;
};

export type Tire = {
  id: string;
  placa: string;
  marca: string;
  diseno: string;
  profundidadInicial: number;
  dimension: string;
  eje: string;
  posicion: number;
  kilometrosRecorridos: number;
  costo: CostEntry[];
  vida: { valor: string; fecha: string }[];
  inspecciones: Inspection[];
  primeraVida: unknown[];
  eventos: { valor: string; fecha: string }[];
  vehicleId?: string;
};

interface Vehicle {
  id: string;
  placa: string;
}

interface DetallesLlantasProps {
  /** Neumáticos ya filtrados */
  tires: Tire[];
  /** Lista de vehículos para resolver placa via vehicleId */
  vehicles: Vehicle[];
}

// Translations object
const translations = {
  es: {
    title: "Detalles de Todas las Llantas",
    exportExcel: "Exportar Excel",
    searchPlaceholder: "Buscar por placa, marca, diseño o vehículo...",
    noResultsFound: "No se encontraron resultados para la búsqueda.",
    noTiresAvailable: "No hay llantas disponibles",
    vehiclePlate: "Placa Vehículo",
    tirePlate: "Placa Llanta",
    brand: "Marca",
    design: "Diseño",
    dimension: "Dimensión",
    axle: "Eje",
    position: "Posición",
    kmTraveled: "Km Recorridos",
    kmProjected: "Km Proyectados",
    life: "Vida",
    lastInspection: "Última Inspección",
    cpk: "CPK",
    cpkProjected: "CPK Proy",
    depthInt: "Profundidad Int",
    depthCenter: "Profundidad Cen",
    depthExt: "Profundidad Ext",
    wear: "Desgaste (%)",
    cost: "Costo",
    event: "Evento",
    results: "Resultados",
    of: "de",
    tires: "llantas",
    totalTires: "Total de llantas",
    updated: "Actualizado",
    firstLife: "Primera Vida",
    lastCost: "Último Costo",
    lastEvent: "Último Evento",
    currentLife: "Vida Actual"
  }
};

const DetallesLlantas: React.FC<DetallesLlantasProps> = ({
  tires,
  vehicles,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  
  // Ref for the content container
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Language select
  const [language, setLanguage] = useState<'es'>('es');

  // Language detection effect
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = 'es';
      setLanguage(saved);
      
    };

    detectAndSetLanguage();
  }, []);

  // Get current translations
  const t = translations[language];

  // Filtrar tanto por campos de neumático como por placa de vehículo
  const searchFilteredTires = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return tires.filter((t) => {
      const vehPlaca =
        vehicles.find((v) => v.id === t.vehicleId)?.placa?.toLowerCase() || "";
      return (
        t.placa.toLowerCase().includes(q) ||
        t.marca.toLowerCase().includes(q) ||
        t.diseno.toLowerCase().includes(q) ||
        t.dimension.toLowerCase().includes(q) ||
        t.eje.toLowerCase().includes(q) ||
        vehPlaca.includes(q)
      );
    });
  }, [tires, vehicles, searchTerm]);

  const exportToExcel = () => {
    setExporting(true);
    
    const exportData = searchFilteredTires.map((tire) => {
      const vehPlaca =
        vehicles.find((v) => v.id === tire.vehicleId)?.placa || "-";
      const vida = tire.vida.at(-1)?.valor || "-";
      const insp = tire.inspecciones.at(-1);
      const costo = tire.costo.at(-1)?.valor ?? "-";
      const evento = tire.eventos.at(-1)?.valor || "-";
      const primeraVida = tire.primeraVida.at(-1);

      const depths = insp
        ? [insp.profundidadInt, insp.profundidadCen, insp.profundidadExt]
        : [0, 0, 0];
      const minDepth = Math.min(...depths);

      const desgastePct =
        tire.profundidadInicial > 0
          ? minDepth <= 0
            ? "100%"
            : ((1 - minDepth / tire.profundidadInicial) * 100).toFixed(2) + "%"
          : "-";

      const kmProyectados =
        tire.profundidadInicial > 0 && minDepth > 0
          ? Math.round(
              tire.kilometrosRecorridos * (tire.profundidadInicial / minDepth)
            )
          : "-";

      return {
        [t.vehiclePlate]: vehPlaca,
        [t.tirePlate]: tire.placa,
        [t.brand]: tire.marca,
        [t.design]: tire.diseno,
        [t.dimension]: tire.dimension,
        [t.axle]: tire.eje,
        [t.position]: tire.posicion,
        [t.kmTraveled]: tire.kilometrosRecorridos,
        [t.kmProjected]: kmProyectados,
        [t.currentLife]: vida,
        [t.lastInspection]: insp
          ? new Date(insp.fecha).toLocaleDateString()
          : "-",
        [t.cpk]: insp?.cpk ?? "-",
        [t.cpkProjected]: insp?.cpkProyectado ?? "-",
        [t.depthInt]: insp?.profundidadInt ?? "-",
        [t.depthCenter]: insp?.profundidadCen ?? "-",
        [t.depthExt]: insp?.profundidadExt ?? "-",
        [t.wear]: desgastePct,
        [t.lastCost]: costo,
        [t.lastEvent]: evento,
        [t.firstLife]: primeraVida ? JSON.stringify(primeraVida) : "-",
      };
    });

    // Note: In actual implementation, you would use XLSX here:
    // const ws = XLSX.utils.json_to_sheet(exportData);
    // const wb = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(wb, ws, language === 'es' ? 'Llantas' : 'Tires');
    // XLSX.writeFile(wb, `${language === 'es' ? 'detalles_llantas' : 'tire_details'}.xlsx`);
    
    // For demo purposes, we'll just console.log the data
    console.log('Export data prepared:', exportData);
    alert(language === 'es' ? 'Datos preparados para exportar (ver consola)' : 'Export data prepared (check console)');
    
    setTimeout(() => setExporting(false), 1000);
  };

  // Language toggle component
  const LanguageToggle = () => (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => {
          const newLang = language === 'es' ? 'en' : 'es';
          setLanguage(newLang);
          localStorage.setItem('preferredLanguage', newLang);
        }}
        className="px-3 py-1.5 bg-white/20 text-white rounded hover:bg-white/30 transition flex items-center text-sm"
      >
        {language === 'es' ? 'EN' : 'ES'}
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header + Export */}
      <div className="bg-[#173D68] text-white p-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t.title}</h2>
        <div className="flex items-center space-x-3">
          <LanguageToggle />
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="px-3 py-1.5 bg-[#1E76B6] text-white rounded hover:bg-[#0A183A] transition flex items-center text-sm disabled:opacity-50"
          >
            <Download className="mr-1.5" size={16} /> 
            {exporting ? (language === 'es' ? 'Exportando...' : 'Exporting...') : t.exportExcel}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      <div className="p-6" ref={contentRef}>
        {searchFilteredTires.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
            {searchTerm ? (
              <>
                <AlertTriangle className="text-yellow-500" size={32} />
                <p>{t.noResultsFound}</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="text-green-500" size={32} />
                <p>{t.noTiresAvailable}</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-auto max-h-96 rounded-lg mb-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-[#173D68] text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">{t.vehiclePlate}</th>
                    <th className="px-4 py-2 text-left">{t.tirePlate}</th>
                    <th className="px-4 py-2 text-left">{t.brand}</th>
                    <th className="px-4 py-2 text-left">{t.design}</th>
                    <th className="px-4 py-2 text-left">{t.dimension}</th>
                    <th className="px-4 py-2 text-left">{t.axle}</th>
                    <th className="px-4 py-2 text-left">{t.position}</th>
                    <th className="px-4 py-2 text-left">{t.kmTraveled}</th>
                    <th className="px-4 py-2 text-left">{t.kmProjected}</th>
                    <th className="px-4 py-2 text-left">{t.life}</th>
                    <th className="px-4 py-2 text-left">{t.lastInspection}</th>
                    <th className="px-4 py-2 text-left">{t.cpk}</th>
                    <th className="px-4 py-2 text-left">{t.cpkProjected}</th>
                    <th className="px-4 py-2 text-left">{t.depthInt}</th>
                    <th className="px-4 py-2 text-left">{t.depthCenter}</th>
                    <th className="px-4 py-2 text-left">{t.depthExt}</th>
                    <th className="px-4 py-2 text-left">{t.wear}</th>
                    <th className="px-4 py-2 text-left">{t.cost}</th>
                    <th className="px-4 py-2 text-left">{t.event}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchFilteredTires.map((tire) => {
                    const vehPlaca =
                      vehicles.find((v) => v.id === tire.vehicleId)?.placa || "-";
                    const vida = tire.vida.at(-1)?.valor || "-";
                    const insp = tire.inspecciones.at(-1);
                    const costo = tire.costo.at(-1)?.valor ?? "-";
                    const evento = tire.eventos.at(-1)?.valor || "-";

                    const depths = insp
                      ? [insp.profundidadInt, insp.profundidadCen, insp.profundidadExt]
                      : [0, 0, 0];
                    const minDepth = Math.min(...depths);

                    const desgastePct =
                      tire.profundidadInicial > 0
                        ? ((1 - minDepth / tire.profundidadInicial) * 100).toFixed(2) + "%"
                        : "-";

                    const kmProyectados =
                      tire.profundidadInicial > 0 && minDepth > 0
                        ? Math.round(
                            tire.kilometrosRecorridos *
                              (tire.profundidadInicial / minDepth)
                          )
                        : "-";

                    return (
                      <tr key={tire.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{vehPlaca}</td>
                        <td className="px-4 py-2">{tire.placa}</td>
                        <td className="px-4 py-2">{tire.marca}</td>
                        <td className="px-4 py-2">{tire.diseno}</td>
                        <td className="px-4 py-2">{tire.dimension}</td>
                        <td className="px-4 py-2">{tire.eje}</td>
                        <td className="px-4 py-2">{tire.posicion}</td>
                        <td className="px-4 py-2">{tire.kilometrosRecorridos}</td>
                        <td className="px-4 py-2">{kmProyectados}</td>
                        <td className="px-4 py-2">{vida}</td>
                        <td className="px-4 py-2">
                          {insp
                            ? new Date(insp.fecha).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-2">{insp?.cpk ?? "-"}</td>
                        <td className="px-4 py-2">
                          {insp?.cpkProyectado ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          {insp?.profundidadInt ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          {insp?.profundidadCen ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          {insp?.profundidadExt ?? "-"}
                        </td>
                        <td className="px-4 py-2">{desgastePct}</td>
                        <td className="px-4 py-2">{costo}</td>
                        <td className="px-4 py-2">{evento}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
              <div className="text-xs text-gray-500 flex items-center">
                <FileSpreadsheet className="mr-1.5" size={14} />
                {searchTerm
                  ? `${t.results}: ${searchFilteredTires.length} ${t.of} ${tires.length} ${t.tires}`
                  : `${t.totalTires}: ${tires.length}`}
              </div>
              <div className="text-xs text-gray-500">
                {t.updated}: {new Date().toLocaleDateString()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DetallesLlantas;