'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar, BarChart3, Clock, MapPin, Users, Menu, X, Download,
  Smartphone, MessageCircle, Plus, Minus,
  Glasses,
  LayoutDashboard
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from "../../../public/logo_text.png"
import logoTire from "../../../public/logo_tire.png"
import landingImage from "../../../public/landingUs.png" 
import phone from "../../../public/2.png"

const TireProUSLanding = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Detect user location and redirect non-US users
  useEffect(() => {
    const detectLocation = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`)
                const data = await response.json()
                const country = data.countryCode
                
                // Redirect non-US users to main site
                if (country !== 'US') {
                  window.location.href = '/'
                  return
                }
              } catch (error) {
                console.log('Geolocation API error:', error)
                detectLanguageFromBrowser()
              }
              setIsLoading(false)
            },
            (error) => {
              console.log('Geolocation error:', error)
              detectLanguageFromBrowser()
              setIsLoading(false)
            }
          )
        } else {
          detectLanguageFromBrowser()
          setIsLoading(false)
        }
      } catch (error) {
        console.log('Location detection error:', error)
        detectLanguageFromBrowser()
        setIsLoading(false)
      }
    }

    const detectLanguageFromBrowser = () => {
      const browserLang = navigator.language || navigator.languages[0]
      // Redirect if browser language is not English
      if (!browserLang.startsWith('en')) {
        window.location.href = '/'
        return
      }
      setIsLoading(false)
    }

    detectLocation()
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isMobileMenuOpen])

  const features = [
    {
      title: "Digital Inspections",
      description: "Finish your tire inspections in less than 10 minutes",
      icon: Calendar
    },
    {
      title: "Cost & CPK Tracking",
      description: "Automatic cost-per-kilometer tracking with full investment visibility to track your true results.",
      icon: BarChart3
    },
    {
      title: "Complete dashboard", 
      description: "Get a detailed dashboard with the current state of your fleet.",
      icon: LayoutDashboard
    },
    {
      title: "Predictive Analytics",
      description: "AI that predicts when to change tires before critical failures.",
      icon: Glasses
    },
    {
      title: "Historical Analysis",
      description: "View how much your CPM has changed over time.",
      icon: Clock
    },
    {
      title: "Retreading Control",
      description: "Add any events including retreading to your tires.",
      icon: Clock
    },
  ]

  const plans = [
    {
      name: "Mini",
      subtitle: "For small fleets (under 5 vehicles)",
      features: ["AI Analysis", "Single user", "Unlimited tires", "Tire monitoring"],
      highlighted: false
    },
    {
      name: "Pro",
      subtitle: "For large fleets (5+ vehicles)", 
      features: ["AI Analysis", "Unlimited users", "Advanced reports", "Tire monitoring & alerts"],
      highlighted: true
    },
    {
      name: "Retail",
      subtitle: "For distributors",
      features: ["Everything in Pro", "Client management", "Per-client analytics"],
      highlighted: false
    }
  ]

  const faqItems = [
    {
      question: "How can TirePro help me?",
      answer: "TirePro analyzes all your tires and makes recommendations to maximize tire performance and help you choose the right tires to save money."
    },
    {
      question: "What devices do I need?",
      answer: "You need a smartphone, tablet, or computer. The platform works offline on phones and syncs when you have connection. The web platform requires internet connection."
    },
    {
      question: "How long does TirePro implementation take?",
      answer: "Initial setup takes less than 10 minutes. Load your vehicles and do a bulk upload (check the bulk upload page for requirements)."
    },
    {
      question: "Are there limits on vehicles or tires?",
      answer: "No, all our plans include unlimited vehicles and tires completely free."
    },
    {
      question: "How is TirePro different from competitors?",
      answer: "TirePro combines AI-powered predictive analytics with comprehensive fleet management in one platform, offering real-time insights that help reduce costs by up to 25%."
    },
    {
      question: "Can I replace spreadsheets with TirePro?",
      answer: "Yes, TirePro eliminates the need for manual spreadsheet tracking by automating data collection and providing real-time analytics and reporting."
    },
    {
      question: "What insights will I get?",
      answer: "You'll receive predictive maintenance alerts, cost analysis, wear pattern insights, replacement recommendations, and performance optimization suggestions."
    },
    {
      question: "Is TirePro secure?",
      answer: "Yes, TirePro uses enterprise-grade security with encrypted data transmission and storage, ensuring your fleet data remains protected and private."
    }
  ]

  const appFeatures = [
    { title: "Offline Inspections", desc: "Works without connection, syncs later" },
    { title: "Real-time Data", desc: "Information updated instantly" },
    { title: "Connected Team", desc: "All your technicians on one platform" }
  ]

  const logos = [
    {
      src: "https://www.aerospacewalesforum.com/wp-content/uploads/MIT-logo.png",
      alt: "MIT",
      className: "h-16 w-16 object-contain"
    },
    {
      src: "https://ingenio.org.uy/wp-content/uploads/2023/05/MongoDB-for-Startups.png",
      alt: "MongoDB",
      className: "h-12 w-auto object-contain"
    },
    {
      src: "https://preditrix.ai/wp-content/uploads/2025/04/aws-n.png",
      alt: "AWS Startup",
      className: "h-12 w-auto object-contain"
    },
    {
      src: "https://static1.squarespace.com/static/594ea10aff7c5048d6e4133a/t/606f00d7796b2013faf1573d/1750691954785/",
      alt: "Partner Logo",
      className: "h-12 w-auto object-contain"
    }
  ]

  if (isLoading) {
    return (
      <div className="bg-[#030712] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#348CCB] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#030712] text-white min-h-screen overflow-x-hidden relative">
      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 transition-all duration-500 ${
        isMobileMenuOpen 
          ? 'backdrop-blur-3xl bg-black/60 opacity-100' 
          : 'opacity-0 pointer-events-none'
      }`} onClick={() => setIsMobileMenuOpen(false)}></div>

      {/* Navbar */}
      <nav className={`fixed top-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-3rem)] max-w-6xl z-50 transition-all duration-700 rounded-2xl ${
        isScrolled 
          ? 'backdrop-blur-2xl bg-gradient-to-r from-white/15 via-white/8 to-white/15 border border-white/30 shadow-2xl' 
          : 'backdrop-blur-xl bg-gradient-to-r from-white/8 via-transparent to-white/8 border border-white/20 shadow-xl'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/15 via-transparent to-[#348CCB]/15 opacity-60 rounded-2xl"></div>
        
        <div className="px-6 sm:px-8 lg:px-10 relative">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/us" className="flex items-center space-x-2 relative z-10">
              <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
              <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 relative z-10">
              {['Platform', 'Plans', 'Contact', 'Features'].map((item) => (
                <a key={item} href={
                  item === 'Platform' ? '#platform' : 
                  item === 'Plans' ? '#plans' : 
                  item === 'Features' ? '/us/features' :
                  `/${item.toLowerCase()}`
                } 
                   className="relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm border border-white/20"></div>
                  <span className="relative z-10">{item}</span>
                </a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3 relative z-10">
              <a href='/login'>
                <button className="px-4 py-2 rounded-xl border border-[#348CCB]/60 text-black backdrop-blur-lg bg-white/10 hover:bg-[#348CCB]/20 hover:border-[#348CCB] transition-all duration-300 hover:shadow-lg">
                  Log In
                </button>
              </a>
              <a href='/companyregister'>
                <button className="px-4 py-2 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-xl backdrop-blur-sm hover:shadow-xl hover:shadow-[#348CCB]/30 transition-all duration-300 hover:scale-105">
                  Get Started
                </button>
              </a>
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

        {/* Mobile Menu */}
        <div className={`md:hidden absolute top-full left-1/2 transform -translate-x-1/2 w-full mt-4 z-50 transition-all duration-500 ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'
        }`}>
          <div className="mx-4 rounded-3xl backdrop-blur-3xl bg-gradient-to-br from-white/25 via-white/15 to-white/20 border-2 border-white/40 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/20 via-transparent to-[#1E76B6]/20 rounded-3xl"></div>
            
            <div className="relative p-5 space-y-6">
              {['Platform', 'Plans', 'Contact', 'Features'].map((item) => (
                <a key={item} href={
                  item === 'Platform' ? '#platform' : 
                  item === 'Plans' ? '#plans' : 
                  item === 'Features' ? '/us/features' :
                  `/${item.toLowerCase()}`
                }
                   className="block py-2 px-6 rounded-2xl text-white font-medium text-lg transition-all duration-300 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-white/30" 
                   onClick={() => setIsMobileMenuOpen(false)}>
                  {item}
                </a>
              ))}
              
              <div className="pt-2 border-t border-white/30 space-y-4">
                <a href='/login'>
                  <button className="w-full py-2 px-6 rounded-2xl border-2 border-[#348CCB]/70 text-black font-semibold text-lg backdrop-blur-sm bg-white/15 hover:bg-[#348CCB]/20 transition-all duration-300 mb-3">
                    Log In
                  </button>
                </a>
                <a href='/companyregister'>
                  <button className="w-full py-2 px-6 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white rounded-2xl backdrop-blur-sm hover:shadow-xl font-semibold text-lg transition-all duration-300">
                    Get Started
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center pt-32 md:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#136eb2_0%,_rgba(19,110,178,0.4)_40%,_transparent_60%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center space-y-12">
            {/* Text Content Above */}
            <div className="space-y-8 max-w-4xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent">
                Reduce Your Tire Costs by Up to 25%
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed">
                Transform your fleet management with AI-powered tire analytics that predicts failures before they happen, optimizes replacement schedules, and provides real-time insights to maximize your tire investment while reducing downtime and operational costs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-lg hover:shadow-[#348CCB]/25 transition-all transform hover:scale-105">
                  Start Free
                </button>
              </div>
            </div>
             
            {/* Image Below - Larger Size */}
            <div className="relative w-full max-w-5xl">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-sm">
                <div className="aspect-video w-full bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/10 flex items-center justify-center rounded-3xl border border-white/10">
                  <div className="w-full h-full flex items-center justify-center p-6">
                    <Image src={landingImage} alt='TirePro Dashboard' className="w-full h-full object-contain rounded-xl"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Section */}
      <section className="py-15 bg-gradient-to-b from-transparent to-[#0A183A]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gray-400 text-lg mb-8">With the support of leading organizations</p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
            {logos.map((logo, index) => (
              <div key={index} className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-300">
                <img 
                  src={logo.src} 
                  alt={logo.alt}
                  className={`${logo.className} filter brightness-0 invert`}
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="platform" className="py-20 bg-gradient-to-b from-[#0A183A]/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
              How TirePro Works
            </h2>
            <p className="text-xl text-gray-300">Technology that optimizes every aspect of your fleet</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <div 
                  key={index}
                  className="group relative p-6 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-white/15 via-white/8 to-white/12 border border-white/25 hover:border-[#348CCB]/60 transition-all duration-500 hover:transform hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/10 to-[#1E76B6]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  
                  <div className="relative">
                    <div className="bg-gradient-to-br from-[#348CCB] to-[#1E76B6] p-4 rounded-2xl w-fit mb-4 shadow-xl">
                      <IconComponent size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
              Take TirePro With You
            </h2>
            <p className="text-xl text-gray-300">Inspect and manage your fleet from anywhere</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                {appFeatures.map((item, i) => {
                  const icons = [Smartphone, Download, Users]
                  const IconComponent = icons[i]
                  return (
                    <div key={i} className="flex items-start space-x-4">
                      <div className="bg-gradient-to-br from-[#348CCB] to-[#1E76B6] p-4 rounded-2xl shadow-xl flex-shrink-0">
                        <IconComponent size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                        <p className="text-gray-300">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a href='https://apps.apple.com/us/app/tirepro/id6741497732'>
                  <button className="flex items-center justify-center space-x-3 bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white px-6 py-4 rounded-xl font-semibold hover:shadow-lg transition-all">
                    <Download size={20} />
                    <span>Download for iOS</span>
                  </button>
                </a>
                <button className="flex items-center justify-center space-x-3 border border-[#348CCB]/50 text-[#348CCB] px-6 py-4 rounded-xl font-semibold backdrop-blur-sm bg-white/5 hover:bg-[#348CCB]/20 transition-all">
                  <Download size={20} />
                  <span>Download for Android</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/8 border border-white/25 p-8 max-w-sm mx-auto flex justify-center items-center">
                <Image src={phone} alt="TirePro Mobile App" className="object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="plans" className="py-20 bg-gradient-to-b from-[#0A183A]/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-[#348CCB] to-[#5CB3E8] bg-clip-text text-transparent">
              TirePro Plans
            </h2>
            <p className="text-xl text-gray-300">Start free, scale when you need</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative backdrop-blur-2xl bg-gradient-to-br from-white/15 via-white/8 to-white/12 rounded-3xl border transition-all duration-500 hover:transform hover:scale-105 ${
                  plan.highlighted
                    ? 'border-[#348CCB] shadow-xl shadow-[#348CCB]/25'
                    : 'border-white/25 hover:border-[#348CCB]/60'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Recommended
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <div className="text-center mb-6">
                    <h3 className={`text-2xl font-bold mb-2 ${
                      plan.highlighted ? 'text-[#348CCB]' : 'text-white'
                    }`}>
                      {plan.name}
                    </h3>
                    <p className="text-gray-400">{plan.subtitle}</p>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <div className="w-2 h-2 bg-[#348CCB] rounded-full mr-3 flex-shrink-0"></div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <a href='/companyregister'>
                    <button className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white hover:shadow-lg hover:shadow-[#348CCB]/25'
                        : 'border border-[#348CCB]/50 text-[#348CCB] backdrop-blur-sm bg-white/5 hover:bg-[#348CCB]/20'
                    }`}>
                      Get Started
                    </button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {faqItems.map((faq, index) => (
              <div 
                key={index}
                className="rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-2xl bg-gradient-to-br from-white/15 via-white/8 to-white/12 rounded-3xl border border-white/25 overflow-hidden transition-all duration-300 hover:border-[#348CCB]/60"
              >
                <button
                  className="w-full text-left flex items-start justify-between group"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <h3 className="font-semibold text-white pr-4 text-lg leading-relaxed">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0 mt-1">
                    {openFaq === index ? (
                      <Minus size={20} className="text-[#348CCB] transition-transform duration-300" />
                    ) : (
                      <Plus size={20} className="text-[#348CCB] transition-transform duration-300 group-hover:scale-110" />
                    )}
                  </div>
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${
                  openFaq === index ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
                }`}>
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="backdrop-blur-2xl bg-gradient-to-br from-white/10 via-white/8 to-white/12 border-t border-white/25 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Link href="/us" className="flex items-center space-x-2 mb-4">
                <Image src={logoTire} alt="TirePro" width={32} height={32} className='p-2 filter brightness-0 invert'/>
                <Image src={logo} alt="TirePro" width={120} height={32} className="filter brightness-0 invert"/>
              </Link>
              <p className="text-gray-400 mb-4">
                Intelligent platform for fleet management and optimization.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/legal#terms-section" className="hover:text-[#348CCB] transition-colors">Terms</a></li>
                <li><a href="/legal#privacy-section" className="hover:text-[#348CCB] transition-colors">Privacy</a></li>
                <li><a href="/contact" className="hover:text-[#348CCB] transition-colors">Contact</a></li>
                <li><a href="/delete" className="hover:text-[#348CCB] transition-colors">Delete Data</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact Information</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>info@tirepro.com</li>
                <li>+1 (754) 305-9935</li>
                <li>United States</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/25 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 TirePro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default TireProUSLanding