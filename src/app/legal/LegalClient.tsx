"use client";

// =============================================================================
// LegalClient — three-document legal hub for TirePro Colombia.
//
// Renders, in order, the three legally binding documents the user must
// be able to consult at any time:
//
//   1. Términos y Condiciones de Uso de la Plataforma, Software SaaS
//      y Marketplace (the master agreement governing platform access).
//   2. Términos y Condiciones de Compra del Marketplace (the e-commerce
//      sale terms — invoked when an order is placed).
//   3. Política de Privacidad y Tratamiento de Datos Personales
//      (Ley 1581/2012 + Decreto 1377/2013 disclosure).
//
// Each document is a tab. Inside, sections are collapsible — initially
// collapsed so the page weighs nothing visually; expand-all is one tap
// away. Numbered headings preserve the legal document's own anchors.
// =============================================================================

import React, { useState } from "react";
import {
  BookOpen, Shield, ShoppingCart, ChevronDown, ChevronUp, Mail, Phone, MapPin, Hash,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────
// Content data model. A section is a stack of "blocks" — each block is
// either a paragraph, a bullet list, or a sub-heading (used for the
// 5.1/5.2/5.3/5.4 sub-sections of the first document). This shape
// keeps the JSX declarative and the data block close to a markdown
// transcription so future edits are straightforward.
// ─────────────────────────────────────────────────────────────────────

type Block =
  | { kind: "p";  text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h";  text: string };

type Section = {
  id: string;
  title: string;
  blocks: Block[];
};

type Doc = {
  id: string;
  tabLabel: string;
  title: string;
  effective: string;
  lastUpdated: string;
  intro: string;
  sections: Section[];
  icon: React.ComponentType<{ className?: string }>;
};

const EFFECTIVE = "8 de mayo de 2026";

// ─────────────────────────────────────────────────────────────────────
// DOCUMENT 1 — Terms of platform / SaaS / marketplace use
// ─────────────────────────────────────────────────────────────────────

const PLATFORM_TERMS: Doc = {
  id: "terms",
  tabLabel: "Términos de uso",
  title: "Términos y Condiciones de Uso de la Plataforma, Software SaaS y Marketplace",
  effective: EFFECTIVE,
  lastUpdated: EFFECTIVE,
  intro:
    "Estos Términos regulan el acceso, navegación, registro y utilización de la plataforma tecnológica TirePro, incluyendo el sitio web, aplicaciones, interfaces API, herramientas de software, servicios SaaS, marketplace, módulos de telemetría, sistemas de inteligencia artificial y demás funcionalidades asociadas.",
  icon: BookOpen,
  sections: [
    {
      id: "identificacion",
      title: "Identificación del titular de la plataforma",
      blocks: [
        { kind: "p", text: "Los presentes Términos y Condiciones de Uso (en adelante, los \"Términos\") regulan el acceso, navegación, registro y utilización de la plataforma tecnológica TirePro, incluyendo el sitio web, aplicaciones, interfaces API, herramientas de software, servicios SaaS, marketplace, módulos de telemetría, sistemas de inteligencia artificial y demás funcionalidades asociadas (en adelante, la \"Plataforma\")." },
        { kind: "p", text: "La Plataforma es operada por TIREPRO S.A.S., identificada con NIT 901964511-7, sociedad comercial constituida conforme a las leyes de la República de Colombia, con domicilio principal en Bogotá D.C., Colombia, teléfono de contacto +57 317 2169790 y correo electrónico info@tirepro.com.co (en adelante, \"TirePro\")." },
        { kind: "p", text: "El acceso, navegación, uso o registro en la Plataforma implica la aceptación expresa, informada, previa e inequívoca de los presentes Términos." },
      ],
    },
    {
      id: "definiciones",
      title: "Definiciones",
      blocks: [
        { kind: "p", text: "Para efectos de interpretación de los presentes Términos, las siguientes expresiones tendrán el significado que se les atribuye a continuación:" },
        { kind: "ul", items: [
          "Guest o Invitado: persona que realiza compras dentro del marketplace sin crear una cuenta registrada.",
          "Cuenta Marketplace: usuario registrado únicamente para gestionar compras, historial, pedidos y funcionalidades básicas del marketplace.",
          "Usuario Pro: persona natural o jurídica que utiliza los módulos SaaS, herramientas de monitoreo, seguimiento, telemetría, analítica, automatización y gestión de llantas.",
          "Distribuidor: persona jurídica o comerciante que utiliza la Plataforma para comercializar productos, publicar inventario, vender llantas y/o revender los servicios SaaS de TirePro a terceros.",
          "Marketplace: entorno digital operado por TirePro que permite la publicación y comercialización de productos y servicios por parte de TirePro y/o terceros.",
          "Contenido del Usuario: toda información, fotografías, imágenes, videos, archivos, telemetría, datos técnicos, comentarios, publicaciones, documentos o cualquier material cargado o transmitido por los Usuarios.",
          "Datos Agregados: información anonimizada, estadística o despersonalizada derivada del uso de la Plataforma.",
          "Servicios SaaS: herramientas de software ofrecidas bajo modalidad Software as a Service.",
          "Modelos de IA: sistemas de inteligencia artificial, machine learning, visión computacional, reconocimiento de patrones o algoritmos desarrollados o entrenados por TirePro.",
        ] },
      ],
    },
    {
      id: "objeto",
      title: "Objeto de la plataforma",
      blocks: [
        { kind: "p", text: "TirePro opera una plataforma tecnológica híbrida compuesta por:" },
        { kind: "ol", items: [
          "Un marketplace digital para comercialización de llantas y productos relacionados.",
          "Un ecosistema SaaS para seguimiento, monitoreo, control, gestión logística y analítica de llantas.",
          "Herramientas de inteligencia artificial y automatización orientadas a inspección, reconocimiento visual, predicción de desgaste y optimización operativa.",
          "Funcionalidades de telemetría y recopilación de datos técnicos asociados al rendimiento de llantas y vehículos.",
        ] },
        { kind: "p", text: "TirePro podrá modificar, actualizar, suspender o eliminar funcionalidades de la Plataforma en cualquier momento." },
      ],
    },
    {
      id: "capacidad",
      title: "Capacidad legal",
      blocks: [
        { kind: "p", text: "Solo podrán utilizar la Plataforma personas con capacidad legal para contratar conforme a las leyes colombianas." },
        { kind: "p", text: "Cuando el Usuario actúe en representación de una sociedad o tercero, declara contar con facultades suficientes para obligar a dicha entidad." },
        { kind: "p", text: "Los menores de edad únicamente podrán utilizar la Plataforma bajo supervisión y responsabilidad de sus representantes legales." },
      ],
    },
    {
      id: "tipos-de-usuario",
      title: "Tipos de usuario y alcance de los servicios",
      blocks: [
        { kind: "h", text: "5.1 Usuarios Guest" },
        { kind: "p", text: "Los Usuarios Guest podrán realizar compras sin crear una cuenta. TirePro podrá solicitar información mínima necesaria para procesar pedidos, pagos, garantías y entregas." },
        { kind: "h", text: "5.2 Cuentas Marketplace" },
        { kind: "p", text: "Las cuentas marketplace permiten gestionar compras, historial, pedidos, facturación, garantías y funcionalidades comerciales básicas." },
        { kind: "h", text: "5.3 Usuarios Pro" },
        { kind: "p", text: "Los Usuarios Pro tendrán acceso a módulos especializados de:" },
        { kind: "ul", items: [
          "Seguimiento de llantas.",
          "Gestión logística.",
          "Telemetría.",
          "Analítica operacional.",
          "Inteligencia artificial.",
          "Reportes.",
          "Escaneo mediante imágenes.",
          "Automatización y alertas.",
        ] },
        { kind: "h", text: "5.4 Distribuidores" },
        { kind: "p", text: "Los Distribuidores podrán:" },
        { kind: "ul", items: [
          "Publicar productos.",
          "Gestionar inventario.",
          "Comercializar productos.",
          "Utilizar herramientas SaaS.",
          "Revender soluciones TirePro a terceros.",
          "Gestionar cuentas subordinadas.",
        ] },
        { kind: "p", text: "El Distribuidor reconoce expresamente que actúa bajo su propia cuenta y riesgo frente a sus clientes finales." },
      ],
    },
    {
      id: "registro",
      title: "Registro y seguridad de la cuenta",
      blocks: [
        { kind: "p", text: "El Usuario se obliga a:" },
        { kind: "ul", items: [
          "Suministrar información veraz, exacta y actualizada.",
          "Mantener la confidencialidad de sus credenciales.",
          "Notificar accesos no autorizados.",
          "No compartir cuentas con terceros no autorizados.",
        ] },
        { kind: "p", text: "TirePro podrá verificar información suministrada y suspender cuentas ante inconsistencias, sospechas de fraude o incumplimientos." },
        { kind: "p", text: "El Usuario será responsable por toda actividad ejecutada desde su cuenta." },
      ],
    },
    {
      id: "licencia-software",
      title: "Licencia de uso del software",
      blocks: [
        { kind: "p", text: "TirePro otorga al Usuario una licencia:" },
        { kind: "ul", items: [
          "Limitada.",
          "No exclusiva.",
          "No transferible.",
          "Revocable.",
          "Sin derecho de sublicencia.",
        ] },
        { kind: "p", text: "La licencia permite exclusivamente el uso interno de la Plataforma conforme a las funcionalidades contratadas." },
        { kind: "p", text: "Queda estrictamente prohibido:" },
        { kind: "ul", items: [
          "Copiar, replicar o redistribuir el software.",
          "Descompilar o realizar ingeniería inversa.",
          "Extraer bases de datos.",
          "Crear productos derivados.",
          "Utilizar bots no autorizados.",
          "Interferir con la seguridad de la Plataforma.",
          "Utilizar la Plataforma para fines ilícitos.",
        ] },
        { kind: "p", text: "Todos los derechos de propiedad intelectual sobre la Plataforma pertenecen exclusivamente a TirePro." },
      ],
    },
    {
      id: "propiedad-contenido",
      title: "Propiedad intelectual y licencia sobre contenido del usuario",
      blocks: [
        { kind: "p", text: "El Usuario conserva la titularidad sobre el contenido que cargue a la Plataforma." },
        { kind: "p", text: "Sin perjuicio de lo anterior, el Usuario concede a TirePro una licencia:" },
        { kind: "ul", items: [
          "Mundial.",
          "Perpetua.",
          "Irrevocable.",
          "Transferible.",
          "Sublicenciable.",
          "Libre de regalías.",
          "No exclusiva.",
        ] },
        { kind: "p", text: "Respecto del Contenido del Usuario, incluyendo imágenes de llantas, fotografías, datos de desgaste, escaneos, telemetría y demás información cargada." },
        { kind: "p", text: "La licencia autoriza a TirePro para:" },
        { kind: "ul", items: [
          "Almacenar.",
          "Reproducir.",
          "Analizar.",
          "Procesar.",
          "Modificar.",
          "Adaptar.",
          "Entrenar modelos de inteligencia artificial y machine learning.",
          "Desarrollar algoritmos.",
          "Mejorar productos.",
          "Generar datasets.",
          "Realizar pruebas.",
          "Desarrollar modelos predictivos.",
          "Comercializar soluciones derivadas.",
          "Crear modelos estadísticos.",
          "Compartir datasets anonimizados.",
        ] },
        { kind: "p", text: "El Usuario declara contar con todos los derechos y autorizaciones necesarias sobre el contenido suministrado." },
      ],
    },
    {
      id: "datos-agregados",
      title: "Datos agregados, analítica y crowdsourcing",
      blocks: [
        { kind: "p", text: "El Usuario autoriza expresamente a TirePro para recopilar, procesar, anonimizar, agregar y utilizar información derivada del uso de la Plataforma." },
        { kind: "p", text: "TirePro podrá:" },
        { kind: "ul", items: [
          "Generar estadísticas agregadas.",
          "Compartir tendencias de desgaste.",
          "Publicar métricas industriales.",
          "Elaborar reportes sectoriales.",
          "Entrenar modelos predictivos.",
          "Desarrollar benchmarks.",
          "Generar recomendaciones automatizadas.",
        ] },
        { kind: "p", text: "Siempre que la información compartida públicamente se encuentre anonimizada y no permita identificar razonablemente a personas naturales determinadas." },
        { kind: "p", text: "Los Datos Agregados serán de propiedad exclusiva de TirePro." },
      ],
    },
    {
      id: "telemetria",
      title: "Telemetría y datos técnicos",
      blocks: [
        { kind: "p", text: "La Plataforma podrá recopilar:" },
        { kind: "ul", items: [
          "Datos operacionales.",
          "Kilometraje.",
          "Temperatura.",
          "Presión.",
          "Ubicación aproximada.",
          "Historial de mantenimiento.",
          "Estado de desgaste.",
          "Rendimiento operativo.",
          "Hábitos de uso.",
          "Datos provenientes de sensores o dispositivos integrados.",
        ] },
        { kind: "p", text: "El Usuario declara conocer y autorizar el tratamiento de dicha información conforme a la Política de Privacidad." },
      ],
    },
    {
      id: "ia",
      title: "Inteligencia artificial y limitación de responsabilidad",
      blocks: [
        { kind: "p", text: "Las recomendaciones generadas por sistemas automatizados o inteligencia artificial constituyen únicamente herramientas de apoyo operacional." },
        { kind: "p", text: "TirePro no garantiza:" },
        { kind: "ul", items: [
          "Exactitud absoluta.",
          "Ausencia de errores.",
          "Predicciones perfectas.",
          "Compatibilidad universal.",
          "Resultados comerciales específicos.",
          "Prevención total de fallas.",
        ] },
        { kind: "p", text: "El Usuario reconoce que toda decisión operacional, técnica, mecánica o comercial basada en información generada por la Plataforma será tomada bajo su exclusiva responsabilidad." },
        { kind: "p", text: "TirePro no será responsable por:" },
        { kind: "ul", items: [
          "Accidentes.",
          "Daños mecánicos.",
          "Pérdidas económicas.",
          "Lucro cesante.",
          "Decisiones técnicas incorrectas.",
          "Daños indirectos.",
          "Interrupciones operativas.",
          "Fallas derivadas de información cargada incorrectamente.",
        ] },
      ],
    },
    {
      id: "responsabilidad-distribuidores",
      title: "Responsabilidad de los distribuidores",
      blocks: [
        { kind: "p", text: "Los Distribuidores son terceros independientes." },
        { kind: "p", text: "TirePro no será responsable por:" },
        { kind: "ul", items: [
          "Calidad del servicio prestado por Distribuidores.",
          "Asesorías incorrectas.",
          "Incumplimientos contractuales.",
          "Garantías ofrecidas directamente por Distribuidores.",
          "Errores operacionales.",
          "Mala utilización de la Plataforma.",
          "Relación contractual entre Distribuidores y sus clientes finales.",
        ] },
        { kind: "p", text: "El Distribuidor mantendrá indemne a TirePro frente a cualquier reclamación derivada de su operación comercial." },
      ],
    },
    {
      id: "disponibilidad",
      title: "Disponibilidad de la plataforma",
      blocks: [
        { kind: "p", text: "TirePro no garantiza disponibilidad continua o ininterrumpida." },
        { kind: "p", text: "La Plataforma podrá presentar:" },
        { kind: "ul", items: [
          "Mantenimientos.",
          "Actualizaciones.",
          "Interrupciones.",
          "Errores.",
          "Vulnerabilidades.",
          "Eventos de fuerza mayor.",
        ] },
        { kind: "p", text: "TirePro podrá suspender funcionalidades temporalmente por razones técnicas, operativas, legales o de seguridad." },
      ],
    },
    {
      id: "pagos",
      title: "Pagos, facturación y suscripciones",
      blocks: [
        { kind: "p", text: "Los servicios SaaS podrán operar bajo modalidades:" },
        { kind: "ul", items: [
          "Mensuales.",
          "Anuales.",
          "Por uso.",
          "Freemium.",
          "Licencias empresariales.",
        ] },
        { kind: "p", text: "La falta de pago podrá generar:" },
        { kind: "ul", items: [
          "Suspensión de acceso.",
          "Restricción de funcionalidades.",
          "Eliminación de información conforme a políticas internas.",
          "Terminación contractual.",
        ] },
        { kind: "p", text: "Los valores publicados incluyen impuestos cuando así lo exija la ley colombiana." },
      ],
    },
    {
      id: "suspension",
      title: "Suspensión y terminación de cuentas",
      blocks: [
        { kind: "p", text: "TirePro podrá suspender o terminar cuentas cuando:" },
        { kind: "ul", items: [
          "Exista incumplimiento contractual.",
          "Se detecte fraude.",
          "Exista uso abusivo.",
          "Se infrinjan derechos de terceros.",
          "Se comprometa la seguridad.",
          "Se incumplan obligaciones de pago.",
          "Exista uso ilegal de la Plataforma.",
        ] },
        { kind: "p", text: "La terminación no extingue obligaciones pendientes." },
      ],
    },
    {
      id: "confidencialidad",
      title: "Confidencialidad",
      blocks: [
        { kind: "p", text: "Toda información técnica, comercial, financiera o estratégica revelada entre las partes tendrá carácter confidencial." },
        { kind: "p", text: "El Usuario se obliga a no divulgar información propietaria de TirePro sin autorización previa y escrita." },
      ],
    },
    {
      id: "indemnidad",
      title: "Indemnidad",
      blocks: [
        { kind: "p", text: "El Usuario mantendrá indemne a TirePro, sus accionistas, directivos, empleados y aliados frente a cualquier reclamación derivada de:" },
        { kind: "ul", items: [
          "Uso indebido de la Plataforma.",
          "Violación normativa.",
          "Infracción de propiedad intelectual.",
          "Incumplimiento contractual.",
          "Información falsa.",
          "Contenido cargado.",
          "Actividades ilícitas.",
        ] },
      ],
    },
    {
      id: "limitacion-general",
      title: "Limitación general de responsabilidad",
      blocks: [
        { kind: "p", text: "En ningún caso la responsabilidad total acumulada de TirePro excederá el valor efectivamente pagado por el Usuario durante los doce (12) meses anteriores al evento que origine la reclamación." },
        { kind: "p", text: "TirePro no responderá por daños indirectos, incidentales, especiales, consecuenciales o lucro cesante." },
      ],
    },
    {
      id: "modificaciones",
      title: "Modificaciones",
      blocks: [
        { kind: "p", text: "TirePro podrá modificar los presentes Términos en cualquier momento." },
        { kind: "p", text: "Las modificaciones entrarán en vigencia desde su publicación en la Plataforma." },
        { kind: "p", text: "El uso continuado de la Plataforma implica aceptación de las modificaciones." },
      ],
    },
    {
      id: "ley-aplicable",
      title: "Ley aplicable y jurisdicción",
      blocks: [
        { kind: "p", text: "Los presentes Términos se regirán por las leyes de la República de Colombia." },
        { kind: "p", text: "Toda controversia será sometida a los jueces competentes de Colombia." },
      ],
    },
    {
      id: "contacto",
      title: "Contacto",
      blocks: [
        { kind: "p", text: "Las solicitudes, peticiones, quejas, reclamos y consultas podrán dirigirse a:" },
        { kind: "ul", items: [
          "Razón social: TIREPRO S.A.S.",
          "NIT: 901964511-7",
          "Teléfono: +57 317 2169790",
          "Correo electrónico: info@tirepro.com.co",
          "Domicilio principal: Bogotá D.C., Colombia",
        ] },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// DOCUMENT 2 — Marketplace purchase terms
// ─────────────────────────────────────────────────────────────────────

const MARKETPLACE_TERMS: Doc = {
  id: "marketplace",
  tabLabel: "Compras del marketplace",
  title: "Términos y Condiciones de Compra del Marketplace",
  effective: EFFECTIVE,
  lastUpdated: EFFECTIVE,
  intro: "Estos Términos regulan las transacciones comerciales realizadas a través del marketplace TirePro: modalidades de venta, proceso de compra, precios, medios de pago, entregas, retracto y garantías.",
  icon: ShoppingCart,
  sections: [
    {
      id: "objeto",
      title: "Objeto",
      blocks: [
        { kind: "p", text: "Los presentes Términos y Condiciones de Compra regulan las transacciones comerciales realizadas a través del marketplace TirePro." },
      ],
    },
    {
      id: "modalidades-venta",
      title: "Modalidades de venta",
      blocks: [
        { kind: "p", text: "Dentro del marketplace podrán existir:" },
        { kind: "ol", items: [
          "Ventas realizadas directamente por TirePro.",
          "Ventas realizadas por Distribuidores o terceros independientes.",
        ] },
        { kind: "p", text: "Cada publicación indicará el vendedor responsable." },
      ],
    },
    {
      id: "naturaleza-marketplace",
      title: "Naturaleza del marketplace",
      blocks: [
        { kind: "p", text: "Cuando la venta sea realizada por un tercero, TirePro actuará únicamente como proveedor de la plataforma tecnológica de intermediación." },
        { kind: "p", text: "En tales casos, el tercero vendedor será responsable de:" },
        { kind: "ul", items: [
          "Calidad del producto.",
          "Garantías.",
          "Existencia de inventario.",
          "Facturación.",
          "Cumplimiento de entrega.",
          "Publicidad ofrecida.",
          "Obligaciones legales frente al consumidor.",
        ] },
      ],
    },
    {
      id: "proceso-compra",
      title: "Proceso de compra",
      blocks: [
        { kind: "p", text: "El Usuario deberá:" },
        { kind: "ol", items: [
          "Seleccionar productos.",
          "Validar información.",
          "Suministrar datos de entrega.",
          "Elegir método de pago.",
          "Confirmar la orden.",
        ] },
        { kind: "p", text: "La compra únicamente se entenderá perfeccionada cuando el pago sea aprobado." },
      ],
    },
    {
      id: "precios",
      title: "Precios",
      blocks: [
        { kind: "p", text: "Los precios publicados podrán modificarse en cualquier momento antes de la confirmación de la compra." },
        { kind: "p", text: "Errores tipográficos, fallas técnicas o inconsistencias manifiestas podrán generar cancelación de órdenes." },
      ],
    },
    {
      id: "pagos-mp",
      title: "Medios de pago",
      blocks: [
        { kind: "p", text: "La Plataforma podrá integrar pasarelas de pago de terceros." },
        { kind: "p", text: "TirePro no almacenará información financiera sensible salvo cuando la normativa aplicable lo permita." },
        { kind: "p", text: "El procesamiento de pagos podrá estar sujeto a validaciones antifraude." },
      ],
    },
    {
      id: "entregas",
      title: "Entregas",
      blocks: [
        { kind: "p", text: "Los tiempos de entrega son estimados y podrán variar por:" },
        { kind: "ul", items: [
          "Disponibilidad.",
          "Ubicación.",
          "Operadores logísticos.",
          "Fuerza mayor.",
          "Restricciones de movilidad.",
          "Eventos climáticos.",
        ] },
        { kind: "p", text: "TirePro no será responsable por retrasos atribuibles a terceros transportadores." },
      ],
    },
    {
      id: "retracto",
      title: "Derecho de retracto",
      blocks: [
        { kind: "p", text: "Conforme al artículo 47 de la Ley 1480 de 2011, el consumidor podrá ejercer el derecho de retracto dentro de los cinco (5) días hábiles siguientes a la entrega del producto." },
        { kind: "p", text: "Para ejercer el retracto:" },
        { kind: "ul", items: [
          "El producto deberá devolverse en condiciones aptas.",
          "Sin señales de uso indebido.",
          "Con empaques originales cuando aplique.",
        ] },
        { kind: "p", text: "Los costos de transporte y devolución serán asumidos por el consumidor salvo disposición legal en contrario." },
        { kind: "p", text: "El reembolso se realizará dentro de los términos legales aplicables." },
        { kind: "p", text: "El derecho de retracto no aplicará en los casos exceptuados por la legislación colombiana." },
      ],
    },
    {
      id: "garantias",
      title: "Garantías",
      blocks: [
        { kind: "p", text: "Las garantías se regirán por la Ley 1480 de 2011." },
        { kind: "p", text: "Cuando el vendedor sea un tercero, éste será el principal responsable frente al consumidor." },
        { kind: "p", text: "Las garantías podrán invalidarse por:" },
        { kind: "ul", items: [
          "Uso indebido.",
          "Instalación incorrecta.",
          "Modificaciones no autorizadas.",
          "Daños accidentales.",
          "Incumplimiento de especificaciones técnicas.",
        ] },
      ],
    },
    {
      id: "cancelaciones",
      title: "Cancelaciones",
      blocks: [
        { kind: "p", text: "Las órdenes podrán cancelarse antes del despacho." },
        { kind: "p", text: "Una vez despachado el producto, aplicarán las reglas de retracto o garantía." },
      ],
    },
    {
      id: "inventario",
      title: "Disponibilidad de inventario",
      blocks: [
        { kind: "p", text: "La disponibilidad de productos podrá cambiar en tiempo real." },
        { kind: "p", text: "En caso de falta de inventario, el Usuario podrá:" },
        { kind: "ul", items: [
          "Esperar reposición.",
          "Solicitar devolución.",
          "Elegir producto alternativo.",
        ] },
      ],
    },
    {
      id: "responsabilidad-productos",
      title: "Responsabilidad sobre productos",
      blocks: [
        { kind: "p", text: "TirePro no fabrica llantas ni garantiza especificaciones técnicas de productos comercializados por terceros." },
        { kind: "p", text: "Las imágenes publicadas son ilustrativas y podrán variar." },
      ],
    },
    {
      id: "facturacion",
      title: "Facturación",
      blocks: [
        { kind: "p", text: "Las facturas serán emitidas por el vendedor correspondiente." },
        { kind: "p", text: "El Usuario deberá suministrar información tributaria correcta." },
      ],
    },
    {
      id: "pqr",
      title: "Peticiones, quejas y reclamos",
      blocks: [
        { kind: "p", text: "Los consumidores podrán presentar solicitudes a través de los siguientes canales:" },
        { kind: "ul", items: [
          "Razón social: TIREPRO S.A.S.",
          "NIT: 901964511-7",
          "Teléfono: +57 317 2169790",
          "Correo electrónico: info@tirepro.com.co",
          "Domicilio principal: Bogotá D.C., Colombia",
        ] },
      ],
    },
    {
      id: "ley-mp",
      title: "Ley aplicable",
      blocks: [
        { kind: "p", text: "Los presentes términos se regirán por las leyes de la República de Colombia." },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// DOCUMENT 3 — Privacy policy & data treatment (Habeas Data)
// ─────────────────────────────────────────────────────────────────────

const PRIVACY_POLICY: Doc = {
  id: "privacy",
  tabLabel: "Política de privacidad",
  title: "Política de Privacidad y Tratamiento de Datos Personales",
  effective: EFFECTIVE,
  lastUpdated: EFFECTIVE,
  intro: "Esta Política regula el tratamiento de datos personales realizado por TIREPRO S.A.S. conforme a la Ley 1581 de 2012, Decreto 1377 de 2013 y demás normas concordantes.",
  icon: Shield,
  sections: [
    {
      id: "introduccion",
      title: "Introducción",
      blocks: [
        { kind: "p", text: "La presente Política de Privacidad y Tratamiento de Datos Personales (la \"Política\") regula el tratamiento de datos personales realizado por TIREPRO S.A.S. conforme a la Ley 1581 de 2012, Decreto 1377 de 2013 y demás normas concordantes." },
      ],
    },
    {
      id: "responsable",
      title: "Identificación del responsable",
      blocks: [
        { kind: "p", text: "TIREPRO S.A.S., identificada con NIT 901964511-7, teléfono +57 317 2169790 y correo electrónico info@tirepro.com.co, actúa como Responsable del Tratamiento de Datos Personales respecto de los usuarios directos de la Plataforma." },
        { kind: "p", text: "En ciertos escenarios, TirePro podrá actuar como Encargado del Tratamiento cuando procese datos suministrados por Distribuidores respecto de sus propios clientes." },
      ],
    },
    {
      id: "definiciones-pp",
      title: "Definiciones",
      blocks: [
        { kind: "p", text: "Para efectos de esta Política se aplicarán las definiciones previstas en la Ley 1581 de 2012." },
      ],
    },
    {
      id: "datos-recolectados",
      title: "Datos personales recolectados",
      blocks: [
        { kind: "p", text: "TirePro podrá recolectar:" },
        { kind: "ul", items: [
          "Nombre.",
          "Identificación.",
          "Dirección.",
          "Teléfono.",
          "Correo electrónico.",
          "Información tributaria.",
          "Historial de compras.",
          "Datos de facturación.",
          "Información de dispositivos.",
          "Direcciones IP.",
          "Geolocalización aproximada.",
          "Fotografías.",
          "Imágenes de llantas.",
          "Datos de telemetría.",
          "Información técnica vehicular.",
          "Datos de sensores.",
          "Métricas operacionales.",
          "Datos de desgaste.",
          "Historial de mantenimiento.",
          "Datos derivados del uso del software.",
        ] },
      ],
    },
    {
      id: "finalidades",
      title: "Finalidades del tratamiento",
      blocks: [
        { kind: "p", text: "Los datos podrán ser utilizados para:" },
        { kind: "ul", items: [
          "Gestionar cuentas.",
          "Procesar pagos.",
          "Ejecutar contratos.",
          "Gestionar entregas.",
          "Proveer soporte.",
          "Ejecutar funcionalidades SaaS.",
          "Analizar rendimiento de llantas.",
          "Generar recomendaciones.",
          "Entrenar sistemas de inteligencia artificial.",
          "Mejorar productos.",
          "Detectar fraude.",
          "Desarrollar modelos predictivos.",
          "Realizar analítica.",
          "Cumplir obligaciones legales.",
          "Gestionar comunicaciones.",
          "Realizar campañas comerciales.",
          "Elaborar estadísticas.",
          "Generar información anonimizada.",
        ] },
      ],
    },
    {
      id: "ia-imagenes",
      title: "Autorización para uso de imágenes e inteligencia artificial",
      blocks: [
        { kind: "p", text: "El Titular autoriza expresamente a TirePro para utilizar las imágenes, fotografías, videos y escaneos cargados en la Plataforma con las siguientes finalidades:" },
        { kind: "ul", items: [
          "Entrenamiento de modelos de inteligencia artificial.",
          "Machine learning.",
          "Visión computacional.",
          "Desarrollo algorítmico.",
          "Reconocimiento de desgaste.",
          "Automatización.",
          "Optimización de productos.",
          "Desarrollo de datasets.",
          "Investigación y desarrollo.",
        ] },
        { kind: "p", text: "La autorización otorgada será:" },
        { kind: "ul", items: [
          "Gratuita.",
          "Mundial.",
          "Irrevocable.",
          "Perpetua.",
          "Libre de regalías.",
        ] },
        { kind: "p", text: "Sin perjuicio de los derechos morales que puedan corresponder conforme a la legislación aplicable." },
      ],
    },
    {
      id: "datos-agregados-pp",
      title: "Datos agregados y anonimización",
      blocks: [
        { kind: "p", text: "El Titular autoriza a TirePro para anonimizar y agregar información derivada del uso de la Plataforma." },
        { kind: "p", text: "TirePro podrá utilizar dicha información anonimizada para:" },
        { kind: "ul", items: [
          "Estudios estadísticos.",
          "Benchmarks industriales.",
          "Analítica.",
          "Investigación.",
          "Modelos predictivos.",
          "Información pública agregada.",
          "Recomendaciones comerciales.",
        ] },
        { kind: "p", text: "La información anonimizada dejará de considerarse dato personal cuando no permita identificar razonablemente al Titular." },
      ],
    },
    {
      id: "telematicos",
      title: "Tratamiento de datos telemáticos y vehiculares",
      blocks: [
        { kind: "p", text: "La Plataforma podrá recopilar y procesar:" },
        { kind: "ul", items: [
          "Ubicación aproximada.",
          "Kilometraje.",
          "Temperatura.",
          "Presión.",
          "Desgaste.",
          "Rendimiento.",
          "Historial técnico.",
          "Datos provenientes de sensores.",
        ] },
        { kind: "p", text: "El Usuario declara contar con las autorizaciones necesarias cuando suministre información de terceros." },
      ],
    },
    {
      id: "responsable-encargado",
      title: "Distribuidores y relación responsable / encargado",
      blocks: [
        { kind: "p", text: "Cuando un Distribuidor cargue información de sus clientes:" },
        { kind: "ul", items: [
          "El Distribuidor actuará como Responsable del Tratamiento.",
          "TirePro actuará como Encargado del Tratamiento.",
        ] },
        { kind: "p", text: "En dichos casos:" },
        { kind: "ul", items: [
          "El Distribuidor garantiza haber obtenido las autorizaciones necesarias.",
          "TirePro tratará los datos conforme a las instrucciones del Distribuidor y la normativa aplicable.",
          "El Distribuidor asumirá responsabilidad frente a reclamaciones derivadas de la ausencia de autorizaciones.",
        ] },
      ],
    },
    {
      id: "derechos-titulares",
      title: "Derechos de los titulares",
      blocks: [
        { kind: "p", text: "Los Titulares podrán:" },
        { kind: "ul", items: [
          "Conocer sus datos.",
          "Actualizar información.",
          "Rectificar datos.",
          "Solicitar prueba de autorización.",
          "Revocar autorizaciones cuando proceda.",
          "Solicitar supresión.",
          "Presentar quejas ante la SIC.",
        ] },
      ],
    },
    {
      id: "procedimiento-pqr",
      title: "Procedimiento de consultas y reclamos",
      blocks: [
        { kind: "p", text: "Las solicitudes deberán presentarse a través de los canales oficiales publicados por TirePro." },
        { kind: "p", text: "TirePro responderá dentro de los términos legales aplicables." },
      ],
    },
    {
      id: "transferencia",
      title: "Transferencia y transmisión internacional",
      blocks: [
        { kind: "p", text: "El Titular autoriza la transferencia y transmisión nacional e internacional de datos personales a:" },
        { kind: "ul", items: [
          "Proveedores cloud.",
          "Operadores tecnológicos.",
          "Herramientas analíticas.",
          "Servicios de hosting.",
          "Procesadores de pago.",
          "Aliados tecnológicos.",
          "Infraestructura de inteligencia artificial.",
        ] },
        { kind: "p", text: "Siempre bajo estándares razonables de seguridad." },
      ],
    },
    {
      id: "seguridad",
      title: "Seguridad de la información",
      blocks: [
        { kind: "p", text: "TirePro implementará medidas técnicas, administrativas y organizacionales razonables para proteger la información." },
        { kind: "p", text: "No obstante, el Usuario reconoce que ningún sistema es completamente invulnerable." },
      ],
    },
    {
      id: "retencion",
      title: "Retención de datos",
      blocks: [
        { kind: "p", text: "Los datos personales serán conservados:" },
        { kind: "ul", items: [
          "Mientras exista relación contractual.",
          "Durante el tiempo necesario para cumplir finalidades legítimas.",
          "Durante términos legales aplicables.",
          "Mientras exista necesidad operacional.",
          "Mientras los modelos de inteligencia artificial dependan razonablemente de datasets históricos anonimizados.",
        ] },
        { kind: "p", text: "La información anonimizada podrá conservarse indefinidamente." },
      ],
    },
    {
      id: "cookies",
      title: "Cookies y tecnologías de seguimiento",
      blocks: [
        { kind: "p", text: "La Plataforma podrá utilizar cookies, píxeles, SDKs y tecnologías similares para:" },
        { kind: "ul", items: [
          "Autenticación.",
          "Analítica.",
          "Seguridad.",
          "Personalización.",
          "Marketing.",
          "Optimización operacional.",
        ] },
      ],
    },
    {
      id: "menores",
      title: "Datos de menores de edad",
      blocks: [
        { kind: "p", text: "TirePro no recopila intencionalmente datos de menores de edad sin autorización legal correspondiente." },
      ],
    },
    {
      id: "modificaciones-pp",
      title: "Modificaciones a la política",
      blocks: [
        { kind: "p", text: "TirePro podrá modificar esta Política en cualquier momento." },
        { kind: "p", text: "Las modificaciones serán publicadas oportunamente en la Plataforma." },
      ],
    },
    {
      id: "vigencia",
      title: "Vigencia",
      blocks: [
        { kind: "p", text: "La presente Política rige a partir de su publicación y permanecerá vigente mientras TirePro realice tratamiento de datos personales." },
      ],
    },
    {
      id: "contacto-pp",
      title: "Contacto y canales de Habeas Data",
      blocks: [
        { kind: "p", text: "Las consultas, reclamos, solicitudes de actualización, rectificación o supresión relacionadas con protección de datos personales podrán dirigirse a:" },
        { kind: "ul", items: [
          "Razón social: TIREPRO S.A.S.",
          "NIT: 901964511-7",
          "Teléfono: +57 317 2169790",
          "Correo electrónico: info@tirepro.com.co",
          "Domicilio principal: Bogotá D.C., Colombia",
        ] },
      ],
    },
  ],
};

const DOCS: Doc[] = [PLATFORM_TERMS, MARKETPLACE_TERMS, PRIVACY_POLICY];

// ─────────────────────────────────────────────────────────────────────
// Block renderer — switches on the discriminator. Kept tiny so the
// reading layout stays uniform across all three documents.
// ─────────────────────────────────────────────────────────────────────

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return <p className="text-[15px] leading-relaxed text-gray-700 mb-4">{block.text}</p>;
    case "h":
      return <h4 className="text-[15px] font-bold text-[#173D68] mt-5 mb-2">{block.text}</h4>;
    case "ul":
      return (
        <ul className="list-disc pl-6 mb-4 space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="text-[15px] leading-relaxed text-gray-700">{it}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal pl-6 mb-4 space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="text-[15px] leading-relaxed text-gray-700">{it}</li>
          ))}
        </ol>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────
// SectionItem — collapsible row for one numbered legal section. Click
// the header to toggle; default is collapsed. Numbering is rendered
// from the index so the legal "1. … 21." sequence stays consistent
// without hard-coding numbers in the data.
// ─────────────────────────────────────────────────────────────────────

function SectionItem({
  index, section, expanded, onToggle,
}: {
  index: number;
  section: Section;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div id={section.id} className="border-b border-gray-200 scroll-mt-28">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-start justify-between gap-4 text-left py-5 group"
      >
        <h3 className="text-base sm:text-lg font-bold text-[#0A183A] group-hover:text-[#1E76B6] transition-colors leading-snug">
          <span className="inline-block w-8 sm:w-10 text-[#1E76B6]/80 tabular-nums">{index + 1}.</span>
          {section.title}
        </h3>
        <span className="flex-shrink-0 mt-1">
          {expanded
            ? <ChevronUp  className="w-5 h-5 text-[#1E76B6]" />
            : <ChevronDown className="w-5 h-5 text-[#1E76B6]" />}
        </span>
      </button>
      {expanded && (
        <div className="pl-0 sm:pl-12 pb-6">
          {section.blocks.map((b, i) => <BlockView key={i} block={b} />)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// DocumentView — header strip + intro card + section list for one
// of the three documents. Tracks its own expand-state in a Set keyed
// by section id.
// ─────────────────────────────────────────────────────────────────────

function DocumentView({ doc }: { doc: Doc }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const allOpen = open.size === doc.sections.length;

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setOpen(allOpen ? new Set() : new Set(doc.sections.map((s) => s.id)));
  }

  const Icon = doc.icon;

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-start gap-3 sm:gap-4 mb-4">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#0A183A,#1E76B6)" }}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-3xl font-black text-[#0A183A] leading-tight">{doc.title}</h2>
          <p className="text-[12px] sm:text-sm text-gray-500 mt-1">
            Vigencia: {doc.effective} · Actualizado: {doc.lastUpdated}
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl p-4 sm:p-5 mb-6"
        style={{
          background: "rgba(30,118,182,0.05)",
          border: "1px solid rgba(30,118,182,0.18)",
        }}
      >
        <p className="text-[14px] text-[#0A183A] leading-relaxed">{doc.intro}</p>
      </div>

      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={toggleAll}
          className="text-[12px] font-bold text-[#1E76B6] hover:underline"
        >
          {allOpen ? "Contraer todo" : "Expandir todo"}
        </button>
      </div>

      <div>
        {doc.sections.map((section, i) => (
          <SectionItem
            key={section.id}
            index={i}
            section={section}
            expanded={open.has(section.id)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LegalPage — outer shell with header, three-tab nav, and footer
// (contact card with company identification + Habeas Data channels).
// ─────────────────────────────────────────────────────────────────────

export default function LegalPage() {
  const [activeId, setActiveId] = useState<string>(DOCS[0].id);
  const activeDoc = DOCS.find((d) => d.id === activeId) ?? DOCS[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header
        className="text-white py-12 sm:py-16 px-4 sm:px-6"
        style={{ background: "linear-gradient(135deg,#0A183A 0%,#173D68 60%,#1E76B6 100%)" }}
      >
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/60">TirePro Legal</p>
          <h1 className="text-3xl sm:text-5xl font-black mt-2 leading-tight">Información legal</h1>
          <p className="text-sm sm:text-lg text-white/80 mt-3 max-w-2xl leading-relaxed">
            Documentos legales que rigen el uso de la plataforma, las compras del marketplace y el tratamiento
            de datos personales conforme a la normativa colombiana.
          </p>
        </div>
      </header>

      {/* Sticky tab nav */}
      <nav
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-md"
        style={{ borderBottom: "1px solid rgba(10,24,58,0.08)" }}
      >
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-2">
            {DOCS.map((doc) => {
              const Icon = doc.icon;
              const active = doc.id === activeId;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveId(doc.id)}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-[12px] sm:text-[13px] font-bold whitespace-nowrap transition-colors"
                  style={{
                    color: active ? "white" : "#0A183A",
                    background: active
                      ? "linear-gradient(135deg,#0A183A,#1E76B6)"
                      : "transparent",
                    boxShadow: active ? "0 8px 20px -8px rgba(30,118,182,0.45)" : "none",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {doc.tabLabel}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Active document */}
      <DocumentView doc={activeDoc} />

      {/* Contact footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1E76B6] mb-2">Contacto</p>
          <h3 className="text-xl font-black text-[#0A183A]">TIREPRO S.A.S.</h3>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-[13px] text-gray-700">
            <p className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
              NIT 901964511-7
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
              <a href="tel:+573172169790" className="hover:text-[#1E76B6]">+57 317 2169790</a>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
              <a href="mailto:info@tirepro.com.co" className="hover:text-[#1E76B6]">info@tirepro.com.co</a>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#1E76B6] flex-shrink-0" />
              Bogotá D.C., Colombia
            </p>
          </div>
          <p className="text-[11px] text-gray-500 mt-6">
            © {new Date().getFullYear()} TIREPRO S.A.S. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
