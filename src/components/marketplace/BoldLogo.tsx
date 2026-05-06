// Inline Bold wordmark — placeholder approximation of Bold's actual brand
// asset. Used in the cart's "Pagar con Bold" CTA + payment badges.
// `fill="currentColor"` on the text means it picks up the parent's text
// color (white on a dark button, dark on a light button) without us having
// to ship two separate files. The pink dot stays as a fixed brand accent.
//
// Swap this component for Bold's official brand asset when we get one
// from prensa@bold.co — keep the same prop API.

import React from "react";

interface Props {
  /** Rendered height in px. Width auto-scales from the viewBox. */
  height?: number;
  /** Override the wordmark color. Defaults to `currentColor` so the
   *  logo inherits the button / link's text color. */
  color?: string;
  /** Override the accent dot color. Defaults to Bold's pink. */
  accent?: string;
  className?: string;
  ariaLabel?: string;
}

export function BoldLogo({
  height = 18,
  color = "currentColor",
  accent = "#FF3D6E",
  className,
  ariaLabel = "Bold",
}: Props) {
  // viewBox 0 0 88 28 keeps the wordmark + accent dot proportions tight.
  // Tweaking font-size > 22 makes the dot collide with the wordmark; <
  // 22 leaves it looking thin on dark backgrounds.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 88 28"
      role="img"
      aria-label={ariaLabel}
      style={{ height, width: "auto", display: "inline-block", verticalAlign: "middle" }}
      className={className}
    >
      <text
        x="2"
        y="22"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Manrope', system-ui, sans-serif"
        fontWeight={900}
        fontSize={22}
        letterSpacing={-1.2}
        fill={color}
      >
        bold
      </text>
      <circle cx={73} cy={19.5} r={3.2} fill={accent} />
    </svg>
  );
}
