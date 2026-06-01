'use client';

import { useState } from 'react';
import { VehicleTireGrid, TireGridLegend, type GridTire } from '@/app/dashboard/components/VehicleTireGrid';

const API_BASE = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : ''; }

async function apiFetch(path: string, opts?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

type Tire = GridTire & {
  placa: string; marca: string; diseno: string; dimension: string;
  eje: string; currentProfundidad: number | null;
  profundidadInicial: number; vidaActual: string; alertLevel: string; healthScore: number | null;
};
type Vehicle = {
  id: string; placa: string; tipovhc: string; kilometrajeActual: number;
  configuracion: string | null; tires: Tire[];
};

type Step = 'intro' | 'placa' | 'pick-source' | 'pick-action' | 'pick-dest' | 'confirm' | 'submitting' | 'done';
type DisplacedAction = 'swap' | 'inventory' | 'fin' | null;

const ALERT_COLORS: Record<string, string> = {
  critical: '#ef4444', warning: '#f59e0b', watch: '#eab308', ok: '#10b981',
};
function tireTone(t: Tire) { return { color: ALERT_COLORS[t.alertLevel] || '#94a3b8' }; }

export default function RotationWizard({ initialPlaca, onDone }: { initialPlaca?: string; onDone: (summary: string) => void }) {
  const [step, setStep] = useState<Step>('placa');
  const [placa, setPlaca] = useState(initialPlaca ?? '');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [sourceTire, setSourceTire] = useState<Tire | null>(null);
  const [destTire, setDestTire] = useState<Tire | null>(null);
  const [destPos, setDestPos] = useState<number | null>(null);
  const [displacedAction, setDisplacedAction] = useState<DisplacedAction>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const searchVehicle = async () => {
    if (!placa.trim()) return;
    setLoading(true); setError('');
    try {
      const v: Vehicle = await apiFetch(`/ana/vehicle-tires?placa=${encodeURIComponent(placa.trim())}`);
      setVehicle(v);
      setStep('pick-source');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const pickSource = (t: Tire) => {
    setSourceTire(t);
    setDestTire(null);
    setDestPos(null);
    setDisplacedAction(null);
    setStep('pick-action');
  };

  const handleAction = (action: 'move' | 'inventory' | 'fin') => {
    if (!sourceTire) return;
    if (action === 'inventory' || action === 'fin') {
      setDisplacedAction(action === 'inventory' ? 'inventory' : 'fin');
      setStep('confirm');
    } else {
      setStep('pick-dest');
    }
  };

  const pickDest = (t: Tire) => {
    if (t.id === sourceTire?.id) return;
    setDestTire(t);
    setDestPos(t.posicion);
    setDisplacedAction('swap');
    setStep('confirm');
  };

  const pickEmptyPos = (pos: number) => {
    setDestTire(null);
    setDestPos(pos);
    setDisplacedAction(null);
    setStep('confirm');
  };

  const submit = async () => {
    if (!sourceTire || !vehicle) return;
    setStep('submitting'); setError('');
    try {
      if (displacedAction === 'inventory' || displacedAction === 'fin') {
        // Send source tire to inventory (vehicleId: null, posicion: 0)
        await apiFetch(`/tires/${sourceTire.id}/edit`, {
          method: 'PATCH',
          body: JSON.stringify({ vehicleId: null, posicion: 0 }),
        });
        if (displacedAction === 'fin') {
          await apiFetch(`/tires/${sourceTire.id}/vida`, {
            method: 'PATCH',
            body: JSON.stringify({ vida: 'fin', motivoFin: 'desgaste' }),
          }).catch(() => {});
        }
      } else if (destPos != null) {
        const updates: Record<string, string> = {};
        updates[String(destPos)] = sourceTire.id;
        if (destTire) {
          // Swap: move displaced tire to source's old position
          updates[String(sourceTire.posicion)] = destTire.id;
        }
        await apiFetch('/tires/update-positions', {
          method: 'POST',
          body: JSON.stringify({ vehicleId: vehicle.id, updates }),
        });
      }
      setStep('done');
    } catch (e) { setError((e as Error).message); setStep('confirm'); }
  };

  const summaryText = () => {
    if (!sourceTire) return '';
    const src = `${sourceTire.marca} ${sourceTire.diseno} (pos ${sourceTire.posicion})`;
    if (displacedAction === 'inventory') return `${src} → Inventario`;
    if (displacedAction === 'fin') return `${src} → Fin de vida`;
    if (destTire) return `${src} ↔ ${destTire.marca} ${destTire.diseno} (pos ${destTire.posicion})`;
    if (destPos != null) return `${src} → Posición ${destPos}`;
    return src;
  };

  return (
    <div className="rounded-2xl border border-[#0A183A]/10 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#0A183A]/6 bg-gradient-to-r from-[#0A183A] to-[#173D68] px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-[13px] font-semibold text-white">Mover / Rotar llantas</span>
        {vehicle && <span className="ml-auto text-[11px] text-white/60">{vehicle.placa.toUpperCase()}</span>}
      </div>

      <div className="p-4">
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">{error}</div>}

        {/* Placa */}
        {step === 'placa' && (
          <div>
            <label className="block text-[12px] font-medium text-[#0A183A]/60 mb-1.5">Placa del vehículo</label>
            <div className="flex gap-2">
              <input type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && searchVehicle()} placeholder="Ej: ABC123" autoFocus
                className="flex-1 rounded-lg border border-[#0A183A]/15 px-3 py-2 text-[14px] text-[#0A183A] placeholder:text-[#0A183A]/30 focus:outline-none focus:ring-2 focus:ring-[#A374FF]/30" />
              <button onClick={searchVehicle} disabled={loading || !placa.trim()}
                className="rounded-lg bg-[#0A183A] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#173D68] disabled:opacity-40 transition-colors">
                {loading ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        )}

        {/* Pick source tire */}
        {step === 'pick-source' && vehicle && (
          <div>
            <p className="text-[13px] text-[#0A183A]/70 mb-2">Selecciona la llanta que quieres mover</p>
            <VehicleTireGrid<Tire>
              tires={vehicle.tires} configuracion={vehicle.configuracion}
              selectedId={sourceTire?.id} onSelect={pickSource} tone={tireTone} cellSize={52}
              renderCellExtra={t => t.currentProfundidad != null ? `${t.currentProfundidad.toFixed(0)}mm` : null}
            />
            <TireGridLegend items={[
              { color: ALERT_COLORS.ok, label: 'Óptimo' },
              { color: ALERT_COLORS.watch, label: '60d' },
              { color: ALERT_COLORS.warning, label: '30d' },
              { color: ALERT_COLORS.critical, label: 'Inmediato' },
            ]} />
          </div>
        )}

        {/* Pick action for source tire */}
        {step === 'pick-action' && sourceTire && (
          <div>
            <div className="mb-3 p-3 rounded-lg bg-[#0A183A]/[0.03] border border-[#0A183A]/6">
              <p className="text-[12px] text-[#0A183A]/50">Llanta seleccionada</p>
              <p className="text-[14px] font-medium text-[#0A183A]">Pos {sourceTire.posicion} — {sourceTire.marca} {sourceTire.diseno}</p>
              <p className="text-[11px] text-[#0A183A]/50">{sourceTire.dimension} · {sourceTire.currentProfundidad?.toFixed(1) ?? '?'}mm · {sourceTire.vidaActual}</p>
            </div>
            <p className="text-[13px] font-medium text-[#0A183A] mb-2">¿Qué quieres hacer con esta llanta?</p>
            <div className="space-y-1.5">
              <button onClick={() => handleAction('move')}
                className="flex w-full items-center gap-3 rounded-xl border border-[#0A183A]/8 px-4 py-3 text-left hover:border-[#A374FF]/30 hover:bg-[#A374FF]/[0.03] transition-colors">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A374FF]/10 text-[#A374FF] font-bold text-[14px]">↔</span>
                <div><p className="text-[13px] font-medium text-[#0A183A]">Mover a otra posición</p><p className="text-[11px] text-[#0A183A]/50">Rotar con otra llanta o mover a posición vacía</p></div>
              </button>
              <button onClick={() => handleAction('inventory')}
                className="flex w-full items-center gap-3 rounded-xl border border-[#0A183A]/8 px-4 py-3 text-left hover:border-amber-400/40 hover:bg-amber-50/50 transition-colors">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 font-bold text-[14px]">▤</span>
                <div><p className="text-[13px] font-medium text-[#0A183A]">Enviar a inventario</p><p className="text-[11px] text-[#0A183A]/50">Desmontar y guardar como disponible</p></div>
              </button>
              <button onClick={() => handleAction('fin')}
                className="flex w-full items-center gap-3 rounded-xl border border-[#0A183A]/8 px-4 py-3 text-left hover:border-red-300 hover:bg-red-50/50 transition-colors">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 font-bold text-[14px]">✕</span>
                <div><p className="text-[13px] font-medium text-[#0A183A]">Fin de vida</p><p className="text-[11px] text-[#0A183A]/50">Retirar permanentemente</p></div>
              </button>
            </div>
            <button onClick={() => setStep('pick-source')} className="mt-2 text-[12px] text-[#A374FF] hover:underline">← Cambiar llanta</button>
          </div>
        )}

        {/* Pick destination */}
        {step === 'pick-dest' && vehicle && sourceTire && (
          <div>
            <p className="text-[13px] text-[#0A183A]/70 mb-1">Selecciona la posición destino</p>
            <p className="text-[11px] text-[#0A183A]/40 mb-2">Si la posición tiene otra llanta, se intercambiarán.</p>
            <VehicleTireGrid<Tire>
              tires={vehicle.tires} configuracion={vehicle.configuracion}
              selectedId={sourceTire.id}
              onSelect={t => { if (t.id !== sourceTire.id) pickDest(t); }}
              tone={t => t.id === sourceTire.id ? { color: '#1E76B6', label: 'Origen' } : tireTone(t)}
              cellSize={52}
              renderCellExtra={t => t.currentProfundidad != null ? `${t.currentProfundidad.toFixed(0)}mm` : null}
            />
            <button onClick={() => setStep('pick-action')} className="mt-2 text-[12px] text-[#A374FF] hover:underline">← Volver</button>
          </div>
        )}

        {/* Confirm */}
        {step === 'confirm' && sourceTire && (
          <div>
            <p className="text-[14px] font-medium text-[#0A183A] mb-3">Confirmar operación</p>
            <div className="mb-4 p-3 rounded-lg bg-[#0A183A]/[0.03] border border-[#0A183A]/6 text-[13px] text-[#0A183A]/80">
              {summaryText()}
            </div>
            {destTire && (
              <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
                La llanta en posición {destTire.posicion} ({destTire.marca} {destTire.diseno}) se moverá a la posición {sourceTire.posicion}.
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={submit}
                className="flex-1 rounded-xl bg-gradient-to-br from-[#0A183A] to-[#A374FF] py-2.5 text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition-all">
                Confirmar
              </button>
              <button onClick={() => setStep('pick-action')}
                className="rounded-xl border border-[#0A183A]/15 px-4 py-2.5 text-[12px] font-medium text-[#0A183A]/60 hover:bg-[#F8FAFC] transition-colors">
                Volver
              </button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#A374FF]/30 border-t-[#A374FF]" />
            <span className="text-[13px] text-[#0A183A]/60">Procesando...</span>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center py-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-emerald-600"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="text-[14px] font-medium text-[#0A183A]">Operación completada</p>
            <p className="mt-1 text-[12px] text-[#0A183A]/50">{summaryText()}</p>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={() => { setSourceTire(null); setDestTire(null); setDestPos(null); setStep('pick-source'); }}
                className="rounded-lg border border-[#0A183A]/15 px-4 py-2 text-[12px] font-medium text-[#0A183A] hover:bg-[#F8FAFC] transition-colors">
                Otra operación
              </button>
              <button onClick={() => onDone(`Rotación completada: ${summaryText()}\n\n¿Hay algo más en lo que pueda ayudarte?`)}
                className="rounded-lg bg-[#0A183A] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#173D68] transition-colors">
                Finalizar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
