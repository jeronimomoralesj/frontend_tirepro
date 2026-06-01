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
    <div
      style={{ width: 220, borderRadius: 12, background: '#fff', border: selected ? `2px solid ${color}` : '1px solid rgba(10,24,58,0.1)', boxShadow: selected ? `0 10px 25px -5px ${color}30` : '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', overflow: 'hidden' }}
    >
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: `${color}15` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color }}>Accion</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0A183A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          </div>
        </div>
        {summary && (
          <div style={{ borderRadius: 8, background: '#F8FAFC', padding: '6px 10px', fontSize: 11, color: 'rgba(10,24,58,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {summary}
          </div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 12, height: 12, background: color, border: '2px solid #fff', left: -6, top: '50%' }}
      />
    </div>
  );
}

export default memo(ActionNode);
