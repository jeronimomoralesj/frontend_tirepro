"use client";

import { useState } from "react";
import {
  Search,
  Timer,
  FileText,
  Camera,
  AlertTriangle,
  Download,
  X
} from "lucide-react";
import jsPDF from "jspdf";

export default function InspeccionPage() {
  // Input states
  const [placaInput, setPlacaInput] = useState("");
  const [newKilometraje, setNewKilometraje] = useState(0);

  interface InspectionData {
    vehicle: Vehicle;
    tires: Array<{
      id: string;
      placa: string;
      marca: string;
      posicion: number;
      profundidadInicial: number;
      kilometrosRecorridos: number;
      costo: Array<{ valor: number }>;
      updates: {
        profundidadInt: number;
        profundidadCen: number;
        profundidadExt: number;
        image: File | null;
      };
      avgDepth: number;
      minDepth: number;
      cpk: string;
      cpkProyectado: string;
      projectedKm: number;
      imageBase64: string | null;
    }>;
    date: string;
    kmDiff: number;
  }
  
  // Data states
  type Vehicle = {
    id: string;
    placa: string;
    tipovhc: string;
    tireCount: number;
    kilometrajeActual: number;
  };

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  interface Inspection {
    profundidadInt: number;
    profundidadCen: number;
    profundidadExt: number;
    imageUrl: string;
    cpk: string;
    cpkProyectado: string;
    fecha: string;
  }
  
  type Tire = {
    id: string;
    placa: string;
    marca: string;
    posicion: number;
    profundidadInicial: number;
    kilometrosRecorridos: number;
    costo: Array<{valor: number}>;
    inspecciones: Inspection[];  
  };

  const [tires, setTires] = useState<Tire[]>([]);
  const [tireUpdates, setTireUpdates] = useState<{
    [id: string]: {
      profundidadInt: number | "";
      profundidadCen: number | "";
      profundidadExt: number | "";
      image: File | null
    }
  }>({});

  // UI states
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);

  // Helper function to convert File to base64 string
  function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  // Calculate CPK based on backend logic
  function calculateCpk(tire: Tire, minDepth: number, kmDiff: number) {
    // Get the updated total km for the tire
    const newTireKm = tire.kilometrosRecorridos + kmDiff;

    // Calculate total cost by summing the costo array
    const totalCost = tire.costo.reduce((sum, entry) => sum + entry.valor, 0);


    // Calculate cost per kilometer (cpk)
    const cpk = newTireKm > 0 ? totalCost / newTireKm : 0;

    // Calculate the projected cost per kilometer (cpkProyectado)
    const profundidadInicial = tire.profundidadInicial || 8; // Default to 8mm if not set
    const denominator = (newTireKm / (profundidadInicial - minDepth)) * profundidadInicial;
    const cpkProyectado = denominator > 0 ? totalCost / denominator : 0;

    // Calculate projected distance until reaching minimum depth (2mm)
    const minAcceptableDepth = 2;
    let projectedKm = 0;

    if (minDepth > minAcceptableDepth) {
      // Calculate wear rate (mm per km)
      const wearRate = (profundidadInicial - minDepth) / newTireKm;
      
      // If the tire is wearing, project distance until it reaches minimum acceptable depth
      if (wearRate > 0) {
        projectedKm = Math.round((minDepth - minAcceptableDepth) / wearRate);
      }
    }

    return {
      cpk: cpk.toFixed(3),
      cpkProyectado: cpkProyectado.toFixed(3),
      projectedKm
    };
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVehicle(null);
    setTires([]);
    setTireUpdates({});
    if (!placaInput.trim()) {
      setError("Por favor ingrese la placa del vehículo");
      return;
    }
    setLoading(true);
    try {
      // Fetch vehicle by placa.
      const vehicleRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/placa?placa=${encodeURIComponent(placaInput.trim())}`
          : `https://api.tirepro.com.co/api/vehicles/placa?placa=${encodeURIComponent(placaInput.trim())}`
      );
      if (!vehicleRes.ok) {
        throw new Error("Vehículo no encontrado");
      }
      const vehicleData = await vehicleRes.json();
      setVehicle(vehicleData);
      setNewKilometraje(vehicleData.kilometrajeActual);

      // Fetch tires by vehicle id.
      const tiresRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/vehicle?vehicleId=${vehicleData.id}`
          : `https://api.tirepro.com.co/api/tires/vehicle?vehicleId=${vehicleData.id}`
      );
      if (!tiresRes.ok) {
        throw new Error("Error al obtener las llantas");
      }
      const tiresData: Tire[] = await tiresRes.json();
      // Sort tires by posicion
      tiresData.sort((a, b) => a.posicion - b.posicion);
      setTires(tiresData);

      // Initialize tireUpdates state with default values.
      const initialUpdates: { [id: string]: { profundidadInt: number | ""; profundidadCen: number | ""; profundidadExt: number | ""; image: File | null } } = {};
      tiresData.forEach((tire) => {
        initialUpdates[tire.id] = {
          profundidadInt: "",
          profundidadCen: "",
          profundidadExt: "",
          image: null,
        };
      });
      setTireUpdates(initialUpdates);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado");
      }
    }
    finally {
      setLoading(false);
    }
  }

  function handleInputChange(
    tireId: string,
    field: "profundidadInt" | "profundidadCen" | "profundidadExt" | "image",
    value: number | File | null
  ) {
    setTireUpdates((prev) => ({
      ...prev,
      [tireId]: {
        ...prev[tireId],
        [field]: value,
      },
    }));
  }

  async function handleSubmitInspections(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1) Basic numeric validation
      const invalidTires = tires.filter(tire => {
        const upd = tireUpdates[tire.id];
        return (
          (upd.profundidadInt === "" || isNaN(Number(upd.profundidadInt))) ||
          (upd.profundidadCen === "" || isNaN(Number(upd.profundidadCen))) ||
          (upd.profundidadExt === "" || isNaN(Number(upd.profundidadExt)))
        );
      });
      if (invalidTires.length > 0) {
        throw new Error("Por favor ingrese valores numéricos válidos para todas las profundidades");
      }

      // 2) Count zero‐value depth fields
      let zeroCount = 0;
      tires.forEach(tire => {
        const upd = tireUpdates[tire.id];
        if (Number(upd.profundidadInt) === 0) zeroCount++;
        if (Number(upd.profundidadCen) === 0) zeroCount++;
        if (Number(upd.profundidadExt) === 0) zeroCount++;
      });
      if (zeroCount > 0) {
        const proceed = window.confirm(
          `Se encontraron ${zeroCount} campo${zeroCount > 1 ? "s" : ""} con valor 0. ¿Desea continuar?`
        );
        if (!proceed) {
          setLoading(false);
          return;  // abort submission to let the user edit
        }
      }

      // Calculate km difference
      const kmDiff = vehicle ? Number(newKilometraje) - vehicle.kilometrajeActual : 0;

      // 3) Send updates
      const updatePromises = tires.map(async tire => {
        const upd = tireUpdates[tire.id];
        const payload = {
          profundidadInt: Number(upd.profundidadInt),
          profundidadCen: Number(upd.profundidadCen),
          profundidadExt: Number(upd.profundidadExt),
          newKilometraje: Number(newKilometraje),
          imageUrl: upd.image ? await convertFileToBase64(upd.image) : ""
        };

        const res = await fetch(
          process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/${tire.id}/inspection`
            : `https://api.tirepro.com.co/api/tires/${tire.id}/inspection`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Error al actualizar el neumático ${tire.id}: ${text}`);
        }
        return res.json();
      });

      await Promise.all(updatePromises);
      alert("Inspecciones actualizadas exitosamente");

      
      // Prepare data for the PDF export
      const inspectionDataForPDF = {
        vehicle,
        tires: tires.map(tire => {
          const updData = tireUpdates[tire.id];
          
          // Convert string values to numbers
          const profundidadInt = Number(updData.profundidadInt);
          const profundidadCen = Number(updData.profundidadCen);
          const profundidadExt = Number(updData.profundidadExt);
          
          // Calculate average depth
          const avgDepth = (profundidadInt + profundidadCen + profundidadExt) / 3;
          
          // Calculate the minimum depth (most worn part)
          const minDepth = Math.min(profundidadInt, profundidadCen, profundidadExt);
          
          // Calculate CPK using the backend-compatible function
          const cpkData = calculateCpk(tire, minDepth, kmDiff);
          
          return {
            ...tire,
            updates: {
              profundidadInt,
              profundidadCen,
              profundidadExt,
              image: updData.image
            },
            avgDepth,
            minDepth,
            cpk: cpkData.cpk,
            cpkProyectado: cpkData.cpkProyectado,
            projectedKm: cpkData.projectedKm,
            imageBase64: updData.image ? null : null // Will be updated when generating PDF
          };
        }),
        date: new Date().toISOString().split('T')[0],
        kmDiff
      };
      
      setInspectionData(inspectionDataForPDF);
      setShowExportPopup(true);
      
      // We'll reset the form after the user closes the export popup
      
    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }

  async function generatePDF() {
    if (!inspectionData || !vehicle) return;

    try {
      setLoading(true);
      
      // Create new PDF document (landscape mode for better layout)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      // Define colors and styles
      const colors = {
        primary: [24, 61, 104],    // #183D68
        secondary: [30, 118, 182], // #1E76B6
        accent: [10, 24, 58],      // #0A183A
        text: [60, 60, 60]         // #3C3C3C
      };
      
      // Helper function to add page with header, footer and watermark
      function addPageWithTemplate(pageNum, totalPages) {
        // Add watermark
        doc.setTextColor(230, 230, 230); // Light gray
        doc.setFontSize(60);
        doc.setFont("helvetica", "bold");
        doc.text("TirePro", 105, 150, { align: "center", angle: 45 });
        
        // Header
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, 210, 25, "F");
        
        // Logo placeholder
        doc.setFillColor(...colors.secondary);
        doc.roundedRect(15, 5, 40, 15, 3, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TirePro", 35, 14, { align: "center" });
        
        // Report title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Reporte de Inspección", 130, 14, { align: "center" });
        
        // Footer
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 282, 210, 15, "F");
        
        // Page number
        doc.setTextColor(...colors.text);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Página ${pageNum} de ${totalPages}`, 105, 290, { align: "center" });
        
        // Date
        const currentDate = new Date().toLocaleDateString();
        doc.text(`Fecha de inspección: ${currentDate}`, 15, 290);
        
        // Return the starting Y position after header
        return 35;
      }
      
      // Count how many pages we'll need
      // We estimate roughly 5 tires per page after vehicle info
      const estimatedPages = Math.ceil((1 + (inspectionData.tires.length / 5)));
      
      // First page
      let yPosition = addPageWithTemplate(1, estimatedPages);
      let currentPage = 1;
      
      // Add vehicle info box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(15, yPosition, 180, 45, 3, 3, "F");
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text("Datos del Vehículo", 20, yPosition + 8);
      
      // Two columns for vehicle info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...colors.text);
      
      // Left column
      yPosition += 8;
      doc.text(`Placa: ${vehicle.placa}`, 25, yPosition + 10);
      doc.text(`Tipo: ${vehicle.tipovhc}`, 25, yPosition + 18);
      doc.text(`Cantidad de Llantas: ${vehicle.tireCount}`, 25, yPosition + 26);
      
      // Right column
      doc.text(`Fecha de Inspección: ${inspectionData.date}`, 110, yPosition + 10);
      doc.text(`Kilometraje Anterior: ${vehicle.kilometrajeActual} km`, 110, yPosition + 18);
      doc.text(`Kilometraje Actual: ${newKilometraje} km`, 110, yPosition + 26);
      doc.text(`Distancia Recorrida: ${inspectionData.kmDiff} km`, 110, yPosition + 34);
      
      yPosition += 55;
      
      // Add tire inspection title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text("Inspección de Neumáticos", 20, yPosition);
      yPosition += 10;
      
      // Process each tire
      for (let i = 0; i < inspectionData.tires.length; i++) {
        const tire = inspectionData.tires[i];
        
        // Check if we need a new page (leaving space for image)
        const tireBlockHeight = tire.updates.image ? 100 : 60;
        if (yPosition + tireBlockHeight > 270) {
          doc.addPage();
          currentPage++;
          yPosition = addPageWithTemplate(currentPage, estimatedPages);
        }
        
        // Tire info box
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(15, yPosition, 180, tireBlockHeight, 3, 3, "F");
        
        // Tire position highlight
        doc.setFillColor(...colors.secondary);
        doc.roundedRect(15, yPosition, 50, 10, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`POSICIÓN ${tire.posicion}`, 40, yPosition + 7, { align: "center" });
        
        // Tire details
        yPosition += 15;
        doc.setTextColor(...colors.accent);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${tire.marca}`, 25, yPosition);
        
        doc.setTextColor(...colors.text);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`ID: ${tire.placa}`, 25, yPosition + 8);
        
        // Profundidades box
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(25, yPosition + 12, 75, 35, 2, 2, "F");
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Profundidades", 62.5, yPosition + 19, { align: "center" });
        
        doc.setFont("helvetica", "normal");
        doc.text(`Interior: ${tire.updates.profundidadInt} mm`, 35, yPosition + 27);
        doc.text(`Central: ${tire.updates.profundidadCen} mm`, 35, yPosition + 34);
        doc.text(`Exterior: ${tire.updates.profundidadExt} mm`, 35, yPosition + 41);
        
        // Average depth and CPK
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(110, yPosition + 12, 75, 35, 2, 2, "F");
        
        doc.setFont("helvetica", "bold");
        doc.text("Análisis de Desgaste", 147.5, yPosition + 19, { align: "center" });
        
        doc.setFont("helvetica", "normal");
        doc.text(`Promedio: ${tire.avgDepth.toFixed(2)} mm`, 120, yPosition + 27);
        doc.text(`CPK: ${tire.cpk}`, 120, yPosition + 34);
        
        // Add image if available
        if (tire.updates.image) {
          try {
            const imgData = await convertFileToBase64(tire.updates.image);
            doc.addImage(imgData, 'JPEG', 65, yPosition + 50, 80, 40);
          } catch (e) {
            console.error("Error adding image to PDF", e);
          }
        }
        
        // Add some spacing
        yPosition += tireBlockHeight + 10;
      }
      
      // Add summary page
      doc.addPage();
      currentPage++;
      yPosition = addPageWithTemplate(currentPage, estimatedPages + 1); // Add one more for summary
      
      // Summary title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text("Resumen de Inspección", 105, yPosition, { align: "center" });
      yPosition += 15;
      
      // Summary box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(15, yPosition, 180, 60, 3, 3, "F");
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.accent);
      doc.text(`Vehículo: ${vehicle.placa} - ${vehicle.tipovhc}`, 25, yPosition + 10);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.text);
      doc.text(`Fecha de Inspección: ${inspectionData.date}`, 25, yPosition + 20);
      doc.text(`Kilometraje Recorrido: ${inspectionData.kmDiff} km`, 25, yPosition + 30);
      
      // Average CPK across all tires
      const avgCpk = inspectionData.tires.reduce((sum, tire) => sum + parseFloat(tire.cpk), 0) / inspectionData.tires.length;
      doc.text(`CPK Promedio: ${avgCpk.toFixed(3)}`, 25, yPosition + 40);
      
      // Find minimum projected km
      let minProjectedKm = Infinity;
      let minProjectedTirePos = 0;
      
      inspectionData.tires.forEach(tire => {
        if (tire.projectedKm < minProjectedKm && tire.projectedKm > 0) {
          minProjectedKm = tire.projectedKm;
          minProjectedTirePos = tire.posicion;
        }
      });
      
      if (minProjectedKm === Infinity) minProjectedKm = 0;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Próximo Cambio Estimado: ${minProjectedKm} km (Posición ${minProjectedTirePos})`, 25, yPosition + 50);
      
      // Save the PDF
      doc.save(`inspeccion_${vehicle.placa}_${inspectionData.date}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setLoading(false);
    }
  }

  function handleClosePopupAndReset() {
    setShowExportPopup(false);

    // Now reset the form
    if (vehicle) {
      setNewKilometraje(vehicle.kilometrajeActual);
    }

    const initial = tires.reduce((acc, t) => {
      acc[t.id] = { profundidadInt: "", profundidadCen: "", profundidadExt: "", image: null };
      return acc;
    }, {} as typeof tireUpdates);
    setTireUpdates(initial);
  }

  return (
    <div className="min-h-screen bg-white text-[#0A183A] font-sans">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-xl font-semibold text-[#0A183A] mb-4">Ingrese la placa del vehiculo</h1>
        
        {/* Search Section */}
        <div className="bg-[#348CCB]/10 rounded-xl p-6 mb-6 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
              <input
                type="text"
                placeholder="Ingrese la placa del vehículo"
                value={placaInput}
                onChange={(e) => setPlacaInput(e.target.value.toLowerCase())}
                className="w-full px-4 py-3 pl-10 border-2 border-[#1E76B6]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1E76B6]" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-[#0A183A] text-white rounded-lg hover:bg-[#1E76B6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse">Buscando...</span>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Buscar
                </>
              )}
            </button>
          </form>
          {error && (
            <div className="mt-4 flex items-center text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="mr-3 text-red-600" />
              {error}
            </div>
          )}
        </div>

        {/* Vehicle Details */}
        {vehicle && (
          <div className="bg-[#173D68]/5 rounded-xl p-6 mb-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[#1E76B6]" />
                  Datos del Vehículo
                </h2>
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span className="font-medium">Placa:</span> 
                    <span>{vehicle.placa}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-medium">Tipo VHC:</span> 
                    <span>{vehicle.tipovhc}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-medium">Cantidad de Llantas:</span> 
                    <span>{vehicle.tireCount}</span>
                  </p>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Timer className="w-6 h-6 text-[#1E76B6]" />
                  Kilometraje
                </h2>
                <div className="relative">
                  <input
                    type="number"
                    value={newKilometraje}
                    onChange={(e) => setNewKilometraje(Number(e.target.value))}
                    className="w-full px-4 py-3 border-2 border-[#1E76B6]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">km</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tire Inspections */}
        {tires.length > 0 && (
          <form onSubmit={handleSubmitInspections}>
            <div className="space-y-6">
              {tires.map((tire) => (
                <div 
                  key={tire.id} 
                  className="bg-[#173D68]/5 rounded-xl p-6 shadow-sm border-l-4 border-[#1E76B6]"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-[#1E76B6]" />
                        Detalles del Neumático
                      </h3>
                      <div className="space-y-2">
                        <p className="flex justify-baseline">
                          <span className="font-medium">ID: </span> 
                          <span>{tire.placa}</span>
                        </p>
                        <p className="flex justify-baseline">
                          <span className="font-medium">Marca: </span> 
                          <span>{tire.marca}</span>
                        </p>
                        <p className="flex justify-baseline">
                          <span className="font-medium">Posición: </span> 
                          <span>{tire.posicion}</span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Mediciones de Profundidad</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {['profundidadInt', 'profundidadCen', 'profundidadExt'].map((field) => (
                          <div key={field}>
                            <label className="block text-sm font-medium mb-1 text-center">
                              {field === 'profundidadInt' ? 'Interior' : 
                               field === 'profundidadCen' ? 'Central' : 'Exterior'}
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={tireUpdates[tire.id]?.[field as "profundidadInt" | "profundidadCen" | "profundidadExt"] || ""}
                              onChange={(e) =>
                                handleInputChange(
                                  tire.id,
                                  field as "profundidadInt" | "profundidadCen" | "profundidadExt",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 border-2 border-[#1E76B6]/30 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-1">Imagen del Neumático</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleInputChange(
                              tire.id,
                              "image",
                              e.target.files ? e.target.files[0] : null
                            )
                          }
                          className="w-full file:mr-4 file:rounded-lg file:border-0 file:bg-[#1E76B6] file:text-white file:px-4 file:py-2 hover:file:bg-[#173D68]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full bg-[#0A183A] text-white py-3 rounded-lg hover:bg-[#1E76B6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-pulse">Actualizando...</span>
              ) : (
                "Actualizar Inspecciones"
              )}
            </button>
          </form>
        )}

        {vehicle && tires.length === 0 && !loading && (
          <div className="text-center bg-[#348CCB]/10 p-6 rounded-xl">
            <p className="text-[#0A183A]">No se encontraron llantas para este vehículo.</p>
          </div>
        )}
        
        {/* Export Popup */}
        {showExportPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-[#0A183A]">Exportar Inspección</h3>
                <button 
                  onClick={handleClosePopupAndReset}
                  className="text-gray-500 hover:text-[#0A183A]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <p className="mb-6 text-gray-600">
                La inspección ha sido guardada exitosamente. Puede exportar un reporte en PDF con todos los datos incluyendo CPK y proyecciones.
              </p>
              
              <button
                onClick={generatePDF}
                disabled={loading}
                className="w-full py-3 bg-[#0A183A] text-white rounded-lg hover:bg-[#1E76B6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-pulse">Generando PDF...</span>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Exportar a PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}