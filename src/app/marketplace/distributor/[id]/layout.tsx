import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/marketplace/distributor/${id}/profile`, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: "Distribuidor — TirePro Marketplace" };
    const d = await res.json();

    const title = `${d.name} — Distribuidor de Llantas${d.ciudad ? ` en ${d.ciudad}` : ""} | TirePro`;
    const description = `${d.name}${d.ciudad ? `, ${d.ciudad}` : ""} — Distribuidor verificado de llantas en TirePro. ${d._count?.listings ?? 0} productos disponibles. ${d.descripcion?.substring(0, 120) ?? "Compra llantas nuevas y reencauche con envio a Colombia."}`;
    const image = d.bannerImage || d.profileImage || "https://tirepro.com.co/og-image.png";
    const cobertura = Array.isArray(d.cobertura) ? d.cobertura : [];

    return {
      title,
      description,
      keywords: [
        `${d.name} llantas`, `distribuidor llantas ${d.ciudad ?? "Colombia"}`,
        `comprar llantas ${d.ciudad ?? ""}`, "distribuidor verificado",
        ...cobertura.map((c: string) => `llantas ${c}`),
      ].filter(Boolean),
      openGraph: {
        title: d.name,
        description,
        url: `https://tirepro.com.co/marketplace/distributor/${id}`,
        siteName: "TirePro Marketplace",
        locale: "es_CO",
        type: "website",
        images: [{ url: image, width: 1200, height: 630 }],
      },
      alternates: { canonical: `https://tirepro.com.co/marketplace/distributor/${id}` },
    };
  } catch {
    return { title: "Distribuidor — TirePro Marketplace" };
  }
}

export default function DistributorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
