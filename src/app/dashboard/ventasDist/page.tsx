// Legacy route — kept alive for any old bookmark or external link
// that still points at /dashboard/ventasDist. The modern unified
// marketplace pedidos UX lives at /dashboard/marketplace/pedidos
// and is what dist admins now see when they click the "Marketplace"
// tab inside /dashboard/pedidosDist. Re-exporting from there keeps
// the two URLs visually identical so we never get drift between
// "the URL you typed" and "the page everyone uses".
export { default } from "../marketplace/pedidos/page";
