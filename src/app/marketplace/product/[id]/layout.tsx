import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/marketplace/product/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: "Producto — TirePro Marketplace" };
    const p = await res.json();

    const imgs = Array.isArray(p.imageUrls) ? p.imageUrls : [];
    const cover = imgs.length > 0 ? imgs[p.coverIndex ?? 0] ?? imgs[0] : "https://tirepro.com.co/og-image.png";
    const price = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(p.precioCop);

    const title = `${p.marca} ${p.modelo} ${p.dimension} — ${price} | TirePro`;
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
        url: `https://tirepro.com.co/marketplace/product/${id}`,
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
      alternates: { canonical: `https://tirepro.com.co/marketplace/product/${id}` },
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
