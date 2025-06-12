'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Send,
  Car,
  Building,
  MessageCircle,
  User,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import logo from "../../../public/logo_text.png"
import logoTire from "../../../public/logo_tire.png"

// Success Popup Component
const SuccessPopup = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000) // Auto close after 5 seconds
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Popup */}
      <div className="relative bg-gradient-to-br from-[#0A183A] to-[#173D68] border border-[#348CCB]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl transform animate-bounce-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Success content */}
        <div className="text-center">
          {/* Success icon with animation */}
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <CheckCircle size={32} className="text-white" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            ¡Mensaje Enviado!
          </h3>
          
          <p className="text-gray-300 mb-6">
            Hemos recibido tu información correctamente. Nuestro equipo se pondrá en contacto contigo en las próximas 24 horas.
          </p>

          <button
            onClick={onClose}
            className="bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white px-6 py-3 rounded-lg font-semibold hover:from-[#1E76B6] hover:to-[#348CCB] transition-all duration-300 transform hover:scale-105"
          >
            ¡Perfecto!
          </button>
        </div>
      </div>
    </div>
  )
}

// Error Popup Component
const ErrorPopup = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000) // Auto close after 5 seconds
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Popup */}
      <div className="relative bg-gradient-to-br from-[#0A183A] to-[#173D68] border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl transform animate-bounce-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Error content */}
        <div className="text-center">
          {/* Error icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-white" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            Error al Enviar
          </h3>
          
          <p className="text-gray-300 mb-6">
            Hubo un problema al enviar tu mensaje. Por favor, intenta de nuevo o contáctanos directamente al +57 310 660 5563.
          </p>

          <button
            onClick={onClose}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

const ContactPage = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    numberOfCars: '',
    message: ''
  })

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

const handleSubmit = async (e) => {
  e.preventDefault()
  setIsSubmitting(true)

  try {
    // Create form data for formsubmit
    const formDataToSend = new FormData()
    
    // FormSubmit specific fields
    formDataToSend.append('_subject', `Nuevo contacto de ${formData.companyName} - TirePro`)
    formDataToSend.append('_template', 'table')
    formDataToSend.append('_captcha', 'false')
    formDataToSend.append('_next', 'https://tirepro.com.co/contact?success=true')
    
    // Our form data
    formDataToSend.append('Empresa', formData.companyName)
    formDataToSend.append('Nombre de Contacto', formData.contactName)
    formDataToSend.append('Email', formData.email)
    formDataToSend.append('Teléfono', formData.phone || 'No proporcionado')
    formDataToSend.append('Número de Vehículos', formData.numberOfCars)
    formDataToSend.append('Mensaje', formData.message || 'Sin mensaje adicional')

    // Send to FormSubmit in no-cors mode to avoid CORS/redirect errors
    await fetch('https://formsubmit.co/info@tirepro.com.co', {
      method: 'POST',
      body: formDataToSend,
      mode: 'no-cors'
    })

    // Show success regardless of opaque response
    setShowSuccessPopup(true)

    // Clear form
    setFormData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      numberOfCars: '',
      message: ''
    })
  } catch (error) {
    console.error('Error submitting form:', error)
    setShowErrorPopup(true)
  } finally {
    setIsSubmitting(false)
  }
}
  return (
    <div className="bg-[#030712] text-white min-h-screen">
      {/* Success Popup */}
      <SuccessPopup 
        isOpen={showSuccessPopup} 
        onClose={() => setShowSuccessPopup(false)} 
      />
      
      {/* Error Popup */}
      <ErrorPopup 
        isOpen={showErrorPopup} 
        onClose={() => setShowErrorPopup(false)} 
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
              {['Plataforma', 'Blog', 'Planes', 'Contacto'].map((item, i) => (
                <a 
                  key={i}
                  href={item === 'Plataforma' ? '#platform' : item === 'Planes' ? '#plans' : `/${item.toLowerCase()}`} 
                  className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                  <span className="relative z-10">{item}</span>
                </a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3 relative z-10">
              <a href='/login'><button className="px-4 py-2 rounded-xl border border-[#348CCB]/60 text-black backdrop-blur-lg bg-white/10 hover:bg-[#348CCB]/20 hover:border-[#348CCB] transition-all duration-300 hover:shadow-lg">
                Ingresar
              </button></a>
              <a href='/companyregister'><button className="px-4 py-2 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-xl backdrop-blur-sm hover:shadow-xl hover:shadow-[#348CCB]/30 transition-all duration-300 hover:scale-105">
                Comenzar
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
              {['Plataforma', 'Blog', 'Planes', 'Contact'].map((item, i) => (
                <a 
                  key={i}
                  href={item === 'Plataforma' ? '#platform' : item === 'Planes' ? '#plans' : `/${item.toLowerCase()}`}
                  className="block py-2 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/30"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
              
              <div className="pt-2 border-t border-white/30 space-y-4">
                <a href='/login'><button className="w-full py-2 px-6 rounded-2xl border-2 border-[#348CCB]/70 text-black font-semibold text-lg backdrop-blur-sm bg-white/15 hover:bg-[#348CCB]/20 transition-all duration-300 mb-3">
                  Ingresar
                </button></a>
                <a href='/companyregister'><button className="w-full py-2 px-6 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-2xl backdrop-blur-sm hover:shadow-xl font-semibold text-lg transition-all duration-300">
                  Comenzar
                </button></a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Contact Form */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Enhanced Gradient Background */}
        <div className="absolute inset-0 bg-no-repeat bg-center bg-[radial-gradient(ellipse_at_top,_#136eb2_0%,_rgba(19,110,178,0.4)_40%,_transparent_60%)]"></div>
        
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[#348CCB]/30 to-[#1E76B6]/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-l from-[#1E76B6]/30 to-[#348CCB]/30 rounded-full blur-2xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            
            {/* Left side - Contact Info */}
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent mb-6">
                  Contacta con TirePro
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  ¿Listo para reducir hasta un 25% tus costos en llantas? Cuéntanos sobre tu flota y te ayudaremos a optimizar tu gestión.
                </p>
              </div>

              {/* Contact Information Cards */}
              <div className="space-y-6">
                {/* Email Card */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/20 to-transparent rounded-2xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                  <div className="relative bg-gradient-to-br from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl p-6 rounded-2xl border border-[#348CCB]/40 shadow-2xl hover:shadow-[#348CCB]/20 hover:border-[#348CCB]/60 transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#348CCB] to-[#1E76B6] rounded-xl flex items-center justify-center shadow-lg">
                        <Mail size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Email</h3>
                        <p className="text-gray-300">info@tirepro.com.co</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phone Card */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1E76B6]/20 to-transparent rounded-2xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                  <div className="relative bg-gradient-to-br from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl p-6 rounded-2xl border border-[#1E76B6]/40 shadow-2xl hover:shadow-[#1E76B6]/20 hover:border-[#1E76B6]/60 transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#1E76B6] to-[#348CCB] rounded-xl flex items-center justify-center shadow-lg">
                        <Phone size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Teléfono</h3>
                        <p className="text-gray-300">+57 310 660 5563</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Card */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/20 to-transparent rounded-2xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                  <div className="relative bg-gradient-to-br from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl p-6 rounded-2xl border border-[#348CCB]/40 shadow-2xl hover:shadow-[#348CCB]/20 hover:border-[#348CCB]/60 transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#348CCB] to-[#1E76B6] rounded-xl flex items-center justify-center shadow-lg">
                        <MapPin size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Ubicación</h3>
                        <p className="text-gray-300">Bogotá, Colombia</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Contact Form */}
            <div className="relative">
              {/* Form Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/20 via-[#1E76B6]/10 to-[#348CCB]/20 rounded-3xl blur-2xl"></div>
              
              {/* Main Form Container */}
              <div className="relative bg-gradient-to-br from-[#0A183A]/95 to-[#173D68]/90 backdrop-blur-xl rounded-3xl border border-[#348CCB]/30 shadow-2xl p-8">
                
                {/* Form Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Háblanos de tu flota
                  </h2>
                  <p className="text-gray-300">
                    Te contactaremos en menos de 24 horas
                  </p>
                </div>

                {/* Contact Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Company Name */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <Building size={16} />
                      <span>Nombre de la Empresa *</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300"
                      placeholder="Ej: Transportes ABC S.A.S"
                    />
                  </div>

                  {/* Contact Name */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <User size={16} />
                      <span>Nombre de Contacto *</span>
                    </label>
                    <input
                      type="text"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300"
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  {/* Email and Phone Row */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                        <Mail size={16} />
                        <span>Email *</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300"
                        placeholder="tu@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                        <Phone size={16} />
                        <span>Teléfono</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300"
                        placeholder="+57 300 123 4567"
                      />
                    </div>
                  </div>

                  {/* Number of Cars */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <Car size={16} />
                      <span>¿Cuántos vehículos tienes? *</span>
                    </label>
                    <select
                      name="numberOfCars"
                      value={formData.numberOfCars}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300"
                    >
                      <option value="">Selecciona un rango</option>
                      <option value="1-5">1 - 5 vehículos</option>
                      <option value="6-20">6 - 20 vehículos</option>
                      <option value="21-50">21 - 50 vehículos</option>
                      <option value="51-100">51 - 100 vehículos</option>
                      <option value="100+">Más de 100 vehículos</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                      <MessageCircle size={16} />
                      <span>Mensaje</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 bg-[#173D68]/50 border border-[#348CCB]/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#348CCB] focus:ring-2 focus:ring-[#348CCB]/20 transition-all duration-300 resize-none"
                      placeholder="Cuéntanos sobre tu flota, tus principales desafíos con las llantas, o cualquier pregunta específica..."
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-[#1E76B6] hover:to-[#348CCB] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 shadow-lg shadow-[#348CCB]/25"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        <span>Enviar Mensaje</span>
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    Al enviar este formulario, aceptas que procesemos tu información de acuerdo con nuestra política de privacidad.
                  </p>

                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer - Same as landing page */}
      <footer className="bg-[#0A183A]/30 border-t border-[#173D68]/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-1'/>
                <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
              </div>
              <p className="text-gray-400 mb-4">
                Plataforma inteligente para la gestión y optimización de flotas de vehículos.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Links Importantes</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/legal#terms-section" className="hover:text-[#348CCB] transition-colors">Términos y Condiciones</Link></li>
                <li><Link href="/legal#privacy-section" className="hover:text-[#348CCB] transition-colors">Privacidad de Datos</Link></li>
                <li><Link href="/contact" className="hover:text-[#348CCB] transition-colors">Contáctanos</Link></li>
                <li><Link href="/delete" className="hover:text-[#348CCB] transition-colors">Eliminar Datos</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contacto</h4>
              <ul className="space-y-2 text-gray-400">
                <li>info@tirepro.com.co</li>
                <li>+57 310 660 5563</li>
                <li>Bogotá, Colombia</li>
              </ul>
              
              <div className="flex space-x-4 mt-6">
                <div className="w-8 h-8 bg-[#348CCB] rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">in</span>
                </div>
                <div className="w-8 h-8 bg-[#348CCB] rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">ig</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#173D68]/30 mt-12 pt-8 text-center">
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