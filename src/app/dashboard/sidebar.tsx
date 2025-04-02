"use client";

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
} from "lucide-react";
import Chatbot from "./cards/chatBot";
import Addfloat from "./cards/addFloat";

export default function Sidebar({ 
  collapsed, 
  setCollapsed, 
  isMobileOpen, 
  setIsMobileOpen 
}) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    } else {
      localStorage.clear();
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    async function fetchCompany() {
      if (!user?.companyId) return;
      try {
        const response = await fetch(`http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/companies/${user.companyId}`);
        if (!response.ok) throw new Error("Failed to fetch company data");
        const companyData = await response.json();
        setCompany(companyData);
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    }
    fetchCompany();
  }, [user?.companyId]);

  if (!user) return null;

  const isAdmin = user.role === "admin";

  const adminLinks = [
    { name: "Resumen", path: "/dashboard/resumen", icon: LayoutDashboard },
    { name: "Flota", path: "/dashboard/flota", icon: LifeBuoy },
    { name: "Semáforo", path: "/dashboard/semaforo", icon: ChartPie },
    { name: "Agregar", path: "/dashboard/agregar", icon: Plus },
    { name: "Analista", path: "/dashboard/analista", icon: Glasses },
    { name: "Vehículos", path: "/dashboard/vehiculo", icon: Car },
    { name: "Buscar", path: "/dashboard/buscar", icon: Search },
  ];

  const regularLinks = [
    { name: "Agregar Conductor", path: "/dashboard/agregarConductor", icon: Settings },
  ];

  const links = isAdmin ? adminLinks : regularLinks;

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  function toggleMobileMenu() {
    setIsMobileOpen(!isMobileOpen);
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <button
        onClick={toggleMobileMenu}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full z-40
          bg-white shadow-xl
          transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-20' : 'w-72'}
          flex flex-col
          overflow-hidden
          border-r border-gray-100
        `}
      >
        {/* Logo section */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <Link 
            href="/dashboard" 
            className={`flex items-center ${collapsed ? 'justify-center w-full' : 'justify-start'}`}
          >
            <img
              src="https://tirepro.com.co/static/media/logo_text.2391efedce2e8af16a32.png"
              alt="TirePro Logo"
              className={`${collapsed ? 'h-6' : 'h-8'} w-auto`}
            />
          </Link>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-full hover:bg-gray-100 lg:block hidden text-gray-500 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? 
              <ChevronRight className="h-5 w-5" /> :
              <ChevronLeft className="h-5 w-5" />
            }
          </button>
        </div>

        {/* User info */}
        <div className={`
          flex items-center 
          ${collapsed ? 'justify-center' : 'justify-start'} 
          p-5 border-b border-gray-100 
          bg-gradient-to-r from-gray-50 to-white
        `}>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
            {company?.profileImage ? (
              <img 
                src={company.profileImage} 
                alt="Company Logo" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-[#0A183A]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#0A183A]" />
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="ml-3 truncate">
              <p className="text-sm font-semibold text-gray-800">{company?.name || "Company"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user.name}</p>
            </div>
          )}
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1.5">
            {links.map(({ name, path, icon: Icon }) => {
              const isActive = pathname === path;
              return (
                <Link
                  key={path}
                  href={path}
                  className={`
                    flex items-center
                    ${collapsed ? 'justify-center' : 'justify-start'}
                    px-3 py-2.5
                    text-sm font-medium
                    rounded-xl
                    transition-all
                    ${isActive 
                      ? "bg-[#0A183A] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-100"}
                  `}
                >
                  <div className={`
                    ${isActive 
                      ? "text-white" 
                      : "text-gray-500"}
                    ${collapsed 
                      ? "" 
                      : isActive ? "bg-white/20 rounded-lg p-1.5" : "bg-gray-100 rounded-lg p-1.5"}
                  `}>
                    <Icon className={`${collapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  </div>
                  {!collapsed && <span className="ml-3">{name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Settings and Logout */}
        <div className={`p-4 border-t border-gray-100 bg-gray-50/50 ${collapsed ? 'space-y-4' : 'space-y-2'}`}>
          {isAdmin && (
            <Link
              href="/dashboard/ajustes"
              className={`
                flex items-center
                ${collapsed ? 'justify-center' : 'justify-start'}
                px-3 py-2.5
                text-sm font-medium
                rounded-xl
                text-gray-700
                hover:bg-gray-100
                transition-colors
              `}
            >
              <div className="bg-gray-100 rounded-lg p-1.5 text-gray-500">
                <Settings className={`${collapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </div>
              {!collapsed && <span className="ml-3">Ajustes</span>}
            </Link>
          )}
          <button
            onClick={handleLogout}
            className={`
              w-full
              flex items-center
              ${collapsed ? 'justify-center' : 'justify-start'}
              px-3 py-2.5
              text-sm font-medium
              rounded-xl
              text-gray-700
              hover:bg-red-50
              group
              transition-colors
            `}
          >
            <div className="bg-red-100 rounded-lg p-1.5 text-red-500 group-hover:bg-red-200 transition-colors">
              <LogOut className={`${collapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
            </div>
            {!collapsed && <span className="ml-3 group-hover:text-red-600 transition-colors">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

    </>
  );
}