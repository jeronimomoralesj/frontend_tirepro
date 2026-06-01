'use client';

import { useRef, useState } from 'react';
import MappingReview from '@/components/bulk/MappingReview';
import { analyzeBulkFile, uploadBulkFile, type AnalyzeResult } from '@/components/bulk/bulkMapping';

const TEMPLATE_FIELDS = [
  'placa', 'marca', 'diseno', 'dimension', 'posicion', 'eje',
  'profundidad_int', 'profundidad_cen', 'profundidad_ext', 'profundidad_inicial',
  'vida', 'costo', 'kilometros_llanta', 'kilometraje_vehiculo', 'tipovhc',
  'fecha_instalacion', 'presion_psi',
];
const TEMPLATE_EXAMPLE = [
  'ABC123', 'Continental', 'HDR2', '295/80R22.5', '1', 'direccion',
  '12', '11.5', '12', '16',
  'nueva', '450000', '30000', '45200', 'Camion',
  '2025-01-15', '110',
];

type UploadResult = { ok: number; failed: { placa?: string; error: string }[] };

function downloadTemplate() {
  const header = TEMPLATE_FIELDS.join('\t');
  const example = TEMPLATE_EXAMPLE.join('\t');
  const blob = new Blob([header + '\n' + example], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'plantilla_carga_llantas.xls';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function BulkUploadWidget({ onDone }: { onDone: (summary: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setError(''); setAnalyzing(true);
    try {
      const res = await analyzeBulkFile(f);
      if (!res.headers.length) { setError('El archivo está vacío o no se pudo leer.'); setFile(null); }
      else setAnalysis(res);
    } catch (err) {
      setError((err as Error).message);
      setFile(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null); setAnalysis(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const commit = async (columnMapping: Record<string, string | null>) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const stored = localStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.companyId) throw new Error('No se encontró la empresa.');

      const res = await uploadBulkFile(file, user.companyId, { userId: user.id ?? '', columnMapping });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult({
        ok: data.success ?? data.ok ?? data.created?.length ?? 0,
        failed: Array.isArray(data.details?.errors)
          ? data.details.errors.map((m: string) => ({ error: m }))
          : (Array.isArray(data.failed) ? data.failed : []),
      });
      setAnalysis(null);
    } catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  };

  const finish = () => {
    const msg = result
      ? `Carga masiva completada: ${result.ok} llantas cargadas exitosamente${result.failed.length ? `, ${result.failed.length} filas con errores` : ''}.\n\n¿Hay algo más en lo que pueda ayudarte?`
      : 'Carga cancelada.';
    onDone(msg);
  };

  return (
    <div className="rounded-2xl border border-[#0A183A]/10 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#0A183A]/6 bg-gradient-to-r from-[#0A183A] to-[#173D68] px-4 py-3">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span className="text-[13px] font-semibold text-white">Carga masiva de llantas</span>
        {analysis && <span className="ml-auto text-[11px] text-white/60">{analysis.totalRows} filas</span>}
      </div>

      <div className="p-4">
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[13px] text-red-700">{error}</div>}

        {/* ── File picker ── */}
        {!analysis && !analyzing && !result && !uploading && (
          <div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />

            <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#A374FF]/15 bg-[#A374FF]/[0.04] px-3 py-2.5">
              <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-[#A374FF]"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              <p className="text-[11px] text-[#0A183A]/60">
                Sube tu archivo con <span className="font-semibold text-[#0A183A]/80">cualquier estructura de columnas</span>. La IA detecta y mapea los datos automáticamente — no necesitas una plantilla fija.
              </p>
            </div>

            <button onClick={downloadTemplate}
              className="mb-3 flex w-full items-center gap-2.5 rounded-lg border border-[#1E76B6]/15 bg-[#1E76B6]/[0.04] px-3 py-2.5 text-left hover:bg-[#1E76B6]/[0.08] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-[#1E76B6]"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div>
                <p className="text-[12px] font-semibold text-[#1E76B6]">Descargar plantilla Excel (opcional)</p>
                <p className="text-[10px] text-[#0A183A]/40">Una referencia con columnas sugeridas y un ejemplo</p>
              </div>
            </button>

            <button onClick={() => inputRef.current?.click()}
              className="mb-1 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#0A183A]/12 py-8 text-[#0A183A]/45 hover:border-[#A374FF]/40 hover:text-[#A374FF] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="text-[13px] font-medium">Seleccionar archivo Excel</span>
              <span className="text-[11px]">.xlsx, .xls o .csv</span>
            </button>
          </div>
        )}

        {/* ── Analyzing ── */}
        {analyzing && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A374FF]/30 border-t-[#A374FF]" />
            <span className="text-[13px] text-[#0A183A]/60">Analizando tu archivo con IA...</span>
            <span className="text-[11px] text-[#0A183A]/35">Detectando columnas y validando datos</span>
          </div>
        )}

        {/* ── Mapping review ── */}
        {analysis && !uploading && !result && (
          <MappingReview
            result={analysis}
            confirmLabel={`Subir ${analysis.totalRows} filas`}
            onBack={reset}
            onConfirm={commit}
          />
        )}

        {/* ── Uploading ── */}
        {uploading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A374FF]/30 border-t-[#A374FF]" />
            <span className="text-[13px] text-[#0A183A]/60">Procesando archivo...</span>
            <span className="text-[11px] text-[#0A183A]/35">Esto puede tomar unos segundos</span>
          </div>
        )}

        {/* ── Result ── */}
        {result && (
          <div>
            <div className={`mb-3 flex items-center gap-3 rounded-lg border px-3 py-3 ${result.ok > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              {result.ok > 0 ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-emerald-600"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-amber-600"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" /></svg>
              )}
              <div>
                <p className={`text-[13px] font-medium ${result.ok > 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {result.ok > 0 ? `${result.ok} llantas cargadas exitosamente` : 'No se pudieron cargar llantas'}
                </p>
                {result.failed.length > 0 && <p className="text-[12px] text-amber-700">{result.failed.length} filas con errores</p>}
              </div>
            </div>

            {result.failed.length > 0 && (
              <div className="mb-3 max-h-32 overflow-y-auto rounded-lg border border-red-100 bg-red-50/50">
                {result.failed.slice(0, 10).map((f, i) => (
                  <div key={i} className="border-b border-red-100 px-3 py-1.5 text-[11px] text-red-700 last:border-0">
                    {f.placa && <span className="font-medium">{f.placa}: </span>}{f.error}
                  </div>
                ))}
                {result.failed.length > 10 && <div className="px-3 py-1.5 text-[11px] text-red-500">...y {result.failed.length - 10} más</div>}
              </div>
            )}

            <button onClick={finish}
              className="w-full rounded-xl bg-[#0A183A] py-2.5 text-[13px] font-medium text-white hover:bg-[#173D68] transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
