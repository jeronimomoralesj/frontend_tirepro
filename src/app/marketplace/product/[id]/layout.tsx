import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

// Cache product metadata for 30 min — long enough to deduplicate within a
// build, short enough that a failed fetch doesn't haunt the page for hours.
async function fetchProductMeta(id: string) {
  const tryFetch = async (init?: RequestInit) => {
    try {
      const r = await fetch(`${API_BASE}/marketplace/product/${id}`, init);
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  };
  // First attempt: ISR cache. If that misses (or returned a stale 404),
  // retry with no-store so a transient API blip doesn't poison the title.
  const cached = await tryFetch({ next: { revalidate: 1800 } });
  if (cached) return cached;
  return tryFetch({ cache: "no-store" });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await fetchProductMeta(id);
    if (!p) {
      return {
        title: "Llantas en Colombia · TirePro Marketplace",
        description: "Compra llantas nuevas y reencauche de distribuidores verificados en Colombia. Marketplace TirePro.",
      };
    }

    const imgs = Array.isArray(p.imageUrls) ? p.imageUrls : [];
    const cover = imgs.length > 0 ? imgs[p.coverIndex ?? 0] ?? imgs[0] : "https://www.tirepro.com.co/og-image.png";
    const price = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(p.precioCop);

    // Tab title — brand, model, dimension first, then site name. Buyers
    // who keep multiple tabs open see what they're looking at without
    // hovering. Includes the type so a reencauche listing is obvious.
    const tipo = p.tipo === "reencauche" ? " (Reencauche)" : "";
    const title = `${p.marca} ${p.modelo} ${p.dimension}${tipo} | TirePro Marketplace`;
    const description = `Comprar ${p.marca} ${p.modelo} ${p.dimension} ${p.tipo === "reencauche" ? "(reencauche)" : ""} por ${price}. ${p.distributor?.name ?? "Distribuidor verificado"} en Colombia. ${p.catalog?.terreno ? `Para ${p.catalog.terreno.toLowerCase()}.` : ""} ${p.catalog?.kmEstimadosReales ? `${(p.catalog.kmEstimadosReales / 1000).toFixed(0)}K km estimados.` : ""} Envio disponible.`;

    return {
      title,
      description,
      keywords: [
        `${p.marca} ${p.modelo}`, `${p.marca} ${p.dimension}`, `comprar ${p.marca}`,
        `llanta ${p.dimension}`, `${p.dimension} precio Colombia`, `${p.marca} Colombia`,
        p.tipo === "reencauche" ? "reencauche llantas" : "llantas nuevas",
        p.catalog?.terreno ?? "", p.distributor?.name ?? "",
      ].filter(Boolean),
      openGraph: {
        title: `${p.marca} ${p.modelo} ${p.dimension} — ${price}`,
        description,
        url: `https://www.tirepro.com.co/marketplace/product/${id}`,
        siteName: "TirePro Marketplace",
        locale: "es_CO",
        type: "website",
        images: [{ url: cover, width: 800, height: 800, alt: `${p.marca} ${p.modelo} ${p.dimension}` }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${p.marca} ${p.modelo} — ${price}`,
        description: `${p.marca} ${p.modelo} ${p.dimension} por ${price}. ${p.distributor?.name ?? "TirePro Marketplace"}`,
        images: [{ url: cover, alt: `${p.marca} ${p.modelo}` }],
      },
      alternates: { canonical: `https://www.tirepro.com.co/marketplace/product/${id}` },
      other: {
        "product:price:amount": String(p.precioCop),
        "product:price:currency": "COP",
      },
    };
  } catch {
    return { title: "Producto — TirePro Marketplace" };
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
