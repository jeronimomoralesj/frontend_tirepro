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
  MessageCircleHeart
} from "lucide-react";
import logo from "../../../public/logo_text.png";
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

  if (company.plan === "mini") {
    // Mini plan: only resumenMini
    links = [
      {
        name: "Resumen",
        path: "/dashboard/resumenMini",
        icon: LayoutDashboard,
      },
      {
        name: "Comunidad",
        path: "/dashboard/comunidad",
        icon: MessageCircleHeart,
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
      { name: "Agregar", path: "/dashboard/agregarConductor", icon: Settings },
    ];
  }

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }
  function toggleMobileMenu() {
    setIsMobileOpen(!isMobileOpen);
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <button
        onClick={toggleMobileMenu}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside
        className={`
          fixed top-0 left-0 h-full z-40 bg-white shadow-xl
          transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-20' : 'w-72'} flex flex-col overflow-hidden border-r border-gray-100
        `}
      >
        {/* Logo + collapse button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <Link
            href="/dashboard"
            className={`flex items-center ${collapsed ? 'justify-center w-full' : 'justify-start'}`}
          >
            <Image src={logo} alt="TirePro Logo" className={`${collapsed ? 'h-6' : 'h-8'} w-auto`} />
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-full hover:bg-gray-100 lg:block hidden text-gray-500 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* User / Company info */}
        <div className={`
          flex items-center ${collapsed ? 'justify-center' : 'justify-start'}
          p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white
        `}>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
            {company.profileImage ? (
              <img src={company.profileImage} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#0A183A]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#0A183A]" />
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="ml-3 truncate">
              <p className="text-sm font-semibold text-gray-800">{company.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user.name}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1.5">
            {links.map(({ name, path, icon: Icon }) => {
              const active = pathname === path;
              return (
                <Link
                  key={path}
                  href={path}
                  className={`
                    flex items-center ${collapsed ? 'justify-center' : 'justify-start'}
                    px-3 py-2.5 text-sm font-medium rounded-xl transition-all
                    ${active ? 'bg-[#0A183A] text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  <div className={`
                    ${active ? 'text-white' : 'text-gray-500'}
                    ${collapsed
                      ? ''
                      : active ? 'bg-white/20 rounded-lg p-1.5' : 'bg-gray-100 rounded-lg p-1.5'}
                  `}>
                    <Icon className={`${collapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
                  </div>
                  {!collapsed && <span className="ml-3">{name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer: Settings + Logout */}
        <div className={`p-4 border-t border-gray-100 bg-gray-50/50 ${collapsed ? 'space-y-4' : 'space-y-2'}`}>
          {/* Only show settings if not mini and if admin */}
          {company.plan !== "mini" && isAdmin && (
            <Link
              href="/dashboard/ajustes"
              className={`
                flex items-center ${collapsed ? 'justify-center' : 'justify-start'}
                px-3 py-2.5 text-sm font-medium rounded-xl text-gray-700 hover:bg-gray-100 transition-colors
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
              w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'}
              px-3 py-2.5 text-sm font-medium rounded-xl text-gray-700 hover:bg-red-50 group transition-colors
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
