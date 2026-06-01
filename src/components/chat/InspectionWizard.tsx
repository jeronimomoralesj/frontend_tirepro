'use client';

import { useState, useRef, useMemo } from 'react';
import { VehicleTireGrid, TireGridLegend, type GridTire } from '@/app/dashboard/components/VehicleTireGrid';

const API_BASE = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : ''; }
function authH() { const t = getToken(); return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }; }

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...authH(), ...opts?.headers } });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || `HTTP ${res.status}`); }
  return res.json();
}

type Costo = { valor: number; fecha: string };
type LastInsp = { profundidadInt: number; profundidadCen: number; profundidadExt: number; fecha: string };

type Tire = GridTire & {
  placa: string; marca: string; diseno: string; dimension: string;
  eje: string; vehicleId: string;
  currentProfundidad: number | null;
  profundidadInicial: number;
  kilometrosRecorridos: number;
  vidaActual: string;
  alertLevel: 'ok' | 'watch' | 'warning' | 'critical' | string;
  healthScore: number | null;
  costos?: Costo[];
  inspecciones?: LastInsp[];
};
type Vehicle = {
  id: string; placa: string; tipovhc: string;
  kilometrajeActual: number; configuracion: string | null;
  union?: string[];
  tires: Tire[];
};
type Draft = { int: string; cen: string; ext: string; psi: string; obs: string; imageData: string | null };

type CpkResult = { cpk: number; cpkProyectado: number; projectedKm: number; avgDepth: number; minDepth: number };

const SEMAFORO: Record<string, { color: string; label: string }> = {
  ok:       { color: '#10b981', label: 'OK' },
  watch:    { color: '#facc15', label: 'Vigilar' },
  warning:  { color: '#f97316', label: 'Alerta' },
  critical: { color: '#ef4444', label: 'Crítica' },
};

function alertTone(t: Tire) {
  return SEMAFORO[t.alertLevel] ?? SEMAFORO.ok;
}

// Mirror of dashboard calculateCpk — keep in sync with Inspeccion.tsx.
function calcCpk(tire: Tire, intMm: number, cenMm: number, extMm: number, kmDiff: number): CpkResult {
  const LIMITE_LEGAL_MM = 2;
  const EXPECTED_LIFETIME_KM = 80_000;
  const MIN_MEANINGFUL_KM = 5_000;

  const avgDepth = (intMm + cenMm + extMm) / 3;
  const minDepth = Math.min(intMm, cenMm, extMm);

  const costoArr = tire.costos ?? [];
  const totalCost = costoArr.reduce((s, c) => s + (c.valor ?? 0), 0);
  const totalKm = (tire.kilometrosRecorridos || 0) + kmDiff;

  const profInicial = tire.profundidadInicial || 8;
  const usableDepth = profInicial - LIMITE_LEGAL_MM;
  const mmWorn = profInicial - minDepth;
  const mmLeft = Math.max(minDepth - LIMITE_LEGAL_MM, 0);

  let projectedKm = 0;
  if (usableDepth > 0) {
    if (totalKm > 0) {
      const wearEstimate = mmWorn > 0 ? totalKm + (totalKm / mmWorn) * mmLeft : 0;
      const fallback = totalKm + (mmLeft / usableDepth) * EXPECTED_LIFETIME_KM;
      if (mmWorn <= 0) projectedKm = fallback;
      else {
        const confidence = Math.min(mmWorn / usableDepth, 1);
        projectedKm = wearEstimate * confidence + fallback * (1 - confidence);
      }
    } else {
      projectedKm = EXPECTED_LIFETIME_KM;
    }
  }

  let cpk = 0;
  if (totalKm >= MIN_MEANINGFUL_KM) cpk = totalCost / totalKm;
  else if (projectedKm > 0 && totalCost > 0) cpk = totalCost / projectedKm;

  const cpkProyectado = projectedKm > 0 ? totalCost / projectedKm : 0;

  return { cpk, cpkProyectado, projectedKm: Math.round(projectedKm), avgDepth, minDepth };
}

