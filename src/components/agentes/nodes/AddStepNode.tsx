import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AddStepNodeData } from '../types';

function AddStepNode(props: NodeProps) {
  const [hover, setHover] = useState(false);
  const data = props.data as AddStepNodeData;
  const disabled = !!data?.disabled;
  const onAdd = data?.onAddAction;

  const handleClick = () => {
    if (disabled) return;
    if (typeof onAdd === 'function') onAdd();
  };

  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={disabled ? 'Maximo 3 acciones' : 'Agregar otra accion'}
        style={{
          display: 'flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          border: `2px dashed ${disabled ? 'rgba(10,24,58,0.08)' : hover ? '#A374FF' : 'rgba(10,24,58,0.25)'}`,
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
          color: disabled ? 'rgba(10,24,58,0.15)' : hover ? '#A374FF' : 'rgba(10,24,58,0.4)',
          transform: hover && !disabled ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      {hover && !disabled && (
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '100%', marginTop: 8,
          whiteSpace: 'nowrap', borderRadius: 8, background: '#0A183A', padding: '6px 12px',
          fontSize: 11, fontWeight: 500, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10,
          pointerEvents: 'none',
        }}>
          Agregar accion
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: -4, width: 8, height: 8, background: '#0A183A', rotate: '45deg' }} />
        </div>
      )}
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  );
}

export default memo(AddStepNode);
