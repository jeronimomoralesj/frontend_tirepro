"use client";

import { useState, useEffect, useRef } from "react";
import { X, ArrowUp, Paperclip } from "lucide-react";
import dynamic from "next/dynamic";
import type { AnaBlock } from "@/components/chat/AnaBlocks";

const AnaBlocks = dynamic(() => import("@/components/chat/AnaBlocks"), { ssr: false });
const BulkUploadWidget = dynamic(() => import("@/components/chat/BulkUploadWidget"), { ssr: false });
const InspectionWizard = dynamic(() => import("@/components/chat/InspectionWizard"), { ssr: false });
const RotationWizard = dynamic(() => import("@/components/chat/RotationWizard"), { ssr: false });

const ANA_API = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api/ana/chat`
  : "https://api.tirepro.com.co/api/ana/chat";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className ?? "h-4 w-4"}>
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TAB_HINTS: Record<string, { greeting: string; help: string }> = {
  crear: {
    greeting: "Estás en Crear Llanta. Completa el formulario con los datos de la nueva llanta — vehículo, marca, dimensión, eje y costo.",
    help: "Si te pierdes o necesitas ayuda, escríbeme y te guío paso a paso.",
  },
  cargamasiva: {
    greeting: "Estás en Carga Masiva. Sube un archivo Excel con tus llantas para registrarlas todas de una vez.",
    help: "Si no sabes qué formato usar o tienes errores con el archivo, pregúntame.",
  },
  inspeccion: {
    greeting: "Estás en Inspección. Registra las mediciones de profundidad y presión de tus llantas.",
    help: "Si no estás seguro de cómo tomar las medidas o qué campos llenar, pregúntame.",
  },
  vida: {
    greeting: "Estás en Vida. Cambia el estado de vida de una llanta — nueva, reencauche, o fin de vida.",
    help: "Si tienes dudas sobre cuándo cambiar la vida de una llanta, estoy aquí para ayudarte.",
  },
  rotacion: {
    greeting: "Estás en Rotación. Mueve llantas entre posiciones de un vehículo para distribuir el desgaste.",
    help: "Si no sabes qué rotación hacer, puedo sugerirte una basada en los datos de tus llantas.",
  },
  evento: {
    greeting: "Estás en Evento. Registra eventos como pinchazos, reparaciones o cambios en tus llantas.",
    help: "Si no sabes qué tipo de evento registrar, cuéntame qué pasó y te ayudo.",
  },
};

type Suggestion = { label: string; intent: string };
type Msg = { id: string; role: "user" | "assistant"; text: string; pending?: boolean; blocks?: AnaBlock[]; suggestions?: Suggestion[] };

export default function AnaChatFab({ tab, tabLabel }: { tab: string; tabLabel: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [activeAction, setActiveAction] = useState<'inspection' | 'upload' | 'rotation' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevTabRef = useRef(tab);

  useEffect(() => {
    if (open && scrollRef.current) {
      requestAnimationFrame(() => { scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight; });
    }
  }, [msgs, open, loading]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  useEffect(() => {
    if (prevTabRef.current !== tab) {
      prevTabRef.current = tab;
      setMsgs([]);
      setConvId(null);
      setShowUpload(false);
      setActiveAction(null);
    }
  }, [tab]);

  function close() {
    setVisible(false);
    setTimeout(() => setOpen(false), 200);
  }

  function detectActionIntent(text: string): 'inspection' | 'upload' | 'rotation' | null {
    const lo = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (/carga\s*masiva|subir\s*(datos|archivo|excel|llantas)|cargar\s*(archivo|datos|excel|llantas)|importar|bulk|upload/.test(lo)) return 'upload';
    if (/hacer.*inspeccion|registrar.*inspeccion|nueva.*inspeccion|inspeccionar|inspeccion\s*en\s*vivo|medir\s*(profundidad|llanta)|iniciar.*inspeccion|quiero.*inspeccion/.test(lo)) return 'inspection';
    if (/rotar|mover.*posicion|cambiar.*posicion|intercambiar.*llanta|rotacion\s*de|desmontar|enviar.*inventario|fin\s*de\s*vida|retirar.*llanta/.test(lo)) return 'rotation';
    return null;
  }

  function startAction(action: 'inspection' | 'upload' | 'rotation') {
    const labels: Record<string, string> = { inspection: 'Registrar inspección', upload: 'Subir datos de llantas', rotation: 'Mover / rotar llantas' };
    const intros: Record<string, string> = {
      inspection: '¡Vamos a inspeccionar! Ingresa la placa del vehículo y selecciona la llanta en el diagrama.',
      upload: '¡Perfecto! Selecciona tu archivo Excel y lo proceso automáticamente.',
      rotation: '¡Listo! Selecciona el vehículo y la llanta que quieres mover.',
    };
    setMsgs(prev => [
      ...prev,
      { id: rid(), role: 'user', text: labels[action] },
      { id: rid(), role: 'assistant', text: intros[action] },
    ]);
    setActiveAction(action);
    if (action === 'upload') setShowUpload(true);
  }

  function finishAction(summary: string) {
    if (summary) {
      setMsgs(prev => [...prev, { id: rid(), role: 'assistant', text: summary }]);
    }
    setActiveAction(null);
    setShowUpload(false);
  }

  async function send(text?: string) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;
    if (!text) setInput("");

    const intent = detectActionIntent(trimmed);
    if (intent) { startAction(intent); return; }

    const uid = rid();
    const pendingId = uid + "-r";
    setMsgs(m => [...m,
      { id: uid, role: "user", text: trimmed },
      { id: pendingId, role: "assistant", text: "", pending: true },
    ]);
    setLoading(true);
    try {
      const ctx = `El usuario está en la sección "${tabLabel}" del panel de agregar información.`;
      const history = msgs.filter(m => !m.pending && m.text).slice(-6).map(m => ({ role: m.role, text: m.text }));
      const body: Record<string, unknown> = { message: trimmed, context: ctx, history };
      if (convId) body.conversationId = convId;

      const res = await fetch(ANA_API, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      // AI quota reached — surface the backend's friendly message.
      if (res.status === 429) {
        const qb = await res.json().catch(() => ({} as { message?: string }));
        const qmsg = qb?.message || "Has alcanzado el límite de consultas de IA de tu plan.";
        setMsgs(m => m.map(msg => msg.id === pendingId ? { ...msg, pending: false, text: qmsg } : msg));
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.conversationId && !convId) setConvId(data.conversationId);

      setMsgs(m => m.map(msg => msg.id === pendingId ? {
        ...msg,
        pending: false,
        text: data.text || "...",
        blocks: Array.isArray(data.blocks) && data.blocks.length ? data.blocks : undefined,
        suggestions: Array.isArray(data.suggestions) && data.suggestions.length ? data.suggestions : undefined,
      } : msg));
    } catch {
      setMsgs(m => m.map(msg => msg.id === pendingId ? { ...msg, pending: false, text: "Error conectando con Ana." } : msg));
    }
    setLoading(false);
  }

  function handleUploadDone(summary: string) {
    finishAction(summary);
  }

  const hint = TAB_HINTS[tab] ?? TAB_HINTS.crear;

  return (
    <>
      {/* FAB */}
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 group">
          <span className="pointer-events-none absolute -inset-4 rounded-full opacity-40 blur-xl" style={{ background: "radial-gradient(circle, rgba(163,116,255,0.4) 0%, transparent 70%)" }} />
          <span className="relative flex items-center gap-2.5 rounded-full bg-white px-5 py-3 shadow-lg ring-1 ring-[#0A183A]/[0.06] transition-all group-hover:shadow-xl" style={{ boxShadow: "0 8px 32px -8px rgba(163,116,255,0.25)" }}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full shadow-md" style={{ background: "linear-gradient(135deg, #0A183A, #A374FF)" }}>
              <SparkleIcon className="ai-sparkle h-4 w-4 text-white" />
            </span>
            <span className="text-[13px] font-semibold text-[#0A183A]">¿Necesitas ayuda?</span>
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex flex-col transition-all duration-200 ease-out"
          style={{
            width: 400,
            maxWidth: "calc(100vw - 24px)",
            height: 540,
            maxHeight: "calc(100vh - 80px)",
            transform: visible ? "translate(-50%, 0) scale(1)" : "translate(-50%, 16px) scale(0.97)",
            opacity: visible ? 1 : 0,
          }}
        >
          <div aria-hidden className="ai-aura pointer-events-none absolute -inset-3 rounded-[28px] blur-2xl opacity-60" style={{ background: "radial-gradient(circle, rgba(163,116,255,0.15) 0%, transparent 70%)" }} />

          <div className="ai-border relative flex flex-1 flex-col overflow-hidden rounded-[20px] bg-white/95 backdrop-blur-xl" style={{ boxShadow: "0 20px 50px -12px rgba(10,24,58,0.25), 0 0 0 1px rgba(10,24,58,0.06)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(10,24,58,0.06)" }}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #0A183A, #A374FF)", boxShadow: "0 3px 10px -3px rgba(163,116,255,0.45)" }}>
                  <SparkleIcon className="ai-sparkle h-3.5 w-3.5 text-white" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-[#0A183A] leading-none">Ana</p>
                  <p className="text-[10px] text-[#0A183A]/30 mt-0.5">Asistente TirePro</p>
                </div>
              </div>
              <button type="button" onClick={close} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#0A183A]/25 hover:bg-[#0A183A]/[0.04] hover:text-[#0A183A]/50 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
              {/* Welcome */}
              {msgs.length === 0 && !loading && (
                <div className="flex justify-start gap-2 mb-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: "linear-gradient(135deg, #0A183A, #A374FF)" }}>
                    <SparkleIcon className="h-3 w-3 text-white" />
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-relaxed text-[#0A183A]/85" style={{ background: "rgba(10,24,58,0.04)" }}>
                    <p>{hint.greeting}</p>
                    <p className="mt-2 text-[#0A183A]/50">{hint.help}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {msgs.map((m) => (
                  <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start gap-2"}>
                    {m.role === "assistant" && (
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: "linear-gradient(135deg, #0A183A, #A374FF)" }}>
                        <SparkleIcon className="h-3 w-3 text-white" />
                      </span>
                    )}
                    <div className={m.role === "user"
                      ? "max-w-[80%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-relaxed text-white"
                      : "max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-relaxed text-[#0A183A]/90"
                    } style={m.role === "user" ? { background: "#0A183A" } : { background: "rgba(10,24,58,0.04)" }}>
                      {m.pending ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" />
                          <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" style={{ animationDelay: "0.15s" }} />
                          <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" style={{ animationDelay: "0.3s" }} />
                          <span className="ai-shimmer-text ml-1 text-[11px] font-medium">Ana piensa…</span>
                        </div>
                      ) : (
                        <>
                          {/^procesando\.{0,3}$/i.test(m.text.trim()) ? (
                            <div className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" />
                              <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" style={{ animationDelay: "0.15s" }} />
                              <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-[#A374FF]" style={{ animationDelay: "0.3s" }} />
                              <span className="ai-shimmer-text text-[12px] font-medium text-[#0A183A]/60">Procesando…</span>
                            </div>
                          ) : (
                            m.text.split("\n").map((line, i) => <p key={i} className="m-0 mb-1 last:mb-0">{line}</p>)
                          )}
                          {m.blocks && m.blocks.length > 0 && (
                            <div className="mt-2 -mx-1"><AnaBlocks blocks={m.blocks} /></div>
                          )}
                          {m.suggestions && m.suggestions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {m.suggestions.map(s => (
                                <button key={s.label} type="button" onClick={() => send(s.intent)}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#A374FF]/25 bg-[#A374FF]/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#A374FF] hover:bg-[#A374FF]/10 transition-colors">
                                  <SparkleIcon className="h-2.5 w-2.5" />{s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action widgets */}
              {activeAction === 'upload' && (
                <div className="mt-3"><BulkUploadWidget onDone={handleUploadDone} /></div>
              )}
              {activeAction === 'inspection' && (
                <div className="mt-3"><InspectionWizard onDone={finishAction} /></div>
              )}
              {activeAction === 'rotation' && (
                <div className="mt-3"><RotationWizard onDone={finishAction} /></div>
              )}
            </div>

            {/* Input bar */}
            <div className="shrink-0 px-3 pb-3">
              <div className="ai-bar-border overflow-hidden rounded-[18px]" style={{ boxShadow: "0 8px 24px -8px rgba(10,24,58,0.15)" }}>
                <div className="flex items-end gap-1.5 rounded-[18px] bg-white px-2 py-1.5">
                  <button type="button" onClick={() => startAction('upload')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#0A183A]/35 hover:bg-[#F8FAFC] hover:text-[#0A183A]/60 transition-colors"
                    title="Subir archivo Excel">
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    rows={1}
                    placeholder="Pregúntale a Ana…"
                    className="flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-[13px] leading-relaxed text-[#0A183A] placeholder:text-[#0A183A]/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all"
                    style={input.trim() ? { background: "#0A183A", color: "white", boxShadow: "0 2px 8px rgba(10,24,58,0.25)" } : { background: "rgba(10,24,58,0.04)", color: "rgba(10,24,58,0.2)" }}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function rid() { return Math.random().toString(36).slice(2); }
