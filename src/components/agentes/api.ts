import type { ApiFlow, ActionEntry } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
  : 'https://api.tirepro.com.co/api';

function authFetch(path: string, init: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (Array.isArray(body?.message)) return body.message.join(', ');
    if (typeof body?.message === 'string') return body.message;
    if (typeof body?.error === 'string') return body.error;
    return res.statusText || `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function listFlows(): Promise<ApiFlow[]> {
  const res = await authFetch('/automation/flows');
  return res.ok ? res.json() : [];
}

export async function getFlow(id: string): Promise<ApiFlow | null> {
  const res = await authFetch(`/automation/flows/${id}`);
  return res.ok ? res.json() : null;
}

export async function createFlow(dto: {
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  additionalActions?: ActionEntry[];
}): Promise<ApiFlow> {
  const res = await authFetch('/automation/flows', { method: 'POST', body: JSON.stringify(dto) });
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  return res.json();
}

export async function updateFlow(id: string, dto: Record<string, unknown>): Promise<ApiFlow> {
  const res = await authFetch(`/automation/flows/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  return res.json();
}

export async function toggleFlow(id: string): Promise<ApiFlow | null> {
  const res = await authFetch(`/automation/flows/${id}/toggle`, { method: 'PATCH' });
  return res.ok ? res.json() : null;
}

export async function deleteFlow(id: string): Promise<boolean> {
  const res = await authFetch(`/automation/flows/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function askAiBuilder(description: string, currentFlow?: Record<string, unknown>): Promise<ApiFlow | null> {
  const res = await authFetch('/automation/ai-builder', {
    method: 'POST',
    body: JSON.stringify({ description, ...(currentFlow ? { currentFlow } : {}) }),
  });
  return res.ok ? res.json() : null;
}

export type IntegrationStatus = { connected: boolean; system?: boolean; accountEmail?: string | null };

export async function listIntegrations(): Promise<Record<string, IntegrationStatus>> {
  const res = await authFetch('/automation/integrations');
  return res.ok ? res.json() : {};
}

export { authFetch };
