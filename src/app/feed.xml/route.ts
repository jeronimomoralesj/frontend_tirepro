/**
 * Google Merchant Center product feed (also consumed by Bing Merchant Center
 * and other shopping engines that accept the standard RSS 2.0 + g: namespace).
 *
 * Submit this URL in:
 *   - Google Merchant Center → Products → Feeds → "Scheduled fetches" →
 *     https://www.tirepro.com.co/feed.xml (refresh: daily)
 *   - Bing Merchant Center → Catalog feed → same URL
 *
 * Once Merchant Center accepts the feed, opt into "Free product listings"
 * (Surfaces across Google) so listings show in Google Search, Shopping tab,
 * Images and Lens for free, no ad spend required. Paid Shopping ads are
 * optional on top.
 *
 * Spec: https://support.google.com/merchants/answer/7052112
 */
import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const SITE = "https://www.tirepro.com.co";

// Secret token gating the feed. Set FEED_TOKEN in the environment (Vercel
// → Settings → Environment Variables → FEED_TOKEN). Then configure Google
// Merchant Center → Feed → URL with `?token=<value>` appended. If the env
// var is empty the route stays open (so dev environments don't break) —
// always set it in production.
const FEED_TOKEN = process.env.FEED_TOKEN ?? "";

// Allow well-known shopping bots through even if the token is missing —
// useful when sharing the URL with Google Search Console / Bing Webmaster
// Tools that may not preserve query params on follow-up fetches.
const ALLOWED_BOT_UA = /googlebot|google-merchant|bingbot|yandexbot|adsbot/i;

function escapeXml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Constant-time string comparison so a token leak through timing analysis
// is not possible (overkill for this use case but free to add).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function asPriceCop(n: unknown): string {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `${num.toFixed(2)} COP`;
}

// Google Merchant taxonomy. Use the full text path instead of the numeric ID
// (916) — Google's auto-classifier sometimes overrides the numeric ID and
// lumps tire feeds under the top-level "Vehicles" content policy, which
// requires special licensing in Colombia and disapproves the whole feed.
// Sending the full path avoids the misclassification.
const GOOGLE_PRODUCT_CATEGORY =
  "Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Parts > Motor Vehicle Tires";

export async function GET(req: NextRequest) {
  // -- Access control -------------------------------------------------------
  // The feed is gated unless the caller either supplies the secret token in
  // the query string or identifies as a known shopping bot. Anything else
  // gets a generic 404 — we don't acknowledge that the route exists.
  if (FEED_TOKEN) {
    const supplied = req.nextUrl.searchParams.get("token") ?? "";
    const userAgent = req.headers.get("user-agent") ?? "";
    const isBot = ALLOWED_BOT_UA.test(userAgent);
    const tokenOk = supplied.length > 0 && timingSafeEqual(supplied, FEED_TOKEN);
    if (!tokenOk && !isBot) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

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
    // Treat missing / zero stock as "available" — most distributors leave
    // cantidadDisponible blank but the listing is still meant to be sold.
    // Only listings explicitly marked as out of stock (negative) are
    // skipped, so we still avoid emitting `preorder` (which would require
    // `availability_date` and disapprove the feed).
    .filter((l) => l && l.id && l.precioCop && l.precioCop > 0 && (l.cantidadDisponible == null || l.cantidadDisponible >= 0))
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

      // After the filter above, every item is in stock — emit a constant
      // value so we never need an availability_date.
      const availability = "in_stock";
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
      <g:google_product_category>${escapeXml(GOOGLE_PRODUCT_CATEGORY)}</g:google_product_category>
      <g:product_type>Tires &gt; ${escapeXml(l.tipo === "reencauche" ? "Retread" : "New")} &gt; ${escapeXml(l.dimension ?? "Sin dimensión")}</g:product_type>
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
