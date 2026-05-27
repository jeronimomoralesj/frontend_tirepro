import type { ApiFlow } from './types';

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
}): Promise<ApiFlow | null> {
  const res = await authFetch('/automation/flows', { method: 'POST', body: JSON.stringify(dto) });
  return res.ok ? res.json() : null;
}

export async function updateFlow(id: string, dto: Record<string, unknown>): Promise<ApiFlow | null> {
  const res = await authFetch(`/automation/flows/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });
  return res.ok ? res.json() : null;
}

export async function toggleFlow(id: string): Promise<ApiFlow | null> {
  const res = await authFetch(`/automation/flows/${id}/toggle`, { method: 'PATCH' });
  return res.ok ? res.json() : null;
}

export async function deleteFlow(id: string): Promise<boolean> {
  const res = await authFetch(`/automation/flows/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function askAiBuilder(description: string): Promise<ApiFlow | null> {
  const res = await authFetch('/automation/ai-builder', { method: 'POST', body: JSON.stringify({ description }) });
  return res.ok ? res.json() : null;
}

export async function listIntegrations(): Promise<Record<string, { connected: boolean }>> {
  const res = await authFetch('/automation/integrations');
  return res.ok ? res.json() : {};
}

export { authFetch };
