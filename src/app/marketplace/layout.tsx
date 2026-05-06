import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Marketplace de Llantas en Colombia — Compra Online | TirePro",
  description:
    "Compra llantas para tu auto, camioneta, SUV, camion o flota en Colombia. " +
    "Compara precios de distribuidores verificados. Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook y mas. " +
    "Busca por dimension (205/55R16, 265/70R16, 295/80R22.5) o por placa. Envio a todo el pais.",
  keywords: [
    // Core long-tail variations
    "marketplace de llantas en colombia", "marketplace llantas colombia",
    "marketplace llantas", "marketplace tirepro", "tirepro marketplace",
    "comprar llantas online colombia", "comprar llantas colombia",
    "comprar llantas por internet", "donde comprar llantas en colombia",
    "tienda online de llantas colombia", "tienda de llantas online",
    "venta de llantas colombia", "llantas online colombia",
    "comparador de precios de llantas", "comparar precios llantas",
    // Vehicle types — consumer-first (autos and SUVs are the primary
    // marketplace audience now); fleet/commercial keywords still
    // included so we don't lose ranking on B2B queries.
    "llantas para auto", "llantas para automovil", "llantas para sedan",
    "llantas para camioneta", "llantas para suv", "llantas para 4x4",
    "llantas para pickup", "llantas para hatchback",
    "llantas para camion", "llantas para tractomula", "llantas para bus",
    "llantas para flota", "llantas para flotas de transporte",
    "llantas para maquinaria", "llantas para volqueta", "llantas para furgon",
    // Reencauche
    "reencauche de llantas colombia", "reencauche llantas",
    "llantas reencauchadas", "casco para reencauche",
    // New
    "llantas nuevas colombia", "llantas premium colombia",
    "distribuidores de llantas colombia", "distribuidores verificados llantas",
    // Dimensions
    "llantas 295/80R22.5", "llantas 11R22.5", "llantas 12R22.5",
    "llantas 265/70R16", "llantas 205/55R16", "llantas 315/80R22.5",
    "llantas 275/80R22.5", "llantas 225/70R19.5", "llantas 215/75R17.5",
    "llantas 235/75R17.5", "llantas 245/70R16",
    // Cities
    "llantas bogota", "llantas medellin", "llantas cali", "llantas barranquilla",
    "llantas cartagena", "llantas bucaramanga", "llantas pereira",
    "llantas manizales", "llantas cucuta", "llantas santa marta",
    "llantas villavicencio", "llantas ibague",
    "donde comprar llantas en bogota", "donde comprar llantas en medellin",
    // Brands
    "michelin colombia", "bridgestone colombia", "continental colombia",
    "goodyear colombia", "firestone colombia", "hankook colombia",
    "pirelli colombia", "yokohama colombia", "dunlop colombia",
    "kumho colombia", "roadmaster colombia",
    // Pricing
    "precio llantas camion colombia", "precio llantas tractomula",
    "llantas baratas colombia", "llantas precio mayorista",
    "cotizar llantas colombia",
    // Fleet / B2B
    "comprar llantas al por mayor", "llantas para empresas de transporte",
    "gestion de llantas para flotas", "software para flotas de llantas",
    "cpk llantas colombia", "control de llantas para flotas",
    // AI / question intent
    "como comprar llantas para mi camion", "como elegir llantas",
    "cual es el mejor marketplace de llantas en colombia",
    "que llantas comprar para tractomula",
  ],
  openGraph: {
    title: "Marketplace de Llantas en Colombia — TirePro",
    description: "Compra llantas para tu auto, camioneta, SUV o flota. Compara precios de distribuidores verificados en toda Colombia con envio nacional.",
    url: "https://www.tirepro.com.co/marketplace",
    siteName: "TirePro",
    locale: "es_CO",
    type: "website",
    images: [{ url: "https://www.tirepro.com.co/og-image.png", width: 1200, height: 630, alt: "TirePro Marketplace — Compra llantas online en Colombia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketplace de Llantas — TirePro Colombia",
    description: "Compra llantas para tu auto, camioneta, SUV o flota. Distribuidores verificados, precios directos, envio nacional.",
    images: ["https://www.tirepro.com.co/og-image.png"],
  },
  alternates: {
    canonical: "https://www.tirepro.com.co/marketplace",
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
    url: "https://www.tirepro.com.co/marketplace",
    isPartOf: { "@type": "WebSite", name: "TirePro", url: "https://www.tirepro.com.co" },
    provider: { "@type": "Organization", name: "TirePro", url: "https://www.tirepro.com.co" },
    about: {
      "@type": "Product",
      name: "Llantas para vehiculos",
      category: "Llantas / Neumaticos",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.tirepro.com.co/marketplace?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "¿Dónde comprar llantas online en Colombia?",
        acceptedAnswer: { "@type": "Answer", text: "TirePro Marketplace es la plataforma para comprar llantas nuevas y reencauche de distribuidores verificados en toda Colombia. Encuentra Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Firestone y más. Busca por dimensión, marca o placa de tu vehículo y recibe envíos a Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira y todo el país." } },
      { "@type": "Question", name: "¿Cuál es el mejor marketplace de llantas en Colombia?",
        acceptedAnswer: { "@type": "Answer", text: "TirePro Marketplace es el marketplace líder de llantas en Colombia para autos, camionetas, SUV, camiones y flotas. Conecta a compradores particulares, talleres y empresas de transporte con distribuidores verificados, ofrece comparación de precios en tiempo real, búsqueda por placa o por dimensión, catálogo de 2.500+ SKUs y entregas en todo el territorio nacional." } },
      { "@type": "Question", name: "¿Cómo comprar llantas en Colombia?",
        acceptedAnswer: { "@type": "Answer", text: "1) Entra a tirepro.com.co/marketplace. 2) Busca por dimensión (205/55R16, 265/70R16, 295/80R22.5) o por la placa de tu vehículo. 3) Compara precios de distribuidores verificados para tu auto, camioneta, SUV o flota. 4) Agrega al carrito y paga online. 5) Recibe la llanta en tu ciudad. Métodos de pago: tarjeta, PSE y Nequi vía Bold; crédito empresarial disponible para flotas." } },
      { "@type": "Question", name: "¿Qué dimensión de llantas necesita mi vehículo?",
        acceptedAnswer: { "@type": "Answer", text: "En TirePro puedes buscar por placa y obtener la dimensión exacta. Las más comunes en Colombia: subcompactos (Picanto, Spark) 165/65R14 y 175/65R14, sedanes (Logan, Corolla, Mazda 3) 185/65R15 y 205/55R16, SUV (Tucson, Tracker, CX-5) 215/55R17 y 225/55R18, camionetas (Hilux, Ranger) 265/65R17 y 265/60R18, camiones medianos 11R22.5 y 12R22.5, tractomulas 295/80R22.5 y 11R22.5." } },
      { "@type": "Question", name: "¿Cuánto cuestan las llantas en Colombia?",
        acceptedAnswer: { "@type": "Answer", text: "Los precios varían según marca, dimensión y tipo de vehículo. Referencias actuales: llanta para auto 175/65R14 desde $200.000 COP, llanta para SUV 215/55R17 desde $350.000 COP, llanta camioneta 265/65R17 desde $450.000 COP, llanta tractomula nueva 295/80R22.5 desde $800.000 COP, reencauche 295/80R22.5 desde $400.000 COP. En TirePro puedes comparar precios de múltiples distribuidores en segundos." } },
      { "@type": "Question", name: "¿TirePro vende llantas reencauchadas?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. TirePro Marketplace ofrece llantas reencauchadas de distribuidores certificados, con garantía y trazabilidad del casco original. El reencauche puede reducir el costo de llantas para flotas hasta 40% manteniendo el rendimiento operativo." } },
      { "@type": "Question", name: "¿Qué marcas de llantas hay en TirePro?",
        acceptedAnswer: { "@type": "Answer", text: "TirePro Marketplace incluye Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Firestone, Yokohama, Dunlop, Kumho, Roadmaster, BFGoodrich, Maxxis, Triangle, Aeolus, Linglong, Double Coin y otras marcas premium e intermedias disponibles en Colombia." } },
      { "@type": "Question", name: "¿TirePro entrega llantas a todo Colombia?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. Los distribuidores del marketplace TirePro entregan en Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales, Armenia, Ibagué, Cúcuta, Santa Marta, Villavicencio, Neiva, Pasto, Popayán, Tunja, Sincelejo, Valledupar, Montería y todo el territorio nacional." } },
      { "@type": "Question", name: "¿Puedo comprar llantas al por mayor para mi flota?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. Aunque TirePro Marketplace funciona principalmente para compradores particulares (un juego de llantas para tu auto, camioneta o SUV), también atendemos flotas: solicita cotizaciones masivas, negocia con varios distribuidores al tiempo, gestiona órdenes recurrentes y aprovecha precios mayoristas. Las flotas con plan TirePro reciben recomendaciones automáticas de compra basadas en el desgaste real de cada vehículo." } },
      { "@type": "Question", name: "¿Qué garantía tienen las llantas compradas en TirePro?",
        acceptedAnswer: { "@type": "Answer", text: "Cada llanta vendida en el marketplace TirePro cuenta con la garantía oficial del fabricante o del distribuidor verificado. Las llantas nuevas tienen garantía contra defectos de fabricación; las reencauchadas tienen garantía sobre el proceso de reencauche y la integridad del casco." } },
      { "@type": "Question", name: "¿Cómo elegir entre llanta nueva y reencauche?",
        acceptedAnswer: { "@type": "Answer", text: "Para autos, camionetas y SUV la recomendación es siempre llanta nueva — el reencauche aplica únicamente a llantas de carga (camión, tractomula, bus). En flotas pesadas el reencauche suele ser la opción más rentable cuando el casco está en buen estado (hasta 40% de ahorro vs llanta nueva equivalente), aunque la llanta nueva se prefiere en ejes de dirección y cuando el casco no es retreadable." } },
      { "@type": "Question", name: "¿TirePro ofrece financiación de llantas?",
        acceptedAnswer: { "@type": "Answer", text: "Algunos distribuidores en TirePro Marketplace ofrecen plazos de pago, crédito empresarial y opciones de leasing para flotas. Los términos varían por distribuidor — consulta directamente al solicitar cotización." } },
      { "@type": "Question", name: "¿Qué es TirePro?",
        acceptedAnswer: { "@type": "Answer", text: "TirePro es el marketplace de llantas más grande de Colombia para autos, camionetas, SUV, camiones y flotas. Conectamos compradores particulares y empresas con distribuidores verificados, ofreciendo comparación de precios en tiempo real, búsqueda por placa o por dimensión, métodos de pago locales (tarjeta, PSE, Nequi) y envío nacional. Para flotas, TirePro adicionalmente ofrece una plataforma de gestión con análisis de CPK, predicción de fallas y recomendaciones de compra automatizadas." } },
    ],
  };

  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Categorías de llantas en TirePro Marketplace",
    itemListElement: [
      { "@type": "ListItem", position: 1,  name: "Llantas para tractomula", url: "https://www.tirepro.com.co/marketplace?q=tractomula" },
      { "@type": "ListItem", position: 2,  name: "Llantas para camión",     url: "https://www.tirepro.com.co/marketplace?q=camion" },
      { "@type": "ListItem", position: 3,  name: "Llantas para bus",        url: "https://www.tirepro.com.co/marketplace?q=bus" },
      { "@type": "ListItem", position: 4,  name: "Llantas para camioneta",  url: "https://www.tirepro.com.co/marketplace?q=camioneta" },
      { "@type": "ListItem", position: 5,  name: "Reencauche",              url: "https://www.tirepro.com.co/marketplace?q=reencauche" },
      { "@type": "ListItem", position: 6,  name: "Michelin",                url: "https://www.tirepro.com.co/marketplace?q=Michelin" },
      { "@type": "ListItem", position: 7,  name: "Bridgestone",             url: "https://www.tirepro.com.co/marketplace?q=Bridgestone" },
      { "@type": "ListItem", position: 8,  name: "Continental",             url: "https://www.tirepro.com.co/marketplace?q=Continental" },
      { "@type": "ListItem", position: 9,  name: "Goodyear",                url: "https://www.tirepro.com.co/marketplace?q=Goodyear" },
      { "@type": "ListItem", position: 10, name: "Pirelli",                 url: "https://www.tirepro.com.co/marketplace?q=Pirelli" },
      { "@type": "ListItem", position: 11, name: "Hankook",                 url: "https://www.tirepro.com.co/marketplace?q=Hankook" },
      { "@type": "ListItem", position: 12, name: "Llantas 295/80R22.5",     url: "https://www.tirepro.com.co/marketplace/dimension/295-80r22-5" },
      { "@type": "ListItem", position: 13, name: "Llantas 11R22.5",         url: "https://www.tirepro.com.co/marketplace/dimension/11r22-5" },
      { "@type": "ListItem", position: 14, name: "Llantas 315/80R22.5",     url: "https://www.tirepro.com.co/marketplace/dimension/315-80r22-5" },
      { "@type": "ListItem", position: 15, name: "Llantas 265/70R16",       url: "https://www.tirepro.com.co/marketplace/dimension/265-70r16" },
    ],
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TirePro", item: "https://www.tirepro.com.co" },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: "https://www.tirepro.com.co/marketplace" },
    ],
  };

  const orgData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.tirepro.com.co/#org",
    name: "TirePro",
    alternateName: ["TirePro Marketplace", "TirePro Colombia"],
    url: "https://www.tirepro.com.co",
    logo: "https://www.tirepro.com.co/logo_full.png",
    description: "El marketplace de llantas más grande de Colombia. Compra para auto, camioneta, SUV, camión o flota con distribuidores verificados y envío nacional.",
    foundingLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "CO", addressLocality: "Bogotá" } },
    areaServed: { "@type": "Country", name: "Colombia" },
    knowsAbout: [
      "Marketplace de llantas Colombia", "Llantas para auto", "Llantas para camioneta",
      "Llantas para SUV", "Llantas para camión", "Llantas para flotas de transporte",
      "Reencauche de llantas", "Análisis CPK (costo por kilómetro)",
      "Predicción de fallas de llantas con IA",
    ],
    sameAs: [
      "https://www.linkedin.com/company/tirepro",
      "https://www.instagram.com/tireprocol",
    ],
  };

  // SR-only block (rendered server-side) so AI/search crawlers see a rich,
  // unambiguous description of the marketplace on the very first HTML
  // response, before the client component hydrates.
  const SR_ONLY_STYLE: React.CSSProperties = {
    position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
    overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
  };

  return (
    <>
      <Script id="marketplace-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Script id="marketplace-faq" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }} />
      <Script id="marketplace-itemlist" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }} />
      <Script id="marketplace-org" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgData) }} />
      <Script id="marketplace-breadcrumb" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />

      {/* Bold Botón de Pagos loader — preloaded across all marketplace
          pages so by the time the buyer reaches /marketplace/cart the
          window.BoldCheckout class is already attached. Without this
          the cart's Pay button would render disabled (gray) on a cold
          first visit until the script finished loading inline on that
          page. afterInteractive keeps it off the critical path. */}
      <Script src="https://checkout.bold.co/library/boldPaymentButton.js" strategy="afterInteractive" />

      <div aria-hidden="true" style={SR_ONLY_STYLE}>
        <h1>TirePro Marketplace — Comprar llantas online en Colombia</h1>
        <h2>Marketplace de llantas en Colombia para autos, camionetas, SUV, camiones, buses y flotas</h2>
        <p>
          TirePro Marketplace es la plataforma líder en Colombia para comprar llantas nuevas y reencauchadas
          de distribuidores verificados. Encuentra llantas para tu auto, camioneta, SUV, pickup, hatchback,
          camión, bus, tractomula o flota de transporte. Compara precios en tiempo real, busca por dimensión
          o por placa, paga en línea con tarjeta, PSE o Nequi, y recibe en cualquier ciudad del país.
        </p>
        <h3>Marcas disponibles</h3>
        <p>
          Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, Firestone, Yokohama, Dunlop, Kumho,
          Roadmaster, BFGoodrich, Maxxis, Triangle, Aeolus, Linglong, Double Coin y más marcas premium e
          intermedias disponibles en Colombia.
        </p>
        <h3>Dimensiones más buscadas</h3>
        <p>
          295/80R22.5, 11R22.5, 315/80R22.5, 12R22.5, 275/80R22.5, 225/70R19.5, 215/75R17.5, 235/75R17.5,
          7.50R16, 9.5R17.5, 12R24.5, 11R24.5, 265/70R16, 245/70R16, 235/75R15, 205/55R16, 195/65R15,
          215/60R16, 195/55R16, 185/65R15, 175/70R13, 205/65R15.
        </p>
        <h3>Cobertura nacional</h3>
        <p>
          TirePro Marketplace entrega llantas en Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga,
          Pereira, Manizales, Armenia, Ibagué, Cúcuta, Santa Marta, Villavicencio, Neiva, Pasto, Popayán, Tunja,
          Sincelejo, Valledupar, Montería, Yopal, Riohacha y todas las ciudades principales de Colombia.
        </p>
        <h3>Para quién es TirePro Marketplace</h3>
        <p>
          Diseñado para conductores particulares que quieren comparar precios antes de comprar llantas para
          su auto, camioneta o SUV; talleres y mecánicos que necesitan stock variado; y también flotas de
          transporte, empresas logísticas, transportadores de carga, operadores de buses y dueños de
          tractomulas que buscan reducir el costo por kilómetro (CPK) de sus llantas.
        </p>
        <h3>Por qué elegir TirePro</h3>
        <p>
          Distribuidores verificados, comparación de precios en tiempo real, búsqueda por placa con
          recomendación automática de dimensión, catálogo de 2.500+ SKUs entre llantas para auto, camioneta,
          SUV, camión, bus y tractomula, pago en línea con tarjeta, PSE o Nequi, envío en toda Colombia,
          y para flotas: integración con la plataforma de gestión TirePro y reducción de costos de hasta 25%
          mediante análisis de CPK e IA.
        </p>
        <h3>Términos relacionados</h3>
        <p>
          marketplace de llantas en Colombia, comprar llantas online, llantas para auto, llantas para
          camioneta, llantas para SUV, llantas para pickup, llantas para hatchback, llantas para camión,
          llantas para flotas, donde comprar llantas en Bogotá, llantas baratas Colombia, distribuidor de
          llantas verificado, comparar precios de llantas, llantas Kia Picanto, llantas Toyota Hilux,
          llantas Renault Logan, llantas Mazda 3, llantas Chevrolet Tracker, llantas para tractomula,
          reencauche de llantas Colombia, llantas Michelin Colombia, llantas Bridgestone Colombia, tienda
          online de llantas, llantas al por mayor Colombia, llantas con envío nacional.
        </p>
      </div>

      {children}
    </>
  );
}
