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
import { AnimatePresence, motion } from 'framer-motion';
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import AddStepNode from './nodes/AddStepNode';
import AnimatedEdge from './AnimatedEdge';
import FlowToolbar from './FlowToolbar';
import NodeConfigPanel from './NodeConfigPanel';
import { getFlow, createFlow, updateFlow, toggleFlow as apiToggle, deleteFlow as apiDelete, askAiBuilder } from './api';
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

  // Floating AI assistant
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiMessageType, setAiMessageType] = useState<'success' | 'error' | 'clarification'>('success');
  const aiRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { const el = aiRef.current; if (!el) return; el.style.height = '0px'; el.style.height = Math.min(el.scrollHeight, 80) + 'px'; }, [aiInput]);

  const handleAiSubmit = async () => {
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    setAiMessage(null);
    const result = await askAiBuilder(aiInput.trim());
    setAiLoading(false);
    if (!result) { setAiMessage('No se pudo procesar. Intenta de nuevo.'); setAiMessageType('error'); return; }
    if ((result as any).impossible) { setAiMessage((result as any).reason); setAiMessageType('error'); return; }
    if ((result as any).clarification) { setAiMessage((result as any).question); setAiMessageType('clarification'); return; }
    // Apply the AI suggestion to the canvas
    setNodes(prev => prev.map(n => {
      if (n.id === 'trigger') return { ...n, data: { ...n.data, triggerType: result.triggerType, triggerConfig: result.triggerConfig } };
      if (n.id === 'action') return { ...n, data: { ...n.data, actionType: result.actionType, actionConfig: result.actionConfig } };
      return n;
    }));
    if (result.name) setFlowName(result.name);
    setAiMessage(`Flujo actualizado: ${result.name}`);
    setAiMessageType('success');
    setAiInput('');
  };

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

        {/* Floating AI assistant */}
        <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2">
          <AnimatePresence>
            {aiOpen && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="w-[340px] rounded-xl border border-[#0A183A]/8 bg-white shadow-2xl">
                <div className="flex items-center gap-2 border-b border-[#0A183A]/4 px-3.5 py-2.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#0A183A] to-[#A374FF]">
                    <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-white"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </div>
                  <span className="flex-1 text-[12px] font-semibold text-[#0A183A]">Modificar con Ana</span>
                  <button type="button" onClick={() => setAiOpen(false)} className="h-5 w-5 flex items-center justify-center rounded text-[#0A183A]/25 hover:bg-[#F8FAFC]">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                </div>
                {aiMessage && (
                  <div className={`mx-3 mt-2.5 rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                    aiMessageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
                    : aiMessageType === 'clarification' ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>{aiMessage}</div>
                )}
                <div className="p-3">
                  <div className="flex items-end gap-1.5">
                    <textarea ref={aiRef} value={aiInput} onChange={e => setAiInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSubmit(); } }}
                      rows={1} placeholder="Ej: Cambia la accion a WhatsApp..."
                      className="flex-1 resize-none rounded-lg border border-[#0A183A]/8 bg-[#F8FAFC] px-2.5 py-1.5 text-[12px] text-[#0A183A] placeholder:text-[#0A183A]/25 focus:border-[#A374FF] focus:outline-none" />
                    <button type="button" onClick={handleAiSubmit} disabled={!aiInput.trim() || aiLoading}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${aiInput.trim() && !aiLoading ? 'bg-[#0A183A] text-white' : 'bg-[#0A183A]/5 text-[#0A183A]/15'}`}>
                      {aiLoading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        : <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button type="button" onClick={() => setAiOpen(v => !v)}
            className={`flex h-10 items-center gap-2 rounded-full px-3.5 shadow-lg transition-all hover:shadow-xl hover:scale-105 ${aiOpen ? 'bg-[#0A183A] text-white' : 'bg-gradient-to-r from-[#0A183A] to-[#A374FF] text-white'}`}>
            {aiOpen
              ? <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
            <span className="text-[12px] font-semibold">{aiOpen ? 'Cerrar' : 'Ana'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
