// =============================================================================
// TIREPRO AGENT REGISTRY
// Single source of truth for all 6 specialized AI agents.
// Import this everywhere agents are referenced to keep names, colors, and
// icons consistent across landing, dashboard, settings, and notifications.
// =============================================================================

import {
  Shield,
  Eye,
  ShoppingCart,
  Zap,
  MessageCircle,
  Skull,
} from "lucide-react";

export type AgentId =
  | "sentinel"
  | "oracle"
  | "nexus"
  | "phantom"
  | "guardian"
  | "reaper";

export interface AgentDef {
  id: AgentId;
  codename: string;
  role: string;
  description: string;
  status: string;
  color: string;
  glow: string;
  bg: string;          // light background for cards
  metric: string;
  metricLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  // Which settings key this agent maps to (for per-agent toggles)
  settingsKey: string;
}

export const AGENTS: Record<AgentId, AgentDef> = {
  sentinel: {
    id: "sentinel",
    codename: "SENTINEL",
    role: "Agente de Desgaste",
    description:
      "Monitorea profundidad en 3 zonas. Detecta sobreinflado, baja presion y desalineacion a 1.5mm de diferencia entre hombros.",
    status: "Analizando",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.15)",
    bg: "rgba(239,68,68,0.06)",
    metric: "< 1.5mm",
    metricLabel: "precision",
    icon: Shield,
    settingsKey: "sentinel",
  },
  oracle: {
    id: "oracle",
    codename: "ORACLE",
    role: "Agente Predictivo",
    description:
      "Calcula fecha exacta de fin de vida, km restantes y punto optimo de retiro a 3mm para preservar el casco. Proyecta CPK futuro.",
    status: "Prediciendo",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.15)",
    bg: "rgba(139,92,246,0.06)",
    metric: "3.0mm",
    metricLabel: "retiro optimo",
    icon: Eye,
    settingsKey: "oracle",
  },
  nexus: {
    id: "nexus",
    codename: "NEXUS",
    role: "Agente de Pedidos",
    description:
      "Cruza necesidades de reemplazo contra 2,500+ SKUs del catalogo colombiano. Genera propuestas y envia a distribuidores.",
    status: "Conectando",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.15)",
    bg: "rgba(34,197,94,0.06)",
    metric: "2,500+",
    metricLabel: "SKUs",
    icon: ShoppingCart,
    settingsKey: "nexus",
  },
  phantom: {
    id: "phantom",
    codename: "PHANTOM",
    role: "Agente de Campo",
    description:
      "Modo rapido: crea vehiculos, registra llantas e inspecciona en un flujo. Autocomplete desde el catalogo.",
    status: "Desplegado",
    color: "#f97316",
    glow: "rgba(249,115,22,0.15)",
    bg: "rgba(249,115,22,0.06)",
    metric: "< 30s",
    metricLabel: "por llanta",
    icon: Zap,
    settingsKey: "phantom",
  },
  guardian: {
    id: "guardian",
    codename: "GUARDIAN",
    role: "Agente de Conductores",
    description:
      "Envia alertas via WhatsApp al conductor con instrucciones exactas y link de confirmacion. Hasta 3 reenvios automaticos.",
    status: "Notificando",
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.15)",
    bg: "rgba(6,182,212,0.06)",
    metric: "WhatsApp",
    metricLabel: "integrado",
    icon: MessageCircle,
    settingsKey: "guardian",
  },
  reaper: {
    id: "reaper",
    codename: "REAPER",
    role: "Agente de Desechos",
    description:
      "Rastrea cada llanta hasta su fin de vida. Causales, milimetros finales, fotos. Calcula remanente perdido y dinero desperdiciado.",
    status: "Rastreando",
    color: "#ec4899",
    glow: "rgba(236,72,153,0.15)",
    bg: "rgba(236,72,153,0.06)",
    metric: "$0",
    metricLabel: "desperdicio",
    icon: Skull,
    settingsKey: "reaper",
  },
};

export const AGENT_LIST: AgentDef[] = Object.values(AGENTS);

// Default per-agent enabled state
export const DEFAULT_AGENT_TOGGLES: Record<AgentId, boolean> = {
  sentinel: true,
  oracle: true,
  nexus: true,
  phantom: true,
  guardian: true,
  reaper: true,
};
