// Payment-method trust strip — drop in below CTAs / pricing / footers
// to signal what we accept. Loads the real brand assets from
// /public/payment/ so the browser caches them. Each method maps to
// its own file (different brands ship in different formats: Bold +
// Nequi as PNG, PSE as WebP, the card networks as SVG), so we map
// method → filename instead of assuming a single extension.

import React from "react";

type Variant = "compact" | "wide";

type PaymentMethod = "visa" | "mastercard" | "amex" | "pse" | "nequi";

const ALL_METHODS: PaymentMethod[] = ["visa", "mastercard", "amex", "pse", "nequi"];

// Per-method asset path. Bold's logo + the new PSE / Nequi pulls live
// alongside the card-network SVGs we already had. Update this map
// when a brand ships a new asset rather than renaming files in
// /public/payment/ — older browsers may still have cached versions
// and SEO crawlers index the old paths.
const METHOD_FILES: Record<PaymentMethod, string> = {
  visa:       "/payment/visa.svg",
  mastercard: "/payment/mastercard.svg",
  amex:       "/payment/amex-real.svg",
  pse:        "/payment/pse-real.webp",
  nequi:      "/payment/nequi-real.png",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  visa:        "Visa",
  mastercard:  "Mastercard",
  amex:        "American Express",
  pse:         "PSE",
  nequi:       "Nequi",
};

interface Props {
  /** "compact" = single line, smaller logos. "wide" = bigger logos with the "Pago seguro vía Bold" caption above. */
  variant?: Variant;
  /** Override the caption when variant="wide". */
  caption?: string;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Limit which methods to show. Defaults to all. */
  methods?: PaymentMethod[];
}

export function PaymentBadges({
  variant = "compact",
  caption = "Pago seguro vía",
  className = "",
  methods = ALL_METHODS,
}: Props) {
  const badgeHeight = variant === "wide" ? 28 : 22;
  const boldHeight  = variant === "wide" ? 22 : 18;

  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      {variant === "wide" && (
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <span>{caption}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/payment/bold.png"
            alt="Bold"
            height={boldHeight}
            style={{ height: boldHeight, width: "auto" }}
          />
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {variant === "compact" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/payment/bold.png"
              alt="Bold"
              height={boldHeight}
              style={{ height: boldHeight, width: "auto", marginRight: 4 }}
            />
          </>
        )}
        {methods.map((m) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={m}
            src={METHOD_FILES[m]}
            alt={METHOD_LABELS[m]}
            title={METHOD_LABELS[m]}
            height={badgeHeight}
            style={{
              height: badgeHeight,
              width: "auto",
              borderRadius: 4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
