'use client'

import React, { useState, useEffect } from 'react'
import { 
Menu, X,
  Smartphone, Brain, Shield, TrendingUp, Settings,
  CheckCircle, Bell, Database, Cloud, Activity
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from "../../../../public/logo_text.png"
import logoTire from "../../../../public/logo_tire.png"
import feature1 from "../../../../public/feature1.png"

const TireProFeaturesPage = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('analytics')

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isMobileMenuOpen])

  const featureCategories = [
    {
      id: 'analytics',
      title: 'AI Analytics',
      icon: Brain,
      description: 'Advanced AI-powered insights and predictive analytics'
    },
    {
      id: 'monitoring',
      title: 'Real-time Monitoring',
      icon: Activity,
      description: 'Live fleet tracking and instant alerts'
    },
    {
      id: 'management',
      title: 'Fleet Management',
      icon: Settings,
      description: 'Comprehensive fleet control and optimization'
    }
  ]

  const detailedFeatures = {
    analytics: [
      {
        title: "Predictive Tire Failure Analysis",
        description: "Our AI algorithms analyze wear patterns, usage data, to predict changes, and provide actionable recommendations.",
        image: feature1,
        benefits: ["30-day failure prediction", "Recommendations to extend tire life", "Purchase recommendations", "Enhanced safety protocols"]
      },
      {
        title: "Cost-Per-Mile Optimization",
        description: "Track and analyze your true tire costs with our comprehensive CPM tracking system. Get detailed insights into tire performance, replacement schedules, and cost optimization opportunities.",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
        benefits: ["Real-time cost tracking", "ROI optimization", "CPM forecasting", "Performance benchmarking"]
      },
      {
        title: "Purchase recommendations",
        description: "Data analysis algorithms provide tire purchase recommendations.",
        image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&h=400&fit=crop",
        benefits: ["Pattern recognition AI", "Maintenance optimization", "Extended tire life", "Alignment insights"]
      }
    ],
    monitoring: [
      {
        title: "Real-time Fleet Dashboard",
        description: "Monitor your entire fleet from a single, comprehensive dashboard. Get instant visibility into tire health, vehicle status, and critical alerts across all your vehicles.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
        benefits: ["Live fleet overview", "Instant notifications", "Multi-vehicle tracking", "Performance metrics"]
      },
      {
        title: "Intelligent Alert System",
        description: "Receive smart notifications based on tire condition, and predictive maintenance schedules. Never miss a critical maintenance window again.",
        image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
        benefits: ["Smart notifications", "Custom thresholds", "Priority alerts", "Mobile integration"]
      },
      {
        title: "Historical Performance Tracking",
        description: "Access comprehensive historical data and performance trends to make informed decisions about tire purchases, maintenance schedules, and fleet optimization strategies.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
        benefits: ["Trend analysis", "Performance history", "Data-driven decisions", "Long-term insights"]
      }
    ],
    management: [
      {
        title: "Digital Inspection Platform",
        description: "Complete tire inspections in under 10 minutes with our streamlined digital platform. Capture photos, record measurements, and generate reports instantly.",
        image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&h=400&fit=crop",
        benefits: ["10-minute inspections", "Digital documentation", "Instant reports", "Photo integration"]
      },
      {
        title: "Inventory Management System",
        description: "Track tire inventory, monitor stock levels, and automate reordering processes. Integrate with suppliers for seamless procurement and cost optimization.",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop",
        benefits: ["Inventory tracking", "Automated reordering", "Supplier integration", "Cost optimization"]
      },
      {
        title: "Team Collaboration Tools",
        description: "Enable your entire maintenance team to collaborate effectively with shared dashboards, task assignments, and communication tools integrated into the platform.",
        image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
        benefits: ["Team collaboration", "Task management", "Shared dashboards", "Communication tools"]
      }
    ]
  }

  const additionalFeatures = [
    {
      icon: Cloud,
      title: "Cloud Synchronization",
      description: "All your data is automatically synced across devices and accessible from anywhere."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and security protocols protect your sensitive fleet data."
    },
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description: "Full functionality on mobile devices with offline capabilities for field operations."
    },
    {
      icon: Database,
      title: "Data Integration",
      description: "Seamlessly integrate with existing fleet management and ERP systems."
    },
    {
      icon: TrendingUp,
      title: "Performance Analytics",
      description: "Comprehensive reporting and analytics to track KPIs and optimize operations."
    },
    {
      icon: Bell,
      title: "Custom Alerts",
      description: "Set up personalized alerts based on your specific operational requirements."
    }
  ]

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
                  item === 'Platform' ? '/us#platform' : 
                  item === 'Features' ? '/features' :
                  item === 'Plans' ? '/us#plans' : 
                  `/${item.toLowerCase()}`
                } 
                   className={`relative px-4 py-2 transition-all duration-300 group ${
                     item === 'Features' ? 'text-[#348CCB]' : 'text-gray-300 hover:text-white'
                   }`}>
                  <div className={`absolute inset-0 rounded-xl transition-all duration-300 backdrop-blur-sm border ${
                    item === 'Features' 
                      ? 'bg-gradient-to-r from-[#348CCB]/20 to-[#348CCB]/30 border-[#348CCB]/40 opacity-100' 
                      : 'bg-gradient-to-r from-white/10 to-white/15 opacity-0 group-hover:opacity-100 border-white/20'
                  }`}></div>
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
              {['Platform', 'Plans', 'Contact', 'Features',].map((item) => (
                <a key={item} href={
                  item === 'Platform' ? '/us#platform' : 
                  item === 'Features' ? '/features' :
                  item === 'Plans' ? '/us#plans' : 
                  `/${item.toLowerCase()}`
                }
                   className={`block py-2 px-6 rounded-2xl font-medium text-lg transition-all duration-300 backdrop-blur-sm border ${
                     item === 'Features'
                       ? 'bg-[#348CCB]/30 text-white border-[#348CCB]/40'
                       : 'text-white hover:bg-white/20 border-white/10 hover:border-white/30'
                   }`}
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
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#136eb2_0%,_rgba(19,110,178,0.4)_40%,_transparent_60%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-white via-gray-100 to-[#348CCB] bg-clip-text text-transparent mb-6">
            Powerful Features for Modern Fleet Management
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Discover how TirePro&apos;s advanced features transform your fleet operations with AI-powered insights, real-time monitoring, and comprehensive management tools designed for the modern transportation industry.
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {featureCategories.map((category) => {
              const IconComponent = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all duration-300 backdrop-blur-2xl border ${
                    activeTab === category.id
                      ? 'bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white border-[#348CCB] shadow-xl shadow-[#348CCB]/25'
                      : 'bg-gradient-to-br from-white/15 via-white/8 to-white/12 border-white/25 text-gray-300 hover:text-white hover:border-[#348CCB]/60'
                  }`}
                >
                  <IconComponent size={20} />
                  <span className="font-semibold">{category.title}</span>
                </button>
              )
            })}
          </div>

          {/* Feature Details */}
          <div className="space-y-20">
            {detailedFeatures[activeTab].map((feature, index) => (
              <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
              }`}>
                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed text-lg">
                      {feature.description}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center space-x-2">
                        <CheckCircle size={16} className="text-[#348CCB] flex-shrink-0" />
                        <span className="text-gray-400 text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`relative ${index % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                  <div className="relative rounded-3xl overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-white/15 via-white/8 to-white/12 border border-white/25 p-6">
                    <div className="aspect-video bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/10 rounded-2xl overflow-hidden">
                      {typeof feature.image === 'string' ? (
                        <img 
                          src={feature.image} 
                          alt={feature.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          className="w-full h-full object-cover"
                          fill
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-[#348CCB]/20 to-[#1E76B6]/20 rounded-full blur-xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-[#1E76B6]/15 to-[#348CCB]/15 rounded-full blur-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 bg-gradient-to-b from-[#0A183A]/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
              Everything You Need in One Platform
            </h2>
            <p className="text-xl text-gray-300">
              Comprehensive tools designed to streamline every aspect of fleet management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <div 
                  key={index}
                  className="group relative p-8 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-white/15 via-white/8 to-white/12 border border-white/25 hover:border-[#348CCB]/60 transition-all duration-500 hover:transform hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#348CCB]/10 to-[#1E76B6]/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  
                  <div className="relative">
                    <div className="bg-gradient-to-br from-[#348CCB] to-[#1E76B6] p-4 rounded-2xl w-fit mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-500">
                      <IconComponent size={28} className="text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 group-hover:text-[#348CCB] transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#348CCB]/20 via-[#1E76B6]/20 to-[#348CCB]/20 rounded-3xl blur-xl"></div>
            <div className="relative backdrop-blur-2xl bg-gradient-to-br from-white/15 via-white/8 to-white/12 border border-white/25 rounded-3xl p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-white to-[#348CCB] bg-clip-text text-transparent">
                Ready to Transform Your Fleet Management?
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Join thousands of fleet operators who have already reduced their tire costs by up to 25% with TirePro&apos;s intelligent platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href='/companyregister'>
                  <button className="bg-gradient-to-r from-[#348CCB] to-[#1E76B6] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-lg hover:shadow-[#348CCB]/25 transition-all transform hover:scale-105">
                    Start for Free
                  </button>
                </a>
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

export default TireProFeaturesPage