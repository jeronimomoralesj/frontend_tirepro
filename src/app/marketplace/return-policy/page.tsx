import Link from "next/link";
import type { Metadata } from "next";
import { MarketplaceNav, MarketplaceFooter } from "../../../components/MarketplaceShell";
import { ArrowLeft, RotateCcw, ShieldCheck, Clock, AlertTriangle, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de devoluciones · TirePro Marketplace",
  description:
    "Política de devoluciones del Marketplace de TirePro: cómo solicitar, plazos, casos aceptados y proceso de reembolso para llantas compradas a distribuidores verificados en Colombia.",
  alternates: { canonical: "https://www.tirepro.com.co/marketplace/return-policy" },
};

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <MarketplaceNav />

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0A183A 0%,#173D68 55%,#1E76B6 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, rgba(52,140,203,0.6), transparent 40%), radial-gradient(circle at 80% 100%, rgba(245,158,11,0.4), transparent 40%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-3 sm:px-6 pt-5 pb-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/70 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver al marketplace
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight">
                Política de devoluciones
              </h1>
              <p className="text-[11px] sm:text-xs text-white/70 mt-1">
                Marketplace TirePro · Última actualización: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-8 -mt-4 relative">
        <div
          className="bg-white rounded-3xl p-6 sm:p-8 space-y-7"
          style={{ boxShadow: "0 20px 60px -20px rgba(10,24,58,0.18), 0 0 0 1px rgba(30,118,182,0.06)" }}
        >
          {/* Resumen */}
          <section>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-[#1E76B6] bg-[#1E76B6]/10 uppercase tracking-widest mb-2">
              <ShieldCheck className="w-3 h-3" />
              Resumen rápido
            </span>
            <h2 className="text-lg font-black text-[#0A183A] mb-2">¿Puedo devolver una llanta?</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Sí. En el Marketplace TirePro puedes solicitar la devolución de una llanta hasta{" "}
              <strong className="text-[#0A183A]">30 días calendario</strong> después de recibir tu pedido,
              siempre y cuando la llanta no haya sido instalada y se encuentre en su estado original. Cada
              solicitud se envía directamente al distribuidor que despachó el producto, quien revisa el
              caso y coordina contigo el proceso de recolección y reembolso.
            </p>
          </section>

          {/* Plazo */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Clock, label: "Plazo para solicitar", value: "30 días" },
              { icon: ShieldCheck, label: "Estado del producto", value: "Sin instalar" },
              { icon: RotateCcw, label: "Tiempo de respuesta", value: "Hasta 5 días hábiles" },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-2xl p-4"
                style={{
                  background: "linear-gradient(135deg,rgba(30,118,182,0.06),rgba(52,140,203,0.04))",
                  border: "1px solid rgba(30,118,182,0.12)",
                }}
              >
                <Icon className="w-4 h-4 text-[#1E76B6] mb-2" />
                <p className="text-[10px] font-black text-[#1E76B6] uppercase tracking-widest">{label}</p>
                <p className="text-sm font-black text-[#0A183A] mt-1">{value}</p>
              </div>
            ))}
          </section>

          {/* Cuándo aplica */}
          <section>
            <h2 className="text-lg font-black text-[#0A183A] mb-3">Casos aceptados</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0 mt-2" />
                <span>
                  <strong className="text-[#0A183A]">Producto incorrecto:</strong> recibiste una medida,
                  marca o modelo distinto al que aparecía en tu pedido.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0 mt-2" />
                <span>
                  <strong className="text-[#0A183A]">Defecto de fábrica:</strong> deformaciones, fisuras,
                  fugas u otros defectos atribuibles al fabricante, soportados con fotografías.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0 mt-2" />
                <span>
                  <strong className="text-[#0A183A]">Daños en el transporte:</strong> daños visibles al
                  recibir el pedido, reportados dentro de las primeras 48 horas tras la entrega.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] flex-shrink-0 mt-2" />
                <span>
                  <strong className="text-[#0A183A]">Cambio de opinión:</strong> dentro de los primeros 5
                  días hábiles, siempre que el producto esté sin uso, sin instalar y en su empaque original.
                </span>
              </li>
            </ul>
          </section>

          {/* No aplica */}
          <section>
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-[#92400e]">Casos que no aplican</p>
                <p className="text-xs text-[#92400e]/90 mt-1 leading-relaxed">
                  Llantas instaladas, llantas con desgaste por uso, llantas dañadas por manipulación
                  inadecuada o accidentes, llantas modificadas (rebajadas, recortadas, perforadas) y
                  productos comprados en promoción de liquidación final, salvo defecto de fábrica.
                </p>
              </div>
            </div>
          </section>

          {/* Cómo solicitarla */}
          <section>
            <h2 className="text-lg font-black text-[#0A183A] mb-3">Cómo solicitar una devolución</h2>
            <ol className="space-y-3 text-sm text-gray-600">
              {[
                "Inicia sesión en TirePro y entra a Mis pedidos desde el menú del marketplace.",
                "Ubica el pedido y haz clic en Solicitar devolución en el producto correspondiente.",
                "Indica el motivo, adjunta fotografías si aplica, y envía la solicitud.",
                "El distribuidor revisará tu caso en hasta 5 días hábiles y te contactará por correo o teléfono.",
                "Si la devolución es aprobada, el distribuidor coordina la recolección y emite el reembolso.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                    style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Reembolso */}
          <section>
            <h2 className="text-lg font-black text-[#0A183A] mb-2">Reembolso</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Una vez el distribuidor recibe el producto y verifica su estado, se emite el reembolso por
              el mismo medio de pago utilizado en la compra. El plazo habitual es de{" "}
              <strong className="text-[#0A183A]">5 a 15 días hábiles</strong> dependiendo de la entidad
              financiera. Los gastos de envío de la devolución pueden ser asumidos por el distribuidor o
              por el comprador según el motivo de la devolución.
            </p>
          </section>

          {/* Contacto */}
          <section
            className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{ background: "linear-gradient(135deg,rgba(30,118,182,0.06),rgba(52,140,203,0.04))", border: "1px solid rgba(30,118,182,0.12)" }}
          >
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 border border-[#1E76B6]/15">
              <Mail className="w-5 h-5 text-[#1E76B6]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-[#0A183A]">¿Tienes problemas con tu devolución?</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Escríbenos a{" "}
                <a href="mailto:info@tirepro.com.co" className="font-bold text-[#1E76B6] hover:underline">
                  info@tirepro.com.co
                </a>{" "}
                y nuestro equipo intermediará con el distribuidor.
              </p>
            </div>
          </section>
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
