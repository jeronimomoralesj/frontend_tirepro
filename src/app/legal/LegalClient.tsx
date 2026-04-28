"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const LegalPage = () => {
  const [expandedSections, setExpandedSections] = useState({
    terms: {},
    privacy: {}
  });
  
  // Language detection state
  const [language, setLanguage] = useState('es');

  // Language detection effect
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      const saved = localStorage.getItem('preferredLanguage');
      if (saved) {
        setLanguage(saved);
        return;
      }
      
      try {
        const pos = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject('no geo');
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
        );
        
        if (resp.ok) {
          const { countryCode } = await resp.json();
          const lang = (countryCode === 'US' || countryCode === 'CA') ? 'en' : 'es';
          setLanguage(lang);
          localStorage.setItem('preferredLanguage', lang);
          return;
        }
      } catch {
        // Browser fallback
        const browser = navigator.language || navigator.languages?.[0] || 'es';
        const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
        setLanguage(lang);
        localStorage.setItem('preferredLanguage', lang);
      }
    };

    detectAndSetLanguage();
  }, []);

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

  // Content based on language
  const content = language === 'en' ? {
    title: "Legal Information",
    subtitle: "Documentation about our terms, conditions and privacy policies for using the TirePro platform.",
    termsTitle: "Terms and Conditions",
    privacyTitle: "Privacy Policy",
    termsIntro: "These terms and conditions govern the use of the TirePro platform. By accessing or using our services, you agree to be legally bound by these terms and conditions. Please read them carefully.",
    privacyIntro: "This Privacy Policy describes how TirePro collects, uses and protects your personal information. We value your privacy and are committed to protecting your personal data.",
    lastUpdated: "Last updated: April 5, 2025",
    contactText: "For any questions related to our legal terms, contact us at:",
    copyright: "All rights reserved.",
    
    terms: [
      {
        id: "company-identification",
        title: "Company Identification",
        content: [
          "TirePro, identified with NIT 1016912013, domiciled at Carrera 80 #170-60, Bogotá, Colombia, is the entity responsible for providing the platform and related services. TirePro is registered under the laws of the Republic of Colombia and complies with all applicable regulations regarding data protection, electronic commerce and consumer rights.",
          "For inquiries, you can contact us through the following channels:",
          "Email: info@tirepro.com.co",
          "Phone: 3106605563",
          "Business hours: Monday to Friday from 8:00 a.m. to 5:00 p.m. (local time)."
        ]
      },
      {
        id: "service-purpose",
        title: "Service Purpose",
        content: [
          "TirePro is a digital platform designed to provide innovative tools that allow companies to manage, track and optimize the use of their tires. Main functionalities include:",
          "- Tire inspection: We use advanced technology to record tire condition and detect potential problems.",
          "- Data collection and analysis: We generate detailed reports using artificial intelligence (AI) to help companies make informed decisions about tire maintenance and replacement.",
          "- Personalized recommendations: Based on collected data, we suggest actions such as rotations, repairs or tire replacements.",
          "TirePro's objective is to maximize operational efficiency, reduce costs and contribute to sustainability through efficient resource management."
        ]
      },
      {
        id: "usage-conditions",
        title: "Usage Conditions",
        content: [],
        subsections: [
          {
            title: "3.1. Age Requirements and Authorization",
            content: [
              "Platform access is permitted exclusively to:",
              "- Persons over 18 years of age.",
              "- Users who have express authorization from TirePro Clients (contracting companies or entities).",
              "- Creating a user account constitutes providing authorization for use of said user.",
              "- Each generated user is subject to these terms and conditions."
            ]
          },
          {
            title: "3.2. Information Accuracy",
            content: [
              "Users must provide accurate, complete and truthful information when registering and using the platform. TirePro is not responsible for problems arising from incorrect or incomplete information provided by Users or Clients."
            ]
          },
          {
            title: "3.3. Prohibited Use",
            content: [
              "It is strictly prohibited to:",
              "- Use the platform for activities contrary to law, including those related to fraud or data abuse.",
              "- Send offensive, defamatory, obscene or illegal content through the platform.",
              "- Attempt unauthorized access to TirePro systems or interfere with their operation."
            ]
          }
        ]
      },
      {
        id: "intellectual-property",
        title: "Intellectual Property",
        content: [],
        subsections: [
          {
            title: "4.1. Property Rights",
            content: [
              "All content, software, technology and materials provided by TirePro, including logos, interfaces, designs, algorithms and documentation, are the exclusive property of TirePro or its licensors. These elements are protected by national and international intellectual property laws."
            ]
          },
          {
            title: "4.2. Limited Use",
            content: [
              "Users and Clients have a non-exclusive, non-transferable and revocable right to use the platform as established in these Terms and Conditions. Any unauthorized use, including reproduction, distribution or modification of content, is strictly prohibited."
            ]
          }
        ]
      },
      {
        id: "liability-limitation",
        title: "Limitation of Liability",
        content: [],
        subsections: [
          {
            title: "5.1. Platform Operation",
            content: [
              "TirePro does not guarantee that the platform will function uninterrupted or error-free. Platform availability may be affected by maintenance tasks, updates or other factors."
            ]
          },
          {
            title: "5.2. Generated Recommendations",
            content: [
              "Recommendations provided by the platform are advisory in nature and must be manually verified by Clients. TirePro does not guarantee that recommendations are completely accurate or suitable for all circumstances."
            ]
          }
        ]
      },
      {
        id: "modifications",
        title: "Modifications",
        content: [
          "TirePro reserves the right to modify these Terms and Conditions at any time. Modifications will take effect after a reasonable notice period of no less than 30 days from communication to Clients.",
          "It is the responsibility of Clients to regularly review the Terms and Conditions. Continued use of services will be interpreted as acceptance of modifications."
        ]
      },
      {
        id: "jurisdiction",
        title: "Jurisdiction and Applicable Law",
        content: [
          "This agreement is governed exclusively by the laws of the Republic of Colombia and the United States where applicable. Any dispute not resolved through mediation or arbitration will be submitted to the competent courts of Bogotá, Colombia or applicable US jurisdiction."
        ]
      }
    ],

    privacy: [
      {
        id: "data-controller",
        title: "Data Controller Identification",
        content: [
          "TirePro, identified with NIT 1016912013, domiciled at Carrera 80 #170-60, Bogotá, Colombia, is responsible for the processing of personal data collected through the platform.",
          "Contact us for any inquiry or exercise of rights at:",
          "Email: info@tirepro.com.co",
          "Phone: 3106605563"
        ]
      },
      {
        id: "data-purposes",
        title: "Processing Purposes",
        content: [
          "TirePro collects and uses personal data for the following main purposes:"
        ],
        subsections: [
          {
            title: "Service Provision:",
            content: [
              "Provide tools for tire management and optimization, including inspections, operational data monitoring and generation of personalized recommendations through artificial intelligence (AI)."
            ]
          },
          {
            title: "AI Model Training:",
            content: [
              "Use anonymized data, including tire images and operational records, to improve the predictive capacity and effectiveness of current and future algorithms, always ensuring the protection of sensitive and personal user data."
            ]
          },
          {
            title: "Analysis and Reports:",
            content: [
              "Perform historical and real-time analysis to help Clients make informed decisions about fleet management."
            ]
          }
        ]
      },
      {
        id: "collected-data",
        title: "Collected Data",
        content: [
          "TirePro may collect and process the following types of personal data:",
          "- Identification Data: Name, email address, phone number, registration information.",
          "- Operational Data: Tire details (brand, model, manufacturer, costs), images uploaded by users, inspections and reports.",
          "- Navigation Data: IP address, device information used to access the platform, cookie data and other tracking technologies."
        ]
      },
      {
        id: "data-security",
        title: "Information Security",
        content: [
          "TirePro adopts technical, administrative and physical measures to guarantee the security of personal data, including:"
        ],
        subsections: [
          {
            title: "Data Encryption:",
            content: [
              "Personal data is encrypted using the Bcrypt (Blowfish) algorithm during storage and transmission, significantly reducing the risk of unauthorized access."
            ]
          },
          {
            title: "Access Control:",
            content: [
              "Access to personal data is restricted exclusively to authorized personnel who need to process it to fulfill the purposes described in this policy."
            ]
          }
        ]
      },
      {
        id: "user-rights",
        title: "Data Subject Rights",
        content: [
          "In accordance with applicable legislation, data subjects have the following rights:",
          "- Access: Know the personal data that TirePro has stored and the treatment given to them.",
          "- Rectification: Request correction of inaccurate, incomplete or outdated data.",
          "- Deletion: Request deletion of data when no longer necessary for processing purposes.",
          "- Consent Revocation: Withdraw at any time the consent granted for personal data processing.",
          "To exercise these rights, subjects must send a request to info@tirepro.com.co indicating their identification, description of the request and necessary supporting documents."
        ]
      }
    ]
  } : {
    title: "Información Legal",
    subtitle: "Documentación sobre nuestros términos, condiciones y políticas de privacidad para el uso de la plataforma TirePro.",
    termsTitle: "Términos y Condiciones",
    privacyTitle: "Política de Privacidad",
    termsIntro: "Estos términos y condiciones rigen el uso de la plataforma TirePro. Al acceder o utilizar nuestros servicios, usted acepta estar legalmente vinculado por estos términos y condiciones. Por favor, léalos cuidadosamente.",
    privacyIntro: "Esta Política de Privacidad describe cómo TirePro recopila, utiliza y protege su información personal. Valoramos su privacidad y nos comprometemos a proteger sus datos personales.",
    lastUpdated: "Última actualización: 5 de abril de 2025",
    contactText: "Para cualquier pregunta relacionada con nuestros términos legales, contáctenos a:",
    copyright: "Todos los derechos reservados.",

    terms: [
      {
        id: "company-identification",
        title: "Identificación de la Entidad Responsable",
        content: [
          "TirePro, identificada con NIT 1016912013, con domicilio en Carrera 80 #170-60, Bogotá, Colombia, es la entidad responsable de proporcionar la plataforma y los servicios relacionados. TirePro está registrada bajo las leyes de la República de Colombia y cumple con todas las normativas aplicables en materia de protección de datos, comercio electrónico y derechos de los consumidores.",
          "Para consultas, puede contactarnos mediante los siguientes canales:",
          "Correo electrónico: info@tirepro.com.co",
          "Teléfono: 3106605563",
          "Horario de atención: lunes a viernes de 8:00 a.m. a 5:00 p.m. (hora local)."
        ]
      },
      {
        id: "service-purpose",
        title: "Objeto del Servicio",
        content: [
          "TirePro es una plataforma digital diseñada para proporcionar herramientas innovadoras que permiten a las empresas gestionar, rastrear y optimizar el uso de sus neumáticos. Las funcionalidades principales incluyen:",
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
              "- Cada usuario generado está sujeto a estos términos y condiciones."
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
              "- Intentar acceder de manera no autorizada a los sistemas de TirePro o interferir en su funcionamiento."
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
              "TirePro no garantiza que la plataforma funcione de manera ininterrumpida o libre de errores. La disponibilidad de la plataforma puede verse afectada por tareas de mantenimiento, actualizaciones u otros factores."
            ]
          },
          {
            title: "5.2. Recomendaciones Generadas",
            content: [
              "Las recomendaciones proporcionadas por la plataforma tienen un carácter orientativo y deben ser verificadas manualmente por los Clientes. TirePro no garantiza que las recomendaciones sean completamente precisas o adecuadas para todas las circunstancias."
            ]
          }
        ]
      },
      {
        id: "modifications",
        title: "Modificaciones",
        content: [
          "TirePro se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones entrarán en vigor después de un periodo razonable de notificación, que no será menor a 30 días desde la comunicación a los Clientes.",
          "Es responsabilidad de los Clientes revisar regularmente los Términos y Condiciones. La continuación en el uso de los servicios se interpretará como aceptación de las modificaciones."
        ]
      },
      {
        id: "jurisdiction",
        title: "Jurisdicción y Ley Aplicable",
        content: [
          "Este acuerdo se rige exclusivamente por las leyes de la República de Colombia. Cualquier disputa que no sea resuelta mediante mediación o arbitraje se someterá a los tribunales competentes de la ciudad de Bogotá, Colombia."
        ]
      }
    ],

    privacy: [
      {
        id: "data-controller",
        title: "Identificación del Responsable del Tratamiento de Datos",
        content: [
          "TirePro, identificada con C.C 1016912013, con domicilio en Carrera 80 #170-60, Bogotá, Colombia, es responsable del tratamiento de los datos personales recogidos a través de la plataforma.",
          "Puede contactarnos para cualquier consulta o ejercicio de derechos en:",
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
          "- Datos de Navegación: Dirección IP, información de dispositivos utilizados para acceder a la plataforma, datos de cookies y otras tecnologías de seguimiento."
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
              "El acceso a los datos personales está restringido exclusivamente a personal autorizado que necesita procesarlos para cumplir con las finalidades descritas en esta política."
            ]
          }
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
          "Para ejercer estos derechos, los titulares deben enviar una solicitud a info@tirepro.com.co indicando su identificación, la descripción de la solicitud y los documentos de soporte necesarios."
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold mb-6">{content.title}</h1>
          <p className="text-lg md:text-xl max-w-3xl opacity-90">
            {content.subtitle}
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
              {content.termsTitle}
            </a>
            <a 
              href="#privacy-section" 
              className="flex items-center whitespace-nowrap px-3 py-2 text-[#0A183A] hover:text-[#1E76B6] font-medium transition-colors duration-200"
            >
              <Shield className="w-5 h-5 mr-2" />
              {content.privacyTitle}
            </a>
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
              <h2 className="text-2xl md:text-3xl font-bold text-[#0A183A]">{content.termsTitle}</h2>
            </div>
            
            <div className="prose max-w-none prose-headings:text-[#0A183A] prose-a:text-[#1E76B6]">
              <p className="text-gray-700 mb-8">
                {content.termsIntro}
              </p>
              
              <div className="bg-[#0A183A]/5 p-6 rounded-lg mb-10">
                <p className="text-[#173D68] font-medium">
                  {content.lastUpdated}
                </p>
              </div>
              
              {content.terms.map((section, index) => renderCollapsibleSection('terms', section, index))}
            </div>
          </section>
          
          {/* Privacy Policy */}
          <section id="privacy-section">
            <div className="flex items-center mb-8 pb-4 border-b border-gray-200">
              <Shield className="w-8 h-8 text-[#1E76B6] mr-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-[#0A183A]">{content.privacyTitle}</h2>
            </div>
            
            <div className="prose max-w-none prose-headings:text-[#0A183A] prose-a:text-[#1E76B6]">
              <p className="text-gray-700 mb-8">
                {content.privacyIntro}
              </p>
              
              <div className="bg-[#0A183A]/5 p-6 rounded-lg mb-10">
                <p className="text-[#173D68] font-medium">
                  {content.lastUpdated}
                </p>
              </div>
              
              {content.privacy.map((section, index) => renderCollapsibleSection('privacy', section, index))}
            </div>
          </section>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 mb-4">
            {content.contactText}
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
            © {new Date().getFullYear()} TirePro. {content.copyright}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;