import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace de Llantas — TirePro",
  description:
    "Compra llantas nuevas y reencauche para tu flota en Colombia. Compara precios de distribuidores verificados. Michelin, Bridgestone, Continental, Goodyear y mas. Envio a todo el pais.",
  keywords: [
    "comprar llantas Colombia", "llantas para camion", "llantas para tractomula",
    "reencauche llantas", "llantas nuevas", "marketplace llantas",
    "distribuidores llantas Colombia", "llantas Bogota", "llantas Medellin",
    "llantas Cali", "llantas Barranquilla", "llantas para flota",
    "Michelin Colombia", "Bridgestone Colombia", "Continental llantas",
    "Goodyear Colombia", "llantas 295/80R22.5", "llantas 11R22.5",
    "llantas 12R22.5", "llantas 315/80R22.5", "precio llantas camion",
    "CPK llantas", "costo por kilometro llantas", "venta llantas Colombia",
  ],
  openGraph: {
    title: "Marketplace de Llantas — TirePro",
    description: "Compra llantas nuevas y reencauche. Compara precios de distribuidores verificados en toda Colombia.",
    url: "https://tirepro.com.co/marketplace",
    siteName: "TirePro",
    locale: "es_CO",
    type: "website",
    images: [{ url: "https://tirepro.com.co/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketplace de Llantas — TirePro",
    description: "Compra llantas para tu flota. Compara precios de distribuidores verificados.",
  },
  alternates: {
    canonical: "https://tirepro.com.co/marketplace",
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
