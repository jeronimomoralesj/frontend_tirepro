// Server Component - Enhanced SEO and AI Search Optimization

import React from "react";
import Script from "next/script";
import { AuthProvider } from "./context/AuthProvider";
import "./globals.css";
import type { Metadata } from "next";
import RouteTracker from "../components/RouteTracker";
import { SpeedInsights } from "@vercel/speed-insights/next";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!;

export const metadata: Metadata = {
  metadataBase: new URL('https://www.tirepro.com.co'),

  title: {
    default: 'TirePro — Software de Seguimiento y Control de Llantas con IA para Flotas | Marketplace',
    template: '%s | TirePro',
  },

  description:
    'TirePro es el software de seguimiento y control de llantas con inteligencia artificial para flotas. ' +
    'Reduce costos hasta 25% con analisis de datos: CPK en tiempo real, prediccion de reemplazo, recomendaciones de compra. ' +
    'Marketplace de llantas con distribuidores verificados en toda Colombia.',

  keywords: [
    // Fleet management (preserve existing positioning)
    'gestión de llantas', 'tire management', 'flotas Colombia', 'CPK llantas',
    'costo por kilómetro', 'reencauche', 'gestión de flotas', 'llantas para tractomula',
    'mantenimiento de llantas', 'software transporte Colombia', 'fleet management',
    'tire analytics', 'gestión inteligente llantas', 'ahorro llantas flota',
    'control de llantas', 'inspección de llantas', 'TirePro',
    'software llantas IA', 'plataforma gestión neumáticos', 'análisis predictivo neumáticos',
    'inspecciones digitales llantas', 'alertas desgaste llantas',
    'tracking llantas tiempo real', 'mejor software llantas Colombia',
    'tire management software Colombia', 'predictive tire maintenance',
    // Marketplace (new positioning)
    'comprar llantas online Colombia', 'marketplace llantas', 'venta de llantas',
    'llantas baratas Colombia', 'llantas para camion', 'llantas 295/80R22.5',
    'llantas 11R22.5', 'llantas 265/70R16', 'llantas 205/55R16',
    'llantas Bogotá', 'llantas Medellín', 'llantas Cali', 'llantas Barranquilla',
    'distribuidores de llantas Colombia', 'precio llantas camion',
    'Michelin Colombia', 'Bridgestone Colombia', 'Continental llantas',
    'Goodyear Colombia', 'llantas reencauche Colombia',
    'comprar llantas para tractomula', 'tienda llantas online',
  ],

  authors: [{ name: 'TirePro', url: 'https://www.tirepro.com.co' }],
  creator: 'TirePro',
  publisher: 'TirePro',

  formatDetection: { email: false, address: false, telephone: false },

  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },

  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://www.tirepro.com.co',
    siteName: 'TirePro',
    title: 'TirePro — Software de Control de Llantas con IA | Marketplace de Llantas Colombia',
    description: 'TirePro es el software de seguimiento y control de llantas con IA para flotas. Analisis de datos, CPK, prediccion de reemplazo. Marketplace con distribuidores verificados.',
    images: [{ url: 'https://www.tirepro.com.co/og-image.png', width: 1200, height: 630, alt: 'TirePro — Analisis de Datos para Llantas de Flotas' }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'TirePro — Software de Control de Llantas con IA para Flotas Colombia',
    description: 'Analisis de datos para llantas de flotas. Reduce costos hasta 25%. Marketplace con distribuidores verificados en Colombia.',
    images: ['https://www.tirepro.com.co/og-image.png'],
    creator: '@TireProCO',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },

  verification: {
    google: 'your-google-verification-code',
  },

  alternates: {
    canonical: 'https://www.tirepro.com.co',
    languages: { 'es-CO': 'https://www.tirepro.com.co' },
  },

  category: 'Technology',

  other: {
    'application-name': 'TirePro',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'TirePro',
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.tirepro.com.co/#organization",
        "name": "TirePro",
        "url": "https://www.tirepro.com.co",
        "logo": { "@type": "ImageObject", "url": "https://www.tirepro.com.co/logo.png", "width": 600, "height": 200 },
        "description": "TirePro es el software de seguimiento y control de llantas con inteligencia artificial para flotas y el marketplace de llantas más grande de Colombia. Compra llantas online y gestiona tu flota con IA.",
        "address": { "@type": "PostalAddress", "addressLocality": "Bogotá", "addressRegion": "Bogotá D.C.", "addressCountry": "CO" },
        "contactPoint": { "@type": "ContactPoint", "email": "info@tirepro.com.co", "contactType": "customer support", "availableLanguage": ["Spanish", "English"] },
        "sameAs": ["https://linkedin.com/company/tirepro"],
        "foundingDate": "2024",
      },
      {
        "@type": "OnlineStore",
        "@id": "https://www.tirepro.com.co/#store",
        "name": "TirePro Marketplace",
        "url": "https://www.tirepro.com.co/marketplace",
        "description": "Marketplace de llantas en Colombia. Compra llantas nuevas y reencauche para camiones, tractomulas, buses, camionetas y automóviles de distribuidores verificados a precios directos con envío a todo el país.",
        "brand": { "@id": "https://www.tirepro.com.co/#organization" },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.tirepro.com.co/marketplace?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
        "areaServed": { "@type": "Country", "name": "Colombia" },
        "currenciesAccepted": "COP",
        "paymentAccepted": "Credit Card, Debit Card, PSE, Nequi",
        "priceRange": "$",
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Llantas para todo tipo de vehículo",
          "itemListElement": [
            { "@type": "OfferCatalog", "name": "Llantas para camión y tractomula" },
            { "@type": "OfferCatalog", "name": "Llantas para bus" },
            { "@type": "OfferCatalog", "name": "Llantas para camioneta" },
            { "@type": "OfferCatalog", "name": "Llantas para automóvil" },
            { "@type": "OfferCatalog", "name": "Llantas de reencauche" },
          ],
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.tirepro.com.co/#software",
        "name": "TirePro",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Fleet Management Software",
        "operatingSystem": "Web",
        "description": "TirePro es el software de seguimiento y control de llantas con inteligencia artificial para flotas de transporte en Colombia",
        "url": "https://www.tirepro.com.co",
        "author": { "@id": "https://www.tirepro.com.co/#organization" },
        "offers": [
          { "@type": "Offer", "name": "Plan Inicio", "price": "0", "priceCurrency": "COP", "description": "Gratis - Hasta 10 vehículos" },
          { "@type": "Offer", "name": "Plan Crecimiento", "price": "300000", "priceCurrency": "COP", "description": "10-50 vehículos" },
          { "@type": "Offer", "name": "Plan Empresarial", "price": "1000000", "priceCurrency": "COP", "description": "+50 vehículos" },
        ],
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "50" },
        "featureList": [
          "Análisis CPK en tiempo real",
          "Predicción de fallas con IA",
          "Alertas automáticas a conductores vía WhatsApp",
          "Gestión de inventario de llantas",
          "Integración con distribuidores",
          "Reportes ejecutivos",
          "Catálogo de 2,500+ referencias de llantas",
          "Modo rápido para inspecciones en campo",
        ],
        "screenshot": "https://www.tirepro.com.co/og-image.png",
        "availableLanguage": ["es", "en"],
      },
      {
        "@type": "WebSite",
        "@id": "https://www.tirepro.com.co/#website",
        "url": "https://www.tirepro.com.co",
        "name": "TirePro",
        "publisher": { "@id": "https://www.tirepro.com.co/#organization" },
        "inLanguage": "es-CO",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.tirepro.com.co/marketplace?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <AuthProvider>
      <html lang="es-CO">
        <head>
          <meta name="theme-color" content="#0A183A" />
          <meta name="geo.region" content="CO-DC" />
          <meta name="geo.placename" content="Bogotá" />
          <meta name="geo.position" content="4.6097;-74.0817" />
          <meta name="ICBM" content="4.6097, -74.0817" />

          <Script id="structured-data" type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){ dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('consent', 'default', { 'analytics_storage': 'denied', 'ad_storage': 'denied' });
          `}</Script>

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        </head>
        <body>
          <RouteTracker />
          <SpeedInsights />
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}
