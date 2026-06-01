import { NextRequest } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const BLOCK_SCHEMA = `Bloques disponibles (copia la forma EXACTA):
- {"kind":"kpis","title":"Resumen","items":[{"label":"Total","value":"245","hint":"+3%","tone":"good"}]}
- {"kind":"bar","title":"CPK por marca","unit":"$/km","data":[{"label":"Michelin","value":42},{"label":"Continental","value":48}]}
- {"kind":"line","title":"CPK 6 meses","unit":"$","data":[{"label":"Ene","value":45},{"label":"Feb","value":42}]}
- {"kind":"pie","title":"Mix marcas","data":[{"label":"Continental","value":48},{"label":"Michelin","value":32}]}
- {"kind":"table","title":"Críticas","columns":["Placa","Posición","Profundidad","Plazo"],"rows":[["ABC-123","Dir.Izq","2.1mm","Inmediato"]]}
- {"kind":"gauge","title":"Salud flota","value":78,"label":"4 críticas"}
- {"kind":"callout","tone":"warn","text":"3 llantas requieren cambio inmediato."}

PROHIBIDO: campos "keys","values","labels","colors" como arrays sueltos. Datos SIEMPRE en "data" (o "items" para kpis, "rows" para table).
orientation en bar: "vertical"|"horizontal". tone: good|warn|bad|info|neutral.`;

function buildSystemPrompt(tireData: string): string {
  return `Eres Ana, analista experta de llantas de TirePro. Español colombiano, profesional y concisa.

REGLA #0 — CIERRE:
- SIEMPRE termina tu "text" con "\\n\\n¿Puedo ayudarte con algo más?" o variación natural.

REGLA #1 — CONSISTENCIA:
- SOLO números EXACTOS de TIREDATA. NUNCA inventes ni redondees.

REGLA #2 — SIEMPRE BLOCKS Y SUGGESTIONS:
- Toda respuesta con datos DEBE incluir blocks. Sin blocks cuando hay datos = INCORRECTO.
- suggestions OBLIGATORIO (3 análisis relacionados). Solo omitir en saludos puros.
- Saludo sin datos → blocks:[], suggestions con 3 opciones de análisis.

REGLA #3 — VISUALIZACIÓN INTELIGENTE:
VALOR PUNTUAL ("¿cuál es el CPK?", "¿cuántas?", "promedio"):
→ kpis con número destacado. Si hay desglose por categoría, agregar bar debajo.

MÁS DETALLES / PROFUNDIZAR ("ver más", "detalle", "desglose"):
→ table detallada + gráfico complementario. NUNCA solo texto.

COMPARACIÓN ("por marca", "por eje", "X vs Y"):
→ kpis resumen + bar chart comparativo.

DISTRIBUCIÓN ("mix", "proporción"):
→ pie chart + kpis con total.

TENDENCIA ("evolución", "histórico"):
→ line chart + kpis resumen.

ALERTAS ("críticas", "cambio inmediato"):
→ callout alerta + table listado.

RESUMEN ("resumen", "estado general"):
→ kpis (3-5 métricas) + gauge salud + callout si hay alertas.

CLAVE: pregunta sobre UN número → kpis (NO gráfico solo para un dato).

CONTEXTO TÉCNICO:
- CPK = costo total / km recorridos. Menor = mejor.
- Profundidad: límite legal 2mm.
- Alertas: inmediato(≤2mm) 30d(2-4mm) 60d(4-6mm) óptimo(>6mm)
- "Críticas" = SOLO inmediato (≤2mm).
- Ejes: direccion, traccion, libre, remolque, repuesto
- Vidas: nueva, reencauche1/2/3, fin
- Health score: 0-100

TIREDATA:
${tireData || 'No hay datos de llantas cargados.'}

FORMATO: responde SOLO JSON puro (sin markdown):
{"text":"...","blocks":[...],"suggestions":[{"label":"...","intent":"..."}]}

${BLOCK_SCHEMA}

REGLAS DE FORMATO:
- text: 1-3 frases con insight + cierre. NO repitas cifras de blocks.
- suggestions: OBLIGATORIO 3, relacionados al tema.
- bar: orientation "horizontal" si >4 categorías.
- Saludo → blocks:[], suggestions con opciones iniciales.
- IMPORTANTE: responde SOLO el JSON, nada más.`;
}

