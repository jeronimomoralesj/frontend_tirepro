// Payment-method trust strip — drop in below CTAs / pricing / footers
// to signal what we accept. Uses real brand SVGs from /public/payment/
// so the browser caches them and they render exactly the same on every
// page. The SVGs are kept aspect-ratio'd to a 64×40 box (8:5) so the
// row of badges is visually consistent regardless of which logos are
// included.

import React from "react";

type Variant = "compact" | "wide";

type PaymentMethod = "visa" | "mastercard" | "amex" | "pse" | "nequi";

const ALL_METHODS: PaymentMethod[] = ["visa", "mastercard", "amex", "pse", "nequi"];

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
            src="/payment/bold.svg"
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
              src="/payment/bold.svg"
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
            src={`/payment/${m}.svg`}
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
