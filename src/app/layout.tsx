import React from "react";
import Script from "next/script";
import { AuthProvider } from "./context/AuthProvider";
import "./globals.css";
import type { Metadata } from "next";
import RouteTracker from "../components/RouteTracker";

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
  icons: {
    icon: "/favicon.ico",
  },
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
        {/* 1) Load GA library */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        {/* 2) Initialize GA (disable automatic page_view) */}
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){ dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
          `}
        </Script>
        <body>
          {/* 3) Fire a page_view on every client-side route change */}
          <RouteTracker />
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}
