'use client'

import React, { useState, useEffect } from 'react'
import {
  Menu, X, Mail, Phone, MapPin, Send, Car, Building, MessageCircle, User, CheckCircle, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from "../../../public/logo_text.png"
import logoTire from "../../../public/logo_tire.png"

// ── Translations ──────────────────────────────────────────────────────────────

const translations = {
  en: {
    title: "Contact TirePro",
    subtitle: "Ready to reduce your tire costs by up to 25%? Tell us about your fleet and we'll help you optimize your management.",
    formTitle: "Tell us about your fleet",
    formSubtitle: "We'll contact you within 24 hours",
    companyName: "Company Name",
    contactName: "Contact Name",
    email: "Email",
    phone: "Phone",
    vehicles: "How many vehicles do you have?",
    message: "Message",
    send: "Send Message",
    sending: "Sending...",
    success: "Message Sent!",
    successMsg: "We have received your information correctly. Our team will contact you within the next 24 hours.",
    error: "Error Sending",
    errorMsg: "There was a problem sending your message. Please try again or contact us directly at +1 (555) 123-4567.",
    perfect: "Perfect!",
    understood: "Understood",
    navItems: ['Platform', 'Plans', 'Contact', 'Blog'],
    login: "Login",
    start: "Get Started",
    vehicleOptions: [
      "Select a range",
      "1 - 5 vehicles",
      "6 - 20 vehicles",
      "21 - 50 vehicles",
      "51 - 100 vehicles",
      "More than 100 vehicles"
    ]
  },
  es: {
    title: "Contacta con TirePro",
    subtitle: "¿Listo para reducir hasta un 25% tus costos en llantas? Cuéntanos sobre tu flota y te ayudaremos a optimizar tu gestión.",
    formTitle: "Háblanos de tu flota",
    formSubtitle: "Te contactaremos en menos de 24 horas",
    companyName: "Nombre de la Empresa",
    contactName: "Nombre de Contacto",
    email: "Email",
    phone: "Teléfono",
    vehicles: "¿Cuántos vehículos tienes?",
    message: "Mensaje",
    send: "Enviar Mensaje",
    sending: "Enviando...",
    success: "¡Mensaje Enviado!",
    successMsg: "Hemos recibido tu información correctamente. Nuestro equipo se pondrá en contacto contigo en las próximas 24 horas.",
    error: "Error al Enviar",
    errorMsg: "Hubo un problema al enviar tu mensaje. Por favor, intenta de nuevo o contáctanos directamente al +57 310 660 5563.",
    perfect: "¡Perfecto!",
    understood: "Entendido",
    navItems: ['Plataforma', 'Blog', 'Planes', 'Contacto'],
    login: "Ingresar",
    start: "Comenzar",
    vehicleOptions: [
      "Selecciona un rango",
      "1 - 5 vehículos",
      "6 - 20 vehículos",
      "21 - 50 vehículos",
      "51 - 100 vehículos",
      "Más de 100 vehículos"
    ]
  }
}

// ── Popup ─────────────────────────────────────────────────────────────────────

const Popup = ({ isOpen, onClose, type, t }: { isOpen: boolean; onClose: () => void; type: string | null; t: typeof translations['es'] }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null
  const isSuccess = type === 'success'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border"
        style={{ borderColor: isSuccess ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)", boxShadow: isSuccess ? "0 20px 60px rgba(16,185,129,0.12)" : "0 20px 60px rgba(239,68,68,0.12)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={20} />
        </button>
        <div className="text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isSuccess ? 'bg-emerald-50' : 'bg-red-50'}`}
            style={{ border: `2px solid ${isSuccess ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}
          >
            {isSuccess
              ? <CheckCircle size={32} style={{ color: '#10b981' }} />
              : <AlertCircle size={32} style={{ color: '#ef4444' }} />
            }
          </div>
          <h3 className="text-2xl font-bold mb-2" style={{ color: '#0A183A' }}>
            {isSuccess ? t.success : t.error}
          </h3>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            {isSuccess ? t.successMsg : t.errorMsg}
          </p>
          <button
            onClick={onClose}
            className="text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
            style={{ backgroundColor: isSuccess ? '#1E76B6' : '#ef4444' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = isSuccess ? '#173D68' : '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = isSuccess ? '#1E76B6' : '#ef4444')}
          >
            {isSuccess ? t.perfect : t.understood}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ContactPage = () => {
  const [language, setLanguage] = useState('es')
  const [isUSLocation, setIsUSLocation] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState<{ type: string | null; show: boolean }>({ type: null, show: false })
  const [formData, setFormData] = useState({
    companyName: '', contactName: '', email: '', phone: '', numberOfCars: '', message: ''
  })

  const t = translations[language as keyof typeof translations]

  // Geolocation / language detection
  useEffect(() => {
    const detectLanguage = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000, enableHighAccuracy: true, maximumAge: 300000
          })
        })
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
        )
        if (res.ok) {
          const data = await res.json()
          const isUS = data.countryCode === 'US'
          setLanguage(isUS ? 'en' : 'es')
          setIsUSLocation(isUS)
        }
      } catch {
        const browserLang = navigator.language || 'es'
        const isUS = browserLang.startsWith('en')
        setLanguage(isUS ? 'en' : 'es')
        setIsUSLocation(isUS)
      }
    }
    detectLanguage()
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('_subject', `New contact from ${formData.companyName} - TirePro`)
      fd.append('_template', 'table')
      fd.append('_captcha', 'false')
      fd.append('Company', formData.companyName)
      fd.append('Contact Name', formData.contactName)
      fd.append('Email', formData.email)
      fd.append('Phone', formData.phone || 'Not provided')
      fd.append('Number of Vehicles', formData.numberOfCars)
      fd.append('Message', formData.message || 'No additional message')
      await fetch('https://formsubmit.co/info@tirepro.com.co', { method: 'POST', body: fd, mode: 'no-cors' })
      setShowPopup({ type: 'success', show: true })
      setFormData({ companyName: '', contactName: '', email: '', phone: '', numberOfCars: '', message: '' })
    } catch {
      setShowPopup({ type: 'error', show: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Shared input style helpers
  const inputBase = "w-full px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none"
  const inputStyle = { border: "1.5px solid rgba(30,118,182,0.2)", backgroundColor: "#f8fafd" }
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "#1E76B6")
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "rgba(30,118,182,0.2)")

  return (
    <div className="bg-white text-gray-900 min-h-screen overflow-x-hidden">
      <Popup
        isOpen={showPopup.show}
        onClose={() => setShowPopup({ type: null, show: false })}
        type={showPopup.type}
        t={t}
      />

      {/* ── Navbar — matches landing page exactly ── */}
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
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 min-w-0" aria-label="TirePro - Inicio">
              <Image
                src={logoTire}
                alt="TirePro"
                width={27}
                height={27}
                style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }}
              />
              <Image
                src={logo}
                alt="TirePro"
                width={100}
                height={27}
                style={{ filter: "brightness(0) saturate(100%) invert(14%) sepia(60%) saturate(900%) hue-rotate(190deg) brightness(85%)" }}
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              {[
                { label: t.navItems[0], href: "/#producto" },
                { label: t.navItems[1], href: "/blog" },
                { label: t.navItems[2], href: "/#planes" },
                { label: t.navItems[3], href: "/contact" },
              ].map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-gray-600 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.color = "#0A183A")}
                  onMouseLeave={e => (e.currentTarget.style.color = "")}
                >
                  {item.label}
                </a>
              ))}
              <a
                href="/login"
                className="text-sm font-medium text-gray-600 transition-colors"
                onMouseEnter={e => (e.currentTarget.style.color = "#0A183A")}
                onMouseLeave={e => (e.currentTarget.style.color = "")}
              >
                {t.login}
              </a>
              <a href="/companyregister">
                <button
                  className="text-white px-4 xl:px-6 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap shadow-md hover:shadow-lg"
                  style={{ backgroundColor: "#1E76B6" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#173D68")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1E76B6")}
                >
                  {t.start}
                </button>
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg transition-colors flex-shrink-0"
              style={{ color: "#0A183A" }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg" role="menu">
            <div className="px-4 sm:px-6 py-4 space-y-3">
              {[
                { label: t.navItems[0], href: "/#producto" },
                { label: t.navItems[1], href: "/blog" },
                { label: t.navItems[2], href: "/#planes" },
                { label: t.navItems[3], href: "/contact" },
              ].map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block text-sm font-medium text-gray-600 py-2"
                  role="menuitem"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <a href="/login" className="block text-sm font-medium text-gray-600 py-2" role="menuitem">
                {t.login}
              </a>
              <a href="/companyregister">
                <button
                  className="w-full text-white px-6 py-3 rounded-full text-sm font-semibold mt-2"
                  style={{ backgroundColor: "#1E76B6" }}
                >
                  {t.start}
                </button>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero / Contact Section ── */}
      <section
        className="relative min-h-screen flex items-center pt-20"
        style={{ background: "linear-gradient(160deg, #f0f6fb 0%, #ffffff 55%, #e8f3fa 100%)" }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(30,118,182,0.08)" }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "rgba(23,61,104,0.06)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Left — contact info */}
            <div className="space-y-8">
              <div>
                <h1
                  className="text-4xl md:text-5xl font-semibold leading-tight mb-6"
                  style={{ color: "#0A183A" }}
                >
                  {t.title}
                </h1>
                <p className="text-xl text-gray-500 leading-relaxed">
                  {t.subtitle}
                </p>
              </div>

              {/* Contact cards */}
              <div className="space-y-4">
                {[
                  {
                    icon: Mail,
                    title: t.email,
                    info: "info@tirepro.com.co",
                  },
                  {
                    icon: Phone,
                    title: t.phone,
                    info: isUSLocation ? "+1 (555) 123-4567" : "+57 310 660 5563",
                  },
                  {
                    icon: MapPin,
                    title: language === 'en' ? 'Location' : 'Ubicación',
                    info: isUSLocation ? "United States" : "Bogotá, Colombia",
                  },
                ].map((contact, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-4 p-5 rounded-2xl bg-white border transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      borderColor: "rgba(30,118,182,0.15)",
                      boxShadow: "0 2px 16px rgba(30,118,182,0.07)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(30,118,182,0.35)"
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(30,118,182,0.12)"
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(30,118,182,0.15)"
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 16px rgba(30,118,182,0.07)"
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
                    >
                      <contact.icon size={22} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#1E76B6" }}>
                        {contact.title}
                      </p>
                      <p className="font-medium" style={{ color: "#0A183A" }}>{contact.info}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — contact form */}
            <div
              className="bg-white rounded-3xl border p-8 shadow-xl"
              style={{
                borderColor: "rgba(30,118,182,0.15)",
                boxShadow: "0 8px 60px rgba(30,118,182,0.12)",
              }}
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: "#0A183A" }}>
                  {t.formTitle}
                </h2>
                <p className="text-gray-500">{t.formSubtitle}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Text / email / tel fields */}
                {[
                  { name: 'companyName', label: t.companyName, icon: Building, type: 'text', required: true, placeholder: 'Ej: Transportes ABC S.A.S' },
                  { name: 'contactName', label: t.contactName, icon: User, type: 'text', required: true, placeholder: language === 'en' ? 'Your full name' : 'Tu nombre completo' },
                  { name: 'email', label: t.email, icon: Mail, type: 'email', required: true, placeholder: language === 'en' ? 'you@company.com' : 'tu@empresa.com' },
                  { name: 'phone', label: t.phone, icon: Phone, type: 'tel', required: false, placeholder: isUSLocation ? '+1 (555) 123-4567' : '+57 300 123 4567' },
                ].map((field, i) => (
                  <div key={i} className="space-y-2">
                    <label
                      className="flex items-center space-x-2 text-sm font-semibold"
                      style={{ color: "#0A183A" }}
                    >
                      <field.icon size={15} style={{ color: "#1E76B6" }} />
                      <span>{field.label}{field.required && ' *'}</span>
                    </label>
                    <input
                      type={field.type}
                      name={field.name}
                      value={(formData as any)[field.name]}
                      onChange={handleInputChange}
                      required={field.required}
                      className={inputBase}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}

                {/* Vehicle count */}
                <div className="space-y-2">
                  <label
                    className="flex items-center space-x-2 text-sm font-semibold"
                    style={{ color: "#0A183A" }}
                  >
                    <Car size={15} style={{ color: "#1E76B6" }} />
                    <span>{t.vehicles} *</span>
                  </label>
                  <select
                    name="numberOfCars"
                    value={formData.numberOfCars}
                    onChange={handleInputChange}
                    required
                    className={inputBase}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    {t.vehicleOptions.map((option, i) => (
                      <option key={i} value={i === 0 ? '' : option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label
                    className="flex items-center space-x-2 text-sm font-semibold"
                    style={{ color: "#0A183A" }}
                  >
                    <MessageCircle size={15} style={{ color: "#1E76B6" }} />
                    <span>{t.message}</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={4}
                    className={inputBase + " resize-none"}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={
                      language === 'en'
                        ? "Tell us about your fleet, your main tire challenges, or any specific questions..."
                        : "Cuéntanos sobre tu flota, tus principales desafíos con las llantas, o cualquier pregunta específica..."
                    }
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full text-white px-8 py-4 rounded-xl text-base font-semibold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#1E76B6" }}
                  onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#173D68" }}
                  onMouseLeave={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1E76B6" }}
                >
                  {isSubmitting ? (
                    <>
                      <div
                        className="h-5 w-5 border-2 rounded-full animate-spin"
                        style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
                      />
                      <span>{t.sending}</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>{t.send}</span>
                    </>
                  )}
                </button>

              </form>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full"
        style={{ borderColor: 'rgba(30,118,182,0.15)', backgroundColor: '#0A183A' }}
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <span className="font-semibold text-white">TirePro</span>
              </div>
              <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Software de optimización inteligente de llantas para flotas de vehículos en Colombia
              </p>
              <nav aria-label="Redes sociales">
                <div className="flex space-x-4">
                  {[
                    { label: 'Facebook',link: "https://www.instagram.com/tirepro.app/", path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                    { label: 'Instagram',link: "https://www.instagram.com/tirepro.app/", path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                    { label: 'LinkedIn', link: "https://tr.ee/NHqhS82dFR",path: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z' },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href={social.link}
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
                <li><a href="https://apps.apple.com/us/app/tirepro/id6741497732" className="hover:text-white transition-colors">Descargar app</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/equipo" className="hover:text-white transition-colors">Nosotros</a></li>
                <li><a href="/developers" className="hover:text-white transition-colors">Desarrolladores</a></li>
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

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/3151349122?text=Hola,%20me%20gustaría%20saber%20más%20sobre%20TirePro"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50"
        aria-label="Contáctanos por WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
      </a>
    </div>
  )
}

export default ContactPage