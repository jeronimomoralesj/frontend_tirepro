// Bold wordmark — renders Bold's official PNG asset from /public/payment/.
// Used in the cart's "Pagar con Bold" CTA. Bold's real logo is gradient-
// colored (navy → purple → maroon → red), so we no longer try to recolor
// it via currentColor — it's a fixed-color image. Sizing prop mirrors the
// previous inline-SVG version so callers don't have to change.

import React from "react";

interface Props {
  /** Rendered height in px. Width auto-scales to preserve aspect ratio. */
  height?: number;
  className?: string;
  ariaLabel?: string;
  /** @deprecated kept so existing call sites compile, no longer applied. */
  color?: string;
  /** @deprecated kept so existing call sites compile, no longer applied. */
  accent?: string;
}

export function BoldLogo({
  height = 18,
  className,
  ariaLabel = "Bold",
}: Props) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/payment/bold.png"
      alt={ariaLabel}
      height={height}
      style={{ height, width: "auto", display: "inline-block", verticalAlign: "middle" }}
      className={className}
    />
  );
}
