"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, AlertTriangle, X } from "lucide-react";

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function InspectionDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingDate = useRef("");
  const isCustom = value !== today();

  function handleChange(newDate: string) {
    if (newDate === today()) {
      onChange(newDate);
      return;
    }
    pendingDate.current = newDate;
    setShowConfirm(true);
  }

  function confirmDate() {
    onChange(pendingDate.current);
    setShowConfirm(false);
  }

  function cancelDate() {
    pendingDate.current = "";
    setShowConfirm(false);
  }

  return (
    <>
      <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)" }}>
        <label className="block text-[10px] font-bold text-[#173D68] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#1E76B6]" />
          Fecha de inspección
        </label>
        <input
          type="date"
          value={value}
          max={today()}
          onChange={(e) => handleChange(e.target.value)}
          className={inputCls}
        />
        {isCustom && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-[11px] font-semibold"
            style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", color: "#9a3412" }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Fecha diferente a hoy — las inspecciones se registrarán con fecha {value}</span>
            <button type="button" onClick={() => onChange(today())} className="ml-auto text-[#1E76B6] hover:text-[#0A183A]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) cancelDate(); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            style={{ boxShadow: "0 24px 60px rgba(10,24,58,0.35)" }}>
            <div className="px-5 py-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
              <AlertTriangle className="w-5 h-5 text-white" />
              <p className="text-sm font-bold text-white">Cambio de fecha</p>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#0A183A]">
                Está a punto de registrar inspecciones con fecha <strong>{pendingDate.current}</strong> en lugar de hoy (<strong>{today()}</strong>).
              </p>
              <p className="text-xs text-[#348CCB]">
                Solo cambie la fecha si está registrando una inspección que se realizó en el pasado. Esta acción afecta los cálculos de CPK y proyecciones.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={cancelDate}
                  className="flex-1 border border-[#348CCB]/40 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDate}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                >
                  Sí, usar {pendingDate.current}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
