import { memo } from 'react';
import { getBezierPath, type EdgeProps } from '@xyflow/react';

function AnimatedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style, selected,
}: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <g>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={selected ? '#A374FF' : 'rgba(10,24,58,0.2)'}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray="6 4"
        className="animated-edge"
        style={style}
      />
    </g>
  );
}

export default memo(AnimatedEdge);
