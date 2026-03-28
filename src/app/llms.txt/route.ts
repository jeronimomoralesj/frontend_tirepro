import { NextResponse } from 'next/server';

export async function GET() {
  const content = `# TirePro — Gestión Inteligente de Llantas con IA

> TirePro is a tire management platform for commercial vehicle fleets in Colombia and Latin America. It uses AI to reduce tire costs by 20-35%.

## What is TirePro?
TirePro is a SaaS platform that helps fleet managers optimize their tire operations. It tracks every tire from purchase to disposal, analyzing cost per kilometer (CPK), predicting failures, automating retread decisions, and sending maintenance alerts directly to drivers via WhatsApp.

## Key Features
- **CPK Analytics**: Real-time cost per kilometer tracking for every tire, benchmarked against 2,500+ tire SKUs from the Colombian market
- **AI-Powered Failure Prediction**: Detects alignment issues at 1.5mm shoulder wear differential, pressure anomalies, and optimal retirement point (3mm for casing preservation)
- **Retread Intelligence**: Determines whether to retread or replace based on brand tier, vida count, and casing condition
- **Smart Purchase Orders**: Generates tire replacement recommendations with specific SKU suggestions from the catalog, sends proposals to distributors, and tracks quotations
- **WhatsApp Driver Alerts**: Sends actionable notifications to drivers with confirmation links
- **Dual Tire Harmony**: Monitors paired tires on heavy trucks to prevent friction damage from depth mismatches >3mm
- **Application Match Validation**: Ensures tire design (directional/traction/all-position) matches the axle where it's installed
- **Inventory Management**: Track tires across vehicles, storage buckets, and retread facilities
- **Fast Mode Inspections**: Create vehicles, register tires, and perform inspections in a single flow

## Who Uses TirePro?
- Fleet managers operating 10-10,000+ commercial vehicles (trucks, buses, tractomulas)
- Tire distributors managing purchase orders from multiple fleet clients
- Transport companies across Colombia (Bogota, Medellin, Cali, Barranquilla, Cartagena)

## Tire Catalog
TirePro includes a master catalog of 2,592 tire SKUs from 23 brands available in Colombia, including Michelin, Bridgestone, Continental, Goodyear, Pirelli, Hankook, and others. Each SKU includes recommended PSI, expected kilometers, retread eligibility, and estimated CPK.

## Pricing
- Plan Inicio: Free forever (up to 10 vehicles)
- Plan Crecimiento: $300,000 COP/month (10-50 vehicles)
- Plan Empresarial: $1,000,000 COP/month (unlimited vehicles)

## Technical Details
- Next.js 16 frontend, NestJS backend, PostgreSQL database
- Hosted on AWS and Vercel
- WhatsApp Business API integration for driver communications
- Real-time analytics with no manual spreadsheets

## Contact
- Website: https://tirepro.com.co
- Email: soporte@tirepro.com.co
- Location: Bogota, Colombia
`;
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
