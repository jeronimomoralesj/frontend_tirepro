import type { Metadata } from "next";

// Transactional surface — there is nothing here for a search engine to
// rank. noindex saves crawl budget for the pages that actually convert
// (product, brand, dimension, city). `follow` stays so the cart's
// internal links (back to listings, distributor) still pass equity.
export const metadata: Metadata = {
  title: "Carrito · TirePro Marketplace",
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
