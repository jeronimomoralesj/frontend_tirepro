// Legacy route — kept alive for any old bookmark or external link
// that points at /dashboard/catalogoDist. The modern unified SKU
// catalog UX lives at /dashboard/catalogoSku and is what dist admins
// now see from the "Catálogo" tab inside /dashboard/pedidosDist
// (matching the marketplace_tracker sidebar entry). Re-exporting
// keeps both URLs visually identical so we never get drift.
export { default } from "../catalogoSku/page";
