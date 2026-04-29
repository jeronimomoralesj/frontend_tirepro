/**
 * Image sitemap — gives Google an explicit per-image title and caption so
 * each tire photo is associated with its own product, not the page title
 * of whichever URL Googlebot first encountered it on. Without this, image
 * search shows every product photo with the homepage title attached.
 *
 * Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 *
 * Submit at https://www.tirepro.com.co/sitemap-images.xml in Search Console
 * → Sitemaps. Discoverable via robots.txt.
 */
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const SITE = "https://www.tirepro.com.co";

function escapeXml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface ImgEntry {
  pageUrl: string;
  imageUrl: string;
  title: string;
  caption: string;
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 7200 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const entries: ImgEntry[] = [];

  // ─── Products ──────────────────────────────────────────────────────────────
  const listingsData = await fetchJSON<any>(
    `${API_BASE}/marketplace/listings?limit=2000&sortBy=newest`,
  );
  const listings: any[] = Array.isArray(listingsData)
    ? listingsData
    : (listingsData?.listings ?? []);

  for (const l of listings) {
    if (!l?.id) continue;
    const imgs: string[] = Array.isArray(l.imageUrls)
      ? l.imageUrls.filter(Boolean)
      : [];
    if (imgs.length === 0) continue;

    const cover = imgs[l.coverIndex ?? 0] ?? imgs[0];
    const ordered = cover ? [cover, ...imgs.filter((u) => u !== cover)] : imgs;

    const baseTitle = `Llanta ${l.marca ?? ""} ${l.modelo ?? ""} ${l.dimension ?? ""}`.trim();
    const condition = l.tipo === "reencauche" ? "reencauche" : "nueva";
    const captionParts = [
      `Comprar ${baseTitle} ${condition}`,
      l.distributor?.name && `de ${l.distributor.name}`,
      "en Colombia",
      l.distributor?.ciudad && `con envío desde ${l.distributor.ciudad}`,
    ].filter(Boolean);

    const pageUrl = `${SITE}/marketplace/product/${l.id}`;

    ordered.slice(0, 5).forEach((img, idx) => {
      entries.push({
        pageUrl,
        imageUrl: img,
        title: idx === 0 ? baseTitle : `${baseTitle} — vista ${idx + 1}`,
        caption: captionParts.join(" "),
      });
    });
  }

  // ─── Brand pages ───────────────────────────────────────────────────────────
  const brands = await fetchJSON<any[]>(`${API_BASE}/marketplace/brands`);
  if (Array.isArray(brands)) {
    for (const b of brands) {
      if (!b?.slug || b.published === false) continue;
      const pageUrl = `${SITE}/marketplace/brand/${b.slug}`;
      if (b.heroImageUrl) {
        entries.push({
          pageUrl,
          imageUrl: b.heroImageUrl,
          title: `Llantas ${b.name} en Colombia`,
          caption: `Catálogo de llantas ${b.name} en TirePro Marketplace — distribuidores verificados en Colombia.`,
        });
      }
      if (b.logoUrl) {
        entries.push({
          pageUrl,
          imageUrl: b.logoUrl,
          title: `Logo ${b.name}`,
          caption: `${b.name} — marca${b.country ? ` de ${b.country}` : ""} disponible en TirePro Marketplace Colombia.`,
        });
      }
    }
  }

  // ─── Blog covers ───────────────────────────────────────────────────────────
  const posts = await fetchJSON<any[]>(`${API_BASE}/blog`);
  if (Array.isArray(posts)) {
    for (const p of posts) {
      if (!p?.slug || !p.coverImage || p.published === false) continue;
      entries.push({
        pageUrl: `${SITE}/blog/${p.slug}`,
        imageUrl: p.coverImage,
        title: p.title,
        caption: p.subtitle || p.title,
      });
    }
  }

  // ─── Distributor banners + profile images ──────────────────────────────────
  const seenDist = new Set<string>();
  for (const l of listings) {
    const d = l?.distributor;
    if (!d?.id || seenDist.has(d.id)) continue;
    seenDist.add(d.id);
    const distHandle = d.slug ?? d.id;
    const pageUrl = `${SITE}/marketplace/distributor/${distHandle}`;
    if (d.bannerImage) {
      entries.push({
        pageUrl,
        imageUrl: d.bannerImage,
        title: `${d.name} — Distribuidor de llantas en Colombia`,
        caption: `Catálogo de llantas de ${d.name}${d.ciudad ? ` en ${d.ciudad}` : ""} en TirePro Marketplace.`,
      });
    }
    if (d.profileImage) {
      entries.push({
        pageUrl,
        imageUrl: d.profileImage,
        title: `Logo ${d.name}`,
        caption: `${d.name}${d.ciudad ? ` — ${d.ciudad}, Colombia` : ""} — distribuidor verificado de llantas en TirePro.`,
      });
    }
  }

  // Group by page URL — Image Sitemap protocol allows up to 1000 images per
  // <url> entry, and grouping is required for Google to attach each image
  // to its canonical landing page.
  const byPage = new Map<string, ImgEntry[]>();
  for (const e of entries) {
    if (!byPage.has(e.pageUrl)) byPage.set(e.pageUrl, []);
    byPage.get(e.pageUrl)!.push(e);
  }

  const urlBlocks: string[] = [];
  for (const [pageUrl, imgs] of byPage) {
    const imageBlocks = imgs.slice(0, 1000).map((e) => `
    <image:image>
      <image:loc>${escapeXml(e.imageUrl)}</image:loc>
      <image:title>${escapeXml(e.title)}</image:title>
      <image:caption>${escapeXml(e.caption)}</image:caption>
    </image:image>`).join("");
    urlBlocks.push(`  <url>
    <loc>${escapeXml(pageUrl)}</loc>${imageBlocks}
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlBlocks.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
