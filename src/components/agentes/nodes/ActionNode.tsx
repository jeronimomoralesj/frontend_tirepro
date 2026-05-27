import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActionNodeData } from '../types';
import { ACTION_LABELS, getActionColor, actionSummary } from '../constants';
import { ACTION_ICON_MAP, GearIcon } from '../icons';

function ActionNode({ data, selected }: NodeProps & { data: ActionNodeData }) {
  const label = ACTION_LABELS[data.actionType] ?? 'Accion';
  const summary = actionSummary(data.actionType, data.actionConfig);
  const { color } = getActionColor(data.actionType);
  const Icon = ACTION_ICON_MAP[data.actionType] ?? GearIcon;

  return (
    <div className={`w-[220px] rounded-xl bg-white border transition-all cursor-pointer ${selected ? 'shadow-lg ring-2' : 'shadow-sm hover:shadow-md'}`} style={{ borderColor: selected ? color : 'rgba(10,24,58,0.1)', ...(selected ? { boxShadow: `0 10px 25px -5px ${color}20`, ringColor: `${color}30` } : {}) }}>
      <div className="h-1 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      <div className="p-3.5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}15` }}>
            <Icon className="h-4.5 w-4.5" style={{ color }} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>Accion</div>
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
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-white !-left-1.5"
        style={{ background: color }}
      />
    </div>
  );
}

export default memo(ActionNode);
