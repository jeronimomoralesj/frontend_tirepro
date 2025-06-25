'use client'

import React, { useState, useEffect } from 'react'
import { 
  Menu, X, Mail, Phone, MapPin, Send, Car, Building, MessageCircle, User, CheckCircle, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from "../../../public/logo_text.png"
import logoTire from "../../../public/logo_tire.png"
// Translations
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
    navItems: ['Platform', 'Plans', 'Contact'],
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

// Popup Components
const Popup = ({ isOpen, onClose, type, t }) => {
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-gradient-to-br from-[#0A183A] to-[#173D68] border border-[#348CCB]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
        <div className="text-center">
          <div className={`w-16 h-16 ${isSuccess ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-red-400 to-red-600'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isSuccess ? <CheckCircle size={32} className="text-white" /> : <AlertCircle size={32} className="text-white" />}
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{isSuccess ? t.success : t.error}</h3>
          <p className="text-gray-300 mb-6">{isSuccess ? t.successMsg : t.errorMsg}</p>
          <button
            onClick={onClose}
            className={`${isSuccess ? 'bg-gradient-to-r from-[#348CCB] to-[#1E76B6] hover:from-[#1E76B6] hover:to-[#348CCB]' : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'} text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300`}
          >
            {isSuccess ? t.perfect : t.understood}
          </button>
        </div>
      </div>
    </div>
  )
}

const ContactPage = () => {
  const [language, setLanguage] = useState('es')
  const [isUSLocation, setIsUSLocation] = useState(false)
  const [locationDetected, setLocationDetected] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState({ type: null, show: false })
  const [formData, setFormData] = useState({
    companyName: '', contactName: '', email: '', phone: '', numberOfCars: '', message: ''
  })

  const t = translations[language]

  // Geolocation and language detection
  useEffect(() => {
    const detectLanguageFromLocation = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000, enableHighAccuracy: true, maximumAge: 300000
          })
        })

        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
        )
        
        if (response.ok) {
          const data = await response.json()
          const countryCode = data.countryCode
          
          if (countryCode === 'US') {
            setLanguage('en')
            setIsUSLocation(true)
          } else {
            setLanguage('es')
            setIsUSLocation(false)
          }
          setLocationDetected(true)
          console.log(`Location detected: ${data.countryName} (${countryCode}), Language: ${countryCode === 'US' ? 'English' : 'Spanish'}`)
        }
      } catch (error) {
        console.log('Geolocation failed, using browser language:', error)
        const browserLang = navigator.language || navigator.languages?.[0] || 'es'
        if (browserLang.startsWith('en')) {
          setLanguage('en')
          setIsUSLocation(true)
        } else {
          setLanguage('es')
          setIsUSLocation(false)
        }
        setLocationDetected(true)
      }
    }
    detectLanguageFromLocation()
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('_subject', `New contact from ${formData.companyName} - TirePro`)
      formDataToSend.append('_template', 'table')
      formDataToSend.append('_captcha', 'false')
      formDataToSend.append('Company', formData.companyName)
      formDataToSend.append('Contact Name', formData.contactName)
      formDataToSend.append('Email', formData.email)  
      formDataToSend.append('Phone', formData.phone || 'Not provided')
      formDataToSend.append('Number of Vehicles', formData.numberOfCars)
      formDataToSend.append('Message', formData.message || 'No additional message')

      await fetch('https://formsubmit.co/info@tirepro.com.co', {
        method: 'POST', body: formDataToSend, mode: 'no-cors'
      })

      setShowPopup({ type: 'success', show: true })
      setFormData({ companyName: '', contactName: '', email: '', phone: '', numberOfCars: '', message: '' })
    } catch (error) {
      setShowPopup({ type: 'error', show: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-[#030712] text-white min-h-screen">
      <Popup 
        isOpen={showPopup.show} 
        onClose={() => setShowPopup({ type: null, show: false })} 
        type={showPopup.type}
        t={t}
      />

{/* Mobile Menu Blur Overlay */}
      <div className={`fixed inset-0 z-40 transition-all duration-500 ${
        isMobileMenuOpen 
          ? 'backdrop-blur-3xl bg-black/60 opacity-100' 
          : 'opacity-0 pointer-events-none'
      }`} onClick={() => setIsMobileMenuOpen(false)}></div>

      {/* Enhanced Floating Liquid Glass Navbar */}
      <nav className={`fixed top-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-3rem)] max-w-6xl z-50 transition-all duration-700 rounded-2xl ${
        isScrolled 
          ? 'backdrop-blur-2xl bg-gradient-to-r from-white/15 via-white/8 to-white/15 border border-white/30 shadow-2xl' 
          : 'backdrop-blur-xl bg-gradient-to-r from-white/8 via-transparent to-white/8 border border-white/20 shadow-xl'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/15 via-transparent to-[#348CCB]/15 opacity-60 rounded-2xl"></div>
        
        <div className="px-6 sm:px-8 lg:px-10 relative">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 relative z-10">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
                  <Link href="/"><div className="flex items-center space-x-2">
              <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
              <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
            </div></Link>
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 relative z-10">
              <a href="#platform" className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                <span className="relative z-10">{t.navItems[0]}</span>
              </a>
              <a href="#plans" className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                <span className="relative z-10">{t.navItems[1]}</span>
              </a>
              <a href="/contact" className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                <span className="relative z-10">{t.navItems[2]}</span>
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3 relative z-10">
              <a href='/login'><button className="px-4 py-2 rounded-xl border border-[#348CCB]/60 text-black backdrop-blur-lg bg-white/10 hover:bg-[#348CCB]/20 hover:border-[#348CCB] transition-all duration-300 hover:shadow-lg">
                {t.login}
              </button></a>
              <a href='/companyregister'><button className="px-4 py-2 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-xl backdrop-blur-sm hover:shadow-xl hover:shadow-[#348CCB]/30 transition-all duration-300 hover:scale-105">
                {t.start}
              </button></a>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-1 rounded-xl backdrop-blur-lg bg-white/15 hover:bg-white/25 transition-all duration-300 relative z-50 border border-white/20"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="relative">
                <Menu className={`w-6 h-6 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 rotate-45' : 'opacity-100'}`} />
                <X className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 -rotate-45'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Enhanced Floating Mobile Menu */}
        <div className={`md:hidden absolute top-full left-1/2 transform -translate-x-1/2 w-full mt-4 z-50 transition-all duration-500 ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'
        }`}>
          <div className="mx-4 rounded-3xl backdrop-blur-3xl bg-gradient-to-br from-white/25 via-white/15 to-white/20 border-2 border-white/40 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/20 via-transparent to-[#1E76B6]/20 rounded-3xl"></div>
            
            <div className="relative p-5 space-y-6">
              <a href="#platform" className="block py-2 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/30" onClick={() => setIsMobileMenuOpen(false)}>
                {t.navItems[0]}
              </a>
              <a href="#plans" className="block py-2 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/30" onClick={() => setIsMobileMenuOpen(false)}>
                {t.navItems[1]}
              </a>
              <a href="/contact" className="block py-2 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/30" onClick={() => setIsMobileMenuOpen(false)}>
                {t.navItems[2]}
              </a>
              
              <div className="pt-2 border-t border-white/30 space-y-4">
                <a href='/login'><button className="w-full py-2 px-6 rounded-2xl border-2 border-[#348CCB]/70 text-black font-semibold text-lg backdrop-blur-sm bg-white/15 hover:bg-[#348CCB]/20 transition-all duration-300 mb-3">
                  {t.login}
                </button></a>
                <a href='/companyregister'><button className="w-full py-2 px-6 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-2xl backdrop-blur-sm hover:shadow-xl font-semibold text-lg transition-all duration-300">
                  {t.start}
                </button></a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#136eb2_0%,_rgba(19,110,178,0.4)_40%,_transparent_60%)]"></div>
        
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[#348CCB]/30 to-[#1E76B6]/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-l from-[#1E76B6]/30 to-[#348CCB]/30 rounded-full blur-2xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            
            {/* Left side - Contact Info */}
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent mb-6">
                  {t.title}
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  {t.subtitle}
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-4">
                {[
                  { icon: Mail, title: t.email, info: "info@tirepro.com.co", color: "from-[#348CCB] to-[#1E76B6]" },
                  { icon: Phone, title: t.phone, info: isUSLocation ? "+1 (555) 123-4567" : "+57 310 660 5563", color: "from-[#1E76B6] to-[#348CCB]" },
                  { icon: MapPin, title: language === 'en' ? 'Location' : 'Ubicación', info: isUSLocation ? "United States" : "Bogotá, Colombia", color: "from-[#348CCB] to-[#1E76B6]" }
                ].map((contact, i) => (
                  <div key={i} className="group relative">
                    <div className="relative bg-gradient-to-br from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl p-6 rounded-2xl border border-[#348CCB]/40 shadow-2xl hover:shadow-[#348CCB]/20 hover:border-[#348CCB]/60 transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${contact.color} rounded-xl flex items-center justify-center shadow-lg`}>
                          <contact.icon size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg mb-1">{contact.title}</h3>
                          <p className="text-gray-300">{contact.info}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Contact Form */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/20 via-[#1E76B6]/10 to-[#348CCB]/20 rounded-3xl blur-2xl"></div>
              
              <div className="relative bg-gradient-to-br from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl rounded-3xl border border-[#348CCB]/30 shadow-2xl p-8">
                
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{t.formTitle}</h2>
                  <p className="text-gray-300">{t.formSubtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {[
                    { name: 'companyName', label: t.companyName, icon: Building, type: 'text', required: true, placeholder: 'Ej: Transportes ABC S.A.S' },
                    { name: 'contactName', label: t.contactName, icon: User, type: 'text', required: true, placeholder: language === 'en' ? 'Your full name' : 'Tu nombre completo' },
                    { name: 'email', label: t.email, icon: Mail, type: 'email', required: true, placeholder: language === 'en' ? 'you@company.com' : 'tu@empresa.com' },
                    { name: 'phone', label: t.phone, icon: Phone, type: 'tel', required: false, placeholder: isUSLocation ? '+1 (555) 123-4567' : '+57 300 123 4567' }
                  ].map((field, i) => (
                    <div key={i} className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                        <field.icon size={16} />
                        <span>{field.label} {field.required && '*'}</span>
                      </label>
                      <input
                        type={field.type}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        required={field.required}
                        className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <Car size={16} />
                      <span>{t.vehicles} *</span>
                    </label>
                    <select
                      name="numberOfCars"
                      value={formData.numberOfCars}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300"
                    >
                      {t.vehicleOptions.map((option, i) => (
                        <option key={i} value={i === 0 ? '' : option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <MessageCircle size={16} />
                      <span>{t.message}</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300 resize-none"
                      placeholder={language === 'en' ? "Tell us about your fleet, your main tire challenges, or any specific questions..." : "Cuéntanos sobre tu flota, tus principales desafíos con las llantas, o cualquier pregunta específica..."}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-[#1E76B6] hover:to-[#348CCB] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 shadow-lg shadow-[#348CCB]/25"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>{t.sending}</span>
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        <span>{t.send}</span>
                      </>
                    )}
                  </button>

                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

{/* Footer */}
      <footer className="backdrop-blur-2xl bg-gradient-to-br from-white/10 via-white/8 to-white/12 border-t border-white/25 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-xl font-bold text-white"><Link href="/"><div className="flex items-center space-x-2">
              <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
              <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
            </div></Link></span>
              </div>
              <p className="text-gray-400 mb-4">
                Plataforma inteligente para la gestión y optimización de flotas de vehículos.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/legal#terms-section" className="hover:text-[#348CCB] transition-colors">Términos</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-[#348CCB] transition-colors">Privacidad</a></li>
                <li><a href="/contact" className="hover:text-[#348CCB] transition-colors">Contacto</a></li>
                <li><a href="/delete" className="hover:text-[#348CCB] transition-colors">Eliminar datos</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Información de contácto</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>info@tirepro.com.co</li>
                <li>+57 315 134 9122</li>
                <li>Bogotá, Colombia</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/25 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 TirePro. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ContactPage