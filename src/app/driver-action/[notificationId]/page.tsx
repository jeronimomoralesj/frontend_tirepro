"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import logo from "../../../../public/logo_full.png";

// ── API ──────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface NotificationData {
  id: string;
  title: string;
  message: string;
  actionLabel: string | null;
  executed: boolean;
  executedAt: string | null;
  driverConfirmed: boolean;
  driverConfirmedAt: string | null;
  vehicle: { placa: string } | null;
  tire: { placa: string; marca: string; posicion: number } | null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DriverActionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const notificationId = params.notificationId as string;
  const token = searchParams.get("token") ?? "";

  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Fetch notification (public endpoint, no auth)
  useEffect(() => {
    if (!notificationId) return;
    setLoading(true);
    fetch(`${API_BASE}/notifications/public/${notificationId}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se encontro la notificacion");
        return r.json();
      })
      .then((d: NotificationData) => {
        setData(d);
        if (d.driverConfirmed) setConfirmed(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [notificationId]);

  // Confirm action
  async function handleConfirm() {
    if (!notificationId) return;
    setConfirming(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/${notificationId}/driver-confirm?token=${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Error al confirmar");
      setConfirmed(true);
    } catch (e: any) {
      setError(e.message);
    }
    setConfirming(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      {/* Logo header */}
      <div className="flex justify-center pt-8 pb-4">
        <Image src={logo} alt="TirePro" className="h-8 w-auto" />
      </div>

      {/* Main card */}
      <div className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border-4 border-[#348CCB]/20 border-t-[#1E76B6] animate-spin" />
              <p className="text-sm text-gray-400 mt-4">Cargando...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
              </div>
              <p className="text-lg font-bold text-[#0A183A] mb-1">Error</p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          ) : confirmed ? (
            /* Success state */
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-black text-[#0A183A] mb-2">
                Gracias
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Accion registrada en el sistema.
                {data?.driverConfirmedAt && (
                  <span className="block text-xs text-gray-400 mt-2">
                    Confirmado: {new Date(data.driverConfirmedAt).toLocaleString("es-CO")}
                  </span>
                )}
              </p>
            </div>
          ) : data ? (
            /* Action card */
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Vehicle header */}
              <div
                className="px-6 py-5 text-center"
                style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)" }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-[#348CCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <path d="M16 8h2a2 2 0 012 2v5a2 2 0 01-2 2h-1M5.5 16a2 2 0 100 4 2 2 0 000-4zM16 16a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  <span className="text-xs text-[#348CCB] font-bold uppercase tracking-wider">
                    Vehiculo
                  </span>
                </div>
                <p
                  className="text-2xl font-black text-white tracking-widest"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {data.vehicle?.placa?.toUpperCase() ?? "---"}
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-5">
                {/* Tire info */}
                {data.tire && (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(52,140,203,0.12)" }}
                  >
                    <div className="flex-1">
                      <p className="text-xs text-[#348CCB] font-bold uppercase tracking-wider">Llanta</p>
                      <p className="text-sm font-bold text-[#0A183A] mt-0.5">
                        {data.tire.placa} - Pos. {data.tire.posicion}
                      </p>
                      <p className="text-xs text-gray-400">{data.tire.marca}</p>
                    </div>
                  </div>
                )}

                {/* Issue */}
                <div
                  className="px-4 py-3 rounded-xl"
                  style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}
                >
                  <p className="text-xs text-[#f97316] font-bold uppercase tracking-wider mb-1">
                    Problema detectado
                  </p>
                  <p className="text-base font-bold text-[#0A183A]">{data.title}</p>
                  {data.message && (
                    <p className="text-sm text-gray-500 mt-1">{data.message}</p>
                  )}
                </div>

                {/* Action required */}
                {data.actionLabel && (
                  <div
                    className="px-4 py-4 rounded-xl text-center"
                    style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.15)" }}
                  >
                    <p className="text-xs text-[#1E76B6] font-bold uppercase tracking-wider mb-2">
                      Accion requerida
                    </p>
                    <p className="text-lg font-black text-[#0A183A]">
                      {data.actionLabel}
                    </p>
                  </div>
                )}

                {/* Confirm button */}
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-black text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
                    minHeight: 56,
                  }}
                >
                  {confirming ? (
                    <div className="w-5 h-5 rounded-full border-3 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Confirmar que ya lo hice
                </button>

                {/* Already executed notice */}
                {data.executed && !data.driverConfirmed && (
                  <p className="text-xs text-center text-gray-400">
                    Esta accion ya fue ejecutada desde el sistema.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 px-4">
        <p className="text-xs text-gray-400">
          TirePro — Gestion inteligente de llantas
        </p>
      </div>
    </div>
  );
}
