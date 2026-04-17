"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock, RotateCcw, Pencil, X, Loader2, AlertTriangle, CheckCircle2, Plus, Trash2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface BulkUploadSnapshot {
  id:         string;
  uploadedAt: string;
  expiresAt:  string;
  fileName:   string | null;
  tireCount:  number;
  userId:     string | null;
  tireIds:    string[];
}

export default function RecentBulkUploads({
  companyId,
  refreshKey,
  onChanged,
}: {
  companyId: string;
  refreshKey?: number;
  onChanged?: () => void;
}) {
  const [items, setItems]     = useState<BulkUploadSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!companyId) { setItems([]); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/tires/bulk-upload/recent?companyId=${companyId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("No se pudieron cargar las cargas recientes");
      const data: BulkUploadSnapshot[] = await res.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshKey]);

  async function handleRevert(snap: BulkUploadSnapshot) {
    const msg = `¿Revertir la carga "${snap.fileName ?? "sin nombre"}"? Se borrarán ${snap.tireCount} llanta${snap.tireCount !== 1 ? "s" : ""}.`;
    if (!confirm(msg)) return;
    setReverting(snap.id);
    try {
      const res = await fetch(`${API_BASE}/tires/bulk-upload/${snap.id}/revert`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "No se pudo revertir la carga");
      }
      fetchList();
      onChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al revertir");
    } finally {
      setReverting(null);
    }
  }

  if (!companyId) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "white", border: "1px solid rgba(52,140,203,0.18)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#1E76B6]" />
          <p className="text-sm font-black text-[#0A183A]">Cargas recientes</p>
        </div>
        <button
          type="button"
          onClick={fetchList}
          disabled={loading}
          className="text-[11px] text-[#348CCB] hover:text-[#1E76B6] disabled:opacity-50"
        >
          {loading ? "Actualizando…" : "Refrescar"}
        </button>
      </div>
      <p className="text-[11px] text-[#93b8d4] mb-3">
        Cada carga se conserva 7 días. Si alguna llanta recibe una inspección o un
        cambio de vida la carga se marca como comprometida y ya no se puede revertir.
      </p>

      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-3"
          style={{ background: "rgba(220,38,38,0.06)", color: "#991b1b", border: "1px solid rgba(220,38,38,0.2)" }}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="text-[11px] text-center text-[#93b8d4] py-4">
          No hay cargas recientes. Aparecerán aquí después de que subas un archivo.
        </p>
      )}

      <div className="space-y-2">
        {items.map((snap) => {
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(snap.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
          );
          return (
            <div
              key={snap.id}
              className="rounded-xl px-3 py-2.5 flex items-center gap-3 flex-wrap"
              style={{ background: "rgba(52,140,203,0.06)", border: "1px solid rgba(52,140,203,0.18)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#0A183A] truncate">
                  {snap.fileName ?? "Carga masiva"}
                </p>
                <p className="text-[10px] text-[#348CCB]">
                  {snap.tireCount} llanta{snap.tireCount !== 1 ? "s" : ""} ·{" "}
                  {new Date(snap.uploadedAt).toLocaleString("es-CO", {
                    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                  })}
                  {" · "}
                  <span className={daysLeft <= 2 ? "text-amber-600 font-bold" : ""}>
                    {daysLeft === 0 ? "Expira hoy" : `${daysLeft} día${daysLeft !== 1 ? "s" : ""} restantes`}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(snap.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#1E76B6] border border-[#348CCB]/40 hover:bg-[#F0F7FF]"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleRevert(snap)}
                  disabled={reverting === snap.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}
                >
                  {reverting === snap.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <RotateCcw className="w-3 h-3" />}
                  Revertir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditBulkUploadModal
          snapshotId={editing}
          companyId={companyId}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); fetchList(); onChanged?.(); }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Edit modal — fetches the raw rows, lets the user edit cells, reapplies
// -----------------------------------------------------------------------------

function EditBulkUploadModal({
  snapshotId,
  companyId,
  onClose,
  onDone,
}: {
  snapshotId: string;
  companyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState("");
  const [rows,    setRows]      = useState<Record<string, string>[]>([]);
  const [columns, setColumns]   = useState<string[]>([]);
  const [result,  setResult]    = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${API_BASE}/tires/bulk-upload/${snapshotId}?companyId=${companyId}`,
          { headers: authHeaders() },
        );
        if (!res.ok) throw new Error("No se pudo cargar la carga");
        const data = await res.json();
        const raw: Record<string, string>[] = Array.isArray(data.rawRows) ? data.rawRows : [];
        // Normalise rows to strings so inputs behave.
        const normalised = raw.map((r) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) out[k] = v == null ? "" : String(v);
          return out;
        });
        setRows(normalised);
        const cols = Array.from(new Set(normalised.flatMap((r) => Object.keys(r))));
        setColumns(cols);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [snapshotId, companyId]);

  function setCell(rowIdx: number, col: string, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [col]: value };
      return next;
    });
  }

  function deleteRow(rowIdx: number) {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
  }

  function addBlankRow() {
    const blank: Record<string, string> = {};
    columns.forEach((c) => { blank[c] = ""; });
    setRows((prev) => [...prev, blank]);
  }

  async function handleSubmit() {
    setSaving(true); setError(""); setResult("");
    try {
      const res = await fetch(
        `${API_BASE}/tires/bulk-upload/${snapshotId}/reapply`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ companyId, rows }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Error al re-aplicar la carga");
      setResult(body.message ?? "Carga re-aplicada");
      setTimeout(onDone, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
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
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col"
        style={{ boxShadow: "0 24px 60px rgba(10,24,58,0.35)" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,#1E76B6,#173D68)" }}
        >
          <div>
            <p className="text-white font-black text-base">Editar y re-aplicar carga</p>
            <p className="text-white/70 text-[11px] mt-0.5">
              Al guardar, las llantas creadas en esta carga se eliminan y se crean con los datos editados.
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

        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <p className="text-center text-sm text-[#348CCB] py-10">
              <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
              Cargando filas…
            </p>
          )}
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-3"
              style={{ background: "rgba(220,38,38,0.06)", color: "#991b1b", border: "1px solid rgba(220,38,38,0.2)" }}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
          {result && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-3"
              style={{ background: "rgba(16,185,129,0.08)", color: "#047857", border: "1px solid rgba(16,185,129,0.3)" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> {result}
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="px-2 py-2 text-left text-[10px] text-[#93b8d4] font-bold uppercase">#</th>
                    {columns.map((c) => (
                      <th
                        key={c}
                        className="px-2 py-2 text-left text-[10px] font-black text-[#0A183A] uppercase tracking-wider whitespace-nowrap border-b"
                        style={{ borderColor: "rgba(52,140,203,0.2)" }}
                      >
                        {c}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b" style={{ borderColor: "rgba(52,140,203,0.08)" }}>
                      <td className="px-2 py-1 text-[10px] text-[#93b8d4]">{rowIdx + 1}</td>
                      {columns.map((c) => (
                        <td key={c} className="px-1 py-1">
                          <input
                            type="text"
                            value={row[c] ?? ""}
                            onChange={(e) => setCell(rowIdx, c, e.target.value)}
                            className="w-full min-w-[110px] px-1.5 py-1 border rounded text-[11px] text-[#0A183A] bg-[#F8FBFF] focus:outline-none focus:border-[#1E76B6]"
                            style={{ borderColor: "rgba(52,140,203,0.2)" }}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => deleteRow(rowIdx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && rows.length === 0 && !error && (
            <p className="text-center text-xs text-[#93b8d4] py-4">
              No quedan filas. Agrega al menos una antes de re-aplicar.
            </p>
          )}
          <div className="mt-3 flex justify-between items-center">
            <button
              type="button"
              onClick={addBlankRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#1E76B6] border border-[#348CCB]/40 hover:bg-[#F0F7FF]"
            >
              <Plus className="w-3 h-3" /> Agregar fila
            </button>
            <span className="text-[10px] text-[#93b8d4]">{rows.length} fila{rows.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex items-center gap-3" style={{ borderColor: "rgba(52,140,203,0.15)" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-[#348CCB]/40 px-4 py-2.5 rounded-xl text-sm text-[#1E76B6] font-medium hover:bg-[#F0F7FF] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || rows.length === 0}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#1E76B6,#173D68)" }}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : "Guardar y re-aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
