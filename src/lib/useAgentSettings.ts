"use client";

import { useState, useEffect } from "react";
import type { AgentId } from "./agents";
import { DEFAULT_AGENT_TOGGLES } from "./agents";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

interface AgentSettingsState {
  enabled: boolean;                        // master switch
  agents: Record<AgentId, boolean>;        // per-agent toggles
  loading: boolean;
}

let cached: AgentSettingsState | null = null;

export function useAgentSettings(): AgentSettingsState {
  const [state, setState] = useState<AgentSettingsState>(
    cached ?? { enabled: false, agents: { ...DEFAULT_AGENT_TOGGLES }, loading: true },
  );

  useEffect(() => {
    if (cached) { setState(cached); return; }

    const stored = localStorage.getItem("user");
    if (!stored) { setState((s) => ({ ...s, loading: false })); return; }

    let companyId: string;
    try { companyId = JSON.parse(stored).companyId; } catch { setState((s) => ({ ...s, loading: false })); return; }
    if (!companyId) { setState((s) => ({ ...s, loading: false })); return; }

    const token = localStorage.getItem("token") ?? "";
    fetch(`${API_BASE}/companies/${companyId}/agent-settings`, {
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const settings = data?.agentSettings ?? {};
        const result: AgentSettingsState = {
          enabled: settings.agentEnabled ?? false,
          agents: { ...DEFAULT_AGENT_TOGGLES, ...(settings.agents ?? {}) },
          loading: false,
        };
        cached = result;
        setState(result);
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  return state;
}

/** Quick check: is a specific agent active? */
export function isAgentOn(state: AgentSettingsState, id: AgentId): boolean {
  return state.enabled && (state.agents[id] ?? true);
}
