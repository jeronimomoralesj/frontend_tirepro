"use client";

import React, { useState } from 'react';
import { BookOpen, Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const LegalPage = () => {
  const [expandedSections, setExpandedSections] = useState({
    terms: {},
    privacy: {}
  });

  const toggleSection = (type, sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [sectionId]: !prev[type][sectionId]
      }
    }));
  };

  const renderCollapsibleSection = (type, section, index) => {
    const isExpanded = expandedSections[type][section.id] || false;
    
    return (
      <div key={section.id} id={section.id} className="mb-8 scroll-mt-24 border-b border-gray-200 pb-6">
        <button 
          onClick={() => toggleSection(type, section.id)}
          className="w-full flex justify-between items-center text-left mb-4 group"
        >
          <h3 className="text-xl md:text-2xl font-semibold text-[#0A183A] group-hover:text-[#1E76B6] transition-colors duration-200">
            {index + 1}. {section.title}
          </h3>
          {isExpanded ? 
            <ChevronUp className="text-[#1E76B6] w-6 h-6" /> : 
            <ChevronDown className="text-[#1E76B6] w-6 h-6" />
          }
        </button>
        
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {section.content.map((paragraph, i) => (
            <p key={i} className="text-gray-700 mb-4 leading-relaxed">
              {paragraph}
            </p>
          ))}
          
          {section.subsections && section.subsections.map((subsection, i) => (
            <div key={i} className="ml-4 mt-4 mb-6">
              <h4 className="text-lg font-medium text-[#173D68] mb-2">{subsection.title}</h4>
              {subsection.content.map((paragraph, j) => (
                <p key={j} className="text-gray-700 mb-3 leading-relaxed ml-2">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const terms = [
    {
      id: "company-identification",
      title: "Identificación de la Entidad Responsable",
      content: [
        "TirePro, identificada con NIT 1016912013, con domicilio en Carrera 80 #170-60, Bogotá, Colombia, es la entidad responsable de proporcionar la plataforma y los servicios relacionados. TirePro está registrada bajo las leyes de la República de Colombia y cumple con todas las normativas aplicables en materia de protección de datos, comercio electrónico y derechos de los consumidores. Para consultas, puede contactarnos mediante los siguientes canales:",
        "Correo electrónico: info@tirepro.com.co",
        "Teléfono: 3106605563",
        "Horario de atención: lunes a viernes de 8:00 a.m. a 5:00 p.m. (hora local).",
        "Formulario de contacto: Disponible en nuestra plataforma."
      ]
    },
    {
      id: "service-purpose",
      title: "Objeto del Servicio",
      content: [
        "TirePro es una plataforma digital diseñada para proporcionar herramientas innovadoras que permiten a las empresas gestionar, rastrear y optimizar el uso de sus neumáticos. Las funcionalidades principales incluyen, pero no se limitan a:",
        "- Inspección de neumáticos: Utilizamos tecnología avanzada para registrar el estado de los neumáticos y detectar problemas potenciales.",
        "- Recopilación y análisis de datos: Generamos reportes detallados utilizando inteligencia artificial (IA) para ayudar a las empresas a tomar decisiones informadas sobre el mantenimiento y la reposición de neumáticos.",
        "- Recomendaciones personalizadas: Basadas en los datos recopilados, sugerimos acciones como rotaciones, reparaciones o reemplazos de neumáticos.",
        "El objetivo de TirePro es maximizar la eficiencia operativa, reducir costos y contribuir a la sostenibilidad mediante la gestión eficiente de los recursos."
      ]
    },
    {
      id: "usage-conditions",
      title: "Condiciones de Uso",
      content: [],
      subsections: [
        {
          title: "3.1. Requisitos de Edad y Autorización",
          content: [
            "El acceso a la plataforma está permitido exclusivamente a:",
            "- Personas mayores de 18 años.",
            "- Usuarios que cuenten con la autorización expresa de los Clientes de TirePro (empresas o entidades contratantes).",
            "- Generar un usuario constituye como proveer una autorización de uso para dicho usuario.",
            "- Cada usuario generado está sujeto a estos términos y condiciones.",
            "- Proteger el acceso mediante usuarios nuevos es la responsabilidad exclusiva del Cliente, y TirePro se reserva el derecho a remover usuarios nuevos por violaciones a esta política."
          ]
        },
        {
          title: "3.2. Veracidad de la Información",
          content: [
            "Los Usuarios deben proporcionar información precisa, completa y veraz al registrarse y utilizar la plataforma. TirePro no se hace responsable por problemas derivados de información incorrecta o incompleta proporcionada por los Usuarios o Clientes."
          ]
        },
        {
          title: "3.3. Uso Prohibido",
          content: [
            "Está estrictamente prohibido:",
            "- Utilizar la plataforma para actividades contrarias a la ley, incluidas aquellas relacionadas con el fraude o el abuso de datos.",
            "- Enviar contenido ofensivo, difamatorio, obsceno o ilegal a través de la plataforma.",
            "- Intentar acceder de manera no autorizada a los sistemas de TirePro o interferir en su funcionamiento.",
            "- Utilizar scripts, robots o cualquier otro método automatizado para interactuar con la plataforma."
          ]
        },
        {
          title: "3.4. Suspensión y Terminación del Servicio",
          content: [
            "TirePro se reserva el derecho de suspender o finalizar el acceso de cualquier Usuario que incumpla estas condiciones, sin previo aviso y sin derecho a reembolso de pagos realizados."
          ]
        }
      ]
    },
    {
      id: "intellectual-property",
      title: "Propiedad Intelectual",
      content: [],
      subsections: [
        {
          title: "4.1. Derechos de Propiedad",
          content: [
            "Todo el contenido, software, tecnología y materiales proporcionados por TirePro, incluyendo logotipos, interfaces, diseños, algoritmos y documentación, son propiedad exclusiva de TirePro o sus licenciantes. Estos elementos están protegidos por las leyes de propiedad intelectual nacionales e internacionales."
          ]
        },
        {
          title: "4.2. Uso Limitado",
          content: [
            "Los Usuarios y Clientes tienen un derecho no exclusivo, no transferible y revocable para utilizar la plataforma según lo establecido en estos Términos y Condiciones. Cualquier uso no autorizado, incluyendo la reproducción, distribución o modificación del contenido, está estrictamente prohibido."
          ]
        },
        {
          title: "4.3. Reporte de Infracciones",
          content: [
            "Si detecta alguna infracción a los derechos de propiedad intelectual de TirePro, por favor notifíquelo al correo electrónico info@tirepro.com.co."
          ]
        }
      ]
    },
    {
      id: "liability-limitation",
      title: "Limitación de Responsabilidad",
      content: [],
      subsections: [
        {
          title: "5.1. Funcionamiento de la Plataforma",
          content: [
            "- TirePro no garantiza que la plataforma funcione de manera ininterrumpida o libre de errores.",
            "- La disponibilidad de la plataforma puede verse afectada por tareas de mantenimiento, actualizaciones u otros factores."
          ]
        },
        {
          title: "5.2. Recomendaciones Generadas",
          content: [
            "Las recomendaciones proporcionadas por la plataforma tienen un carácter orientativo y deben ser verificadas manualmente por los Clientes. TirePro no garantiza que las recomendaciones sean completamente precisas o adecuadas para todas las circunstancias."
          ]
        },
        {
          title: "5.3. Exclusiones de Responsabilidad",
          content: [
            "TirePro no será responsable por:",
            "- Decisiones financieras u operativas basadas en recomendaciones de la plataforma.",
            "- Daños personales, materiales o financieros relacionados con el uso de neumáticos basados en información proporcionada por TirePro.",
            "- Errores en los datos ingresados por los Usuarios o Clientes.",
            "- Comportamiento negligente o uso indebido de la información por parte de los Usuarios."
          ]
        }
      ]
    },
    {
      id: "conflict-resolution",
      title: "Mecanismos de Resolución de Conflictos",
      content: [],
      subsections: [
        {
          title: "6.1. Mediación y Arbitraje",
          content: [
            "Cualquier disputa derivada del uso de la plataforma se resolverá preferentemente mediante mediación. Si la mediación no resulta efectiva, las partes podrán recurrir al arbitraje conforme a las reglas de un centro de arbitraje reconocido en Colombia.",
            "El proceso de mediación incluirá:",
            "- La designación de un mediador neutral y capacitado.",
            "- La presentación de pruebas y argumentos por ambas partes.",
            "- La búsqueda de una solución amistosa en un plazo de 30 días.",
            "Si se recurre al arbitraje:",
            "- El fallo del árbitro será vinculante para ambas partes.",
            "- Los costos del arbitraje serán asumidos según lo determine el árbitro."
          ]
        },
        {
          title: "6.2. Jurisdicción",
          content: [
            "Si no se llega a un acuerdo mediante mediación o arbitraje, cualquier disputa se someterá a los tribunales competentes de la ciudad de Bogotá, Colombia."
          ]
        }
      ]
    },
    {
      id: "modifications",
      title: "Modificaciones",
      content: [
        "TirePro se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento para reflejar cambios en las leyes aplicables, mejoras en los servicios ofrecidos o ajustes operativos. Las modificaciones entrarán en vigor después de un periodo razonable de notificación, que no será menor a 30 días desde la comunicación a los Clientes.",
        "La notificación de cambios será realizada a través de los siguientes medios:",
        "- Publicación en la plataforma de TirePro.",
        "- Envío de un correo electrónico a la dirección registrada por el Cliente.",
        "- Notificaciones emergentes al ingresar a la plataforma.",
        "Es responsabilidad de los Clientes revisar regularmente los Términos y Condiciones. La continuación en el uso de los servicios se interpretará como aceptación de las modificaciones. Si un Cliente no está de acuerdo con los cambios, deberá comunicar su decisión de rescindir el uso del servicio antes de la fecha de entrada en vigor de las modificaciones."
      ]
    },
    {
      id: "jurisdiction",
      title: "Jurisdicción y Ley Aplicable",
      content: [
        "Este acuerdo se rige exclusivamente por las leyes de la República de Colombia, incluyendo pero no limitado a las disposiciones del Código Civil, Código de Comercio y la Ley de Comercio Electrónico. Cualquier disputa que no sea resuelta mediante mediación o arbitraje se someterá a los tribunales competentes de la ciudad de Bogotá, Colombia."
      ]
    }
  ];

  const privacy = [
    {
      id: "data-controller",
      title: "Identificación del Responsable del Tratamiento de Datos",
      content: [
        "TirePro, identificada con C.C 1016912013, con domicilio en Carrera 80 #170-60, Bogotá, Colombia, es responsable del tratamiento de los datos personales recogidos a través de la plataforma. Puede contactarnos para cualquier consulta o ejercicio de derechos en:",
        "Correo electrónico: info@tirepro.com.co",
        "Teléfono: 3106605563"
      ]
    },
    {
      id: "data-purposes",
      title: "Finalidades del Tratamiento",
      content: [
        "TirePro recopila y utiliza datos personales con los siguientes propósitos principales:"
      ],
      subsections: [
        {
          title: "Provisión de Servicios:",
          content: [
            "Brindar herramientas para la gestión y optimización de neumáticos, incluidas inspecciones, monitoreo de datos operativos y generación de recomendaciones personalizadas mediante inteligencia artificial (IA)."
          ]
        },
        {
          title: "Entrenamiento de Modelos de IA:",
          content: [
            "Utilizar datos anonimizados, incluidas imágenes de neumáticos y registros operativos, para mejorar la capacidad predictiva y la eficacia de los algoritmos actuales y futuros, garantizando siempre la protección de los datos sensibles y personales de los usuarios."
          ]
        },
        {
          title: "Análisis y Reportes:",
          content: [
            "Realizar análisis históricos y en tiempo real para ayudar a los Clientes a tomar decisiones fundamentadas sobre la gestión de sus flotas."
          ]
        },
        {
          title: "Soporte y Mejoras Continuas:",
          content: [
            "Resolver incidencias reportadas por los Clientes y mejorar continuamente la funcionalidad y seguridad de la plataforma."
          ]
        },
        {
          title: "Cumplimiento Legal:",
          content: [
            "Cumplir con las obligaciones legales, reglamentarias y contractuales aplicables en Colombia."
          ]
        }
      ]
    },
    {
      id: "collected-data",
      title: "Datos Recopilados",
      content: [
        "TirePro podrá recopilar y tratar los siguientes tipos de datos personales:",
        "- Datos de Identificación: Nombre, dirección de correo electrónico, número de teléfono, información de registro.",
        "- Datos Operativos: Detalles sobre neumáticos (marca, modelo, fabricante, costos), imágenes cargadas por los usuarios, inspecciones y reportes.",
        "- Datos de Navegación: Dirección IP, información de dispositivos utilizados para acceder a la plataforma, datos de cookies y otras tecnologías de seguimiento.",
        "- Datos Sensibles: Fotografías de neumáticos u otra información que pueda ser considerada sensible bajo la Ley 1581 de 2012."
      ]
    },
    {
      id: "sensitive-data",
      title: "Tratamiento de Datos Sensibles",
      content: [
        "El tratamiento de datos sensibles se realizará únicamente con el consentimiento expreso del titular, garantizando medidas de seguridad reforzadas. Estos datos se utilizarán exclusivamente para:",
        "- Evaluar el estado de los neumáticos mediante IA.",
        "- Entrenar modelos predictivos para generar recomendaciones precisas y personalizadas.",
        "- Proveer análisis técnicos a los Clientes.",
        "TirePro garantiza que los datos sensibles no serán utilizados para fines distintos a los autorizados ni serán divulgados a terceros sin consentimiento previo."
      ]
    },
    {
      id: "data-security",
      title: "Seguridad de la Información",
      content: [
        "TirePro adopta medidas técnicas, administrativas y físicas para garantizar la seguridad de los datos personales, entre ellas:"
      ],
      subsections: [
        {
          title: "Cifrado de Datos:",
          content: [
            "Los datos personales se cifran mediante el algoritmo Bcrypt (Blowfish) durante su almacenamiento y transmisión, lo que reduce significativamente el riesgo de accesos no autorizados."
          ]
        },
        {
          title: "Control de Acceso:",
          content: [
            "El acceso a los datos personales está restringido exclusivamente a personal autorizado que necesita procesarlos para cumplir con las finalidades descritas en esta política.",
            "Cada acceso está sujeto a controles de autenticación y auditoría."
          ]
        },
        {
          title: "Monitoreo y Auditorías:",
          content: [
            "Se realizan auditorías periódicas de seguridad para garantizar el cumplimiento de las mejores prácticas de la industria.",
            "Monitoreo continuo de posibles vulnerabilidades y amenazas."
          ]
        },
        {
          title: "Seguridad de Infraestructura:",
          content: [
            "TirePro utiliza servidores seguros alojados en proveedores certificados que cumplen con estándares internacionales como ISO/IEC 27001."
          ]
        },
        {
          title: "Políticas de Respuesta a Incidentes:",
          content: [
            "En caso de un incidente de seguridad que comprometa datos personales, TirePro implementará su plan de respuesta, informando a los titulares afectados y a las autoridades competentes dentro de los plazos establecidos por la ley."
          ]
        }
      ]
    },
    {
      id: "data-transfer",
      title: "Transferencia y Transmisión de Datos",
      content: [
        "TirePro podrá transferir datos personales a terceros proveedores de servicios o socios tecnológicos ubicados dentro y fuera de Colombia, siempre garantizando:",
        "- El cumplimiento de medidas de protección adecuadas conforme a la legislación colombiana e internacional.",
        "- Que dichos terceros ofrezcan niveles equivalentes o superiores de seguridad en el tratamiento de datos.",
        "En casos de transferencias internacionales, TirePro garantizará el cumplimiento de lo dispuesto en la Ley 1581 de 2012 y el Decreto 1377 de 2013, y aplicará las medidas contractuales necesarias para proteger la información transferida.",
        "TirePro podrá compartir datos anonimizados para fines estadísticos o de investigación, asegurando que no sea posible identificar a los titulares."
      ]
    },
    {
      id: "user-rights",
      title: "Derechos de los Titulares de los Datos",
      content: [
        "De acuerdo con la legislación colombiana, los titulares tienen los siguientes derechos:",
        "- Acceso: Conocer los datos personales que TirePro tiene almacenados y el tratamiento que se les da.",
        "- Rectificación: Solicitar la corrección de datos inexactos, incompletos o desactualizados.",
        "- Eliminación: Pedir la eliminación de los datos cuando ya no sean necesarios para las finalidades del tratamiento.",
        "- Revocación del Consentimiento: Retirar en cualquier momento el consentimiento otorgado para el tratamiento de datos personales.",
        "- Consulta y Reclamación: Presentar solicitudes relacionadas con el uso de sus datos personales a través de los canales establecidos.",
        "Para ejercer estos derechos, los titulares deben enviar una solicitud a info@tirepro.com.co indicando su identificación, la descripción de la solicitud y los documentos de soporte necesarios."
      ]
    },
    {
      id: "data-retention",
      title: "Período de Conservación de Datos",
      content: [
        "Los datos personales serán conservados durante el tiempo necesario para cumplir con las finalidades descritas en esta política y conforme a las obligaciones legales aplicables. Una vez cumplido este plazo, los datos serán eliminados de manera segura."
      ]
    },
    {
      id: "policy-changes",
      title: "Modificaciones a la Política de Privacidad",
      content: [
        "TirePro se reserva el derecho de modificar esta Política de Privacidad en cualquier momento. Las actualizaciones serán notificadas a los titulares mediante la plataforma o por correo electrónico. La continuación en el uso de los servicios tras la notificación constituye la aceptación de los términos modificados."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold mb-6">Información Legal</h1>
          <p className="text-lg md:text-xl max-w-3xl opacity-90">
            Documentación sobre nuestros términos, condiciones y políticas de privacidad para el uso de la plataforma TirePro.
          </p>
        </div>
      </div>
      
      {/* Navigation tabs */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap overflow-x-auto py-2 gap-2 md:gap-6">
            <a 
              href="#terms-section" 
              className="flex items-center whitespace-nowrap px-3 py-2 text-[#0A183A] hover:text-[#1E76B6] font-medium transition-colors duration-200"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Términos y Condiciones
            </a>
            <a 
              href="#privacy-section" 
              className="flex items-center whitespace-nowrap px-3 py-2 text-[#0A183A] hover:text-[#1E76B6] font-medium transition-colors duration-200"
            >
              <Shield className="w-5 h-5 mr-2" />
              Política de Privacidad
            </a>
            
            {/* Jump to specific sections */}
            <div className="relative group ml-auto">
              <div className="absolute right-0 mt-2 w-60 bg-white shadow-lg rounded-md border border-gray-200 py-2 hidden group-hover:block">
                <div className="max-h-96 overflow-y-auto">
                  <div className="px-3 py-1 text-sm font-semibold text-gray-600">Términos y Condiciones</div>
                  {terms.map(section => (
                    <a 
                      key={section.id} 
                      href={`#${section.id}`} 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-[#1E76B6]"
                    >
                      {section.title}
                    </a>
                  ))}
                  <div className="px-3 py-1 text-sm font-semibold text-gray-600 mt-2 border-t border-gray-100">
                    Política de Privacidad
                  </div>
                  {privacy.map(section => (
                    <a 
                      key={section.id} 
                      href={`#${section.id}`} 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-[#1E76B6]"
                    >
                      {section.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Terms and Conditions */}
          <section id="terms-section" className="mb-16">
            <div className="flex items-center mb-8 pb-4 border-b border-gray-200">
              <BookOpen className="w-8 h-8 text-[#1E76B6] mr-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-[#0A183A]">Términos y Condiciones</h2>
            </div>
            
            <div className="prose max-w-none prose-headings:text-[#0A183A] prose-a:text-[#1E76B6]">
              <p className="text-gray-700 mb-8">
                Estos términos y condiciones rigen el uso de la plataforma TirePro. Al acceder o utilizar nuestros servicios, usted acepta estar legalmente vinculado por estos términos y condiciones. Por favor, léalos cuidadosamente.
              </p>
              
              <div className="bg-[#0A183A]/5 p-6 rounded-lg mb-10">
                <p className="text-[#173D68] font-medium">
                  Última actualización: 5 de abril de 2025
                </p>
              </div>
              
              {terms.map((section, index) => renderCollapsibleSection('terms', section, index))}
            </div>
          </section>
          
          {/* Privacy Policy */}
          <section id="privacy-section">
            <div className="flex items-center mb-8 pb-4 border-b border-gray-200">
              <Shield className="w-8 h-8 text-[#1E76B6] mr-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-[#0A183A]">Política de Privacidad</h2>
            </div>
            
            <div className="prose max-w-none prose-headings:text-[#0A183A] prose-a:text-[#1E76B6]">
              <p className="text-gray-700 mb-8">
                Esta Política de Privacidad describe cómo TirePro recopila, utiliza y protege su información personal. Valoramos su privacidad y nos comprometemos a proteger sus datos personales.
              </p>
              
              <div className="bg-[#0A183A]/5 p-6 rounded-lg mb-10">
                <p className="text-[#173D68] font-medium">
                  Última actualización: 5 de abril de 2025
                </p>
              </div>
              
              {privacy.map((section, index) => renderCollapsibleSection('privacy', section, index))}
            </div>
          </section>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 mb-4">
            Para cualquier pregunta relacionada con nuestros términos legales, contáctenos a:
          </p>
          <div className="flex justify-center items-center mb-6">
            <a 
              href="mailto:info@tirepro.com.co" 
              className="flex items-center text-[#1E76B6] hover:text-[#348CCB] transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              info@tirepro.com.co
            </a>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TirePro. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;