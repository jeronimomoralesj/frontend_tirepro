import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Marketplace de Llantas en Colombia — Compra Online | TirePro",
  description:
    "Compra llantas nuevas y reencauche para camiones, tractomulas, buses, camionetas y autos en Colombia. " +
    "Compara precios de distribuidores verificados. Michelin, Bridgestone, Continental, Goodyear y mas. " +
    "Busca por dimension (295/80R22.5, 11R22.5, 265/70R16) o por placa. Envio a todo el pais.",
  keywords: [
    "comprar llantas Colombia", "llantas online Colombia", "marketplace llantas",
    "llantas para camion", "llantas para tractomula", "llantas para bus",
    "llantas para camioneta", "llantas para auto",
    "reencauche llantas", "llantas nuevas Colombia",
    "distribuidores llantas Colombia", "venta de llantas",
    "llantas 295/80R22.5", "llantas 11R22.5", "llantas 12R22.5",
    "llantas 265/70R16", "llantas 205/55R16", "llantas 315/80R22.5",
    "llantas Bogota", "llantas Medellin", "llantas Cali", "llantas Barranquilla",
    "Michelin Colombia", "Bridgestone Colombia", "Continental llantas",
    "Goodyear Colombia", "Firestone Colombia", "Hankook Colombia",
    "precio llantas camion Colombia", "llantas baratas Colombia",
    "comprar llantas para flota", "tienda llantas online Colombia",
  ],
  openGraph: {
    title: "Marketplace de Llantas en Colombia — TirePro",
    description: "Compra llantas nuevas y reencauche. Compara precios de distribuidores verificados en toda Colombia. Envio a todo el pais.",
    url: "https://tirepro.com.co/marketplace",
    siteName: "TirePro",
    locale: "es_CO",
    type: "website",
    images: [{ url: "https://tirepro.com.co/og-image.png", width: 1200, height: 630, alt: "TirePro Marketplace — Compra llantas online en Colombia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketplace de Llantas — TirePro Colombia",
    description: "Compra llantas para tu flota o vehiculo. Distribuidores verificados, precios directos, envio nacional.",
    images: ["https://tirepro.com.co/og-image.png"],
  },
  alternates: {
    canonical: "https://tirepro.com.co/marketplace",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Marketplace de Llantas — TirePro",
    description: "Compra llantas nuevas y reencauche para todo tipo de vehiculo en Colombia. Distribuidores verificados con envio a todo el pais.",
    url: "https://tirepro.com.co/marketplace",
    isPartOf: { "@type": "WebSite", name: "TirePro", url: "https://tirepro.com.co" },
    provider: { "@type": "Organization", name: "TirePro", url: "https://tirepro.com.co" },
    about: {
      "@type": "Product",
      name: "Llantas para vehiculos",
      category: "Llantas / Neumaticos",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://tirepro.com.co/marketplace?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Donde comprar llantas online en Colombia?",
        acceptedAnswer: { "@type": "Answer", text: "En el marketplace de TirePro puedes comprar llantas nuevas y reencauche de distribuidores verificados en toda Colombia. Busca por dimension, marca o placa de tu vehiculo. Envio a Bogota, Medellin, Cali, Barranquilla y todo el pais." },
      },
      {
        "@type": "Question",
        name: "¿Que dimension de llantas necesita mi vehiculo?",
        acceptedAnswer: { "@type": "Answer", text: "En TirePro puedes buscar por placa y te decimos las dimensiones exactas. Las mas comunes son: 295/80R22.5 y 11R22.5 para tractomulas, 265/70R16 para camionetas, 205/55R16 para sedanes, y 195/65R15 para compactos." },
      },
      {
        "@type": "Question",
        name: "¿Cuanto cuestan las llantas para camion en Colombia?",
        acceptedAnswer: { "@type": "Answer", text: "Los precios varian segun marca, dimension y tipo (nueva o reencauche). En TirePro puedes comparar precios de multiples distribuidores en segundos. Llantas nuevas 295/80R22.5 desde $800,000 COP. Reencauche desde $400,000 COP." },
      },
    ],
  };

  return (
    <>
      <Script id="marketplace-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Script id="marketplace-faq" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }} />
      {children}
    </>
  );
}
