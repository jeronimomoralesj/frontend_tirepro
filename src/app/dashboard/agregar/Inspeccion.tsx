"use client";

import { useState } from "react";
import {
  Search,
  Timer,
  FileText,
  Camera,
  AlertTriangle,
  Download,
  X,
  Link
} from "lucide-react";
import jsPDF from "jspdf";

export default function InspeccionPage() {
  // Input states
  const [placaInput, setPlacaInput] = useState("");
  const [newKilometraje, setNewKilometraje] = useState(0);

  interface InspectionData {
    vehicle: Vehicle;
    unionVehicle?: Vehicle;
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
      vehicleId: string; // Add this to identify which vehicle the tire belongs to
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
    union?: string; // Add union field
  };

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [unionVehicle, setUnionVehicle] = useState<Vehicle | null>(null);

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
    vehicleId: string; // Add this to identify which vehicle the tire belongs to
  };

  const [tires, setTires] = useState<Tire[]>([]);
  const [unionTires, setUnionTires] = useState<Tire[]>([]);
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
    setUnionVehicle(null);
    setTires([]);
    setUnionTires([]);
    setTireUpdates({});
    
    if (!placaInput.trim()) {
      setError("Por favor ingrese la placa del vehículo");
      return;
    }
    
    setLoading(true);
    try {
      // Fetch vehicle by placa
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

      // Check for union vehicle
      let unionVehicleData = null;
      if (vehicleData.union) {
        try {
          const unionVehicleRes = await fetch(
            process.env.NEXT_PUBLIC_API_URL
              ? `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles/placa?placa=${encodeURIComponent(vehicleData.union)}`
              : `https://api.tirepro.com.co/api/vehicles/placa?placa=${encodeURIComponent(vehicleData.union)}`
          );
          if (unionVehicleRes.ok) {
            unionVehicleData = await unionVehicleRes.json();
            setUnionVehicle(unionVehicleData);
          }
        } catch (err) {
          console.warn("Union vehicle not found or error fetching:", err);
        }
      }

      // Fetch tires for main vehicle
      const tiresRes = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/vehicle?vehicleId=${vehicleData.id}`
          : `https://api.tirepro.com.co/api/tires/vehicle?vehicleId=${vehicleData.id}`
      );
      if (!tiresRes.ok) {
        throw new Error("Error al obtener las llantas");
      }
      const tiresData: Tire[] = await tiresRes.json();
      tiresData.sort((a, b) => a.posicion - b.posicion);
      setTires(tiresData);

      // Fetch tires for union vehicle if it exists
      let unionTiresData: Tire[] = [];
      if (unionVehicleData) {
        try {
          const unionTiresRes = await fetch(
            process.env.NEXT_PUBLIC_API_URL
              ? `${process.env.NEXT_PUBLIC_API_URL}/api/tires/vehicle?vehicleId=${unionVehicleData.id}`
              : `https://api.tirepro.com.co/api/tires/vehicle?vehicleId=${unionVehicleData.id}`
          );
          if (unionTiresRes.ok) {
            unionTiresData = await unionTiresRes.json();
            unionTiresData.sort((a, b) => a.posicion - b.posicion);
            setUnionTires(unionTiresData);
          }
        } catch (err) {
          console.warn("Error fetching union vehicle tires:", err);
        }
      }

      // Initialize tireUpdates state with default values for all tires
      const allTires = [...tiresData, ...unionTiresData];
      const initialUpdates: { [id: string]: { profundidadInt: number | ""; profundidadCen: number | ""; profundidadExt: number | ""; image: File | null } } = {};
      allTires.forEach((tire) => {
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
      const allTires = [...tires, ...unionTires];
      
      // 1) Basic numeric validation
      const invalidTires = allTires.filter(tire => {
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

      // 2) Count zero-value depth fields
      let zeroCount = 0;
      allTires.forEach(tire => {
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
          return;
        }
      }

      // Calculate km difference based on main vehicle
      const kmDiff = vehicle ? Number(newKilometraje) - vehicle.kilometrajeActual : 0;

      // 3) Send updates for all tires (main vehicle and union vehicle)
      const updatePromises = allTires.map(async tire => {
        const upd = tireUpdates[tire.id];
        
        // Determine the new kilometraje for this tire's vehicle
        let tireNewKilometraje = Number(newKilometraje);
        if (unionVehicle && tire.vehicleId === unionVehicle.id) {
          // For union vehicle tires, add the km difference to their current km
          tireNewKilometraje = unionVehicle.kilometrajeActual + kmDiff;
        }
        
        const payload = {
          profundidadInt: Number(upd.profundidadInt),
          profundidadCen: Number(upd.profundidadCen),
          profundidadExt: Number(upd.profundidadExt),
          newKilometraje: tireNewKilometraje,
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
        unionVehicle,
        tires: allTires.map(tire => {
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
            imageBase64: updData.image ? null : null,
            vehicleId: tire.vehicleId
          };
        }),
        date: new Date().toISOString().split('T')[0],
        kmDiff
      };
      
      setInspectionData(inspectionDataForPDF);
      setShowExportPopup(true);
      
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
      
      // Create new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      // Define colors and styles
      const colors = {
        primary: [24, 61, 104],
        secondary: [30, 118, 182],
        accent: [10, 24, 58],
        text: [60, 60, 60]
      };
      
      // Helper function to add page with header, footer and watermark
      function addPageWithTemplate(pageNum, totalPages) {
        // Add watermark
        doc.setTextColor(230, 230, 230);
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
        
        return 35;
      }
      
      // Count pages needed
      const estimatedPages = Math.ceil((2 + (inspectionData.tires.length / 5)));
      
      // First page
      let yPosition = addPageWithTemplate(1, estimatedPages);
      let currentPage = 1;
      
      // Add main vehicle info box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(15, yPosition, 180, 45, 3, 3, "F");
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text("Vehículo Principal", 20, yPosition + 8);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...colors.text);
      
      yPosition += 8;
      doc.text(`Placa: ${vehicle.placa}`, 25, yPosition + 10);
      doc.text(`Tipo: ${vehicle.tipovhc}`, 25, yPosition + 18);
      doc.text(`Cantidad de Llantas: ${vehicle.tireCount}`, 25, yPosition + 26);
      
      doc.text(`Fecha de Inspección: ${inspectionData.date}`, 110, yPosition + 10);
      doc.text(`Kilometraje Anterior: ${vehicle.kilometrajeActual} km`, 110, yPosition + 18);
      doc.text(`Kilometraje Actual: ${newKilometraje} km`, 110, yPosition + 26);
      doc.text(`Distancia Recorrida: ${inspectionData.kmDiff} km`, 110, yPosition + 34);
      
      yPosition += 55;

      // Add union vehicle info if exists
      if (unionVehicle) {
        doc.setFillColor(235, 245, 255);
        doc.roundedRect(15, yPosition, 180, 45, 3, 3, "F");
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.secondary);
        doc.text("Vehículo en Unión", 20, yPosition + 8);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...colors.text);
        
        const unionNewKm = unionVehicle.kilometrajeActual + inspectionData.kmDiff;
        
        yPosition += 8;
        doc.text(`Placa: ${unionVehicle.placa}`, 25, yPosition + 10);
        doc.text(`Tipo: ${unionVehicle.tipovhc}`, 25, yPosition + 18);
        doc.text(`Cantidad de Llantas: ${unionVehicle.tireCount}`, 25, yPosition + 26);
        
        doc.text(`Kilometraje Anterior: ${unionVehicle.kilometrajeActual} km`, 110, yPosition + 10);
        doc.text(`Kilometraje Actual: ${unionNewKm} km`, 110, yPosition + 18);
        doc.text(`Distancia Recorrida: ${inspectionData.kmDiff} km`, 110, yPosition + 26);
        
        yPosition += 55;
      }
      
      // Add tire inspection title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text("Inspección de Neumáticos", 20, yPosition);
      yPosition += 10;
      
      // Group tires by vehicle
      const mainVehicleTires = inspectionData.tires.filter(tire => tire.vehicleId === vehicle.id);
      const unionVehicleTires = inspectionData.tires.filter(tire => unionVehicle && tire.vehicleId === unionVehicle.id);
      
      // Process main vehicle tires
      if (mainVehicleTires.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.primary);
        doc.text(`Neumáticos - ${vehicle.placa}`, 20, yPosition);
        yPosition += 10;
        
        for (const tire of mainVehicleTires) {
          const tireBlockHeight = tire.updates.image ? 100 : 60;
          if (yPosition + tireBlockHeight > 270) {
            doc.addPage();
            currentPage++;
            yPosition = addPageWithTemplate(currentPage, estimatedPages);
          }
          
          // Render tire block
          yPosition = await renderTireBlock(doc, tire, yPosition, colors);
        }
      }
      
      // Process union vehicle tires
      if (unionVehicleTires.length > 0) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.secondary);
        doc.text(`Neumáticos - ${unionVehicle!.placa}`, 20, yPosition);
        yPosition += 10;
        
        for (const tire of unionVehicleTires) {
          const tireBlockHeight = tire.updates.image ? 100 : 60;
          if (yPosition + tireBlockHeight > 270) {
            doc.addPage();
            currentPage++;
            yPosition = addPageWithTemplate(currentPage, estimatedPages);
          }
          
          yPosition = await renderTireBlock(doc, tire, yPosition, colors);
        }
      }
      
      // Helper function to render tire block
      async function renderTireBlock(doc, tire, yPos, colors) {
        const tireBlockHeight = tire.updates.image ? 100 : 60;
        
        // Tire info box
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(15, yPos, 180, tireBlockHeight, 3, 3, "F");
        
        // Tire position highlight
        doc.setFillColor(...colors.secondary);
        doc.roundedRect(15, yPos, 50, 10, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`POSICIÓN ${tire.posicion}`, 40, yPos + 7, { align: "center" });
        
        // Tire details
        yPos += 15;
        doc.setTextColor(...colors.accent);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${tire.marca}`, 25, yPos);
        
        doc.setTextColor(...colors.text);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`ID: ${tire.placa}`, 25, yPos + 8);
        
        // Profundidades box
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(25, yPos + 12, 75, 35, 2, 2, "F");
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Profundidades", 62.5, yPos + 19, { align: "center" });
        
        doc.setFont("helvetica", "normal");
        doc.text(`Interior: ${tire.updates.profundidadInt} mm`, 35, yPos + 27);
        doc.text(`Central: ${tire.updates.profundidadCen} mm`, 35, yPos + 34);
        doc.text(`Exterior: ${tire.updates.profundidadExt} mm`, 35, yPos + 41);
        
        // Average depth and CPK
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(110, yPos + 12, 75, 35, 2, 2, "F");
        
        doc.setFont("helvetica", "bold");
        doc.text("Análisis de Desgaste", 147.5, yPos + 19, { align: "center" });
        
        doc.setFont("helvetica", "normal");
        doc.text(`Profundidad Promedio: ${tire.avgDepth.toFixed(2)} mm`, 120, yPos + 27);
        doc.text(`CPK: ${tire.cpk}`, 120, yPos + 34);
        
        // Add image if available
        if (tire.updates.image) {
          try {
            const imgData = await convertFileToBase64(tire.updates.image);
            doc.addImage(imgData, 'JPEG', 65, yPos + 50, 80, 40);
          } catch (e) {
            console.error("Error adding image to PDF", e);
          }
        }
        
        return yPos + tireBlockHeight + 10;
      }
      
      // Save the PDF
      const filename = unionVehicle 
        ? `inspeccion_${vehicle.placa}_${unionVehicle.placa}_${inspectionData.date}.pdf`
        : `inspeccion_${vehicle.placa}_${inspectionData.date}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setLoading(false);
    }
  }

  function handleClosePopupAndReset() {
    setShowExportPopup(false);

    // Reset the form
    if (vehicle) {
      setNewKilometraje(vehicle.kilometrajeActual);
    }

    const allTires = [...tires, ...unionTires];
    const initial = allTires.reduce((acc, t) => {
      acc[t.id] = { profundidadInt: "", profundidadCen: "", profundidadExt: "", image: null };
      return acc;
    }, {} as typeof tireUpdates);
    setTireUpdates(initial);
  }

  // Helper function to render tire inspection form
  function renderTireSection(tiresData: Tire[], vehicleData: Vehicle, title: string, bgColor: string) {
    if (tiresData.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link className="w-5 h-5 text-[#1E76B6]" />
          <h2 className="text-xl font-bold text-[#0A183A]">{title}</h2>
          <span className="text-sm text-gray-600">({vehicleData.placa})</span>
        </div>
        
        <div className="space-y-6">
          {tiresData.map((tire) => (
            <div 
              key={tire.id} 
              className={`${bgColor} rounded-xl p-6 shadow-sm border-l-4 border-[#1E76B6]`}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#0A183A] mb-2">
              Sistema de Inspección de Neumáticos
            </h1>
            <p className="text-gray-600">Registre las mediciones de profundidad y genere reportes detallados</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-[#0A183A]">
                  Placa del Vehículo
                </label>
                <input
                  type="text"
                  value={placaInput}
                  onChange={(e) => setPlacaInput(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#1E76B6]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  placeholder="Ingrese la placa del vehículo"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#0A183A] text-white rounded-lg hover:bg-[#1E76B6] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Search className="w-5 h-5" />
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Vehicle Info and Kilometraje Update */}
          {vehicle && (
            <div className="mb-8 bg-[#348CCB]/10 rounded-xl p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xl font-bold mb-4 text-[#0A183A] flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Información del Vehículo
                  </h2>
                  <div className="space-y-2">
                    <p><span className="font-medium">Placa:</span> {vehicle.placa}</p>
                    <p><span className="font-medium">Tipo:</span> {vehicle.tipovhc}</p>
                    <p><span className="font-medium">Llantas:</span> {vehicle.tireCount}</p>
                    <p><span className="font-medium">Kilometraje Actual:</span> {vehicle.kilometrajeActual} km</p>
                    {vehicle.union && <p><span className="font-medium">Vehículo en Unión:</span> {vehicle.union}</p>}
                  </div>
                </div>
                
                {unionVehicle && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 text-[#1E76B6] flex items-center gap-2">
                      <Link className="w-6 h-6" />
                      Vehículo en Unión
                    </h2>
                    <div className="space-y-2">
                      <p><span className="font-medium">Placa:</span> {unionVehicle.placa}</p>
                      <p><span className="font-medium">Tipo:</span> {unionVehicle.tipovhc}</p>
                      <p><span className="font-medium">Llantas:</span> {unionVehicle.tireCount}</p>
                      <p><span className="font-medium">Kilometraje Actual:</span> {unionVehicle.kilometrajeActual} km</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2 text-[#0A183A]">
                  <Timer className="w-4 h-4 inline mr-2" />
                  Nuevo Kilometraje
                </label>
                <input
                  type="number"
                  value={newKilometraje}
                  onChange={(e) => setNewKilometraje(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-[#1E76B6]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  min={vehicle.kilometrajeActual}
                />
                <p className="text-sm text-gray-600 mt-1">
                  Diferencia: +{newKilometraje - vehicle.kilometrajeActual} km
                </p>
              </div>
            </div>
          )}

          {/* Tire Inspection Forms */}
          {(tires.length > 0 || unionTires.length > 0) && (
            <form onSubmit={handleSubmitInspections}>
              {renderTireSection(tires, vehicle!, `Neumáticos - Vehículo Principal`, "bg-gray-50")}
              {unionVehicle && renderTireSection(unionTires, unionVehicle, `Neumáticos - Vehículo en Unión`, "bg-blue-50")}
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
        </div>
        
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