'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  BarChart3, 
  Clock, 
  MapPin,
  Menu,
  X,
  Download,
  ArrowRight,
  Check,
  ChevronDown,
  Zap,
  ChevronRight,
  AlertCircle,
  DollarSign,
  Target,
  Activity,
} from 'lucide-react'
import landing from "../../public/first.png"
import Image from 'next/image'
import pcImage from "../../public/pc.png"
import logo from "../../public/logo_full.png"
import phoneImage from "../../public/phoneImg.png"
const TireProLanding = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [activePlan, setActivePlan] = useState(1)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: Calendar,
      title: "Inspecciones Digitales",
      description: "IA que automatiza inspecciones y mantiene un historial completo del estado de cada llanta",
      stat: "10x más rápido"
    },
    {
      icon: BarChart3,
      title: "Análisis de Costos",
      description: "Seguimiento automático del costo por kilómetro con visibilidad total de tu inversión",
      stat: "25% ahorro"
    },
    {
      icon: MapPin,
      title: "Control de Posiciones",
      description: "Gestiona y reorganiza llantas por vehículo con interfaz visual e intuitiva",
      stat: "100% visual"
    },
    {
      icon: Clock,
      title: "Predicción Inteligente",
      description: "IA que predice cuándo cambiar llantas antes de fallas críticas",
      stat: "95% precisión"
    }
  ]

  const plans = [
    {
      name: "Inicio",
      description: "Para flotas pequeñas que están comenzando",
      price: "Gratis",
      priceDetail: "Para siempre",
      vehicles: "Hasta 10 vehículos",
      features: [
        "Hasta 10 vehículos",
        "Un usuario",
        "Análisis básico con IA",
        "Llantas ilimitadas",
        "Monitoreo básico",
        "Reportes mensuales",
        "Soporte por email"
      ],
      cta: "Comenzar gratis",
      popular: false
    },
    {
      name: "Crecimiento",
      description: "Para flotas en expansión",
      price: "$300.000",
      priceDetail: "/mes",
      vehicles: "De 10 a 50 vehículos",
      features: [
        "10-50 vehículos",
        "Hasta 5 usuarios",
        "Análisis avanzado con IA",
        "Llantas ilimitadas",
        "Alertas predictivas en tiempo real",
        "Reportes semanales personalizados",
        "Dashboard avanzado",
        "Soporte prioritario",
        "Integración con sistemas"
      ],
      cta: "Comenzar ahora",
      popular: true
    },
    {
      name: "Empresarial",
      description: "Para grandes flotas y distribuidores",
      price: "$1.000.000",
      priceDetail: "/mes",
      vehicles: "Más de 50 vehículos",
      features: [
        "Vehículos ilimitados",
        "Usuarios ilimitados",
        "IA personalizada para tu flota",
        "Gestión multi-cliente",
        "Análisis predictivo avanzado",
        "Reportes en tiempo real",
        "API completa",
        "Gerente de cuenta dedicado",
        "Capacitación incluida",
        "SLA garantizado"
      ],
      cta: "Contactar ventas",
      popular: false
    }
  ]

  const benefits = [
    {
      icon: DollarSign,
      title: "Reduce costos hasta 25%",
      description: "Optimiza la vida útil de cada llanta y evita gastos innecesarios"
    },
    {
      icon: Target,
      title: "Toma decisiones inteligentes",
      description: "Datos en tiempo real para saber exactamente cuándo actuar"
    },
    {
      icon: Zap,
      title: "Ahorra tiempo",
      description: "Automatiza inspecciones que antes tomaban horas"
    },
    {
      icon: Activity,
      title: "Predice problemas",
      description: "Evita fallas críticas antes de que ocurran"
    }
  ]

  const testimonials = [
    {
      quote: "TirePro nos ayudó a reducir nuestros costos en llantas en un 23% en solo 6 meses.",
      author: "Carlos Méndez",
      role: "Director de Operaciones",
      company: "TransLogística SA"
    },
    {
      quote: "La herramienta es increíblemente fácil de usar y las predicciones son muy precisas.",
      author: "María González",
      role: "Gerente de Flota",
      company: "Distribuidora Nacional"
    },
    {
      quote: "Ahora sabemos exactamente cuándo cambiar cada llanta. Ya no hay sorpresas.",
      author: "Juan Rodríguez",
      role: "Jefe de Mantenimiento",
      company: "Cargas Express"
    }
  ]

  const faqs = [
    {
      q: "¿Cómo reduce TirePro mis costos?",
      a: "TirePro analiza el desgaste de tus llantas con IA, predice el momento óptimo de reemplazo y te ayuda a maximizar la vida útil de cada llanta. Además, identifica patrones de desgaste irregular que indican problemas mecánicos, permitiéndote actuar antes de generar gastos mayores."
    },
    {
      q: "¿Qué necesito para empezar?",
      a: "Solo necesitas un smartphone o computador. La app móvil funciona offline y sincroniza cuando hay conexión. La configuración toma menos de 10 minutos. Carga tus vehículos, toma fotos de las llantas y TirePro se encarga del resto."
    },
    {
      q: "¿Cómo funciona el plan gratuito?",
      a: "El plan Inicio es 100% gratuito para siempre y te permite gestionar hasta 10 vehículos con un usuario. Incluye todas las funcionalidades básicas de análisis con IA y monitoreo. Si tu flota crece, puedes actualizar en cualquier momento."
    },
    {
      q: "¿Puedo cambiar de plan después?",
      a: "Sí, puedes cambiar de plan en cualquier momento. Si tu flota crece y superas los 10 vehículos, te notificaremos automáticamente. El cambio es instantáneo y mantienes toda tu información histórica."
    },
    {
      q: "¿Qué incluye el soporte?",
      a: "Todos los planes incluyen soporte técnico. El plan Inicio tiene soporte por email en 24-48 horas. Los planes Crecimiento y Empresarial tienen soporte prioritario con respuesta en menos de 4 horas, además de un gerente de cuenta dedicado en el plan Empresarial."
    },
    {
      q: "¿Los datos están seguros?",
      a: "Sí, todos los datos están encriptados y almacenados en servidores seguros en la nube. Cumplimos con todas las normativas de protección de datos y realizamos backups diarios automáticos."
    }
  ]

  const process = [
    {
      step: "01",
      title: "Registra tu flota",
      description: "Carga tus vehículos en minutos con nuestra interfaz intuitiva"
    },
    {
      step: "02",
      title: "Inspecciona con IA",
      description: "Toma fotos de las llantas y nuestra IA las analiza automáticamente"
    },
    {
      step: "03",
      title: "Recibe recomendaciones",
      description: "Obtén alertas y predicciones precisas sobre cuándo actuar"
    },
    {
      step: "04",
      title: "Optimiza y ahorra",
      description: "Reduce costos y maximiza la vida útil de cada llanta"
    }
  ]

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <span className="text-xl font-semibold"><Image src={logo} height={60} alt='logo' className='filter brightness-0 invert'/></span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#producto" className="text-sm text-gray-400 hover:text-white transition-colors">Producto</a>
              <a href="#beneficios" className="text-sm text-gray-400 hover:text-white transition-colors">Beneficios</a>
              <a href="#planes" className="text-sm text-gray-400 hover:text-white transition-colors">Planes</a>
              <a href="#preguntas" className="text-sm text-gray-400 hover:text-white transition-colors">Preguntas</a>
              <a href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</a>
              <a href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Ingresar</a>
              <a href="/companyregister">
                <button className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-all">
                  Comenzar
                </button>
              </a>
            </div>

            <button 
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-black border-t border-white/10">
            <div className="px-6 py-4 space-y-4">
              <a href="#producto" className="block text-gray-400 hover:text-white transition-colors">Producto</a>
              <a href="#beneficios" className="block text-gray-400 hover:text-white transition-colors">Beneficios</a>
              <a href="#planes" className="block text-gray-400 hover:text-white transition-colors">Planes</a>
              <a href="#preguntas" className="block text-gray-400 hover:text-white transition-colors">Preguntas</a>
              <a href="/login" className="block text-gray-400 hover:text-white transition-colors">Ingresar</a>
              <a href="/companyregister">
                <button className="w-full bg-white text-black px-6 py-3 rounded-full text-sm font-medium">
                  Comenzar
                </button>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-semibold leading-tight tracking-tight">
              Reduce hasta un 25%
              <br />
              <span className="text-gray-500">tus costos en llantas</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Inteligencia artificial que analiza, predice y optimiza cada aspecto de tu flota
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a href="/companyregister">
                <button className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition-all flex items-center space-x-2">
                  <span>Comenzar gratis</span>
                  <ArrowRight size={20} />
                </button>
              </a>
              <a href="#producto">
                <button className="border border-white/20 px-8 py-4 rounded-full font-medium hover:bg-white/5 transition-all">
                  Ver cómo funciona
                </button>
              </a>
            </div>
            <p className="text-sm text-gray-500">Plan Inicio gratis para siempre • Sin tarjeta de crédito</p>
          </div>

          {/* Hero Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl"></div>
            <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <Image 
                src={landing} 
                alt="Dashboard"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 lg:px-8 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-semibold mb-2 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">25%</div>
              <div className="text-gray-500 text-sm">Reducción de costos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-semibold mb-2 bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">95%</div>
              <div className="text-gray-500 text-sm">Precisión en predicciones</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-semibold mb-2 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">10x</div>
              <div className="text-gray-500 text-sm">Más rápido que manual</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-semibold mb-2 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">24/7</div>
              <div className="text-gray-500 text-sm">Monitoreo continuo</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              Cómo funciona
            </h2>
            <p className="text-xl text-gray-500">Simplificamos la gestión de tu flota en 4 pasos</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {process.map((item, index) => (
              <div key={index} className="relative">
                <div className="mb-6">
                  <div className="text-6xl font-bold text-white/10">{item.step}</div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-gray-500">{item.description}</p>
                {index < process.length - 1 && (
                  <div className="hidden md:block absolute top-12 -right-4 text-gray-700">
                    <ChevronRight size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="producto" className="py-32 px-6 lg:px-8 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              Tecnología de punta
            </h2>
            <p className="text-xl text-gray-500">Herramientas diseñadas para optimizar cada aspecto</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative p-8 rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-300 bg-gradient-to-br from-white/5 to-transparent hover:from-white/10"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <feature.icon size={28} className="text-white" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
                    {feature.stat}
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-32 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-semibold mb-6 leading-tight">
                ¿Por qué elegir
                <br />
                <span className="text-gray-500">TirePro?</span>
              </h2>
              <p className="text-xl text-gray-400 mb-12">
                Más que un software, es tu socio estratégico para optimizar cada peso invertido en llantas
              </p>
              
              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-white/5 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <benefit.icon size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-gray-500">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl border border-white/10 overflow-hidden">
                <Image 
                  src={pcImage} 
                  alt="Analytics"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-32 px-6 lg:px-8 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              Lo que dicen nuestros clientes
            </h2>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-12">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`transition-all duration-500 ${
                    index === activeTestimonial ? 'opacity-100' : 'opacity-0 absolute inset-0 p-12'
                  }`}
                >
                  <p className="text-2xl md:text-3xl font-light mb-8 leading-relaxed">
                    {testimonial.quote}
                  </p>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-gray-500">{testimonial.role}</div>
                    <div className="text-gray-600 text-sm">{testimonial.company}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeTestimonial ? 'bg-white w-8' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* App Section */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="aspect-[9/16] max-w-sm mx-auto bg-gradient-to-br from-gray-800 to-gray-900 rounded-[3rem] border border-white/10 p-3 shadow-2xl">
                <div className="w-full h-full bg-black rounded-[2.5rem] overflow-hidden">
                  <Image 
                    src={phoneImage}
                    alt="App móvil"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute top-1/2 -left-6 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="order-1 lg:order-2 space-y-8">
              <h2 className="text-4xl md:text-5xl font-semibold leading-tight">
                Tu flota en
                <br />
                <span className="text-gray-500">tu bolsillo</span>
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                Inspecciona y gestiona desde cualquier lugar. La app funciona offline y sincroniza automáticamente cuando hay conexión.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <span className="text-gray-300">Modo offline completo</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <span className="text-gray-300">Sincronización automática</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <span className="text-gray-300">Disponible iOS y Android</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <a href="https://apps.apple.com/us/app/tirepro/id6741497732">
                  <button className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition-all flex items-center space-x-2">
                    <Download size={20} />
                    <span>App Store</span>
                  </button>
                </a>
                <button className="border border-white/20 px-8 py-4 rounded-full font-medium hover:bg-white/5 transition-all flex items-center space-x-2">
                  <Download size={20} />
                  <span>Google Play</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planes" className="py-32 px-6 lg:px-8 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              Planes para cada etapa
            </h2>
            <p className="text-xl text-gray-500">Comienza gratis y escala cuando tu flota crezca</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={index}
                onMouseEnter={() => setActivePlan(index)}
                className={`rounded-3xl border p-8 transition-all duration-300 ${
                  plan.popular
                    ? 'border-blue-500 bg-gradient-to-b from-blue-500/10 to-transparent scale-105 shadow-2xl shadow-blue-500/20' 
                    : activePlan === index
                    ? 'border-white/20 bg-white/5'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                {plan.popular && (
                  <div className="inline-block px-4 py-1 rounded-full bg-blue-500 text-white text-sm font-medium mb-4">
                    Más popular
                  </div>
                )}
                
                <div className="mb-8">
                  <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
                  <div className="mb-2">
                    <span className="text-4xl font-semibold">{plan.price}</span>
                    <span className="text-gray-500 text-lg">{plan.priceDetail}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{plan.vehicles}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      <Check size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-400 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a href={plan.name === "Empresarial" ? "/contact" : "/companyregister"}>
                  <button className={`w-full py-3 rounded-full font-medium transition-all ${
                    plan.popular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'border border-white/20 hover:bg-white/5'
                  }`}>
                    {plan.cta}
                  </button>
                </a>
              </div>
            ))}
          </div>

          {/* Pricing comparison note */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center space-x-2 px-6 py-3 rounded-full border border-white/20 bg-white/5">
              <AlertCircle size={20} className="text-blue-400" />
              <span className="text-sm text-gray-400">Todos los planes incluyen llantas ilimitadas y actualizaciones gratis</span>
            </div>
          </div>
        </div>
      </section>

      <div>
        <hr className='mb-10 ml-20 mr-20'/>
        <p className='text-center'>Si necesitas ayuda tambien puedes contactar a uno de nuestros aliado:</p>
        <div className='flex justify-center mt-10'>
          <img className='rounded-3xl h-20 m-2' src='https://i0.wp.com/reencauchadoraremax.com/wp-content/uploads/2023/01/Logo30Anos_Mesa-de-trabajo-1-copia.jpg?fit=500%2C166&ssl=1'/>
          <img className='rounded-3xl h-20 m-2' src='https://media.licdn.com/dms/image/v2/C4E0BAQFZkpMWoNQU1w/company-logo_200_200/company-logo_200_200/0/1630609548810?e=2147483647&v=beta&t=kVePfprWik91OQyyu6sgafGDp8uFGurAk0wG23Wac2Y'/>
        </div>
        <hr className='mt-10 ml-20 mr-20'/>
      </div>

      {/* FAQ Section */}
      <section id="preguntas" className="py-32 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-4">
              Preguntas frecuentes
            </h2>
            <p className="text-xl text-gray-500">Todo lo que necesitas saber sobre TirePro</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
              >
                <button
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-all"
                  onClick={() => setActiveQuestion(activeQuestion === index ? null : index)}
                >
                  <span className="font-medium pr-8">{faq.q}</span>
                  <ChevronDown 
                    size={20} 
                    className={`flex-shrink-0 transition-transform ${
                      activeQuestion === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${
                  activeQuestion === index ? 'max-h-96' : 'max-h-0'
                }`}>
                  <div className="px-6 pb-6">
                    <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent"></div>
            <div className="relative p-12 md:p-20 text-center space-y-8">
              <h2 className="text-4xl md:text-6xl font-semibold leading-tight">
                Comienza a ahorrar
                <br />
                <span className="text-gray-400">hoy mismo</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Únete a las flotas que ya están optimizando sus costos con TirePro. Sin tarjeta de crédito, sin compromiso.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <a href="/companyregister">
                  <button className="bg-white text-black px-10 py-4 rounded-full font-medium hover:bg-gray-100 transition-all inline-flex items-center space-x-2 text-lg">
                    <span>Crear cuenta gratis</span>
                    <ArrowRight size={22} />
                  </button>
                </a>
                <a href="/contact">
                  <button className="border border-white/20 px-10 py-4 rounded-full font-medium hover:bg-white/5 transition-all text-lg">
                    Hablar con ventas
                  </button>
                </a>
              </div>
              <div className="flex items-center justify-center space-x-8 pt-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <Check size={16} className="text-green-500" />
                  <span>Gratis para siempre</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check size={16} className="text-green-500" />
                  <span>Sin tarjeta requerida</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check size={16} className="text-green-500" />
                  <span>Configuración en 10 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                </div>
                <span className="font-semibold">TirePro</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Optimización inteligente para flotas de vehículos
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#producto" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#planes" className="hover:text-white transition-colors">Planes y precios</a></li>
                <li><a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="hover:text-white transition-colors">Descargar app</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/legal#terms-section" className="hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="/delete" className="hover:text-white transition-colors">Eliminar datos</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>info@tirepro.com.co</li>
                <li>+57 315 134 9122</li>
                <li>Bogotá, Colombia</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>© 2025 TirePro. Todos los derechos reservados.</p>
            <p className="mt-4 md:mt-0">Hecho con ❤️ en Colombia</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/3151349122"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50 group"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
      </a>
    </div>
  )
}

export default TireProLanding