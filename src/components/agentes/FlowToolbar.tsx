'use client';

const cn = (...a: (string | boolean | undefined | null)[]) => a.filter(Boolean).join(' ');

type Props = {
  name: string;
  onNameChange: (name: string) => void;
  status: 'draft' | 'active' | 'paused' | 'error';
  dirty: boolean;
  saving: boolean;
  isNew: boolean;
  onBack: () => void;
  onSave: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
};

export default function FlowToolbar({ name, onNameChange, status, dirty, saving, isNew, onBack, onSave, onToggle, onDelete }: Props) {
  const statusLabel = status === 'draft' ? 'Borrador' : status === 'active' ? 'Activo' : status === 'paused' ? 'Pausado' : 'Error';
  const statusColor = status === 'active' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : status === 'draft' ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#0A183A]/6 bg-white px-4 sm:px-5">
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#0A183A]/50 hover:bg-[#F8FAFC] hover:text-[#0A183A]">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <input
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Nombre del flujo"
          className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold text-[#0A183A] placeholder:text-[#0A183A]/25 focus:outline-none"
        />
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-semibold text-[#0A183A]/50">
          <span className={cn('h-1.5 w-1.5 rounded-full', statusColor)} />
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isNew && onToggle && (
          <button type="button" onClick={onToggle}
            className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', status === 'active' ? 'bg-emerald-400' : 'bg-[#D1D5DB]')}>
            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', status === 'active' ? 'left-[18px]' : 'left-0.5')} />
          </button>
        )}

        {!isNew && onDelete && (
          <button type="button" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0A183A]/25 hover:bg-red-50 hover:text-red-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}

        <button type="button" onClick={onSave} disabled={saving || (!dirty && !isNew)}
          className={cn('flex h-8 items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold transition-all',
            (dirty || isNew) && !saving ? 'bg-[#0A183A] text-white hover:bg-[#173D68]' : 'bg-[#0A183A]/5 text-[#0A183A]/25 cursor-not-allowed')}>
          {saving ? (
            <><div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Guardando</>
          ) : (
            <>{dirty || isNew ? 'Guardar' : <><svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> Guardado</>}</>
          )}
        </button>
      </div>
    </div>
  );
}
