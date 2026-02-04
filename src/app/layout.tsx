// Server Component - Enhanced SEO and AI Search Optimization

import React from "react";
import Script from "next/script";
import { AuthProvider } from "./context/AuthProvider";
import "./globals.css";
import type { Metadata } from "next";
import RouteTracker from "../components/RouteTracker";
import CookieConsentBanner from "../components/CookieConsentBanner";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!;

export const metadata: Metadata = {
  metadataBase: new URL('https://tirepro.com.co'),
  
  title: {
    default: "TirePro – Software de Gestión de Llantas con IA para Flotas en Colombia | Sistema de Seguimiento de Neumáticos",
    template: "%s | TirePro - Gestión Inteligente de Llantas"
  },
  
  description:
    "TirePro es el software líder en Colombia para gestión inteligente de llantas con IA. " +
    "Sistema de seguimiento predictivo de neumáticos para flotas que reduce costos hasta 25%, " +
    "optimiza mantenimiento y maximiza vida útil. Plataforma completa para control de llantas, " +
    "inspecciones digitales, análisis de costos y alertas predictivas en tiempo real. " +
    "Ideal para flotas de camiones, buses, taxis y empresas de logística en Colombia.",
  
  keywords: [
    // Primary keywords - Spanish
    "software gestión de llantas Colombia",
    "sistema seguimiento neumáticos",
    "gestión llantas flotas",
    "control llantas camiones",
    "software llantas IA",
    "plataforma gestión neumáticos",
    "TirePro Colombia",
    
    // AI-related keywords
    "inteligencia artificial llantas",
    "IA predicción desgaste llantas",
    "análisis predictivo neumáticos",
    "machine learning gestión flotas",
    
    // Industry-specific
    "mantenimiento predictivo llantas",
    "inspección digital neumáticos",
    "control costos llantas flotas",
    "optimización vida útil llantas",
    "gestión flotas Colombia",
    "software flotas vehículos",
    
    // Location-based
    "gestión llantas Bogotá",
    "software flotas Colombia",
    "sistema llantas empresas colombianas",
    
    // Use cases
    "gestión llantas camiones",
    "control neumáticos buses",
    "software llantas taxis",
    "gestión llantas logística",
    "sistema llantas transporte",
    
    // Features
    "inspecciones digitales llantas",
    "análisis costo por kilómetro",
    "alertas desgaste llantas",
    "reporte estado neumáticos",
    "tracking llantas tiempo real",
    
    // Competitors & alternatives
    "alternativa gestión llantas",
    "mejor software llantas Colombia",
    "plataforma seguimiento neumáticos",
    
    // English keywords for international reach
    "tire management software Colombia",
    "fleet tire tracking system",
    "tire monitoring platform",
    "AI tire management",
    "predictive tire maintenance"
  ],
  
  authors: [{ name: "TirePro Colombia" }],
  creator: "TirePro",
  publisher: "TirePro Colombia",
  
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  icons: { 
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  
  openGraph: {
    title: "TirePro – Software #1 de Gestión de Llantas con IA en Colombia",
    description:
      "Reduce costos hasta 25% con TirePro, el sistema de gestión inteligente de llantas líder en Colombia. " +
      "IA predictiva para flotas, inspecciones digitales automatizadas, alertas en tiempo real y análisis completo de costos. " +
      "Más de 1,000 vehículos gestionados. Prueba gratis.",
    url: "https://tirepro.com.co",
    siteName: "TirePro Colombia",
    images: [
      {
        url: "https://tirepro.com.co/og-image.png",
        width: 1200,
        height: 630,
        alt: "TirePro - Software de Gestión Inteligente de Llantas con IA para Flotas en Colombia",
      },
    ],
    locale: "es_CO",
    type: "website",
    countryName: "Colombia"
  },
  
  twitter: {
    card: "summary_large_image",
    title: "TirePro – Gestión Inteligente de Llantas con IA | Colombia",
    description: "Reduce costos hasta 25% con el software #1 de gestión de llantas en Colombia. IA predictiva, inspecciones digitales y alertas en tiempo real.",
    images: ["https://tirepro.com.co/og-image.png"],
    creator: "@TireProCO"
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  verification: {
    google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
  
  alternates: {
    canonical: "https://tirepro.com.co",
    languages: {
      'es-CO': 'https://tirepro.com.co',
      'es': 'https://tirepro.com.co',
    }
  },
  
  category: 'Technology',
  
  other: {
    'application-name': 'TirePro',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'TirePro',
    'mobile-web-app-capable': 'yes',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Structured Data for rich snippets and AI understanding
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // Organization
      {
        "@type": "Organization",
        "@id": "https://tirepro.com.co/#organization",
        "name": "TirePro Colombia",
        "url": "https://tirepro.com.co",
        "logo": {
          "@type": "ImageObject",
          "url": "https://tirepro.com.co/logo.png",
          "width": 600,
          "height": 200
        },
        "description": "TirePro es la plataforma líder en Colombia para la gestión inteligente de llantas con inteligencia artificial. Ayudamos a flotas a reducir costos hasta 25% mediante inspecciones digitales automatizadas, análisis predictivo y alertas en tiempo real.",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Bogotá",
          "addressRegion": "Bogotá D.C.",
          "addressCountry": "CO"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+57-315-134-9122",
          "contactType": "Sales",
          "email": "info@tirepro.com.co",
          "availableLanguage": ["Spanish", "English"],
          "areaServed": "CO"
        },
        "sameAs": [
          "https://www.facebook.com/TireProColombia",
          "https://twitter.com/TireProCO",
          "https://www.linkedin.com/company/tirepro-colombia"
        ],
        "foundingDate": "2024",
        "founders": [
          {
            "@type": "Person",
            "name": "TirePro Team"
          }
        ]
      },
      
      // SoftwareApplication
      {
        "@type": "SoftwareApplication",
        "@id": "https://tirepro.com.co/#software",
        "name": "TirePro - Software de Gestión de Llantas con IA",
        "operatingSystem": "Web, iOS, Android",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Fleet Management Software",
        "offers": [
          {
            "@type": "Offer",
            "name": "Plan Inicio",
            "price": "0",
            "priceCurrency": "COP",
            "description": "Gratis para siempre - Hasta 10 vehículos"
          },
          {
            "@type": "Offer",
            "name": "Plan Crecimiento",
            "price": "300000",
            "priceCurrency": "COP",
            "description": "Para flotas de 10-50 vehículos"
          },
          {
            "@type": "Offer",
            "name": "Plan Empresarial",
            "price": "1000000",
            "priceCurrency": "COP",
            "description": "Para grandes flotas +50 vehículos"
          }
        ],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "127",
          "bestRating": "5",
          "worstRating": "1"
        },
        "featureList": [
          "Inspecciones digitales con IA",
          "Análisis predictivo de desgaste",
          "Alertas en tiempo real",
          "Control de costos por kilómetro",
          "Gestión visual de posiciones",
          "Reportes automáticos",
          "App móvil offline",
          "Dashboard avanzado"
        ],
        "screenshot": "https://tirepro.com.co/screenshots/dashboard.png",
        "provider": {
          "@id": "https://tirepro.com.co/#organization"
        }
      },
      
      // Product
      {
        "@type": "Product",
        "@id": "https://tirepro.com.co/#product",
        "name": "Sistema de Gestión de Llantas TirePro",
        "description": "Software inteligente de gestión de llantas para flotas con IA predictiva. Reduce costos hasta 25%, automatiza inspecciones y maximiza vida útil de neumáticos.",
        "brand": {
          "@id": "https://tirepro.com.co/#organization"
        },
        "category": "Fleet Management Software",
        "audience": {
          "@type": "BusinessAudience",
          "audienceType": [
            "Empresas de transporte",
            "Flotas de camiones",
            "Operadores de buses",
            "Empresas de logística",
            "Distribuidoras de neumáticos"
          ]
        },
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": "0",
          "highPrice": "1000000",
          "priceCurrency": "COP",
          "availability": "https://schema.org/InStock",
          "url": "https://tirepro.com.co/#planes"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "127"
        }
      },
      
      // Service
      {
        "@type": "Service",
        "@id": "https://tirepro.com.co/#service",
        "serviceType": "Fleet Tire Management System",
        "name": "Servicio de Gestión Inteligente de Llantas",
        "description": "Servicio completo de gestión y seguimiento de llantas para flotas vehiculares con tecnología de inteligencia artificial, inspecciones digitales automatizadas y análisis predictivo.",
        "provider": {
          "@id": "https://tirepro.com.co/#organization"
        },
        "areaServed": {
          "@type": "Country",
          "name": "Colombia"
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Planes TirePro",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Plan Inicio - Gestión de Llantas Gratis"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Plan Crecimiento - Gestión Avanzada"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Plan Empresarial - Solución Completa"
              }
            }
          ]
        }
      },
      
      // WebSite
      {
        "@type": "WebSite",
        "@id": "https://tirepro.com.co/#website",
        "url": "https://tirepro.com.co",
        "name": "TirePro Colombia",
        "description": "Software de gestión de llantas con IA para flotas en Colombia",
        "publisher": {
          "@id": "https://tirepro.com.co/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://tirepro.com.co/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        },
        "inLanguage": "es-CO"
      },
      
      // FAQPage
      {
        "@type": "FAQPage",
        "@id": "https://tirepro.com.co/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "¿Qué es TirePro y cómo funciona?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "TirePro es un software de gestión inteligente de llantas con inteligencia artificial para flotas en Colombia. Funciona mediante inspecciones digitales automatizadas con IA, análisis predictivo de desgaste, alertas en tiempo real y control completo de costos. Solo necesitas tomar fotos de las llantas y nuestra IA las analiza automáticamente, generando reportes y predicciones precisas."
            }
          },
          {
            "@type": "Question",
            "name": "¿Cómo reduce TirePro los costos de mi flota?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "TirePro reduce costos hasta 25% mediante: 1) Predicción del momento óptimo de reemplazo para maximizar vida útil, 2) Detección temprana de desgaste irregular que indica problemas mecánicos, 3) Optimización de rotaciones y mantenimientos, 4) Análisis automático de costo por kilómetro, 5) Prevención de fallas críticas mediante alertas predictivas."
            }
          },
          {
            "@type": "Question",
            "name": "¿TirePro funciona para cualquier tipo de flota?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sí, TirePro es ideal para todo tipo de flotas en Colombia: camiones de carga, buses, taxis, vehículos de logística, flotas corporativas y empresas de transporte. También es usado por distribuidoras y reencauchadoras de llantas para gestión multi-cliente."
            }
          },
          {
            "@type": "Question",
            "name": "¿Necesito internet para usar TirePro?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No necesariamente. La app móvil de TirePro funciona completamente offline. Puedes realizar inspecciones sin conexión y los datos se sincronizan automáticamente cuando hay internet disponible."
            }
          },
          {
            "@type": "Question",
            "name": "¿Cuánto cuesta TirePro?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "TirePro ofrece 3 planes: Plan Inicio (Gratis para siempre, hasta 10 vehículos), Plan Crecimiento ($300.000/mes, 10-50 vehículos) y Plan Empresarial ($1.000.000/mes, vehículos ilimitados). Todos los planes incluyen llantas ilimitadas y actualizaciones gratis."
            }
          },
          {
            "@type": "Question",
            "name": "¿Qué tecnología de IA usa TirePro?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "TirePro utiliza machine learning y visión por computadora para analizar automáticamente el estado de las llantas a través de fotografías, predecir el desgaste futuro con 95% de precisión, detectar patrones anormales de desgaste, y generar recomendaciones personalizadas de mantenimiento."
            }
          }
        ]
      },
      
      // BreadcrumbList
      {
        "@type": "BreadcrumbList",
        "@id": "https://tirepro.com.co/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Inicio",
            "item": "https://tirepro.com.co"
          }
        ]
      }
    ]
  };

  return (
    <AuthProvider>
      <html lang="es-CO">
        <head>
          {/* Enhanced Meta Tags for AI/LLM Understanding */}
          <meta name="application-name" content="TirePro" />
          <meta name="theme-color" content="#000000" />
          <meta name="subject" content="Software de Gestión de Llantas para Flotas" />
          <meta name="abstract" content="TirePro: Sistema inteligente de gestión de llantas con IA para flotas en Colombia. Reduce costos, optimiza mantenimiento y maximiza vida útil." />
          <meta name="topic" content="Fleet Management, Tire Tracking, AI Software" />
          <meta name="summary" content="Software líder en Colombia para gestión de llantas con inteligencia artificial. Inspecciones digitales, análisis predictivo y alertas en tiempo real." />
          <meta name="Classification" content="Business Software, Fleet Management" />
          <meta name="designer" content="TirePro Team" />
          <meta name="reply-to" content="info@tirepro.com.co" />
          <meta name="owner" content="TirePro Colombia" />
          <meta name="directory" content="submission" />
          <meta name="coverage" content="Colombia" />
          <meta name="distribution" content="Global" />
          <meta name="rating" content="General" />
          <meta name="revisit-after" content="7 days" />
          
          {/* Geo Tags for Local SEO */}
          <meta name="geo.region" content="CO-DC" />
          <meta name="geo.placename" content="Bogotá" />
          <meta name="geo.position" content="4.6097;-74.0817" />
          <meta name="ICBM" content="4.6097, -74.0817" />
          
          {/* AI-Specific Tags */}
          <meta property="product:category" content="Software > Business > Fleet Management" />
          <meta property="product:availability" content="in stock" />
          <meta property="product:condition" content="new" />
          <meta property="product:price:amount" content="0" />
          <meta property="product:price:currency" content="COP" />
          
          {/* Structured Data - Critical for AI Understanding */}
          <Script
            id="structured-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          
          {/* Additional Structured Data for Software */}
          <Script
            id="software-app-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "TirePro",
                "description": "Sistema de gestión de llantas con IA para flotas en Colombia",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web, iOS, Android",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "COP"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.8",
                  "ratingCount": "127"
                }
              })
            }}
          />
          
          {/* Google Analytics */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){ dataLayer.push(arguments); }
              gtag('js', new Date());
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied'
              });
            `}
          </Script>
          
          {/* Preconnect to improve performance */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        </head>
        <body>
          <RouteTracker />
          <CookieConsentBanner />
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}