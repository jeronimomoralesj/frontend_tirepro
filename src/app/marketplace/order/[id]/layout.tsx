import type { Metadata } from "next";

// Per-buyer transactional page (gated by email at the API layer).
// Indexing serves no purpose and would attempt to crawl thousands of
// per-order pages with no SEO value. follow stays so internal links
// from the order tracker still pass authority.
export const metadata: Metadata = {
  title: "Pedido · TirePro Marketplace",
  robots: { index: false, follow: true },
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
