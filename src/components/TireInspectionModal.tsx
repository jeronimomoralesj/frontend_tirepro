"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Camera, Loader2, CheckCircle2, Gauge, Wind, Trash2 } from "lucide-react";

// -----------------------------------------------------------------------------
// Minimal tire shape the modal needs. Host pages can widen their own
// Tire type and cast safely — this contract is just the fields the modal
// reads.
// -----------------------------------------------------------------------------
export interface InspectionTire {
  id: string;
  placa: string;
  marca?: string;
  diseno?: string;
  dimension?: string;
  posicion?: number | string;
  eje?: string;
  profundidadInicial?: number;
}

export interface InspectionDraft {
  profundidadInt: string;
  profundidadCen: string;
  profundidadExt: string;
  presionPsi: string;
  imageUrls: string[]; // data: URIs or existing https URLs, up to 2
  inspected?: boolean;
}

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res(r.result as string);
    r.onerror = rej;
  });
}

export default function TireInspectionModal({
  tire,
  initial,
  onClose,
  onSave,
}: {
  tire: InspectionTire;
  initial?: Partial<InspectionDraft>;
  onClose: () => void;
  onSave: (draft: InspectionDraft) => Promise<void> | void;
}) {
  const [profInt, setProfInt] = useState(initial?.profundidadInt ?? "");
  const [profCen, setProfCen] = useState(initial?.profundidadCen ?? "");
  const [profExt, setProfExt] = useState(initial?.profundidadExt ?? "");
  const [presion, setPresion] = useState(initial?.presionPsi ?? "");
  const [images,  setImages]  = useState<string[]>(initial?.imageUrls ?? []);
  const [error,   setError]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, saving]);

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 2) {
      setError("Máximo 2 fotos por llanta");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImages((prev) => [...prev, dataUrl]);
    } catch {
      setError("No se pudo leer la imagen");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError("");
    const pInt = Number(profInt), pCen = Number(profCen), pExt = Number(profExt);
    if ([pInt, pCen, pExt].some((v) => !Number.isFinite(v) || v < 0)) {
      setError("Ingrese las tres profundidades (≥ 0)");
      return;
    }
    if (presion !== "" && (!Number.isFinite(Number(presion)) || Number(presion) < 0)) {
      setError("Presión inválida");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        profundidadInt: profInt,
        profundidadCen: profCen,
        profundidadExt: profExt,
        presionPsi: presion,
        imageUrls: images,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(10,24,58,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: "0 24px 60px rgba(10,24,58,0.35)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,#1E76B6,#173D68)" }}
        >
          <div className="min-w-0">
            <p className="text-white font-black text-base tracking-wide truncate">
              {tire.placa?.toUpperCase()}
            </p>
            <p className="text-white/70 text-[11px] mt-0.5 truncate">
              {[tire.marca, tire.diseno, tire.dimension].filter(Boolean).join(" · ") || "Llanta"}
              {tire.posicion !== undefined && tire.posicion !== null ? ` · Pos. ${tire.posicion}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-white/80 hover:text-white disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div
              className="text-xs px-3 py-2 rounded-xl"
              style={{ background: "rgba(239,68,68,0.08)", color: "#991b1b", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              {error}
            </div>
          )}

          {/* Depths */}
          <div>
            <p className="text-[10px] font-black text-[#173D68] uppercase tracking-wider mb-2">
              Profundidades (mm)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Interior", val: profInt, set: setProfInt },
                { label: "Centro",   val: profCen, set: setProfCen },
                { label: "Exterior", val: profExt, set: setProfExt },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[9px] font-bold text-[#348CCB] uppercase mb-1">{f.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    inputMode="decimal"
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={tire.profundidadInicial?.toString() ?? "0.0"}
                    className={inputCls}
                    autoFocus={f.label === "Interior"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Pressure */}
          <div>
            <label className="block text-[10px] font-black text-[#173D68] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Wind className="w-3 h-3" /> Presión (PSI)
            </label>
            <input
              type="number"
              min={0}
              step="0.1"
              inputMode="decimal"
              value={presion}
              onChange={(e) => setPresion(e.target.value)}
              placeholder="ej: 100"
              className={inputCls}
            />
          </div>

          {/* Photos */}
          <div>
            <p className="text-[10px] font-black text-[#173D68] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> Fotos ({images.length}/2)
            </p>
            <div className="flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative w-20 h-20 rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(52,140,203,0.25)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow"
                    aria-label="Eliminar foto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 2 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-xl flex items-center justify-center transition-colors hover:bg-[#F0F7FF]"
                  style={{ border: "1px dashed rgba(52,140,203,0.4)", background: "#F8FBFF" }}
                >
                  <Camera className="w-5 h-5 text-[#1E76B6]" />
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePickImage}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-[#348CCB]/40 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#1E76B6,#173D68)" }}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Guardar inspección</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
