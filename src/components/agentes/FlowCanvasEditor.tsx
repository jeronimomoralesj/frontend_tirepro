'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ConnectionLineType,
  type Node,
  type Edge,
} from '@xyflow/react';
import { AnimatePresence } from 'framer-motion';
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import AddStepNode from './nodes/AddStepNode';
import AnimatedEdge from './AnimatedEdge';
import FlowToolbar from './FlowToolbar';
import NodeConfigPanel from './NodeConfigPanel';
import { getFlow, createFlow, updateFlow, toggleFlow as apiToggle, deleteFlow as apiDelete } from './api';
import { getActionColor } from './constants';
import type { ApiFlow, FlowTemplate, TriggerNodeData, ActionNodeData } from './types';

const nodeTypes = { trigger: TriggerNode, action: ActionNode, addStep: AddStepNode };
const edgeTypes = { animated: AnimatedEdge };

function buildNodes(
  triggerType: string, triggerConfig: Record<string, unknown>,
  actionType: string, actionConfig: Record<string, unknown>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    { id: 'trigger', type: 'trigger', position: { x: 80, y: 200 }, data: { nodeType: 'trigger', triggerType, triggerConfig } },
    { id: 'addStep', type: 'addStep', position: { x: 420, y: 222 }, draggable: false, data: { nodeType: 'addStep' } },
    { id: 'action', type: 'action', position: { x: 620, y: 200 }, data: { nodeType: 'action', actionType, actionConfig } },
  ];
  const edges: Edge[] = [
    { id: 'e-trigger-add', source: 'trigger', target: 'addStep', type: 'animated' },
    { id: 'e-add-action', source: 'addStep', target: 'action', type: 'animated' },
  ];
  return { nodes, edges };
}

type Props = {
  flowId: string | 'new';
  template?: FlowTemplate | null;
  onClose: (refresh?: boolean) => void;
};

export default function FlowCanvasEditor({ flowId, template, onClose }: Props) {
  const isNew = flowId === 'new';
  const [flowName, setFlowName] = useState(template?.name ?? '');
  const [flowStatus, setFlowStatus] = useState<'draft' | 'active' | 'paused' | 'error'>(isNew ? 'draft' : 'active');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : flowId);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const initial = useMemo(() => buildNodes(
    template?.triggerType ?? 'tire_alert_level',
    template?.triggerConfig ?? { alertLevels: ['critical'] },
    template?.actionType ?? 'send_email',
    template?.actionConfig ?? { to: '', subject: 'Alerta TirePro' },
  ), [template]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const snapshotRef = useRef('');
  const currentSnapshot = JSON.stringify({ flowName, nodes: nodes.map(n => n.data) });
  const dirty = currentSnapshot !== snapshotRef.current;

  useEffect(() => {
    if (isNew) {
      snapshotRef.current = currentSnapshot;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isNew || !flowId) return;
    (async () => {
      setLoading(true);
      const flow = await getFlow(flowId);
      if (flow) {
        setFlowName(flow.name);
        setFlowStatus(flow.status as any);
        const { nodes: n, edges: e } = buildNodes(flow.triggerType, flow.triggerConfig, flow.actionType, flow.actionConfig);
        setNodes(n);
        setEdges(e);
        setTimeout(() => {
          snapshotRef.current = JSON.stringify({ flowName: flow.name, nodes: n.map(nd => nd.data) });
        }, 0);
      }
      setLoading(false);
    })();
  }, [flowId, isNew, setNodes, setEdges]);

  // Re-center the addStep node when trigger/action are dragged
  const handleNodesChange: typeof onNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    setNodes(prev => {
      const trigger = prev.find(n => n.id === 'trigger');
      const action = prev.find(n => n.id === 'action');
      if (!trigger || !action) return prev;
      const midX = (trigger.position.x + 220 + action.position.x) / 2 - 20;
      const midY = (trigger.position.y + action.position.y) / 2 + 22;
      return prev.map(n => n.id === 'addStep' ? { ...n, position: { x: midX, y: midY } } : n);
    });
  }, [onNodesChange, setNodes]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.id === 'trigger' || node.id === 'action') setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);

  const handleSave = async () => {
    if (!flowName.trim()) return;
    setSaving(true);
    const trigger = nodes.find(n => n.id === 'trigger')?.data as TriggerNodeData;
    const action = nodes.find(n => n.id === 'action')?.data as ActionNodeData;
    if (!trigger || !action) { setSaving(false); return; }

    const payload = {
      name: flowName,
      triggerType: trigger.triggerType,
      triggerConfig: trigger.triggerConfig,
      actionType: action.actionType,
      actionConfig: action.actionConfig,
    };

    let result: ApiFlow | null;
    if (savedId) {
      result = await updateFlow(savedId, payload);
    } else {
      result = await createFlow(payload);
      if (result) setSavedId(result.id);
    }

    if (result) {
      setFlowStatus(result.status as any);
      snapshotRef.current = JSON.stringify({ flowName, nodes: nodes.map(n => n.data) });
    }
    setSaving(false);
  };

  const handleToggle = async () => {
    if (!savedId) return;
    const result = await apiToggle(savedId);
    if (result) setFlowStatus(result.status as any);
  };

  const handleDelete = async () => {
    if (!savedId || !confirm('¿Eliminar este flujo?')) return;
    await apiDelete(savedId);
    onClose(true);
  };

  const handleBack = () => {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Salir?')) return;
    onClose(!!savedId);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeType = selectedNodeId === 'trigger' ? 'trigger' as const : 'action' as const;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A183A]/10 border-t-[#A374FF]" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <FlowToolbar
        name={flowName}
        onNameChange={setFlowName}
        status={flowStatus}
        dirty={dirty}
        saving={saving}
        isNew={!savedId}
        onBack={handleBack}
        onSave={handleSave}
        onToggle={savedId ? handleToggle : undefined}
        onDelete={savedId ? handleDelete : undefined}
      />

      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          connectionLineType={ConnectionLineType.SmoothStep}
          snapToGrid
          snapGrid={[20, 20]}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
          selectionKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(10,24,58,0.07)" />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            nodeColor={(n) => {
              if (n.type === 'trigger') return '#A374FF';
              if (n.type === 'action') return getActionColor((n.data as ActionNodeData)?.actionType).color;
              return '#D1D5DB';
            }}
            maskColor="rgba(248,250,252,0.85)"
            style={{ border: '1px solid rgba(10,24,58,0.08)', borderRadius: 8 }}
          />
        </ReactFlow>

        <AnimatePresence>
          {selectedNode && (selectedNodeId === 'trigger' || selectedNodeId === 'action') && (
            <NodeConfigPanel
              nodeType={selectedNodeType}
              data={selectedNode.data as any}
              onUpdate={(data) => updateNodeData(selectedNodeId, data as Record<string, unknown>)}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
