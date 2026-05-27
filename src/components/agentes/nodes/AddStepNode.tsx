import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function AddStepNode(_props: NodeProps) {
  const [hover, setHover] = useState(false);
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowTip(false); }}>
      <button
        type="button"
        onClick={() => setShowTip(v => !v)}
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed transition-all ${hover ? 'border-[#A374FF] text-[#A374FF] scale-110' : 'border-[#0A183A]/15 text-[#0A183A]/30'}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      {showTip && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded-lg bg-[#0A183A] px-3 py-1.5 text-[11px] font-medium text-white shadow-lg z-10">
          Próximamente: múltiples pasos
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 h-2 w-2 rotate-45 bg-[#0A183A]" />
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
    </div>
  );
}

export default memo(AddStepNode);
