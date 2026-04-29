// Dynamic Open Graph image for /marketplace.
//
// WhatsApp / Facebook / Twitter / LinkedIn fetch this URL as the
// preview thumbnail when someone shares https://www.tirepro.com.co/marketplace.
// Next.js auto-injects <meta property="og:image"> + <meta name="twitter:image">
// pointing here, overriding any URL in metadata.openGraph.images.
//
// The logo is positioned in the centered 630x630 square so WhatsApp's
// thumbnail crop (which uses the center) still shows the full mark.

import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TirePro — Marketplace de llantas en Colombia";

export default async function MarketplaceOGImage() {
  const logoBuffer = await readFile(join(process.cwd(), "public", "logo_full.png"));
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FFFFFF 0%, #F0F7FF 55%, #DCEBFC 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoBase64} width={620} height={244} alt="TirePro" />
        <div
          style={{
            marginTop: 36,
            fontSize: 30,
            fontWeight: 700,
            color: "#0A183A",
            letterSpacing: "-0.01em",
          }}
        >
          Marketplace de llantas en Colombia
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 20,
            color: "#1E76B6",
            fontWeight: 500,
          }}
        >
          Distribuidores verificados · Envío nacional
        </div>
      </div>
    ),
    size,
  );
}