type Step = 'placa' | 'grid' | 'measure' | 'uploading' | 'report';

export default function InspectionWizard({ onDone }: { onDone: (summary: string) => void }) {
  const [step, setStep] = useState<Step>('placa');
  const [placa, setPlaca] = useState('');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [unionVehicle, setUnionVehicle] = useState<Vehicle | null>(null);
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);
  const [draft, setDraft] = useState<Draft>({ int: '', cen: '', ext: '', psi: '', obs: '', imageData: null });
  const [km, setKm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [lastSuccess, setLastSuccess] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  // Snapshot of tires + drafts at submit time so the report step still has
  // data after we reset drafts. kmDiff is also captured so CPK matches the
  // numbers the backend just stored.
  const [report, setReport] = useState<null | {
    vehicle: Vehicle;
    unionVehicle: Vehicle | null;
    items: Array<{ tire: Tire; draft: Draft; cpk: CpkResult }>;
    kmDiff: number;
    date: string;
    inspectorName?: string;
  }>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const inspectedIds = useMemo(() => new Set(Object.keys(drafts)), [drafts]);
  const allTires = useMemo(
    () => [...(vehicle?.tires ?? []), ...(unionVehicle?.tires ?? [])],
    [vehicle, unionVehicle],
  );
  const totalTires = allTires.length;

  async function fetchVehicleByPlaca(p: string): Promise<Vehicle> {
    return apiFetch(`/ana/vehicle-tires?placa=${encodeURIComponent(p.trim())}`);
  }

  const searchVehicle = async () => {
    if (!placa.trim()) return;
    setLoading(true); setError('');
    try {
      const v = await fetchVehicleByPlaca(placa);
      setVehicle(v);
      setKm(String(v.kilometrajeActual || ''));

      // Pull the union vehicle (the truck/trailer pair) so its tires show up
      // in the same wizard — mirrors what dashboard/agregar Inspeccion does.
      const unionPlacas = Array.isArray(v.union) ? v.union : [];
      if (unionPlacas.length > 0) {
        try {
          const u = await fetchVehicleByPlaca(unionPlacas[0]);
          setUnionVehicle(u);
        } catch { setUnionVehicle(null); }
      } else {
        setUnionVehicle(null);
      }

      setStep('grid');
    } catch (e) { setError((e as Error).message || 'Vehículo no encontrado.'); }
    finally { setLoading(false); }
  };

  const selectTire = (t: Tire) => {
    setSelectedTire(t);
    const existing = drafts[t.id];
    setDraft(existing ?? { int: '', cen: '', ext: '', psi: '', obs: '', imageData: null });
    setError(''); setLastSuccess(''); setStep('measure');
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setDraft(d => ({ ...d, imageData: r.result as string }));
    r.readAsDataURL(f);
  };

  const saveDraft = () => {
    if (!selectedTire || !draft.int || !draft.cen || !draft.ext) return;
    setDrafts(prev => ({ ...prev, [selectedTire.id]: { ...draft } }));
    setLastSuccess(`Pos ${selectedTire.posicion} — ${selectedTire.marca} ${selectedTire.diseno}`);
    setSelectedTire(null); setStep('grid');
  };

  const submitAll = async () => {
    if (!vehicle || inspectedIds.size === 0) return;
    setStep('uploading'); setError('');
    try {
      const kmDelta = Math.max(Number(km) - vehicle.kilometrajeActual, 0);
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');

      await Promise.all(Object.entries(drafts).map(async ([tireId, d]) => {
        const payload: Record<string, unknown> = {
          profundidadInt: parseFloat(d.int),
          profundidadCen: parseFloat(d.cen),
          profundidadExt: parseFloat(d.ext),
          newKilometraje: Number(km) || undefined,
          kmDelta: kmDelta > 0 ? kmDelta : undefined,
          source: 'manual',
        };
        if (d.psi) payload.presionPsi = parseFloat(d.psi);
        if (d.obs.trim()) payload.observacion = d.obs.trim();
        if (d.imageData) payload.imageUrls = [d.imageData];
        if (user?.name) payload.inspeccionadoPorNombre = user.name;
        if (user?.id) payload.inspeccionadoPorId = user.id;

        const res = await fetch(`${API_BASE}/tires/${tireId}/inspection`, { method: 'PATCH', headers: authH(), body: JSON.stringify(payload) });
        if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || `Error en llanta ${tireId}`); }
      }));

      // Build the snapshot the report step + PDF generator will use.
      const kmDiff = kmDelta;
      const items = Object.entries(drafts).map(([tireId, d]) => {
        const tire = allTires.find(t => t.id === tireId)!;
        const cpk = calcCpk(tire, parseFloat(d.int), parseFloat(d.cen), parseFloat(d.ext), kmDiff);
        return { tire, draft: d, cpk };
      });
      setReport({
        vehicle, unionVehicle, items, kmDiff,
        date: new Date().toISOString().slice(0, 10),
        inspectorName: user?.name,
      });
      setStep('report');
    } catch (e) {
      setError((e as Error).message || 'Error al subir inspecciones.');
      setStep('grid');
    }
  };

  async function generatePDF() {
    if (!report) return;
    const r = report;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const navy: [number, number, number] = [10, 24, 58];
      const blue: [number, number, number] = [30, 118, 182];
      const mid:  [number, number, number] = [23, 61, 104];
      const gray: [number, number, number] = [80, 80, 80];

      const totalPages = Math.max(2, Math.ceil(r.items.length / 4) + 1);
      let page = 1;

      function addHeader() {
        doc.setFillColor(...navy);
        doc.rect(0, 0, 210, 22, 'F');
        doc.setFillColor(...blue);
        doc.roundedRect(12, 4, 36, 14, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text('TirePro', 30, 13, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Reporte de Inspección', 130, 13, { align: 'center' });

        doc.setFillColor(240, 245, 255);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(...gray); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text(`Página ${page} de ${totalPages}`, 105, 289, { align: 'center' });
        doc.text(`Fecha: ${r.date}`, 15, 289);
        return 30;
      }

      let y = addHeader();
      const veh = r.vehicle;
      const hasInspector = !!r.inspectorName;

      doc.setFillColor(245, 248, 255);
      doc.roundedRect(12, y, 186, hasInspector ? 56 : 48, 3, 3, 'F');
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...mid);
      doc.text('Vehículo Principal', 18, y + 9);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...gray);
      doc.text(`Placa: ${veh.placa.toUpperCase()}`, 18, y + 18);
      doc.text(`Tipo: ${veh.tipovhc}`, 18, y + 26);
      doc.text(`Km anterior: ${veh.kilometrajeActual} km`, 18, y + 34);
      doc.text(`Km actual: ${veh.kilometrajeActual + r.kmDiff} km`, 18, y + 42);
      doc.text(`Distancia: +${r.kmDiff} km`, 110, y + 18);
      doc.text(`Llantas: ${veh.tires.length}`, 110, y + 26);
      if (hasInspector) doc.text(`Inspector: ${r.inspectorName}`, 110, y + 34);
      y += hasInspector ? 62 : 54;

      if (r.unionVehicle) {
        const uv = r.unionVehicle;
        doc.setFillColor(235, 245, 255);
        doc.roundedRect(12, y, 186, 40, 3, 3, 'F');
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
        doc.text('Vehículo en Unión', 18, y + 9);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
        doc.text(`Placa: ${uv.placa.toUpperCase()}`, 18, y + 18);
        doc.text(`Tipo: ${uv.tipovhc}`, 18, y + 26);
        doc.text(`Llantas: ${uv.tires.length}`, 110, y + 18);
        y += 46;
      }

      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...navy);
      doc.text('Inspección de Neumáticos', 15, y);
      y += 8;

      for (const { tire, draft, cpk } of r.items) {
        const hasPressure = !!draft.psi;
        const boxH = hasPressure ? 62 : 54;
        if (y + boxH > 272) { doc.addPage(); page++; y = addHeader(); }

        const isUnion = !!r.unionVehicle && tire.vehicleId === r.unionVehicle.id;
        const bg: [number, number, number] = isUnion ? [235, 245, 255] : [245, 248, 255];
        doc.setFillColor(...bg);
        doc.roundedRect(12, y, 186, boxH, 3, 3, 'F');

        doc.setFillColor(...(isUnion ? blue : navy));
        doc.roundedRect(12, y, 44, 10, 2, 2, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(`POSICIÓN ${tire.posicion}`, 34, y + 7, { align: 'center' });

        y += 14;
        doc.setTextColor(...navy); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(`${tire.marca}  —  ${tire.placa.toUpperCase()}`, 18, y);

        y += 8;
        doc.setTextColor(...gray); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text(`Int: ${draft.int} mm`, 18, y);
        doc.text(`Cen: ${draft.cen} mm`, 58, y);
        doc.text(`Ext: ${draft.ext} mm`, 98, y);
        doc.text(`Prom: ${cpk.avgDepth.toFixed(2)} mm`, 138, y);

        y += 8;
        doc.text(`CPK: ${cpk.cpk.toFixed(3)}`, 18, y);
        doc.text(`CPK Proy.: ${cpk.cpkProyectado.toFixed(3)}`, 58, y);
        if (cpk.projectedKm > 0) doc.text(`Km restantes: ${cpk.projectedKm.toLocaleString()}`, 110, y);

        if (hasPressure) {
          y += 8;
          doc.setTextColor(...blue);
          doc.text(`Presión medida: ${draft.psi} PSI`, 18, y);
          doc.setTextColor(...gray);
        }

        y += 20;
      }

      const filename = r.unionVehicle
        ? `inspeccion_${veh.placa}_${r.unionVehicle.placa}_${r.date}.pdf`
        : `inspeccion_${veh.placa}_${r.date}.pdf`;
      doc.save(filename);
    } catch (e) {
      setError('Error al generar el PDF.');
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  }

  const finishWithSummary = () => {
    if (!report) { onDone('Inspección lista.'); return; }
    const n = report.items.length;
    const placas = [report.vehicle.placa, report.unionVehicle?.placa].filter(Boolean).join(' + ').toUpperCase();
    onDone(`Inspección completada — ${n} llanta${n !== 1 ? 's' : ''} inspeccionada${n !== 1 ? 's' : ''} en ${placas}.\n\n¿Hay algo más en lo que pueda ayudarte?`);
  };

  return (
    <div className="rounded-2xl border border-[#0A183A]/10 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#0A183A]/6 bg-gradient-to-r from-[#0A183A] to-[#173D68] px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        <span className="text-[13px] font-semibold text-white">Inspección en vivo</span>
        {vehicle && step !== 'report' && (
          <span className="ml-auto text-[11px] text-white/60">
            {vehicle.placa.toUpperCase()}
            {unionVehicle && ` + ${unionVehicle.placa.toUpperCase()}`}
            {' · '}{inspectedIds.size}/{totalTires}
          </span>
        )}
      </div>

      <div className="p-4">
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">{error}</div>}

        {lastSuccess && step === 'grid' && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-emerald-600"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-[12px] text-emerald-700">{lastSuccess} — guardada localmente</span>
          </div>
        )}

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

        {/* Grid (vehicle + optional union) */}
        {step === 'grid' && vehicle && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] text-[#0A183A]/70">
                Toca una llanta para inspeccionar
                {inspectedIds.size > 0 && <span className="ml-1 text-[#1E76B6] font-medium">({inspectedIds.size} lista{inspectedIds.size !== 1 ? 's' : ''})</span>}
              </p>
              <button
                onClick={() => { setStep('placa'); setVehicle(null); setUnionVehicle(null); setDrafts({}); setLastSuccess(''); }}
                className="text-[12px] text-[#1E76B6] hover:underline"
              >
                Cambiar
              </button>
            </div>

            {allTires.length === 0 ? (
              <p className="text-[13px] text-[#0A183A]/50 py-6 text-center">Este vehículo no tiene llantas registradas.</p>
            ) : (
              <>
                <VehicleSection
                  title={`${vehicle.placa.toUpperCase()} · Principal`}
                  vehicle={vehicle}
                  drafts={drafts}
                  selectedTire={selectedTire}
                  onSelect={selectTire}
                  accent="navy"
                />
                {unionVehicle && unionVehicle.tires.length > 0 && (
                  <div className="mt-4">
                    <VehicleSection
                      title={`${unionVehicle.placa.toUpperCase()} · En Unión`}
                      vehicle={unionVehicle}
                      drafts={drafts}
                      selectedTire={selectedTire}
                      onSelect={selectTire}
                      accent="blue"
                    />
                  </div>
                )}

                <TireGridLegend items={[
                  { color: '#1E76B6', label: 'Inspeccionada' },
                  { color: SEMAFORO.ok.color, label: 'OK' },
                  { color: SEMAFORO.watch.color, label: 'Vigilar' },
                  { color: SEMAFORO.warning.color, label: 'Alerta' },
                  { color: SEMAFORO.critical.color, label: 'Crítica' },
                ]} />

                <div className="mt-3 max-h-36 overflow-y-auto rounded-lg border border-[#0A183A]/6">
                  {allTires.map(t => {
                    const done = inspectedIds.has(t.id);
                    const tone = alertTone(t);
                    return (
                      <button key={t.id} onClick={() => selectTire(t)}
                        className={`flex w-full items-center gap-2 border-b border-[#0A183A]/4 px-3 py-2 text-left last:border-0 transition-colors ${done ? 'bg-[#1E76B6]/5' : 'hover:bg-[#F8FAFC]'}`}>
                        {done ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1E76B6]/15 text-[#1E76B6]">
                            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        ) : (
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white"
                            style={{ background: tone.color }}
                            title={tone.label}
                          >{t.posicion}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className={`text-[12px] font-medium ${done ? 'text-[#0A183A]/50' : 'text-[#0A183A]'}`}>{t.marca} {t.diseno}</span>
                          <span className="ml-2 text-[11px] text-[#0A183A]/40">{t.dimension} · {t.eje}</span>
                        </div>
                        <span className={`text-[12px] font-semibold w-12 text-right ${done ? 'text-[#1E76B6]' : 'text-[#0A183A]/60'}`}>
                          {done ? `${drafts[t.id]?.int}` : (t.currentProfundidad?.toFixed(1) ?? '?')}mm
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-3">
              <label className="block text-[11px] font-medium text-[#0A183A]/50 mb-1">Kilometraje actual</label>
              <input type="number" value={km} onChange={e => setKm(e.target.value)}
                className="w-full rounded-lg border border-[#0A183A]/10 px-3 py-1.5 text-[13px] text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#A374FF]/30" />
            </div>

            {inspectedIds.size > 0 && (
              <button onClick={submitAll}
                className="mt-3 w-full rounded-xl bg-gradient-to-br from-[#0A183A] to-[#173D68] py-2.5 text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition-all">
                Subir {inspectedIds.size} inspección{inspectedIds.size !== 1 ? 'es' : ''}
              </button>
            )}
          </div>
        )}

        {/* Measure */}
        {step === 'measure' && selectedTire && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#0A183A]">Pos {selectedTire.posicion} — {selectedTire.marca} {selectedTire.diseno}</p>
                <p className="text-[11px] text-[#0A183A]/50">{selectedTire.dimension} · {selectedTire.eje} · {selectedTire.vidaActual} · Actual: {selectedTire.currentProfundidad?.toFixed(1) ?? '?'}mm</p>
              </div>
              <button onClick={() => setStep('grid')} className="text-[12px] text-[#1E76B6] hover:underline">← Volver</button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['int', 'cen', 'ext'] as const).map(zone => (
                <div key={zone}>
                  <label className="block text-[11px] font-medium text-[#0A183A]/50 mb-1">
                    {zone === 'int' ? 'Interior' : zone === 'cen' ? 'Centro' : 'Exterior'} (mm)
                  </label>
                  <input type="number" step="0.1" min="0" max="30" value={draft[zone]}
                    onChange={e => setDraft(d => ({ ...d, [zone]: e.target.value }))} autoFocus={zone === 'int'}
                    placeholder="0.0"
                    className="w-full rounded-lg border border-[#0A183A]/15 px-3 py-2 text-center text-[16px] font-semibold text-[#0A183A] placeholder:text-[#0A183A]/20 focus:outline-none focus:ring-2 focus:ring-[#A374FF]/30" />
                </div>
              ))}
            </div>

            <div className="mb-3">
              <label className="block text-[11px] font-medium text-[#0A183A]/50 mb-1">Presión (PSI) — opcional</label>
              <input type="number" step="1" min="0" max="250" value={draft.psi} onChange={e => setDraft(d => ({ ...d, psi: e.target.value }))}
                placeholder="Ej: 110"
                className="w-full rounded-lg border border-[#0A183A]/10 px-3 py-1.5 text-[13px] text-[#0A183A] focus:outline-none focus:ring-2 focus:ring-[#A374FF]/30" />
            </div>

            <div className="mb-3">
              <label className="block text-[11px] font-medium text-[#0A183A]/50 mb-1">Observaciones — opcional</label>
              <textarea value={draft.obs} onChange={e => setDraft(d => ({ ...d, obs: e.target.value }))} rows={2}
                placeholder="Desgaste irregular, daño lateral, etc."
                className="w-full resize-none rounded-lg border border-[#0A183A]/10 px-3 py-1.5 text-[13px] text-[#0A183A] placeholder:text-[#0A183A]/30 focus:outline-none focus:ring-2 focus:ring-[#A374FF]/30" />
            </div>

            <div className="mb-4">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
              {draft.imageData ? (
                <div className="relative">
                  <img src={draft.imageData} alt="Foto" className="h-32 w-full rounded-lg object-cover border border-[#0A183A]/10" />
                  <button onClick={() => setDraft(d => ({ ...d, imageData: null }))}
                    className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white hover:bg-black/70">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#0A183A]/15 py-3 text-[12px] text-[#0A183A]/45 hover:border-[#1E76B6]/40 hover:text-[#1E76B6] transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" /></svg>
                  Agregar foto (opcional)
                </button>
              )}
            </div>

            <button onClick={saveDraft}
              disabled={!draft.int || !draft.cen || !draft.ext}
              className="w-full rounded-xl bg-[#0A183A] py-2.5 text-[13px] font-semibold text-white hover:bg-[#173D68] disabled:opacity-40 transition-all">
              Guardar y continuar
            </button>
          </div>
        )}

        {/* Uploading */}
        {step === 'uploading' && (
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E76B6]/30 border-t-[#1E76B6]" />
            <span className="text-[13px] text-[#0A183A]/60">Subiendo {inspectedIds.size} inspección{inspectedIds.size !== 1 ? 'es' : ''}...</span>
          </div>
        )}

        {/* Report — post-submit summary + PDF prompt */}
        {step === 'report' && report && (
          <div>
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-emerald-600"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="text-[12px] text-emerald-700">
                {report.items.length} inspección{report.items.length !== 1 ? 'es' : ''} guardada{report.items.length !== 1 ? 's' : ''} exitosamente.
              </span>
            </div>

            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#0A183A]/55">Inspecciones del día</p>
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {report.items.map(({ tire, draft, cpk }) => {
                const tone = alertTone(tire);
                const isUnion = !!report.unionVehicle && tire.vehicleId === report.unionVehicle.id;
                return (
                  <div key={tire.id} className="rounded-xl border border-[#0A183A]/8 bg-white p-3 shadow-sm">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.color }} title={tone.label} />
                        <span className="text-[12px] font-bold text-[#0A183A] truncate">Pos {tire.posicion} · {tire.marca}</span>
                      </div>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                        style={{
                          background: isUnion ? 'rgba(30,118,182,0.12)' : 'rgba(10,24,58,0.06)',
                          color: isUnion ? '#1E76B6' : '#0A183A',
                        }}
                      >
                        {isUnion ? 'Unión' : 'Principal'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#0A183A]/55">{tire.placa.toUpperCase()} · {tire.dimension}</p>
                    <div className="mt-2 flex items-baseline gap-3 text-[11px]">
                      <span className="text-[#0A183A]/55">Int <span className="font-semibold text-[#0A183A]">{draft.int}</span></span>
                      <span className="text-[#0A183A]/55">Cen <span className="font-semibold text-[#0A183A]">{draft.cen}</span></span>
                      <span className="text-[#0A183A]/55">Ext <span className="font-semibold text-[#0A183A]">{draft.ext}</span></span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between text-[11px]">
                      <span className="text-[#0A183A]/55">Prom <span className="font-semibold text-[#0A183A]">{cpk.avgDepth.toFixed(2)} mm</span></span>
                      {cpk.projectedKm > 0 && (
                        <span className="text-[#0A183A]/55">~ <span className="font-semibold text-[#0A183A]">{cpk.projectedKm.toLocaleString()} km</span></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-[#A374FF]/25 bg-[#A374FF]/5 p-4">
              <p className="text-[13px] font-semibold text-[#0A183A]">¿Quieres que te dé un reporte?</p>
              <p className="mt-0.5 text-[11px] text-[#0A183A]/60">
                Genero un PDF con todas las profundidades, CPK y proyecciones de esta inspección.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={generatePDF}
                  disabled={pdfLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1E76B6] to-[#173D68] py-2.5 text-[13px] font-semibold text-white shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
                >
                  {pdfLoading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generando PDF…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Sí, descargar reporte
                    </>
                  )}
                </button>
                <button
                  onClick={finishWithSummary}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#0A183A]/15 bg-white py-2.5 text-[13px] font-medium text-[#0A183A]/75 hover:bg-[#F8FAFC] transition-colors"
                >
                  No, terminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Vehicle grid section — header strip + axle diagram. Reused for the
// principal vehicle and (when present) the unión vehicle so they read as
// one continuous wizard instead of two disconnected widgets.
// =============================================================================
function VehicleSection({
  title, vehicle, drafts, selectedTire, onSelect, accent,
}: {
  title: string;
  vehicle: Vehicle;
  drafts: Record<string, Draft>;
  selectedTire: Tire | null;
  onSelect: (t: Tire) => void;
  accent: 'navy' | 'blue';
}) {
  const inspectedIds = useMemo(() => new Set(Object.keys(drafts)), [drafts]);
  const headerBg = accent === 'navy'
    ? 'linear-gradient(135deg, #0A183A, #173D68)'
    : 'linear-gradient(135deg, #1E76B6, #173D68)';
  return (
    <div className="rounded-xl border border-[#0A183A]/8 overflow-hidden">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white" style={{ background: headerBg }}>
        {title}
      </div>
      <div className="bg-[#F8FAFC] px-2 py-3">
        <VehicleTireGrid<Tire>
          tires={vehicle.tires}
          configuracion={vehicle.configuracion}
          selectedId={selectedTire?.id}
          onSelect={onSelect}
          tone={(t) => inspectedIds.has(t.id)
            ? { color: '#1E76B6', label: '✓' }
            : alertTone(t)}
          cellSize={52}
          renderCellExtra={t => inspectedIds.has(t.id) ? '✓' : (t.currentProfundidad != null ? `${t.currentProfundidad.toFixed(0)}` : null)}
        />
      </div>
    </div>
  );
}
