"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Tag, Calendar, Percent, Gift } from "lucide-react";

export type Cupon = {
  id: string;
  titulo: string;
  descripcion: string;
  descuento: number;
  categoria: "llantas" | "baterias" | "rines" | "aceites" | "accesorios";
  fechaVencimiento: string;
  codigo: string;
  imagen: string;
  terminos: string[];
  activo: boolean;
};

const CuponesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [selectedCupon, setSelectedCupon] = useState<Cupon | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Datos dummy de cupones
  const cupones: Cupon[] = [
    {
      id: "1",
      titulo: "15% OFF en Llantas Continental",
      descripcion: "Descuento especial en toda nuestra línea de llantas premium",
      descuento: 15,
      categoria: "llantas",
      fechaVencimiento: "2025-07-15",
      codigo: "LLANTA20",
      imagen: "https://pbs.twimg.com/media/FDOEw9BX0AI5CMe.jpg",
      terminos: ["Válido hasta el 15 de julio", "No acumulable con otras ofertas", "Mínimo de compra $500"],
      activo: true
    },
    {
      id: "2",
      titulo: "Batería Gratis",
      descripcion: "Compra 2 baterías y llévate 1 gratis",
      descuento: 33,
      categoria: "baterias",
      fechaVencimiento: "2025-06-30",
      codigo: "BAT2X1",
      imagen: "/api/placeholder/300/200",
      terminos: ["Promoción 2x1", "Válido en baterías seleccionadas", "Stock limitado"],
      activo: true
    },
    {
      id: "3",
      titulo: "Rines Deportivos 15% OFF",
      descripcion: "Descuento en rines deportivos de todas las marcas",
      descuento: 15,
      categoria: "rines",
      fechaVencimiento: "2025-08-01",
      codigo: "RINES15",
      imagen: "/api/placeholder/300/200",
      terminos: ["Válido en rines deportivos", "Instalación incluida", "Garantía de 1 año"],
      activo: true
    },
    {
      id: "4",
      titulo: "Cambio de Aceite Premium",
      descripción: "Cambio completo con aceite sintético premium",
      descuento: 25,
      categoria: "aceites",
      fechaVencimiento: "2025-07-30",
      codigo: "ACEITE25",
      imagen: "/api/placeholder/300/200",
      terminos: ["Incluye filtro de aceite", "Aceite sintético premium", "Revisión gratuita"],
      activo: true
    },
    {
      id: "5",
      titulo: "Kit de Accesorios",
      descripcion: "Combo especial de accesorios para tu vehículo",
      descuento: 30,
      categoria: "accesorios",
      fechaVencimiento: "2025-09-15",
      codigo: "KIT30",
      imagen: "/api/placeholder/300/200",
      terminos: ["Incluye múltiples accesorios", "Instalación gratuita", "Garantía extendida"],
      activo: true
    },
    {
      id: "6",
      titulo: "Super Descuento Llantas",
      descripcion: "Oferta limitada en llantas económicas",
      descuento: 35,
      categoria: "llantas",
      fechaVencimiento: "2025-06-25",
      codigo: "SUPER35",
      imagen: "/api/placeholder/300/200",
      terminos: ["Oferta por tiempo limitado", "Llantas económicas", "Balanceo incluido"],
      activo: true
    }
  ];

  const categorias = [
    { id: "todos", label: "Todos", icon: Gift },
    { id: "llantas", label: "Llantas", icon: Tag },
    { id: "baterias", label: "Baterías", icon: Tag },
    { id: "rines", label: "Rines", icon: Tag },
    { id: "aceites", label: "Aceites", icon: Tag },
    { id: "accesorios", label: "Accesorios", icon: Tag }
  ];

  const cuponesFiltrados = useMemo(() => {
    if (selectedCategory === "todos") return cupones;
    return cupones.filter(cupon => cupon.categoria === selectedCategory);
  }, [selectedCategory, cupones]);

  const itemsPerSlide = 3;
  const totalSlides = Math.ceil(cuponesFiltrados.length / itemsPerSlide);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const getCurrentCupones = () => {
    const start = currentSlide * itemsPerSlide;
    return cuponesFiltrados.slice(start, start + itemsPerSlide);
  };

  const getCategoryColor = (categoria: string) => {
    const colors: { [key: string]: string } = {
      llantas: "bg-blue-100 text-blue-800",
      baterias: "bg-green-100 text-green-800",
      rines: "bg-purple-100 text-purple-800",
      aceites: "bg-yellow-100 text-yellow-800",
      accesorios: "bg-red-100 text-red-800"
    };
    return colors[categoria] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-[#173D68] text-white p-5">
        <h2 className="text-xl font-bold">Cupones y Ofertas</h2>
        <p className="text-sm opacity-90 mt-1">Encuentra las mejores ofertas para tu vehículo</p>
      </div>

      {/* Filtros de categoría */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-wrap gap-2">
          {categorias.map((categoria) => {
            const IconComponent = categoria.icon;
            return (
              <button
                key={categoria.id}
                onClick={() => {
                  setSelectedCategory(categoria.id);
                  setCurrentSlide(0);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === categoria.id
                    ? "bg-[#173D68] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <IconComponent size={16} />
                {categoria.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Carousel */}
      <div className="p-6">
        {cuponesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
            <Gift size={32} />
            <p>No hay cupones disponibles para esta categoría</p>
          </div>
        ) : (
          <div className="relative">
            {/* Navigation buttons */}
            {totalSlides > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={20} className="text-[#173D68]" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight size={20} className="text-[#173D68]" />
                </button>
              </>
            )}

            {/* Cupones grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getCurrentCupones().map((cupon) => (
                <div
                  key={cupon.id}
                  onClick={() => setSelectedCupon(cupon)}
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                >
                  <div className="relative">
                    <img
                      src={cupon.imagen}
                      alt={cupon.titulo}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      -{cupon.descuento}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(cupon.categoria)}`}>
                      {cupon.categoria.charAt(0).toUpperCase() + cupon.categoria.slice(1)}
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 text-sm">{cupon.titulo}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">{cupon.descripcion}</p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} />
                        Vence: {new Date(cupon.fechaVencimiento).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-[#173D68]">
                        <Percent size={12} />
                        {cupon.codigo}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Indicators */}
            {totalSlides > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      currentSlide === index ? "bg-[#173D68]" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="border-t border-gray-100 pt-4 mt-6 flex justify-between items-center text-xs text-gray-500">
          <div>Total cupones: {cuponesFiltrados.length}</div>
          <div>Actualizado: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Modal de detalles del cupón */}
      {selectedCupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#173D68] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Detalles del Cupón</h3>
              <button
                onClick={() => setSelectedCupon(null)}
                className="hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <img
                src={selectedCupon.imagen}
                alt={selectedCupon.titulo}
                className="w-full h-48 object-cover rounded-lg"
              />

              <div className="space-y-3">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedCupon.categoria)}`}>
                  {selectedCupon.categoria.charAt(0).toUpperCase() + selectedCupon.categoria.slice(1)}
                </div>

                <h2 className="text-xl font-bold text-gray-900">{selectedCupon.titulo}</h2>
                <p className="text-gray-600">{selectedCupon.descripcion}</p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">-{selectedCupon.descuento}%</div>
                  <div className="text-sm text-gray-600 mb-2">Código de descuento:</div>
                  <div className="bg-white border-2 border-dashed border-red-300 rounded-lg p-3">
                    <code className="text-lg font-bold text-[#173D68]">{selectedCupon.codigo}</code>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    Válido hasta: {new Date(selectedCupon.fechaVencimiento).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Términos y condiciones:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {selectedCupon.terminos.map((termino, index) => (
                      <li key={index}>{termino}</li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedCupon.codigo);
                    // Aquí podrías mostrar un toast de confirmación
                  }}
                  className="w-full bg-[#173D68] text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                >
                  Copiar Código
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuponesPage;