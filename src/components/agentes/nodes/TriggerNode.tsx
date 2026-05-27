import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TriggerNodeData } from '../types';
import { TRIGGER_LABELS, triggerSummary } from '../constants';
import { TRIGGER_ICON_MAP, BoltIcon } from '../icons';

function TriggerNode({ data, selected }: NodeProps & { data: TriggerNodeData }) {
  const label = TRIGGER_LABELS[data.triggerType] ?? 'Trigger';
  const summary = triggerSummary(data.triggerType, data.triggerConfig);
  const Icon = TRIGGER_ICON_MAP[data.triggerType] ?? BoltIcon;

  return (
    <div className={`w-[220px] rounded-xl bg-white border transition-all cursor-pointer ${selected ? 'border-[#A374FF] shadow-lg shadow-[#A374FF]/15 ring-2 ring-[#A374FF]/20' : 'border-[#0A183A]/10 shadow-sm hover:shadow-md hover:border-[#A374FF]/30'}`}>
      <div className="h-1 rounded-t-xl bg-gradient-to-r from-[#A374FF] to-[#7C3AED]" />
      <div className="p-3.5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A374FF]/10">
            <Icon className="h-4.5 w-4.5 text-[#A374FF]" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A374FF]">Trigger</div>
            <div className="text-[13px] font-semibold text-[#0A183A] truncate">{label}</div>
          </div>
        </div>
        {summary && (
          <div className="rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] text-[#0A183A]/60 truncate">
            {summary}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#A374FF] !border-2 !border-white !-right-1.5"
      />
    </div>
  );
}

export default memo(TriggerNode);
