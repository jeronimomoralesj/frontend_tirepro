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
    <div
      style={{ width: 220, borderRadius: 12, background: '#fff', border: selected ? '2px solid #A374FF' : '1px solid rgba(10,24,58,0.1)', boxShadow: selected ? '0 10px 25px -5px rgba(163,116,255,0.15)' : '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', overflow: 'hidden' }}
    >
      <div style={{ height: 4, background: 'linear-gradient(90deg, #A374FF, #7C3AED)' }} />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(163,116,255,0.1)' }}>
            <Icon className="h-4 w-4" style={{ color: '#A374FF' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A374FF' }}>Trigger</div>
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
        type="source"
        position={Position.Right}
        style={{ width: 12, height: 12, background: '#A374FF', border: '2px solid #fff', right: -6, top: '50%' }}
      />
    </div>
  );
}

export default memo(TriggerNode);
