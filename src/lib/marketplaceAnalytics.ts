/**
 * Marketplace-specific Google Analytics 4 event tracking.
 *
 * Uses GA4 recommended e-commerce events where possible so data
 * shows up in GA4's built-in Monetization reports automatically.
 *
 * All calls are fire-and-forget and safe to call server-side (no-op).
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function gtag(...args: any[]) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

// ─── Page / Screen views ────────────────────────────────────────────────────

/** Marketplace home page viewed */
export function trackMarketplaceHome() {
  gtag("event", "view_item_list", {
    item_list_id: "marketplace_home",
    item_list_name: "Marketplace Home",
  });
}

/** Product detail page viewed */
export function trackProductView(product: {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  precioCop: number;
  tipo: string;
  distributorName: string;
}) {
  gtag("event", "view_item", {
    currency: "COP",
    value: product.precioCop,
    items: [
      {
        item_id: product.id,
        item_name: `${product.marca} ${product.modelo}`,
        item_brand: product.marca,
        item_category: product.tipo,
        item_variant: product.dimension,
        price: product.precioCop,
        affiliation: product.distributorName,
      },
    ],
  });
}

/** Distributor storefront viewed */
export function trackDistributorView(distributor: {
  id: string;
  name: string;
}) {
  gtag("event", "view_promotion", {
    promotion_id: distributor.id,
    promotion_name: distributor.name,
    creative_name: "distributor_storefront",
  });
}

// ─── Search & Discovery ─────────────────────────────────────────────────────

/** User searched for a term */
export function trackSearch(query: string, resultsCount: number) {
  gtag("event", "search", {
    search_term: query,
    mp_results_count: resultsCount,
  });
}

/** User used a filter */
export function trackFilter(filterType: string, filterValue: string) {
  gtag("event", "mp_filter_applied", {
    filter_type: filterType,
    filter_value: filterValue,
  });
}

/** User searched by license plate */
export function trackPlateSearch(placa: string, found: boolean) {
  gtag("event", "mp_plate_search", {
    plate: placa,
    found: found ? "yes" : "no",
  });
}

/** User selected a vehicle type manually (plate fallback) */
export function trackPlateVehicleSelect(placa: string, vehicleType: string) {
  gtag("event", "mp_plate_vehicle_select", {
    plate: placa,
    vehicle_type: vehicleType,
  });
}

/** User clicked a quick category link */
export function trackCategoryClick(category: string) {
  gtag("event", "mp_category_click", {
    category_name: category,
  });
}

// ─── Cart ───────────────────────────────────────────────────────────────────

/** Item added to cart */
export function trackAddToCart(item: {
  id: string;
  marca: string;
  modelo: string;
  dimension: string;
  precioCop: number;
  tipo: string;
  distributorName: string;
  quantity: number;
}) {
  gtag("event", "add_to_cart", {
    currency: "COP",
    value: item.precioCop * item.quantity,
    items: [
      {
        item_id: item.id,
        item_name: `${item.marca} ${item.modelo}`,
        item_brand: item.marca,
        item_category: item.tipo,
        item_variant: item.dimension,
        price: item.precioCop,
        quantity: item.quantity,
        affiliation: item.distributorName,
      },
    ],
  });
}

/** Item removed from cart */
export function trackRemoveFromCart(item: {
  id: string;
  marca: string;
  modelo: string;
  precioCop: number;
}) {
  gtag("event", "remove_from_cart", {
    currency: "COP",
    value: item.precioCop,
    items: [
      {
        item_id: item.id,
        item_name: `${item.marca} ${item.modelo}`,
        price: item.precioCop,
      },
    ],
  });
}

/** Cart page viewed */
export function trackViewCart(totalCop: number, itemCount: number) {
  gtag("event", "view_cart", {
    currency: "COP",
    value: totalCop,
    mp_item_count: itemCount,
  });
}

// ─── Checkout & Purchase ────────────────────────────────────────────────────

/** Checkout form started */
export function trackBeginCheckout(totalCop: number, items: { id: string; marca: string; modelo: string; precioCop: number; quantity: number }[]) {
  gtag("event", "begin_checkout", {
    currency: "COP",
    value: totalCop,
    items: items.map((i) => ({
      item_id: i.id,
      item_name: `${i.marca} ${i.modelo}`,
      price: i.precioCop,
      quantity: i.quantity,
    })),
  });
}

/** Order placed successfully */
export function trackPurchase(order: {
  orderId: string;
  totalCop: number;
  items: { id: string; marca: string; modelo: string; precioCop: number; quantity: number; distributorName: string }[];
}) {
  gtag("event", "purchase", {
    transaction_id: order.orderId,
    currency: "COP",
    value: order.totalCop,
    items: order.items.map((i) => ({
      item_id: i.id,
      item_name: `${i.marca} ${i.modelo}`,
      price: i.precioCop,
      quantity: i.quantity,
      affiliation: i.distributorName,
    })),
  });
}

// ─── Reviews ────────────────────────────────────────────────────────────────

/** User submitted a review */
export function trackReviewSubmit(listingId: string, rating: number) {
  gtag("event", "mp_review_submit", {
    listing_id: listingId,
    rating: String(rating),
  });
}

// ─── Engagement ─────────────────────────────────────────────────────────────

/** User clicked on a product card from a list */
export function trackSelectItem(item: {
  id: string;
  marca: string;
  modelo: string;
  precioCop: number;
  listName: string;
}) {
  gtag("event", "select_item", {
    item_list_name: item.listName,
    items: [
      {
        item_id: item.id,
        item_name: `${item.marca} ${item.modelo}`,
        price: item.precioCop,
      },
    ],
  });
}

/** User shared a product */
export function trackShare(method: string, itemId: string) {
  gtag("event", "share", {
    method,
    content_type: "product",
    item_id: itemId,
  });
}

/** Track time spent on product page (call on unmount) */
export function trackProductDwell(productId: string, durationSeconds: number) {
  if (durationSeconds < 2) return; // skip accidental visits
  gtag("event", "mp_product_dwell", {
    product_id: productId,
    duration_seconds: String(Math.round(durationSeconds)),
    duration_bucket:
      durationSeconds < 10 ? "0-10s" :
      durationSeconds < 30 ? "10-30s" :
      durationSeconds < 60 ? "30-60s" :
      durationSeconds < 180 ? "1-3min" : "3min+",
  });
}

/** Track marketplace session engagement */
export function trackMarketplaceSession() {
  gtag("event", "mp_session_start", {
    timestamp: new Date().toISOString(),
  });
}

// ─── Signup / Plan ──────────────────────────────────────────────────────────

/** User signed up from marketplace context */
export function trackSignup(method: string) {
  gtag("event", "sign_up", { method });
}

/** User changed plan */
export function trackPlanChange(fromPlan: string, toPlan: string) {
  gtag("event", "mp_plan_change", {
    from_plan: fromPlan,
    to_plan: toPlan,
  });
}
