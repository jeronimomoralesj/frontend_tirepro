import { NextRequest, NextResponse } from "next/server";

/**
 * Geo-enriched proxy for marketplace view tracking. The browser posts
 * here; we read Vercel's edge geo headers (x-vercel-ip-country,
 * x-vercel-ip-city, x-vercel-ip-country-region — set automatically on
 * any Vercel deployment), enrich the body with country/region/city,
 * and forward to the NestJS API which persists the row.
 *
 * Why a Next.js route in front of the API:
 *   - Vercel's geo headers are only present on requests that terminate
 *     at Vercel's edge. Our NestJS API is on a separate host
 *     (api.tirepro.com.co) and won't see them.
 *   - Putting this in front lets the API stay clean — geo lookup is
 *     a Vercel concern, persistence is a NestJS concern.
 *
 * Best-effort: any failure (geo missing, API down, malformed body)
 * returns 204 without throwing. We never want a tracking call to
 * surface as a console error to the buyer.
 */
export const runtime = "nodejs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

interface ViewBody {
  targetType?: "product" | "distributor";
  targetId?: string;
}

export async function POST(req: NextRequest) {
  let body: ViewBody = {};
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!body?.targetType || !body?.targetId) {
    return new NextResponse(null, { status: 204 });
  }

  // Vercel geo headers — these are populated automatically on every
  // request that terminates at the Vercel edge. Lowercased to match
  // the convention NextRequest uses internally.
  const country = req.headers.get("x-vercel-ip-country") ?? null;
  const region  = req.headers.get("x-vercel-ip-country-region") ?? null;
  // City may be URL-encoded (e.g. "Bogot%C3%A1") — decode for storage.
  const cityRaw = req.headers.get("x-vercel-ip-city");
  let city: string | null = null;
  if (cityRaw) {
    try { city = decodeURIComponent(cityRaw); } catch { city = cityRaw; }
  }

  // Forward the buyer's real IP so the backend's IP capture stays
  // useful (otherwise it'd see Vercel's edge IP).
  const fwd = req.headers.get("x-forwarded-for")
    ?? req.headers.get("x-real-ip")
    ?? "";
  // Forward the original UA too so the analytics stay accurate.
  const ua = req.headers.get("user-agent") ?? "";

  // Forward to NestJS — fire and forget, but await so any error gets
  // swallowed here instead of becoming an unhandled rejection.
  try {
    await fetch(`${API_BASE}/marketplace/track/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(fwd ? { "x-forwarded-for": fwd } : {}),
        ...(ua  ? { "user-agent": ua } : {}),
      },
      body: JSON.stringify({
        targetType: body.targetType,
        targetId:   body.targetId,
        country, region, city,
      }),
      // Short timeout — analytics shouldn't block.
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // swallow — best-effort
  }

  return new NextResponse(null, { status: 204 });
}
