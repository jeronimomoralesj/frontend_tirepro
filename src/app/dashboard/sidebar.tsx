'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Settings,
  Search,
  Car,
  ChartPie,
  LogOut,
  Glasses,
  LifeBuoy,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Truck,
} from "lucide-react";
import logo from "../../../public/logo_full.png";
import Image from "next/image";

export default function Sidebar({
  collapsed,
  setCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string; companyId: string } | null>(null);
  const [company, setCompany] = useState<{ name: string; profileImage?: string; plan: string } | null>(null);

  // load user from localStorage
  useEffect(() => {
    const sUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (sUser && token) {
      setUser(JSON.parse(sUser));
    } else {
      localStorage.clear();
      window.location.href = "/login";
    }
  }, []);

  // fetch company after we know user.companyId
  useEffect(() => {
    if (!user?.companyId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/companies/${user.companyId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch company");
        return r.json();
      })
      .then(setCompany)
      .catch((err) => console.error("Error fetching company:", err));
  }, [user?.companyId]);

  if (!user || !company) {
    // either still loading user or company
    return null;
  }

  const isAdmin = user.role === "admin";

  // Build links based on company.plan first
  let links: { name: string; path: string; icon: React.ComponentType }[];

  if (company.plan === "distribuidor") {
    links = [
      {
        name: "Resumen",
        path: "/dashboard/distribuidor",
        icon: LayoutDashboard,
      },
      {
        name: "Agregar",
        path: "/dashboard/agregarDist",
        icon: Plus,
      },
      {
        name: "Vehiculos",
        path: "/dashboard/vehiculoDist",
        icon: Truck,
      },
    ];
  } else if (isAdmin) {
    // Admin on pro/retail
    links = [
      { name: "Resumen", path: "/dashboard/resumen", icon: LayoutDashboard },
      { name: "Flota", path: "/dashboard/flota", icon: LifeBuoy },
      { name: "Semáforo", path: "/dashboard/semaforo", icon: ChartPie },
      { name: "Agregar", path: "/dashboard/agregar", icon: Plus },
      { name: "Analista", path: "/dashboard/analista", icon: Glasses },
      { name: "Vehículos", path: "/dashboard/vehiculo", icon: Car },
      { name: "Buscar", path: "/dashboard/buscar", icon: Search },
    ];
  } else {
    // Regular user on pro/retail
    links = [
      { name: "Agregar", path: "/dashboard/agregarConductor", icon: Plus },
    ];
  }

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }
  
  function toggleMobileMenu() {
    setIsMobileOpen(!isMobileOpen);
  }

  // Close mobile sidebar when clicking a link
  function handleLinkClick() {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }

  return (
    <>
      {/* Mobile backdrop with blur effect */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${
          isMobileOpen 
            ? 'backdrop-blur-3xl bg-black/60 opacity-100'
            : 'opacity-0 pointer-events-none'
        } lg:hidden`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile Navigation Bar - Fixed height of 64px total */}
      <nav className={`fixed top-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] h-14 z-50 transition-all duration-700 rounded-xl lg:hidden
                      backdrop-blur-2xl bg-gradient-to-r from-white/15 via-white/8 to-white/15 border border-white/30 shadow-2xl`}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A183A]/15 via-transparent to-[#0A183A]/15 opacity-60 rounded-xl"></div>
        
        <div className="px-4 relative h-full">
          <div className="flex justify-between items-center h-full">
            {/* Company Logo - Centered */}
            <div className="flex-1 flex justify-center items-center relative z-10">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden 
                              border-2 border-white/40 shadow-2xl
                              bg-gradient-to-br from-white/30 to-white/10
                              hover:scale-105 transition-all duration-300">
                {company.profileImage ? (
                  <img src={company.profileImage} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                                  flex items-center justify-center backdrop-blur-xl">
                    <User className="w-5 h-5 text-gray-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              </div>
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="relative z-10 bg-white/20 backdrop-blur-xl border border-white/30 
                         p-2 rounded-xl shadow-2xl hover:bg-white/30 
                         transition-all duration-300 ease-out hover:scale-105
                         before:absolute before:inset-0 before:rounded-xl 
                         before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 
                         hover:before:opacity-100 before:transition-opacity before:duration-300"
            >
              {isMobileOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside
        className={`
          fixed top-4 left-4 h-[calc(100vh-2rem)] z-40 
          transition-all duration-500 ease-out
          ${collapsed ? 'w-16' : 'w-60'} 
          flex flex-col overflow-hidden
          hidden lg:flex
          
          /* Liquid glass effect */
          bg-white/80 backdrop-blur-2xl 
          border border-white/30 rounded-2xl shadow-2xl
          
          /* Floating animation */
          hover:shadow-3xl hover:-translate-y-1 transition-all duration-300
          
          /* Inner glow */
          before:absolute before:inset-0 before:rounded-2xl 
          before:bg-gradient-to-br before:from-white/40 before:via-white/20 before:to-transparent 
          before:opacity-60 before:pointer-events-none
          
          /* Outer highlight */
          after:absolute after:inset-0 after:rounded-2xl 
          after:bg-gradient-to-r after:from-[#0A183A]/10 after:via-[#1E76B6]/5 after:to-transparent 
          after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500
          after:pointer-events-none
        `}
      >
        {/* Company Logo Section - Compact */}
        <div className={`
          relative flex flex-col items-center justify-center
          ${collapsed ? 'p-2' : 'p-3'}
          border-b border-white/20
          bg-gradient-to-br from-blue/40 via-white/20 to-white/10
          backdrop-blur-xl
          transition-all duration-500
        `}>
          <div className={`
            relative rounded-2xl overflow-hidden
            border 
            transition-all duration-500
            ${collapsed ? 'w-10 h-10' : 'w-full h-20'}
          `}>
            {company.profileImage ? (
              <img 
                src={company.profileImage} 
                alt="Company Logo" 
                className="w-full h-full object-contain p-5" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                              flex items-center justify-center backdrop-blur-xl">
                <User className={`${collapsed ? 'w-5 h-5' : 'w-12 h-12'} text-gray-700 transition-all duration-500`} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          
          {!collapsed && (
            <div className="mt-2 text-center w-full">
              <p className="text-sm font-bold text-gray-800 drop-shadow-sm truncate px-2">
                {company.name}
              </p>
              <p className="text-xs text-gray-600 drop-shadow-sm">
                {user.name}
              </p>
            </div>
          )}
        </div>

        {/* Collapse button - Compact */}
        {!collapsed && (
          <div className="px-3 py-1 flex justify-end">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex p-1.5 rounded-lg 
                         bg-white/20 backdrop-blur-xl border border-white/30
                         hover:bg-white/30 hover:scale-105 
                         text-gray-700 transition-all duration-300 ease-out
                         shadow-lg hover:shadow-xl"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {collapsed && (
          <div className="px-2 py-1 flex justify-center">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex p-1.5 rounded-lg 
                         bg-white/20 backdrop-blur-xl border border-white/30
                         hover:bg-white/30 hover:scale-105 
                         text-gray-700 transition-all duration-300 ease-out
                         shadow-lg hover:shadow-xl"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Navigation with liquid glass buttons - Compact spacing */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {links.map(({ name, path, icon: Icon }) => {
            const active = pathname === path;
            return (
              <Link
                key={path}
                href={path}
                onClick={handleLinkClick}
                className={`
                  group relative flex items-center ${collapsed ? 'justify-center px-2' : 'justify-start px-2.5'}
                  py-2 text-sm font-medium rounded-xl transition-all duration-300
                  ${active 
                    ? 'bg-gradient-to-r from-[#0A183A]/90 to-[#1E76B6]/90 text-white shadow-2xl border border-white/20' 
                    : 'text-gray-700 hover:bg-white/30 hover:backdrop-blur-xl hover:shadow-xl hover:border-white/30 border border-transparent'
                  }
                  hover:scale-[1.02] hover:-translate-y-0.5
                `}
              >
                {/* Background glass effect for non-active items */}
                {!active && (
                  <div className="absolute inset-0 rounded-xl bg-white/20 backdrop-blur-xl opacity-0 
                                  group-hover:opacity-100 transition-all duration-300" />
                )}
                
                {/* Active item glow */}
                {active && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                                  blur-xl opacity-60" />
                )}
                
                <div className={`
                  relative z-10 flex items-center
                  ${active ? 'text-white' : 'text-gray-600 group-hover:text-gray-800'}
                  transition-colors duration-300
                `}>
                  <div className={`
                    rounded-lg p-1.5 transition-all duration-300
                    ${active 
                      ? 'bg-white/20 backdrop-blur-xl shadow-lg' 
                      : 'bg-white/40 backdrop-blur-xl group-hover:bg-white/60 group-hover:shadow-lg'
                    }
                  `}>
                    <Icon className="h-4 w-4 transition-all duration-300" />
                  </div>
                  
                  {!collapsed && (
                    <span className="ml-2.5 font-medium drop-shadow-sm">
                      {name}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer with TirePro logo and actions - Compact */}
        <div className={`
          border-t border-white/20 
          bg-gradient-to-br from-white/40 via-white/20 to-white/10
          backdrop-blur-xl
        `}>
          {/* Settings link for admin users */}
          {company.plan !== "mini" && isAdmin && (
            <div className="p-2">
              <Link
                href="/dashboard/ajustes"
                onClick={handleLinkClick}
                className={`
                  group relative flex items-center ${collapsed ? 'justify-center px-2' : 'justify-start px-2.5'}
                  py-2 text-sm font-medium rounded-xl 
                  text-gray-700 hover:bg-white/30 hover:backdrop-blur-xl 
                  hover:shadow-lg border border-transparent hover:border-white/30
                  transition-all duration-300 hover:scale-[1.02]
                `}
              >
                <div className="absolute inset-0 rounded-xl bg-white/20 backdrop-blur-xl opacity-0 
                                group-hover:opacity-100 transition-all duration-300" />
                
                <div className="relative z-10 flex items-center">
                  <div className="bg-white/40 backdrop-blur-xl rounded-lg p-1.5 
                                  group-hover:bg-white/60 group-hover:shadow-lg transition-all duration-300">
                    <Settings className="h-4 w-4 text-gray-600" />
                  </div>
                  {!collapsed && <span className="ml-2.5 drop-shadow-sm">Ajustes</span>}
                </div>
              </Link>
            </div>
          )}
          
          {/* Logout button */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className={`
                group relative w-full flex items-center ${collapsed ? 'justify-center px-2' : 'justify-start px-2.5'}
                py-2 text-sm font-medium rounded-xl 
                text-gray-700 hover:bg-red-50/40 hover:backdrop-blur-xl 
                hover:shadow-lg border border-transparent hover:border-red-200/30
                transition-all duration-300 hover:scale-[1.02]
              `}
            >
              <div className="absolute inset-0 rounded-xl bg-red-50/30 backdrop-blur-xl opacity-0 
                              group-hover:opacity-100 transition-all duration-300" />
              
              <div className="relative z-10 flex items-center">
                <div className="bg-[#1E76B6] backdrop-blur-xl rounded-lg p-1.5 
                                group-hover:bg-red-200/60 group-hover:shadow-lg transition-all duration-300">
                  <LogOut className="h-4 w-4 text-white" />
                </div>
                {!collapsed && (
                  <span className="ml-2.5 group-hover:text-[#1E76B6] transition-colors duration-300 drop-shadow-sm">
                    Cerrar sesión
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* TirePro Logo at bottom - Compact */}
          <div className={`
            flex items-center justify-center p-2
            border-t border-white/20
            bg-gradient-to-r from-white/30 to-white/10
          `}>
            <Link
              href="/dashboard"
              onClick={handleLinkClick}
              className="flex items-center hover:scale-105 transition-all duration-300"
            >
              <div className="relative">
                <Image 
                  src={logo} 
                  alt="TirePro Logo" 
                  className={`${collapsed ? 'h-5' : 'h-10'} w-auto transition-all duration-300
                             filter drop-shadow-lg`} 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                                rounded-lg blur-xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar (Full Screen) */}
      <div className={`
        fixed inset-0 z-50 transition-all duration-500 lg:hidden
        ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'}
        bg-white/90 backdrop-blur-3xl
      `}>
        <div className="flex flex-col h-full">
          {/* Mobile Company Logo Header - Full width */}
          <div className="flex flex-col items-center p-6 border-b border-white/20">
            <button
              onClick={toggleMobileMenu}
              className="self-end p-3 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30
                         hover:bg-white/30 transition-all duration-300 mb-4"
            >
              <X className="h-6 w-6 text-gray-800" />
            </button>

            {/* Large Company Logo */}
            <div className="relative w-full h-40 rounded-2xl overflow-hidden 
                            border-2 border-white/40 shadow-2xl
                            bg-gradient-to-br from-white/30 to-white/10 mb-4">
              {company.profileImage ? (
                <img src={company.profileImage} alt="Company Logo" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-[#0A183A]/20 to-[#1E76B6]/20 
                                flex items-center justify-center backdrop-blur-xl">
                  <User className="w-20 h-20 text-gray-700" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </div>

            <div className="text-center w-full">
              <p className="text-l font-bold text-gray-800">{company.name}</p>
              <p className="text-m text-gray-600 mt-1">{user.name}</p>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-6">
            <div className="space-y-3">
              {links.map(({ name, path, icon: Icon }) => {
                const active = pathname === path;
                return (
                  <Link
                    key={path}
                    href={path}
                    onClick={handleLinkClick}
                    className={`
                      flex items-center px-4 py-4 text-base font-medium rounded-2xl
                      transition-all duration-300
                      ${active 
                        ? 'bg-gradient-to-r from-[#0A183A]/90 to-[#1E76B6]/90 text-white shadow-xl' 
                        : 'text-gray-700 hover:bg-white/40 hover:shadow-lg'
                      }
                    `}
                  >
                    <div className={`
                      rounded-xl p-3 transition-all duration-300
                      ${active 
                        ? 'bg-white/20 backdrop-blur-xl' 
                        : 'bg-white/40 backdrop-blur-xl'
                      }
                    `}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="ml-4">{name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile Footer */}
          <div className="border-t border-white/20">
            <div className="p-6 space-y-3">
              {company.plan !== "mini" && isAdmin && (
                <Link
                  href="/dashboard/ajustes"
                  onClick={handleLinkClick}
                  className="flex items-center px-4 py-3 text-base font-medium rounded-2xl
                             text-gray-700 hover:bg-white/40 hover:shadow-lg transition-all duration-300"
                >
                  <div className="bg-white/40 backdrop-blur-xl rounded-xl p-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="ml-3">Ajustes</span>
                </Link>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-base font-medium rounded-2xl
                           text-gray-700 hover:bg-red-50/40 hover:shadow-lg transition-all duration-300"
              >
                <div className="bg-red-100/60 backdrop-blur-xl rounded-xl p-2">
                  <LogOut className="h-5 w-5 text-red-500" />
                </div>
                <span className="ml-3 hover:text-red-600 transition-colors duration-300">
                  Cerrar sesión
                </span>
              </button>
            </div>

            {/* TirePro Logo at bottom of mobile */}
            <div className="flex items-center justify-center p-4 border-t border-white/20
                            bg-gradient-to-r from-white/30 to-white/10">
              <Image 
                src={logo} 
                alt="TirePro Logo" 
                className="h-8 w-auto filter drop-shadow-lg" 
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}