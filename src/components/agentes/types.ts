export type ActionEntry = {
  actionType: string;
  actionConfig: Record<string, unknown>;
};

export type ApiFlow = {
  id: string;
  name: string;
  description?: string;
  status: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  additionalActions?: ActionEntry[] | null;
  runCount: number;
  errorCount: number;
  lastRunAt?: string | null;
  lastError?: string | null;
};

export type FlowTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  additionalActions?: ActionEntry[];
};

export type TriggerNodeData = {
  nodeType: 'trigger';
  triggerType: string;
  triggerConfig: Record<string, unknown>;
};

export type ActionNodeData = {
  nodeType: 'action';
  actionType: string;
  actionConfig: Record<string, unknown>;
};

export type AddStepNodeData = {
  nodeType: 'addStep';
  onAddAction?: () => void;
  disabled?: boolean;
};

export type FlowNodeData = TriggerNodeData | ActionNodeData | AddStepNodeData;