type AnaReply = {
  text: string;
  blocks: unknown[];
  suggestions: { label: string; intent: string }[] | null;
};

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return Response.json(
      { error: 'missing_api_key', detail: 'Set GEMINI_API_KEY in .env.local' },
      { status: 500 },
    );
  }

  let payload: {
    message?: string;
    history?: { role: string; text: string }[];
    tireData?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 });
  }

  const message = (payload?.message ?? '').toString().trim();
  if (!message) {
    return Response.json({ error: 'empty_message' }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(payload.tireData ?? '');

  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  if (Array.isArray(payload.history)) {
    for (const m of payload.history.slice(-8)) {
      if (!m || typeof m.text !== 'string' || !m.text) continue;
      contents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      });
    }
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  let geminiRes: Response;
  try {
    geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.55,
          maxOutputTokens: 1200,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
  } catch (err) {
    return Response.json({ error: 'fetch_failed', detail: String(err) }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text().catch(() => '');
    return Response.json({ error: 'gemini_error', status: geminiRes.status, detail }, { status: 502 });
  }

  const data = await geminiRes.json().catch(() => null);
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let parsed: { text?: unknown; blocks?: unknown; suggestions?: unknown } = {};
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    parsed = { text: raw || 'Entendido.' };
  }

  const reply: AnaReply = {
    text: typeof parsed.text === 'string' && parsed.text.trim() ? parsed.text.trim() : 'Entendido.',
    blocks: normalizeBlocks(parsed.blocks),
    suggestions: normalizeSuggestions(parsed.suggestions),
  };

  return Response.json(reply);
}

function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return trimmed;
}

const ALLOWED_KINDS = new Set(['kpis', 'bar', 'line', 'pie', 'table', 'gauge', 'callout']);

function normalizeBlocks(b: unknown): unknown[] {
  if (!Array.isArray(b)) return [];
  const out: unknown[] = [];
  for (const item of b) {
    if (!item || typeof item !== 'object') continue;
    const coerced = coerceBlock(item as Record<string, unknown>);
    if (coerced) out.push(coerced);
  }
  return out;
}

function coerceBlock(x: Record<string, unknown>): Record<string, unknown> | null {
  const kind = x.kind;
  if (typeof kind !== 'string' || !ALLOWED_KINDS.has(kind)) return null;
  const out: Record<string, unknown> = { ...x, kind };

  if (kind === 'bar' || kind === 'line' || kind === 'pie') {
    out.data = coerceXY(out.data, out);
    if (!Array.isArray(out.data) || out.data.length === 0) return null;
  } else if (kind === 'kpis') {
    if (!Array.isArray(out.items)) {
      const alt = (out.data ?? out.kpis) as unknown;
      if (Array.isArray(alt)) out.items = alt;
    }
    if (!Array.isArray(out.items) || (out.items as unknown[]).length === 0) return null;
  } else if (kind === 'table') {
    if (!Array.isArray(out.columns) || !Array.isArray(out.rows)) return null;
  } else if (kind === 'gauge') {
    const v = out.value;
    if (typeof v !== 'number') {
      const n = Number(v);
      if (Number.isFinite(n)) out.value = n;
      else return null;
    }
  } else if (kind === 'callout') {
    if (typeof out.text !== 'string' || !out.text) return null;
  }
  return out;
}

function coerceXY(data: unknown, container: Record<string, unknown>): unknown {
  if (Array.isArray(data) && data.length > 0 && data.every(isLabelValue)) return data;
  const keys = (container.keys ?? container.labels ?? container.categories) as unknown;
  const values = (container.values ?? container.amounts ?? container.counts) as unknown;
  if (Array.isArray(keys) && Array.isArray(values)) {
    return keys.map((k, i) => ({
      label: String(k),
      value: Number((values as unknown[])[i]) || 0,
    }));
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return Object.entries(data as Record<string, unknown>).map(([label, value]) => ({
      label,
      value: Number(value) || 0,
    }));
  }
  return [];
}

function isLabelValue(d: unknown): boolean {
  if (!d || typeof d !== 'object') return false;
  const o = d as { label?: unknown; value?: unknown; name?: unknown; amount?: unknown };
  return (
    (typeof o.label === 'string' || typeof o.name === 'string') &&
    (typeof o.value === 'number' || typeof o.amount === 'number')
  );
}

const FALLBACK_SUGGESTIONS: { label: string; intent: string }[] = [
  { label: 'Resumen de flota', intent: 'Dame un resumen general de mi flota.' },
  { label: 'Llantas críticas', intent: '¿Qué llantas necesitan cambio inmediato?' },
  { label: 'CPK por marca', intent: '¿Cuál es el CPK promedio por marca?' },
];

function normalizeSuggestions(s: unknown): AnaReply['suggestions'] {
  if (!Array.isArray(s)) return FALLBACK_SUGGESTIONS;
  const out: { label: string; intent: string }[] = [];
  for (const it of s) {
    if (!it || typeof it !== 'object') continue;
    const o = it as { label?: unknown; intent?: unknown };
    if (typeof o.label === 'string' && typeof o.intent === 'string' && o.label.trim() && o.intent.trim()) {
      out.push({ label: o.label.trim(), intent: o.intent.trim() });
    }
    if (out.length >= 3) break;
  }
  return out.length ? out : FALLBACK_SUGGESTIONS;
}
