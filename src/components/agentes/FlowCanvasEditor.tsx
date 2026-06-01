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
import type { ApiFlow, FlowTemplate, TriggerNodeData, ActionNodeData, ActionEntry } from './types';

const nodeTypes = { trigger: TriggerNode, action: ActionNode, addStep: AddStepNode };
const edgeTypes = { animated: AnimatedEdge };

const MAX_ACTIONS = 3;

// Fan-out layout: trigger on the left, each action stacked vertically on the
// right and connected straight from the trigger's source handle. Plus button
// sits below the bottom action when there's room for more.
const TRIGGER_X = 80;
const ACTION_X = 520;
const ACTION_GAP_Y = 140;         // vertical distance between action nodes
const ACTION_HEIGHT_HALF = 50;    // ~half of a typical action card so the trigger lines up with the visual center
const CANVAS_TOP = 120;

function actionY(idx: number) {
  return CANVAS_TOP + idx * ACTION_GAP_Y;
}

function triggerY(totalActions: number) {
  // Center the trigger vertically against the action stack so the fan-out
  // looks balanced (centerline of all actions = centerline of trigger).
  return CANVAS_TOP + ((totalActions - 1) * ACTION_GAP_Y) / 2;
}

function buildNodes(
  triggerType: string,
  triggerConfig: Record<string, unknown>,
  actions: ActionEntry[],
  onAddAction?: () => void,
): { nodes: Node[]; edges: Edge[] } {
  const safe = actions.length > 0 ? actions : [{ actionType: 'send_email', actionConfig: { to: '', subject: 'Alerta TirePro' } }];
  const total = safe.length;
  const tY = triggerY(total);

  const nodes: Node[] = [
    { id: 'trigger', type: 'trigger', position: { x: TRIGGER_X, y: tY }, data: { nodeType: 'trigger', triggerType, triggerConfig } },
  ];

  safe.forEach((a, i) => {
    nodes.push({
      id: `action-${i}`,
      type: 'action',
      position: { x: ACTION_X, y: actionY(i) },
      data: { nodeType: 'action', actionType: a.actionType, actionConfig: a.actionConfig },
    });
  });

  const canAddMore = total < MAX_ACTIONS;
  // Plus button stacks below the last action in the same column.
  const addBtnY = CANVAS_TOP + total * ACTION_GAP_Y + ACTION_HEIGHT_HALF / 2;
  nodes.push({
    id: 'addStep',
    type: 'addStep',
    position: { x: ACTION_X + 90, y: addBtnY },
    draggable: false,
    selectable: false,
    data: { nodeType: 'addStep', onAddAction, disabled: !canAddMore },
  });

  // Every action edge originates from the trigger — clean fan-out.
  const edges: Edge[] = safe.map((_, i) => ({
    id: `e-trigger-a${i}`,
    source: 'trigger',
    target: `action-${i}`,
    type: 'animated',
  }));
  if (canAddMore) {
    edges.push({ id: 'e-trigger-add', source: 'trigger', target: 'addStep', type: 'animated' });
  }

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

  // Stable ref to the latest setNodes — used inside callbacks passed to node data
  // so we can mutate the action list without triggering full rebuilds.
  const nodesRef = useRef<Node[]>([]);

  const handleAddAction = useCallback(() => {
    const actions = extractActions(nodesRef.current);
    if (actions.length >= MAX_ACTIONS) return;
    const next: ActionEntry[] = [...actions, { actionType: 'send_email', actionConfig: { to: '', subject: 'Alerta TirePro' } }];
    const trigger = nodesRef.current.find(n => n.id === 'trigger')?.data as TriggerNodeData | undefined;
    const { nodes: n, edges: e } = buildNodes(
      trigger?.triggerType ?? 'tire_alert_level',
      trigger?.triggerConfig ?? {},
      next,
      handleAddAction,
    );
    setNodes(n);
    setEdges(e);
    setSelectedNodeId(`action-${next.length - 1}`);
  }, []);

  const initialActions: ActionEntry[] = useMemo(() => {
    const base: ActionEntry = {
      actionType: template?.actionType ?? 'send_email',
      actionConfig: template?.actionConfig ?? { to: '', subject: 'Alerta TirePro' },
    };
    const extras = Array.isArray(template?.additionalActions) ? template!.additionalActions! : [];
    return [base, ...extras].slice(0, MAX_ACTIONS);
  }, [template]);

  const initial = useMemo(() => buildNodes(
    template?.triggerType ?? 'tire_alert_level',
    template?.triggerConfig ?? { alertLevels: ['critical'] },
    initialActions,
    handleAddAction,
  ), [template, initialActions, handleAddAction]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const snapshotRef = useRef('');
  const currentSnapshot = JSON.stringify({ flowName, nodes: nodes.filter(n => n.id !== 'addStep').map(n => n.data) });
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
        const extras = Array.isArray(flow.additionalActions) ? flow.additionalActions : [];
        const loadedActions: ActionEntry[] = [
          { actionType: flow.actionType, actionConfig: flow.actionConfig },
          ...extras,
        ].slice(0, MAX_ACTIONS);
        const { nodes: n, edges: e } = buildNodes(flow.triggerType, flow.triggerConfig, loadedActions, handleAddAction);
        setNodes(n);
        setEdges(e);
        setTimeout(() => {
          snapshotRef.current = JSON.stringify({ flowName: flow.name, nodes: n.filter(nd => nd.id !== 'addStep').map(nd => nd.data) });
        }, 0);
      }
      setLoading(false);
    })();
  }, [flowId, isNew, setNodes, setEdges, handleAddAction]);

  // Keep the addStep button stacked below the last action when nodes drag.
  const handleNodesChange: typeof onNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    setNodes(prev => {
      const actionNodes = prev.filter(n => n.id.startsWith('action-'));
      if (actionNodes.length === 0) return prev;
      const last = actionNodes.reduce((acc, n) => (n.position.y > acc.position.y ? n : acc), actionNodes[0]);
      const targetX = last.position.x + 90;
      const targetY = last.position.y + ACTION_GAP_Y;
      return prev.map(n => n.id === 'addStep' ? { ...n, position: { x: targetX, y: targetY } } : n);
    });
  }, [onNodesChange, setNodes]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.id === 'trigger' || node.id.startsWith('action-')) setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);

  const handleDeleteAction = useCallback((nodeId: string) => {
    const idx = parseInt(nodeId.split('-')[1] ?? '-1', 10);
    if (Number.isNaN(idx) || idx <= 0) return; // never delete the primary action
    const actions = extractActions(nodesRef.current);
    if (idx >= actions.length) return;
    const next = actions.filter((_, i) => i !== idx);
    const trigger = nodesRef.current.find(n => n.id === 'trigger')?.data as TriggerNodeData | undefined;
    const { nodes: n, edges: e } = buildNodes(
      trigger?.triggerType ?? 'tire_alert_level',
      trigger?.triggerConfig ?? {},
      next,
      handleAddAction,
    );
    setNodes(n);
    setEdges(e);
    setSelectedNodeId(null);
  }, [handleAddAction, setEdges, setNodes]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!flowName.trim()) { setSaveError('Pon un nombre al flujo antes de guardar.'); return; }
    setSaving(true);
    setSaveError(null);
    const trigger = nodes.find(n => n.id === 'trigger')?.data as TriggerNodeData;
    const actions = extractActions(nodes);
    if (!trigger || actions.length === 0) {
      setSaving(false);
      setSaveError('Debes definir al menos una accion.');
      return;
    }

    const [primary, ...extras] = actions;
    const payload = {
      name: flowName,
      triggerType: trigger.triggerType,
      triggerConfig: trigger.triggerConfig,
      actionType: primary.actionType,
      actionConfig: primary.actionConfig,
      ...(extras.length > 0 ? { additionalActions: extras } : {}),
    };

    try {
      const result: ApiFlow = savedId
        ? await updateFlow(savedId, payload)
        : await createFlow(payload);
      if (!savedId) setSavedId(result.id);
      setFlowStatus(result.status as any);
      snapshotRef.current = JSON.stringify({ flowName, nodes: nodes.filter(n => n.id !== 'addStep').map(n => n.data) });
    } catch (err: any) {
      const msg = err?.message ?? 'No se pudo guardar.';
      const status = err?.status;
      // When the server rejects `additionalActions` (older deploy / migration),
      // give the user something more actionable than a raw 400.
      if (status === 400 && /additional/i.test(String(msg))) {
        setSaveError('El servidor todavia no acepta varias acciones. Pide al admin desplegar la ultima version del backend (incluye la migracion automation_flows.additionalActions).');
      } else {
        setSaveError(`No se pudo guardar${status ? ` (${status})` : ''}: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
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
  const selectedNodeType: 'trigger' | 'action' = selectedNodeId === 'trigger' ? 'trigger' : 'action';
  const actionCount = nodes.filter(n => n.id.startsWith('action-')).length;
  const selectedActionIndex = selectedNodeId && selectedNodeId.startsWith('action-')
    ? parseInt(selectedNodeId.split('-')[1] ?? '0', 10)
    : undefined;

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
    const triggerNode = nodes.find(n => n.id === 'trigger')?.data as TriggerNodeData | undefined;
    const currentActions = extractActions(nodes);
    const currentFlow = triggerNode ? {
      name: flowName,
      triggerType: triggerNode.triggerType,
      triggerConfig: triggerNode.triggerConfig,
      actionType: currentActions[0]?.actionType,
      actionConfig: currentActions[0]?.actionConfig,
      ...(currentActions.length > 1 ? { additionalActions: currentActions.slice(1) } : {}),
    } : undefined;
    const result = await askAiBuilder(aiInput.trim(), currentFlow);
    setAiLoading(false);
    if (!result) { setAiMessage('No se pudo procesar. Intenta de nuevo.'); setAiMessageType('error'); return; }
    if ((result as any).impossible) { setAiMessage((result as any).reason); setAiMessageType('error'); return; }
    if ((result as any).clarification) { setAiMessage((result as any).question); setAiMessageType('clarification'); return; }
    // Apply the AI suggestion to the canvas (trigger + 1..3 actions)
    const aiExtras = Array.isArray((result as any).additionalActions) ? (result as any).additionalActions as ActionEntry[] : [];
    const aiActions: ActionEntry[] = [
      { actionType: result.actionType, actionConfig: result.actionConfig },
      ...aiExtras,
    ].slice(0, MAX_ACTIONS);
    const { nodes: n, edges: e } = buildNodes(result.triggerType, result.triggerConfig, aiActions, handleAddAction);
    setNodes(n);
    setEdges(e);
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', overflow: 'hidden', minHeight: 0 }}>
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

      <div style={{ position: 'relative', flex: '1 1 0%', minHeight: 0, overflow: 'hidden', background: '#ebf0fc' }}>
        {saveError && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 30, maxWidth: 560 }}>
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 mt-0.5 text-red-500">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <div className="flex-1 text-[12.5px] leading-relaxed text-red-700">{saveError}</div>
              <button type="button" onClick={() => setSaveError(null)} className="shrink-0 text-red-300 hover:text-red-500">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
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
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(10,24,58,0.1)" />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            nodeColor={(n) => {
              if (n.type === 'trigger') return '#A374FF';
              if (n.type === 'action') return getActionColor((n.data as ActionNodeData)?.actionType).color;
              return '#D1D5DB';
            }}
            maskColor="rgba(235,240,252,0.85)"
            style={{ border: '1px solid rgba(10,24,58,0.1)', borderRadius: 8, background: 'rgba(255,255,255,0.9)' }}
          />
        </ReactFlow>
        </div>

        <AnimatePresence>
          {selectedNode && (selectedNodeId === 'trigger' || (selectedNodeId && selectedNodeId.startsWith('action-'))) && (
            <NodeConfigPanel
              nodeType={selectedNodeType}
              data={selectedNode.data as any}
              onUpdate={(data) => updateNodeData(selectedNodeId!, data as Record<string, unknown>)}
              onClose={() => setSelectedNodeId(null)}
              onDelete={selectedNodeType === 'action' && typeof selectedActionIndex === 'number' && selectedActionIndex > 0
                ? () => handleDeleteAction(selectedNodeId!)
                : undefined}
              actionIndex={selectedActionIndex}
              actionTotal={actionCount}
            />
          )}
        </AnimatePresence>

      </div>

      {/* Floating AI assistant — centered at bottom */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
        <AnimatePresence>
          {aiOpen && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="w-[360px] max-w-[calc(100vw-2.5rem)] rounded-xl border border-[#0A183A]/10 bg-white shadow-2xl">
              <div className="flex items-center gap-2 border-b border-[#0A183A]/6 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#0A183A] to-[#A374FF]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-white"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
                <div className="flex-1">
                  <span className="text-[13px] font-semibold text-[#0A183A]">Modificar con Ana</span>
                  <p className="text-[10px] text-[#0A183A]/35">Describe que quieres cambiar en el flujo</p>
                </div>
                <button type="button" onClick={() => setAiOpen(false)} className="h-6 w-6 flex items-center justify-center rounded-lg text-[#0A183A]/25 hover:bg-[#F8FAFC]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
              {aiMessage && (
                <div className={`mx-3.5 mt-3 rounded-lg px-3 py-2.5 text-[12px] leading-relaxed ${
                  aiMessageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
                  : aiMessageType === 'clarification' ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>{aiMessage}</div>
              )}
              <div className="p-3.5">
                <div className="flex items-end gap-2 rounded-xl border border-[#0A183A]/8 bg-[#F8FAFC] px-3 py-2">
                  <textarea ref={aiRef} value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSubmit(); } }}
                    rows={1} placeholder="Ej: Cambia la accion a WhatsApp..."
                    className="flex-1 resize-none border-0 bg-transparent py-0.5 text-[13px] text-[#0A183A] placeholder:text-[#0A183A]/25 focus:outline-none" />
                  <button type="button" onClick={handleAiSubmit} disabled={!aiInput.trim() || aiLoading}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${aiInput.trim() && !aiLoading ? 'bg-[#0A183A] text-white hover:bg-[#173D68]' : 'bg-[#0A183A]/5 text-[#0A183A]/15'}`}>
                    {aiLoading ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      : <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button type="button" onClick={() => setAiOpen(v => !v)}
          className={`flex h-11 items-center gap-2 rounded-full px-4 shadow-lg transition-all hover:shadow-xl hover:scale-105 ${aiOpen ? 'bg-[#0A183A] text-white' : 'bg-gradient-to-r from-[#0A183A] to-[#A374FF] text-white'}`}>
          {aiOpen
            ? <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            : <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
          <span className="text-[13px] font-semibold">{aiOpen ? 'Cerrar' : 'Ana'}</span>
        </button>
      </div>
    </div>
  );
}

function extractActions(allNodes: Node[]): ActionEntry[] {
  return allNodes
    .filter(n => n.id.startsWith('action-'))
    .map(n => {
      const idx = parseInt(n.id.split('-')[1] ?? '0', 10);
      const d = n.data as ActionNodeData;
      return { idx, entry: { actionType: d.actionType, actionConfig: d.actionConfig } };
    })
    .sort((a, b) => a.idx - b.idx)
    .map(({ entry }) => entry);
}
