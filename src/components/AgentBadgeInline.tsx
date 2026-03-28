"use client";

import { AGENTS } from "../lib/agents";
import type { AgentId } from "../lib/agents";
import { useAgentSettings, isAgentOn } from "../lib/useAgentSettings";

type Props = {
  agent: AgentId;
  message?: string;
  compact?: boolean;
};

export default function AgentBadgeInline({ agent, message, compact }: Props) {
  const settings = useAgentSettings();
  if (settings.loading) return null;
  if (!isAgentOn(settings, agent)) return null;

  const a = AGENTS[agent];
  const Icon = a.icon;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
        style={{ background: a.bg, color: a.color, border: `1px solid ${a.color}20` }}
      >
        <Icon className="w-2.5 h-2.5" />
        {a.codename}
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ background: a.bg, border: `1px solid ${a.color}15` }}
    >
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: a.color }}
      >
        <Icon className="w-3 h-3 text-white" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: a.color }}>
          {a.codename}
        </span>
        {message && (
          <p className="text-[10px] text-gray-500 leading-tight">{message}</p>
        )}
      </div>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0 ml-auto" style={{ background: a.color }} />
    </div>
  );
}
