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
  Tag,
  User,
} from 'lucide-react'
import landing from '../../public/first.png'
import Image from 'next/image'
import pcImage from '../../public/pc.png'
import logo from '../../public/logo_full.png'
import phoneImage from '../../public/phoneImg.png'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article {
  id: string | number
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  author: string
  date: string
  readTime: string
  image: string
  featured: boolean
  hashtags: string[]
}

interface TireProLandingProps {
  initialArticles: Article[]
}

// ─── CSS Variables ─────────────────────────────────────────────────────────────
// Primary dark navy:  #0A183A
// Mid blue:           #173D68
// Accent blue:        #1E76B6

// ─── Component ────────────────────────────────────────────────────────────────

const TireProLanding = ({ initialArticles = [] }: { initialArticles?: any[] }) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null)
  const [activePlan, setActivePlan] = useState(1)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const articles = initialArticles

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
      title: 'Inspecciones Digitales con IA',
      description:
        'Inteligencia artificial que automatiza inspecciones de llantas y mantiene un historial completo del estado de cada neumático de tu flota',
      stat: '10x más rápido',
    },
    {
      icon: BarChart3,
      title: 'Análisis de Costos por Kilómetro',
      description:
        'Seguimiento automático del costo por kilómetro con visibilidad total de tu inversión en llantas y mantenimiento preventivo',
      stat: '25% ahorro',
    },
    {
      icon: MapPin,
      title: 'Control de Posiciones de Llantas',
      description:
        'Gestiona y reorganiza llantas por vehículo con interfaz visual e intuitiva para optimizar rotaciones y maximizar vida útil',
      stat: '100% visual',
    },
    {
      icon: Clock,
      title: 'Predicción Inteligente de Desgaste',
      description:
        'IA que predice cuándo cambiar llantas antes de fallas críticas usando machine learning y análisis predictivo avanzado',
      stat: '95% precisión',
    },
  ]

  const plans = [
    {
      name: 'Plan Inicio',
      description: 'Para flotas pequeñas que están comenzando con gestión de llantas',
      price: 'Gratis',
      priceDetail: 'Para siempre',
      vehicles: 'Hasta 10 vehículos',
      features: [
        'Hasta 10 vehículos',
        'Un usuario',
        'Análisis básico con IA',
        'Llantas ilimitadas',
        'Monitoreo básico',
        'Reportes mensuales',
        'Soporte por email',
      ],
      cta: 'Comenzar gratis',
      popular: false,
    },
    {
      name: 'Plan Crecimiento',
      description: 'Para flotas en expansión que necesitan gestión avanzada',
      price: '$300.000',
      priceDetail: '/mes',
      vehicles: 'De 10 a 50 vehículos',
      features: [
        '10-50 vehículos',
        'Hasta 5 usuarios',
        'Análisis avanzado con IA',
        'Llantas ilimitadas',
        'Alertas predictivas en tiempo real',
        'Reportes semanales personalizados',
        'Dashboard avanzado',
        'Soporte prioritario',
        'Integración con sistemas',
      ],
      cta: 'Comenzar ahora',
      popular: true,
    },
    {
      name: 'Plan Empresarial',
      description: 'Para grandes flotas y distribuidores de neumáticos',
      price: '$1.000.000',
      priceDetail: '/mes',
      vehicles: 'Más de 50 vehículos',
      features: [
        'Vehículos ilimitados',
        'Usuarios ilimitados',
        'IA personalizada para tu flota',
        'Gestión multi-cliente',
        'Análisis predictivo avanzado',
        'Reportes en tiempo real',
        'API completa',
        'Gerente de cuenta dedicado',
        'Capacitación incluida',
        'SLA garantizado',
      ],
      cta: 'Contactar ventas',
      popular: false,
    },
  ]

  const benefits = [
    {
      icon: DollarSign,
      title: 'Reduce costos hasta 25%',
      description:
        'Optimiza la vida útil de cada llanta y evita gastos innecesarios en reemplazos prematuros',
    },
    {
      icon: Target,
      title: 'Toma decisiones inteligentes',
      description:
        'Datos en tiempo real para saber exactamente cuándo actuar y prevenir fallas',
    },
    {
      icon: Zap,
      title: 'Ahorra tiempo',
      description:
        'Automatiza inspecciones que antes tomaban horas con nuestra tecnología de IA',
    },
    {
      icon: Activity,
      title: 'Predice problemas',
      description:
        'Evita fallas críticas antes de que ocurran con análisis predictivo',
    },
  ]

  const testimonials = [
    {
      quote: 'TirePro nos ayudó a reducir nuestros costos en llantas en un 23% en solo 6 meses.',
      author: 'Carlos Méndez',
      role: 'Director de Operaciones',
      company: 'TransLogística SA',
      rating: 5,
    },
    {
      quote: 'La herramienta es increíblemente fácil de usar y las predicciones son muy precisas.',
      author: 'María González',
      role: 'Gerente de Flota',
      company: 'Distribuidora Nacional',
      rating: 5,
    },
    {
      quote: 'Ahora sabemos exactamente cuándo cambiar cada llanta. Ya no hay sorpresas.',
      author: 'Juan Rodríguez',
      role: 'Jefe de Mantenimiento',
      company: 'Cargas Express',
      rating: 5,
    },
  ]

  const faqs = [
    {
      q: '¿Cómo reduce TirePro mis costos de llantas y mantenimiento?',
      a: 'TirePro analiza el desgaste de tus llantas con IA, predice el momento óptimo de reemplazo y te ayuda a maximizar la vida útil de cada llanta. Además, identifica patrones de desgaste irregular que indican problemas mecánicos, permitiéndote actuar antes de generar gastos mayores. Nuestros clientes reportan ahorros del 20-25% en costos de llantas.',
    },
    {
      q: '¿Qué necesito para empezar a usar TirePro?',
      a: 'Solo necesitas un smartphone o computador. La app móvil funciona offline y sincroniza cuando hay conexión. La configuración toma menos de 10 minutos. Carga tus vehículos, toma fotos de las llantas y TirePro se encarga del resto con análisis automático mediante inteligencia artificial.',
    },
    {
      q: '¿Cómo funciona el plan gratuito de TirePro?',
      a: 'El plan Inicio es 100% gratuito para siempre y te permite gestionar hasta 10 vehículos con un usuario. Incluye todas las funcionalidades básicas de análisis con IA, inspecciones digitales y monitoreo. Si tu flota crece, puedes actualizar en cualquier momento a nuestros planes de pago.',
    },
    {
      q: '¿Puedo cambiar de plan después o cancelar?',
      a: 'Sí, puedes cambiar de plan en cualquier momento sin penalizaciones. Si tu flota crece y superas los 10 vehículos, te notificaremos automáticamente. El cambio es instantáneo y mantienes toda tu información histórica. No hay contratos de permanencia.',
    },
    {
      q: '¿Qué incluye el soporte técnico de TirePro?',
      a: 'Todos los planes incluyen soporte técnico. El plan Inicio tiene soporte por email en 24-48 horas. Los planes Crecimiento y Empresarial tienen soporte prioritario con respuesta en menos de 4 horas, además de un gerente de cuenta dedicado en el plan Empresarial con capacitación incluida.',
    },
    {
      q: '¿Los datos de mi flota están seguros en TirePro?',
      a: 'Sí, todos los datos están encriptados con estándares bancarios y almacenados en servidores seguros en la nube. Cumplimos con todas las normativas de protección de datos de Colombia y realizamos backups diarios automáticos. Tu información está 100% protegida.',
    },
  ]

  const process = [
    {
      step: '01',
      title: 'Registra tu flota',
      description:
        'Carga tus vehículos en minutos con nuestra interfaz intuitiva y comienza a gestionar tus llantas',
    },
    {
      step: '02',
      title: 'Inspecciona con IA',
      description:
        'Toma fotos de las llantas y nuestra IA las analiza automáticamente detectando desgaste y problemas',
    },
    {
      step: '03',
      title: 'Recibe recomendaciones',
      description:
        'Obtén alertas y predicciones precisas sobre cuándo actuar y realizar mantenimientos',
    },
    {
      step: '04',
      title: 'Optimiza y ahorra',
      description:
        'Reduce costos y maximiza la vida útil de cada llanta con decisiones basadas en datos',
    },
  ]

  return (
    <div className="bg-white text-gray-900 min-h-screen overflow-x-hidden w-full">

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm'
            : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-3 min-w-0">
              <a href="/" aria-label="TirePro - Inicio">
                <Image
                  src={logo}
                  height={50}
                  width={120}
                  alt="TirePro - Software de Gestión de Llantas con IA"
                  className="h-10 sm:h-12 md:h-14 w-auto"
                  style={{ filter: 'brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)' }}
                />
              </a>
            </div>
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <a href="#producto" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Producto</a>
              <a href="#beneficios" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Beneficios</a>
              <a href="#planes" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Planes</a>
              <a href="#preguntas" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Preguntas</a>
              <a href="/blog" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Blog</a>
              <a href="/login" className="text-sm text-gray-600 hover:text-[#0A183A] transition-colors font-medium">Ingresar</a>
              <a href="/companyregister">
                <button
                  className="text-white px-4 xl:px-6 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#1E76B6' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#173D68')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1E76B6')}
                >
                  Comenzar Gratis
                </button>
              </a>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg transition-colors flex-shrink-0"
              style={{ color: '#0A183A' }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú de navegación"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg" role="menu">
            <div className="px-4 sm:px-6 py-4 space-y-3">
              <a href="#producto" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Producto</a>
              <a href="#beneficios" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Beneficios</a>
              <a href="#planes" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Planes</a>
              <a href="#preguntas" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Preguntas</a>
              <a href="/login" className="block text-gray-600 hover:text-[#0A183A] transition-colors py-2 font-medium" role="menuitem">Ingresar</a>
              <a href="/companyregister">
                <button
                  className="w-full text-white px-6 py-3 rounded-full text-sm font-semibold mt-2"
                  style={{ backgroundColor: '#1E76B6' }}
                >
                  Comenzar Gratis
                </button>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header
        className="pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: 'linear-gradient(135deg, #f0f6fb 0%, #e8f3fa 50%, #ffffff 100%)' }}
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 w-full">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight tracking-tight"
              style={{ color: '#0A183A' }}
            >
              Software de Gestión de Llantas con IA para Flotas en Colombia
              <br />
              <span style={{ color: '#1E76B6' }}>Reduce hasta 25% tus costos</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              TirePro es el sistema líder de gestión inteligente de neumáticos con inteligencia artificial.
              Inspecciones digitales automatizadas, análisis predictivo y alertas en tiempo real para optimizar tu flota.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4">
              <a href="/companyregister" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: '#1E76B6' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#173D68')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1E76B6')}
                  aria-label="Comenzar gratis con TirePro"
                >
                  <span>Comenzar Gratis</span>
                  <ArrowRight size={20} />
                </button>
              </a>
              <a href="#producto" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto border-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all bg-white"
                  style={{ borderColor: '#1E76B6', color: '#1E76B6' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1E76B6'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white'; (e.currentTarget as HTMLButtonElement).style.color = '#1E76B6' }}
                >
                  Ver Cómo Funciona
                </button>
              </a>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              Plan Inicio gratis para siempre • Sin tarjeta de crédito • Configuración en 10 minutos
            </p>
          </div>

          <figure className="mt-12 sm:mt-16 md:mt-20 relative w-full">
            <div
              className="absolute inset-0 blur-3xl pointer-events-none rounded-3xl"
              style={{ background: 'linear-gradient(135deg, rgba(30,118,182,0.15), rgba(23,61,104,0.1))' }}
              aria-hidden="true"
            />
            <div
              className="relative w-full aspect-video rounded-2xl sm:rounded-3xl border overflow-hidden shadow-2xl"
              style={{ borderColor: 'rgba(30,118,182,0.2)', background: 'linear-gradient(135deg, #f0f6fb, #e8f3fa)' }}
            >
              <Image
                src={landing}
                alt="Dashboard TirePro - Gestión inteligente de llantas con IA mostrando análisis predictivo, control de costos y alertas en tiempo real"
                className="w-full h-full object-cover"
                priority
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(10,24,58,0.05), transparent)' }}
                aria-hidden="true"
              />
            </div>
            <figcaption className="sr-only">
              Panel de control de TirePro mostrando gestión de flota, análisis de llantas y métricas de rendimiento
            </figcaption>
          </figure>
        </div>
      </header>

      {/* Stats Section */}
      <section
        className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 w-full border-y"
        style={{ borderColor: 'rgba(30,118,182,0.15)', background: 'linear-gradient(180deg, #f8fafd 0%, #ffffff 100%)' }}
        aria-labelledby="stats-heading"
      >
        <h2 id="stats-heading" className="sr-only">Estadísticas de TirePro</h2>
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { value: '25%', label: 'Reducción de costos en llantas' },
              { value: '95%', label: 'Precisión en predicciones de desgaste' },
              { value: '10x', label: 'Más rápido que inspecciones manuales' },
              { value: '80+', label: 'Vehículos activos' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-2"
                  style={{ color: '#1E76B6' }}
                >
                  {stat.value}
                </div>
                <div className="text-gray-500 text-xs sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full bg-white"
        aria-labelledby="process-heading"
      >
        <div className="max-w-7xl mx-auto w-full">
          <header className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2
              id="process-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 sm:mb-4"
              style={{ color: '#0A183A' }}
            >
              Cómo Funciona TirePro
            </h2>
            <p className="text-lg sm:text-xl text-gray-500">
              Sistema de gestión de llantas simplificado en 4 pasos
            </p>
          </header>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {process.map((item, index) => (
              <article key={index} className="relative">
                <div className="mb-4 sm:mb-6">
                  <div
                    className="text-5xl sm:text-6xl font-bold"
                    style={{ color: 'rgba(30,118,182,0.15)' }}
                    aria-hidden="true"
                  >
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3" style={{ color: '#0A183A' }}>{item.title}</h3>
                <p className="text-sm sm:text-base text-gray-500">{item.description}</p>
                {index < process.length - 1 && (
                  <div className="hidden lg:block absolute top-12 -right-4" style={{ color: '#1E76B6', opacity: 0.4 }} aria-hidden="true">
                    <ChevronRight size={24} />
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Blog Posts */}
      <section
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: 'linear-gradient(180deg, #f0f6fb 0%, #ffffff 100%)' }}
        aria-labelledby="blog-heading"
      >
        <div className="max-w-7xl mx-auto w-full">
          <header className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2
              id="blog-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 sm:mb-4"
              style={{ color: '#0A183A' }}
            >
              Artículos Recientes del Blog
            </h2>
            <p className="text-lg sm:text-xl text-gray-500">
              Descubre consejos expertos sobre gestión de llantas, mantenimiento de flotas y optimización con IA
            </p>
          </header>

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {articles.map((article) => (
                <Link key={article.id} href={`/blog/${article.slug}`}>
                  <article
                    className="group relative bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 hover:border-[#1E76B6]/40 transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-xl"
                  >
                    <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
                      <Image
                        src={article.image}
                        alt={`Imagen de portada para el artículo: ${article.title}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        width={800}
                        height={400}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                        <div className="flex items-center space-x-1">
                          <User size={14} />
                          <span>{article.author}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{new Date(article.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{article.readTime} de lectura</span>
                        </div>
                      </div>
                      <h3
                        className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 transition-colors line-clamp-2"
                        style={{ color: '#0A183A' }}
                      >
                        {article.title}
                      </h3>
                      <p className="text-xs sm:text-sm md:text-base text-gray-500 mb-4 sm:mb-6 line-clamp-3">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Tag size={14} style={{ color: '#1E76B6' }} />
                          <span className="text-xs sm:text-sm capitalize" style={{ color: '#1E76B6' }}>
                            {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-[#1E76B6] transition-colors" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              No hay artículos recientes disponibles en este momento.
            </div>
          )}

          <div className="mt-8 sm:mt-12 md:mt-16 text-center">
            <a href="/blog">
              <button
                className="text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all inline-flex items-center space-x-2 text-sm sm:text-base shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#1E76B6' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#173D68')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1E76B6')}
              >
                <span>Ver Todos los Artículos</span>
                <ArrowRight size={18} />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="producto"
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full bg-white"
        aria-labelledby="features-heading"
      >
        <div className="max-w-7xl mx-auto w-full">
          <header className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 sm:mb-4"
              style={{ color: '#0A183A' }}
            >
              Tecnología de Punta en Gestión de Llantas
            </h2>
            <p className="text-lg sm:text-xl text-gray-500">
              Herramientas con IA diseñadas para optimizar cada aspecto de tu flota
            </p>
          </header>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <article
                key={index}
                className="group relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100 hover:border-[#1E76B6]/30 transition-all duration-300 bg-white hover:shadow-xl"
                style={{ boxShadow: '0 2px 12px rgba(30,118,182,0.06)' }}
              >
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1E76B6, #173D68)' }}
                  >
                    <feature.icon size={24} className="text-white" />
                  </div>
                  <div
                    className="px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap ml-2"
                    style={{ backgroundColor: 'rgba(30,118,182,0.1)', color: '#1E76B6' }}
                  >
                    {feature.stat}
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3" style={{ color: '#0A183A' }}>
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-500 leading-relaxed">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        id="beneficios"
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: 'linear-gradient(180deg, #f0f6fb 0%, #ffffff 100%)' }}
        aria-labelledby="benefits-heading"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
            <div className="min-w-0">
              <h2
                id="benefits-heading"
                className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 sm:mb-6 leading-tight"
                style={{ color: '#0A183A' }}
              >
                ¿Por qué elegir TirePro para tu flota?
              </h2>
              <p className="text-lg sm:text-xl text-gray-500 mb-8 sm:mb-12">
                Más que un software, TirePro es tu socio estratégico para optimizar cada peso invertido en llantas y mantenimiento
              </p>
              <div className="space-y-4 sm:space-y-6">
                {benefits.map((benefit, index) => (
                  <article
                    key={index}
                    className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all hover:bg-blue-50/60 border border-transparent hover:border-[#1E76B6]/20"
                  >
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #1E76B6, #173D68)' }}
                    >
                      <benefit.icon size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold mb-1" style={{ color: '#0A183A' }}>{benefit.title}</h3>
                      <p className="text-sm sm:text-base text-gray-500">{benefit.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <figure className="relative order-first lg:order-last w-full">
              <div
                className="aspect-square rounded-2xl sm:rounded-3xl border overflow-hidden w-full shadow-xl"
                style={{ borderColor: 'rgba(30,118,182,0.15)' }}
              >
                <Image
                  src={pcImage}
                  alt="Dashboard de análisis TirePro mostrando métricas de rendimiento, costos y predicciones de mantenimiento para flotas"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute bottom-0 right-0 w-32 h-32 sm:w-48 sm:h-48 rounded-2xl sm:rounded-3xl blur-2xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(30,118,182,0.2), rgba(23,61,104,0.1))' }}
                aria-hidden="true"
              />
              <figcaption className="sr-only">Análisis avanzado de datos de llantas en tiempo real</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full"
        style={{ backgroundColor: '#0A183A' }}
        aria-labelledby="testimonials-heading"
      >
        <div className="max-w-4xl mx-auto w-full">
          <header className="text-center mb-12 sm:mb-16">
            <h2 id="testimonials-heading" className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 sm:mb-4 text-white">
              Lo que dicen nuestros clientes
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Testimonios reales de empresas que usan TirePro</p>
          </header>
          <div className="relative">
            <div
              className="overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 min-h-[280px] sm:min-h-[320px] border"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(30,118,182,0.3)' }}
            >
              {testimonials.map((testimonial, index) => (
                <article
                  key={index}
                  className={`transition-all duration-500 ${
                    index === activeTestimonial ? 'opacity-100' : 'opacity-0 absolute inset-0 p-6 sm:p-8 md:p-12'
                  }`}
                  itemScope
                  itemType="https://schema.org/Review"
                >
                  <blockquote
                    className="text-xl sm:text-2xl md:text-3xl font-light mb-6 sm:mb-8 leading-relaxed text-white"
                    itemProp="reviewBody"
                  >
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <footer>
                    <div className="font-semibold text-base sm:text-lg text-white" itemProp="author" itemScope itemType="https://schema.org/Person">
                      <span itemProp="name">{testimonial.author}</span>
                    </div>
                    <div style={{ color: '#1E76B6' }} className="text-sm sm:text-base" itemProp="jobTitle">{testimonial.role}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs sm:text-sm" itemProp="organization">{testimonial.company}</div>
                    <meta itemProp="ratingValue" content={testimonial.rating.toString()} />
                  </footer>
                </article>
              ))}
            </div>
            <div className="flex justify-center space-x-2 mt-6 sm:mt-8" role="tablist" aria-label="Navegación de testimonios">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className="h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: index === activeTestimonial ? '#1E76B6' : 'rgba(255,255,255,0.25)',
                    width: index === activeTestimonial ? '2rem' : '0.5rem',
                  }}
                  role="tab"
                  aria-label={`Testimonial ${index + 1}`}
                  aria-selected={index === activeTestimonial}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* App Section */}
      <section
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full bg-white"
        aria-labelledby="mobile-app-heading"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
            <figure className="order-2 lg:order-1 relative w-full flex justify-center">
              <div
                className="aspect-[9/16] w-full max-w-[280px] sm:max-w-sm rounded-[2.5rem] sm:rounded-[3rem] border p-2 sm:p-3 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #e8f3fa, #d0e8f5)',
                  borderColor: 'rgba(30,118,182,0.2)',
                }}
              >
                <div className="w-full h-full bg-white rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden">
                  <Image
                    src={phoneImage}
                    alt="App móvil TirePro para iOS y Android - Inspección de llantas offline con IA"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div
                className="absolute top-1/2 left-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-3xl pointer-events-none -translate-y-1/2"
                style={{ backgroundColor: 'rgba(30,118,182,0.15)' }}
                aria-hidden="true"
              />
              <figcaption className="sr-only">Aplicación móvil de TirePro mostrando funciones de inspección y gestión</figcaption>
            </figure>
            <div className="order-1 lg:order-2 space-y-6 sm:space-y-8 min-w-0">
              <h2 id="mobile-app-heading" className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight" style={{ color: '#0A183A' }}>
                Tu flota en
                <br />
                <span style={{ color: '#1E76B6' }}>tu bolsillo</span>
              </h2>
              <p className="text-lg sm:text-xl text-gray-500 leading-relaxed">
                App móvil TirePro para inspecciones de llantas desde cualquier lugar.
                Funciona offline con sincronización automática. Disponible para iOS y Android.
              </p>
              <ul className="space-y-3 sm:space-y-4">
                {[
                  'Modo offline completo para inspecciones sin internet',
                  'Sincronización automática en segundo plano',
                  'Disponible para iOS y Android',
                ].map((item) => (
                  <li key={item} className="flex items-center space-x-3">
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#1E76B6' }}
                    >
                      <Check size={14} className="text-white" />
                    </div>
                    <span className="text-gray-700 text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="w-full sm:w-auto">
                  <button
                    className="w-full sm:w-auto text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                    style={{ backgroundColor: '#0A183A' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#173D68')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0A183A')}
                  >
                    <Download size={18} />
                    <span className="text-sm sm:text-base">Descargar en App Store</span>
                  </button>
                </a>
                <button
                  className="w-full sm:w-auto border-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all flex items-center justify-center space-x-2"
                  style={{ borderColor: '#1E76B6', color: '#1E76B6' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1E76B6'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#1E76B6' }}
                >
                  <Download size={18} />
                  <span className="text-sm sm:text-base">Descargar en Google Play</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="planes"
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: 'linear-gradient(180deg, #f0f6fb 0%, #ffffff 100%)' }}
        aria-labelledby="pricing-heading"
      >
        <div className="max-w-7xl mx-auto w-full">
          <header className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2
              id="pricing-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 sm:mb-4"
              style={{ color: '#0A183A' }}
            >
              Planes de Gestión de Llantas para Cada Etapa
            </h2>
            <p className="text-lg sm:text-xl text-gray-500">
              Comienza gratis y escala cuando tu flota crezca
            </p>
          </header>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <article
                key={index}
                onMouseEnter={() => setActivePlan(index)}
                className={`rounded-2xl sm:rounded-3xl border p-6 sm:p-8 transition-all duration-300 bg-white ${
                  plan.popular ? 'lg:scale-105' : ''
                }`}
                style={{
                  borderColor: plan.popular ? '#1E76B6' : activePlan === index ? 'rgba(30,118,182,0.3)' : '#e5e7eb',
                  boxShadow: plan.popular
                    ? '0 8px 40px rgba(30,118,182,0.2)'
                    : activePlan === index
                    ? '0 4px 20px rgba(30,118,182,0.1)'
                    : '0 2px 8px rgba(0,0,0,0.05)',
                }}
                itemScope
                itemType="https://schema.org/Offer"
              >
                {plan.popular && (
                  <div
                    className="inline-block px-3 sm:px-4 py-1 rounded-full text-white text-xs sm:text-sm font-semibold mb-3 sm:mb-4"
                    style={{ backgroundColor: '#1E76B6' }}
                  >
                    Más Popular
                  </div>
                )}
                <header className="mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-semibold mb-2" style={{ color: '#0A183A' }} itemProp="name">{plan.name}</h3>
                  <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6" itemProp="description">{plan.description}</p>
                  <div className="mb-2">
                    <span className="text-3xl sm:text-4xl font-semibold" style={{ color: '#0A183A' }} itemProp="price">{plan.price}</span>
                    <span className="text-gray-400 text-base sm:text-lg">{plan.priceDetail}</span>
                    <meta itemProp="priceCurrency" content="COP" />
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm">{plan.vehicles}</p>
                </header>
                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-2 sm:space-x-3">
                      <Check size={18} style={{ color: '#1E76B6' }} className="flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 text-xs sm:text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <a href={plan.name === 'Plan Empresarial' ? '/contact' : '/companyregister'}>
                  <button
                    className="w-full py-3 rounded-full font-semibold transition-all text-sm sm:text-base"
                    style={
                      plan.popular
                        ? { backgroundColor: '#1E76B6', color: 'white' }
                        : { border: `2px solid #1E76B6`, color: '#1E76B6', backgroundColor: 'transparent' }
                    }
                    onMouseEnter={e => {
                      if (plan.popular) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#173D68'
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1E76B6';
                        (e.currentTarget as HTMLButtonElement).style.color = 'white'
                      }
                    }}
                    onMouseLeave={e => {
                      if (plan.popular) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1E76B6'
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.color = '#1E76B6'
                      }
                    }}
                  >
                    {plan.cta}
                  </button>
                </a>
              </article>
            ))}
          </div>
          <div className="mt-12 sm:mt-16 text-center">
            <div
              className="inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full border"
              style={{ borderColor: 'rgba(30,118,182,0.2)', backgroundColor: 'rgba(30,118,182,0.05)' }}
            >
              <AlertCircle size={18} style={{ color: '#1E76B6' }} className="flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-600">
                Todos los planes incluyen llantas ilimitadas y actualizaciones gratis
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <aside className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 w-full bg-white" aria-label="Socios comerciales">
        <hr style={{ borderColor: 'rgba(30,118,182,0.15)' }} className="mb-6 sm:mb-10" />
        <p className="text-center text-sm sm:text-base text-gray-600">
          ¿Necesitas ayuda con tus llantas? Contáctanos o habla con uno de nuestros aliados distribuidores:
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6 sm:mt-10">
          <img
            className="rounded-2xl sm:rounded-3xl h-16 sm:h-20 object-contain max-w-full border border-gray-100 shadow-sm"
            src="https://i0.wp.com/reencauchadoraremax.com/wp-content/uploads/2023/01/Logo30Anos_Mesa-de-trabajo-1-copia.jpg?fit=500%2C166&ssl=1"
            alt="Reencauchadora Remax - Aliado TirePro Colombia"
            loading="lazy"
          />
          <img
            className="rounded-2xl sm:rounded-3xl h-16 sm:h-20 object-contain max-w-full border border-gray-100 shadow-sm"
            src="https://media.licdn.com/dms/image/v2/C4E0BAQFZkpMWoNQU1w/company-logo_200_200/company-logo_200_200/0/1630609548810?e=2147483647&v=beta&t=kVePfprWik91OQyyu6sgafGDp8uFGurAk0wG23Wac2Y"
            alt="Aliado distribuidor TirePro Colombia"
            loading="lazy"
          />
        </div>
        <hr style={{ borderColor: 'rgba(30,118,182,0.15)' }} className="mt-6 sm:mt-10" />
      </aside>

      {/* FAQ Section */}
      <section
        id="preguntas"
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full"
        style={{ background: 'linear-gradient(180deg, #f0f6fb 0%, #ffffff 100%)' }}
        aria-labelledby="faq-heading"
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        <div className="max-w-3xl mx-auto w-full">
          <header className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2
              id="faq-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 sm:mb-4"
              style={{ color: '#0A183A' }}
            >
              Preguntas Frecuentes sobre TirePro
            </h2>
            <p className="text-lg sm:text-xl text-gray-500">
              Todo lo que necesitas saber sobre el software de gestión de llantas
            </p>
          </header>
          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <article
                key={index}
                className="border rounded-xl sm:rounded-2xl overflow-hidden transition-all bg-white"
                style={{
                  borderColor: activeQuestion === index ? 'rgba(30,118,182,0.4)' : '#e5e7eb',
                  boxShadow: activeQuestion === index ? '0 4px 20px rgba(30,118,182,0.08)' : '0 2px 6px rgba(0,0,0,0.04)',
                }}
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <button
                  className="w-full p-4 sm:p-6 text-left flex items-center justify-between transition-all hover:bg-blue-50/40"
                  onClick={() => setActiveQuestion(activeQuestion === index ? null : index)}
                  aria-expanded={activeQuestion === index}
                >
                  <span
                    className="font-medium pr-4 sm:pr-8 text-sm sm:text-base"
                    style={{ color: '#0A183A' }}
                    itemProp="name"
                  >
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 transition-transform`}
                    style={{
                      color: '#1E76B6',
                      transform: activeQuestion === index ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                    aria-hidden="true"
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${activeQuestion === index ? 'max-h-96' : 'max-h-0'}`}
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed" itemProp="text">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Calculadora section */}
      <section
        id="calculadora"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 w-full"
        style={{ backgroundColor: '#173D68' }}
        aria-labelledby="calculadora-heading"
      >
        <h2
          id="calculadora-heading"
          className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 sm:mb-4 text-center text-white"
        >
          Quieres ver como se está comportando tu CPK?
        </h2>
        <p className="text-lg sm:text-xl text-center mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Usa nuestra calculadora gratuita para ver como tus diferentes métricas se están comportando verdaderamente
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a href="/calculadora">
            <button
              className="w-full sm:w-auto bg-white px-8 sm:px-10 py-3 sm:py-4 rounded-full font-semibold transition-all inline-flex items-center justify-center space-x-2 text-base sm:text-lg shadow-lg hover:shadow-xl"
              style={{ color: '#173D68' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e8f3fa' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white' }}
            >
              <span>Ir a la calculadora</span>
            </button>
          </a>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 w-full bg-white"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-5xl mx-auto w-full">
          <div
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden border p-8 sm:p-12 md:p-16 lg:p-20 text-center space-y-6 sm:space-y-8"
            style={{
              borderColor: 'rgba(30,118,182,0.2)',
              background: 'linear-gradient(135deg, #f0f6fb 0%, #e3f0f9 50%, #f8fafd 100%)',
              boxShadow: '0 8px 60px rgba(30,118,182,0.12)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top right, rgba(30,118,182,0.08), transparent 60%)' }}
              aria-hidden="true"
            />
            <h2
              id="cta-heading"
              className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight"
              style={{ color: '#0A183A' }}
            >
              Comienza a ahorrar en llantas
              <br />
              <span style={{ color: '#1E76B6' }}>hoy mismo con TirePro</span>
            </h2>
            <p className="relative text-base sm:text-lg md:text-xl text-gray-500 max-w-2xl mx-auto">
              Únete a las flotas colombianas que ya están optimizando sus costos con TirePro.
              Sin tarjeta de crédito, sin compromiso, sin instalación compleja.
            </p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4">
              <a href="/companyregister" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto text-white px-8 sm:px-10 py-3 sm:py-4 rounded-full font-semibold transition-all inline-flex items-center justify-center space-x-2 text-base sm:text-lg shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: '#1E76B6' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#173D68')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1E76B6')}
                >
                  <span>Crear Cuenta Gratis</span>
                  <ArrowRight size={20} />
                </button>
              </a>
              <a href="/contact" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto border-2 px-8 sm:px-10 py-3 sm:py-4 rounded-full font-semibold transition-all text-base sm:text-lg bg-white"
                  style={{ borderColor: '#1E76B6', color: '#1E76B6' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1E76B6'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white'; (e.currentTarget as HTMLButtonElement).style.color = '#1E76B6' }}
                >
                  Hablar con Ventas
                </button>
              </a>
            </div>
            <ul className="relative flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-4 text-xs sm:text-sm text-gray-500">
              {['Gratis para siempre', 'Sin tarjeta requerida', 'Configuración en 10 min'].map((item) => (
                <li key={item} className="flex items-center space-x-2">
                  <Check size={14} style={{ color: '#1E76B6' }} className="flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full"
        style={{ borderColor: 'rgba(30,118,182,0.15)', backgroundColor: '#0A183A' }}
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#1E76B6' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                </div>
                <span className="font-semibold text-white">TirePro Colombia</span>
              </div>
              <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Software de optimización inteligente de llantas para flotas de vehículos en Colombia
              </p>
              <nav aria-label="Redes sociales">
                <div className="flex space-x-4">
                  {[
                    { label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                    { label: 'Twitter', path: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
                    { label: 'LinkedIn', path: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z' },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href="#"
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#1E76B6'; (e.currentTarget as HTMLAnchorElement).style.color = 'white' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)' }}
                      aria-label={social.label}
                    >
                      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d={social.path}/></svg>
                    </a>
                  ))}
                </div>
              </nav>
            </div>
            <nav aria-labelledby="product-nav">
              <h4 id="product-nav" className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Producto</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="#producto" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#planes" className="hover:text-white transition-colors">Planes y precios</a></li>
                <li><a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="hover:text-white transition-colors">Descargar app</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </nav>
            <nav aria-labelledby="legal-nav">
              <h4 id="legal-nav" className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Legal</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="/legal#terms-section" className="hover:text-white transition-colors">Términos de servicio</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-white transition-colors">Política de privacidad</a></li>
                <li><a href="/delete" className="hover:text-white transition-colors">Eliminar datos</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </nav>
            <address className="not-italic">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-white">Contacto TirePro</h4>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li><a href="mailto:info@tirepro.com.co" className="hover:text-white transition-colors">info@tirepro.com.co</a></li>
                <li><a href="tel:+573151349122" className="hover:text-white transition-colors">+57 315 134 9122</a></li>
                <li>Bogotá, Colombia</li>
              </ul>
            </address>
          </div>
          <div
            className="pt-6 sm:pt-8 border-t flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm gap-4"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}
          >
            <p>© 2025 TirePro Colombia. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ en Colombia</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/3151349122?text=Hola,%20me%20gustaría%20saber%20más%20sobre%20TirePro"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50"
        aria-label="Contáctanos por WhatsApp para consultas sobre TirePro"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full animate-pulse" aria-hidden="true"></span>
      </a>
    </div>
  )
}

export default TireProLanding