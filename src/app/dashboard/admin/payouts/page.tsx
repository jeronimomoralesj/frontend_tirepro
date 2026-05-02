"use client";

// Back-office payouts queue. Lists every distributor with orders that
// have been delivered for ≥ 3 days and haven't been paid out yet,
// aggregated to one row per distributor with the total to transfer.
// TirePro admin pulls the bank reference number from Bancolombia
// Empresas after sending the wire, then clicks "Marcar como pagado"
// here — that closes the loop in our ledger and emails the dist a
// comprobante.

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, CheckCircle2, Loader2, Lock, RefreshCw,
  ShieldAlert, Wallet,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

function authFetch(url: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

interface QueueOrderRef {
  id: string;
  total: number;
  net: number;
  productLabel: string;
}

interface BankAccount {
  id: string;
  holderName: string;
  documentType: string;
  documentNumber: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  notificationEmail: string | null;
  verifiedAt: string | null;
}

interface QueueRow {
  distributorId: string;
  distributorName: string;
  bankAccount: BankAccount | null;
  amountCop: number;
  orders: QueueOrderRef[];
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [release, setRelease] = useState<{ row: QueueRow; ref: string; notes: string; saving: boolean; error: string } | null>(null);
  const [globalToast, setGlobalToast] = useState("");

  // Auth gate — only `tirepro_admin` users see this page. Backend also
  // enforces; the frontend check just hides the UI for non-admins.
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (user?.role === "tirepro_admin") {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
    } catch {
      setAuthorized(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/payments/admin/payouts/queue`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setAuthorized(false);
        setQueue([]);
        return;
      }
      const data = await res.json();
      setQueue(Array.isArray(data) ? data : []);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized === true) fetchQueue();
  }, [authorized, fetchQueue]);

  async function handleRelease() {
    if (!release) return;
    if (!release.ref.trim()) {
      setRelease({ ...release, error: "La referencia bancaria es obligatoria." });
      return;
    }
    setRelease({ ...release, saving: true, error: "" });
    try {
      const res = await authFetch(`${API_BASE}/payments/admin/payouts/release`, {
        method: "POST",
        body: JSON.stringify({
          distributorId:       release.row.distributorId,
          bankReferenceNumber: release.ref.trim(),
          notes:               release.notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRelease(null);
      setGlobalToast(`Pago a ${release.row.distributorName} marcado como liberado.`);
      setTimeout(() => setGlobalToast(""), 4000);
      fetchQueue();
    } catch (e: any) {
      setRelease({ ...release, saving: false, error: e?.message?.slice(0, 200) || "No se pudo liberar el pago" });
    }
  }

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E76B6]" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa] px-4">
        <div className="max-w-md text-center bg-white rounded-2xl p-8" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-lg font-black text-[#0A183A]">Acceso restringido</h1>
          <p className="text-sm text-gray-500 mt-2">
            Esta sección solo está disponible para administradores de TirePro.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#1E76B6]"
          >
            <ArrowLeft className="w-3 h-3" /> Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  const grandTotal = queue.reduce((s, r) => s + r.amountCop, 0);
  const grandOrders = queue.reduce((s, r) => s + r.orders.length, 0);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#1E76B6]">
              Admin · Marketplace
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A183A] mt-1 leading-tight">
              Cola de pagos a distribuidores
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Pedidos entregados con 3+ días de hold. Transfiere desde Bancolombia Empresas y luego marca cada distribuidor como pagado con la referencia bancaria.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-[#0A183A] bg-white hover:bg-[#F0F7FF] transition-colors disabled:opacity-50 flex-shrink-0"
            style={{ border: "1px solid rgba(10,24,58,0.10)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {/* Global totals */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Kpi label="Total a pagar" value={fmtCOP(grandTotal)} accent="#1E76B6" />
          <Kpi label="Pedidos en cola" value={String(grandOrders)} accent="#0A183A" />
        </div>

        {globalToast && (
          <div className="mb-4 px-4 py-2.5 rounded-xl text-sm bg-emerald-600 text-white inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {globalToast}
          </div>
        )}

        {/* Queue */}
        {loading && queue.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#1E76B6]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : queue.length === 0 ? (
          <div
            className="rounded-2xl bg-white p-10 text-center"
            style={{ border: "1px dashed rgba(10,24,58,0.12)" }}
          >
            <Wallet className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#0A183A]">No hay pagos pendientes</p>
            <p className="text-xs text-gray-500 mt-1">Cuando un pedido lleve 3 días en estado "entregado" aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((row) => (
              <PayoutRow
                key={row.distributorId}
                row={row}
                onRelease={() => setRelease({ row, ref: "", notes: "", saving: false, error: "" })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Release modal */}
      {release && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
          onClick={() => !release.saving && setRelease(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4" style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E76B6]">Marcar como pagado</p>
              <h2 className="text-lg font-black text-[#0A183A] truncate">{release.row.distributorName}</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {fmtCOP(release.row.amountCop)} · {release.row.orders.length} pedido{release.row.orders.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {release.row.bankAccount && (
                <div
                  className="rounded-xl p-3.5 text-xs"
                  style={{ background: "rgba(30,118,182,0.06)", border: "1px solid rgba(30,118,182,0.18)" }}
                >
                  <p className="font-bold text-[#0A183A]">{release.row.bankAccount.holderName}</p>
                  <p className="text-gray-700 mt-0.5">
                    {release.row.bankAccount.bankName} · {release.row.bankAccount.accountType} ****{release.row.bankAccount.accountNumber.slice(-4)}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {release.row.bankAccount.documentType} {release.row.bankAccount.documentNumber}
                  </p>
                </div>
              )}

              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Referencia bancaria *
                </span>
                <input
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.25)" }}
                  value={release.ref}
                  onChange={(e) => setRelease(release ? { ...release, ref: e.target.value } : null)}
                  placeholder="Comprobante / nº de transferencia"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Notas internas (opcional)
                </span>
                <textarea
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#1E76B6]"
                  style={{ border: "1px solid rgba(52,140,203,0.25)", resize: "vertical" }}
                  value={release.notes}
                  onChange={(e) => setRelease(release ? { ...release, notes: e.target.value } : null)}
                />
              </label>

              {release.error && (
                <p className="text-xs text-red-600 font-medium">{release.error}</p>
              )}
            </div>

            <div
              className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4"
              style={{ borderTop: "1px solid rgba(10,24,58,0.08)" }}
            >
              <button
                type="button"
                onClick={() => setRelease(null)}
                disabled={release.saving}
                className="px-4 py-2 rounded-full text-sm font-bold text-[#0A183A] hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRelease}
                disabled={release.saving || !release.ref.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#0A183A,#1E76B6)",
                  boxShadow: "0 12px 28px -10px rgba(30,118,182,0.45)",
                }}
              >
                {release.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Marcar como pagado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-white p-4" style={{ border: "1px solid rgba(10,24,58,0.08)" }}>
      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400">{label}</p>
      <p className="text-xl sm:text-2xl font-black tabular-nums mt-0.5" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function PayoutRow({ row, onRelease }: { row: QueueRow; onRelease: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: "1px solid rgba(10,24,58,0.08)" }}
    >
      <div className="p-4 sm:p-5 flex items-center gap-4 flex-wrap">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(30,118,182,0.08)" }}
        >
          <Building2 className="w-4 h-4 text-[#1E76B6]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#0A183A] truncate">{row.distributorName}</p>
          {row.bankAccount ? (
            <p className="text-[11px] text-gray-500 truncate">
              {row.bankAccount.bankName} · {row.bankAccount.accountType} ****{row.bankAccount.accountNumber.slice(-4)} · {row.bankAccount.holderName}
            </p>
          ) : (
            <p className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" /> Sin cuenta bancaria registrada
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-black text-[#0A183A] tabular-nums">{fmtCOP(row.amountCop)}</p>
          <p className="text-[11px] text-gray-500">{row.orders.length} pedido{row.orders.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold text-[#0A183A] hover:bg-gray-100"
            style={{ border: "1px solid rgba(10,24,58,0.10)" }}
          >
            {expanded ? "Ocultar" : "Detalle"}
          </button>
          <button
            type="button"
            onClick={onRelease}
            disabled={!row.bankAccount}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: row.bankAccount ? "linear-gradient(135deg,#15803d,#22c55e)" : "#9ca3af",
              boxShadow: row.bankAccount ? "0 8px 20px -8px rgba(34,197,94,0.4)" : "none",
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Marcar pagado
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5" style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pt-3 mb-2">
            Pedidos incluidos
          </p>
          <ul className="space-y-1.5">
            {row.orders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 text-xs px-3 py-2 rounded-lg"
                style={{ background: "#fafbfc", border: "1px solid rgba(10,24,58,0.06)" }}
              >
                <span className="font-mono text-gray-500">#{o.id.slice(0, 8).toUpperCase()}</span>
                <span className="flex-1 text-[#0A183A] truncate">{o.productLabel}</span>
                <span className="tabular-nums text-gray-500">{fmtCOP(o.total)}</span>
                <span className="tabular-nums font-bold text-emerald-700">{fmtCOP(o.net)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
