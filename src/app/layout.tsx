// (no "use client" here – this is a Server Component)

import React from "react";
import Script from "next/script";
import { AuthProvider } from "./context/AuthProvider";
import "./globals.css";
import type { Metadata } from "next";
import RouteTracker from "../components/RouteTracker";
import CookieConsentBanner from "../components/CookieConsentBanner";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!;

export const metadata: Metadata = {
  title: "TirePro – Gestión Inteligente de Neumáticos para Flotas",
  description:
    "TirePro es la plataforma integral para la gestión y análisis predictivo " +
    "de neumáticos de tu flota. Reduce costes de mantenimiento, maximiza la vida útil " +
    "de tus llantas y recibe alertas en tiempo real para evitar paradas imprevistas.",
  keywords: [
    "gestión de llantas",
    "mantenimiento predictivo",
    "flota de vehículos",
    "neumáticos",
    "análisis de datos",
    "TirePro",
  ],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "TirePro – Gestión Inteligente de Neumáticos para Flotas",
    description:
      "Reduce costes, optimiza mantenimientos y evita paradas imprevistas con TirePro: " +
      "tu aliado para la gestión predictiva de neumáticos.",
    url: "https://tirepro.com.co",
    siteName: "TirePro",
    images: [
      {
        url: "https://tirepro.com.co/og-image.png",
        width: 1200,
        height: 630,
        alt: "TirePro: gestión de neumáticos",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <html lang="es">
        <head>
          {/* 1) Load GA */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          {/* 2) Init GA with default-deny */}
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){ dataLayer.push(arguments); }
              gtag('js', new Date());
              // start with no storage until consent
              gtag('consent', 'default', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied'
              });
            `}
          </Script>
        </head>
        <body>
          {/* 3) SPA route tracking */}
          <RouteTracker />
          {/* 4) Cookie consent banner */}
          <CookieConsentBanner />
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}
