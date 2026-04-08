/**
 * Google Merchant Center product feed (also consumed by Bing Merchant Center
 * and other shopping engines that accept the standard RSS 2.0 + g: namespace).
 *
 * Submit this URL in:
 *   - Google Merchant Center → Products → Feeds → "Scheduled fetches" →
 *     https://tirepro.com.co/feed.xml (refresh: daily)
 *   - Bing Merchant Center → Catalog feed → same URL
 *
 * Once Merchant Center accepts the feed, opt into "Free product listings"
 * (Surfaces across Google) so listings show in Google Search, Shopping tab,
 * Images and Lens for free, no ad spend required. Paid Shopping ads are
 * optional on top.
 *
 * Spec: https://support.google.com/merchants/answer/7052112
 */
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const SITE = "https://tirepro.com.co";

function escapeXml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function asPriceCop(n: unknown): string {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `${num.toFixed(2)} COP`;
}

// Google Merchant taxonomy: 916 = Vehicles & Parts > Vehicle Parts &
// Accessories > Motor Vehicle Parts > Motor Vehicle Tires.
const GOOGLE_PRODUCT_CATEGORY = "916";

export async function GET() {
  let listings: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/marketplace/listings?limit=2000&sortBy=newest`, {
      next: { revalidate: 3600 }, // refresh hourly so MC fetches see fresh prices
    });
    if (res.ok) {
      const data = await res.json();
      listings = Array.isArray(data) ? data : (data.listings ?? []);
    }
  } catch {
    /* fall through to empty feed */
  }

  const items = listings
    .filter((l) => l && l.id && l.precioCop && l.precioCop > 0)
    .map((l) => {
      const imgs = Array.isArray(l.imageUrls) ? l.imageUrls : [];
      const cover = imgs[l.coverIndex ?? 0] ?? imgs[0] ?? `${SITE}/og-image.png`;
      const additionalImages = imgs.filter((u: string) => u && u !== cover).slice(0, 10);

      const hasPromo =
        l.precioPromo != null &&
        l.promoHasta &&
        new Date(l.promoHasta).getTime() > Date.now();
      const salePrice = hasPromo ? Number(l.precioPromo) : null;

      const title = `${l.marca ?? ""} ${l.modelo ?? ""} ${l.dimension ?? ""}`.trim();
      const fullDescription = [
        `${l.marca} ${l.modelo} ${l.dimension}`,
        l.tipo === "reencauche" ? "Llanta reencauchada" : "Llanta nueva",
        l.distributor?.name ? `Distribuidor: ${l.distributor.name}` : "",
        l.distributor?.ciudad ? `Ciudad: ${l.distributor.ciudad}` : "",
        l.descripcion ?? "",
        l.catalog?.terreno ? `Terreno: ${l.catalog.terreno}.` : "",
        l.catalog?.kmEstimadosReales ? `Km estimados: ${l.catalog.kmEstimadosReales}.` : "",
        l.catalog?.psiRecomendado ? `PSI recomendado: ${l.catalog.psiRecomendado}.` : "",
        "Disponible en TirePro Marketplace con envío en Colombia.",
      ]
        .filter(Boolean)
        .join(" ")
        .substring(0, 5000);

      const availability = l.cantidadDisponible > 0 ? "in_stock" : "preorder";
      const condition = l.tipo === "reencauche" ? "refurbished" : "new";

      return `
    <item>
      <g:id>${escapeXml(l.id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(fullDescription)}</g:description>
      <g:link>${SITE}/marketplace/product/${escapeXml(l.id)}</g:link>
      <g:image_link>${escapeXml(cover)}</g:image_link>
${additionalImages.map((u: string) => `      <g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`).join("\n")}
      <g:availability>${availability}</g:availability>
      <g:price>${asPriceCop(l.precioCop)}</g:price>
${salePrice ? `      <g:sale_price>${asPriceCop(salePrice)}</g:sale_price>` : ""}
${salePrice && l.promoHasta ? `      <g:sale_price_effective_date>${new Date().toISOString()}/${new Date(l.promoHasta).toISOString()}</g:sale_price_effective_date>` : ""}
      <g:brand>${escapeXml(l.marca ?? "Sin marca")}</g:brand>
      <g:condition>${condition}</g:condition>
      <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
      <g:product_type>Llantas &gt; ${escapeXml(l.tipo === "reencauche" ? "Reencauche" : "Nuevas")} &gt; ${escapeXml(l.dimension ?? "Sin dimensión")}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
      <g:mpn>${escapeXml(l.id)}</g:mpn>
      <g:item_group_id>${escapeXml(l.modelo ?? l.marca ?? l.id)}</g:item_group_id>
      <g:size>${escapeXml(l.dimension ?? "")}</g:size>
      <g:custom_label_0>${escapeXml(l.tipo === "reencauche" ? "reencauche" : "nueva")}</g:custom_label_0>
      <g:custom_label_1>${escapeXml(l.dimension ?? "")}</g:custom_label_1>
      <g:custom_label_2>${escapeXml(l.distributor?.ciudad ?? "")}</g:custom_label_2>
      <g:custom_label_3>${escapeXml(l.distributor?.name ?? "")}</g:custom_label_3>
      <g:shipping>
        <g:country>CO</g:country>
        <g:service>Estándar</g:service>
        <g:price>0 COP</g:price>
      </g:shipping>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>TirePro Marketplace — Llantas en Colombia</title>
    <link>${SITE}/marketplace</link>
    <description>Catálogo de llantas nuevas y reencauche de distribuidores verificados en Colombia. Tractomulas, camiones, buses, camionetas y autos.</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
