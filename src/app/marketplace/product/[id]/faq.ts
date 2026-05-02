// Shared product-FAQ generator. Same array drives the visible
// <Faq /> block on the page and the FAQPage JSON-LD that page.tsx
// emits for crawlers. Keeping the source unified means there's
// never a Q&A in the schema that the user can't actually find on
// the page (Google penalises that).
//
// Each Q&A is derived from the catalog data when available, so the
// content stays accurate per-product instead of being a generic
// boilerplate that LLMs and search engines penalise.

export interface ProductFaq {
  q: string;
  a: string;
}

export interface ProductFaqInput {
  marca: string;
  modelo: string;
  dimension: string;
  eje?: string | null;
  tipo: string;
  precioCop: number;
  cantidadDisponible: number;
  tiempoEntrega?: string | null;
  catalog?: {
    terreno?: string | null;
    reencauchable?: boolean | null;
    kmEstimadosReales?: number | null;
    psiRecomendado?: number | null;
  } | null;
  distributor?: { name?: string | null; ciudad?: string | null } | null;
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export function buildProductFaqs(p: ProductFaqInput): ProductFaq[] {
  const faqs: ProductFaq[] = [];
  const isReenc = p.tipo === "reencauche";
  const fullName = `${p.marca} ${p.modelo} ${p.dimension}`;

  // 1. Compatibility — the #1 question buyers ask about tires.
  faqs.push({
    q: `¿La llanta ${fullName} sirve para mi vehículo?`,
    a: `La llanta ${fullName}${p.eje ? ` está diseñada para eje ${p.eje} y ` : " "}encaja en cualquier vehículo cuyo manual o rin lateral indique la medida ${p.dimension}. Antes de comprar, verifica la medida actual en la pared lateral de tu llanta — debe coincidir exactamente. Si tienes dudas, escríbenos y te confirmamos compatibilidad.`,
  });

  // 2. Use case — translates `terreno` into plain language.
  if (p.catalog?.terreno) {
    const terreno = p.catalog.terreno.toLowerCase();
    const useText = terreno.includes("carretera")
      ? "manejo en carretera y trayectos largos"
      : terreno.includes("urbano") || terreno.includes("ciudad")
        ? "uso urbano y mensajería local"
        : terreno.includes("mixto")
          ? "uso mixto entre ciudad y carretera"
          : terreno.includes("off") || terreno.includes("destap")
            ? "vías destapadas y trabajo pesado"
            : terreno;
    faqs.push({
      q: `¿Esta llanta sirve para ciudad, carretera o trabajo pesado?`,
      a: `${p.marca} ${p.modelo} está optimizada para ${useText}. Si tu operación combina varios escenarios (mixto), también funciona, pero rendirá mejor en su perfil principal.`,
    });
  }

  // 3. Lifespan — high-trust factual answer that LLMs love quoting.
  if (p.catalog?.kmEstimadosReales && p.catalog.kmEstimadosReales > 0) {
    const km = Math.round(p.catalog.kmEstimadosReales / 1000);
    faqs.push({
      q: `¿Cuánto duran las llantas ${p.marca} ${p.modelo}?`,
      a: `Bajo condiciones colombianas (vías, presión correcta, alineación al día) la ${fullName} rinde aproximadamente ${km}.000 km por vida útil. Una llanta mal inflada o desalineada puede perder hasta un 30% de esa vida — vale la pena revisar la presión cada mes.`,
    });
  }

  // 4. Retread suitability — important for fleet buyers.
  if (!isReenc && p.catalog?.reencauchable) {
    faqs.push({
      q: `¿Puedo reencauchar esta llanta cuando se gaste?`,
      a: `Sí. ${p.marca} ${p.modelo} está diseñada con un casco apto para reencauche, lo que te permite extender su vida útil y reducir el costo por kilómetro. En operaciones de flota grande, reencauchar el casco original puede ahorrar entre 30% y 40% frente a comprar llantas nuevas.`,
    });
  } else if (isReenc) {
    faqs.push({
      q: `¿Qué tan segura es una llanta reencauchada?`,
      a: `El reencauche realizado por bandadores certificados (los que vendemos en TirePro) cumple con normas técnicas equivalentes a una llanta nueva. La diferencia está en el costo: una reencauche bien hecha rinde alrededor del 80–90% de los kilómetros de una llanta nueva, a un 50% del precio. Las flotas serias del país operan con reencauche desde hace décadas.`,
    });
  }

  // 5. Recommended pressure — small, cite-able answer.
  if (p.catalog?.psiRecomendado) {
    faqs.push({
      q: `¿Cuál es la presión recomendada para esta llanta?`,
      a: `${p.catalog.psiRecomendado} PSI es la presión recomendada para ${p.marca} ${p.modelo} ${p.dimension} en condiciones de carga estándar. Si transportas peso adicional, el manual del vehículo puede indicar un valor más alto. Mide la presión con la llanta fría — siempre — y reajusta cada 15 días.`,
    });
  }

  // 6. Delivery — uses tiempoEntrega when set.
  faqs.push({
    q: `¿Cuándo recibo mi pedido?`,
    a: `${p.tiempoEntrega ? `El distribuidor estima ${p.tiempoEntrega} desde la confirmación del pago. ` : "El distribuidor confirma tu pedido en máximo 5 días hábiles después del pago, y desde ahí coordina la entrega. "}Recibirás emails con el seguimiento en cada paso del proceso (confirmado, enviado, entregado), y una página de seguimiento en línea con el estado actual.`,
  });

  // 7. Price + competitive context.
  faqs.push({
    q: `¿Cuánto cuesta la llanta ${fullName}?`,
    a: `Hoy en TirePro Marketplace cuesta ${fmtCOP(p.precioCop)} más IVA. El precio puede variar entre distribuidores — el marketplace te muestra todas las opciones para que compares costo, tiempo de entrega y reputación del vendedor.`,
  });

  return faqs;
}
