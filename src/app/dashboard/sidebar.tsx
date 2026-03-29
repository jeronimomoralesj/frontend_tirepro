'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Plus, Settings, Search, Car, ChartPie,
  LogOut, Glasses, LifeBuoy, User, Menu, X,
  ChevronLeft, ChevronRight, Truck, User2, Trash2,
  Trash, ClipboardList, Package, ShoppingCart,
} from "lucide-react";
import logo from "../../../public/logo_full.png";
import Image from "next/image";

// =============================================================================
// Types
// =============================================================================

type UserData    = { name: string; role: string; companyId: string };
type CompanyData = { name: string; profileImage?: string; plan: string };

type NavLink = { name: string; path: string; icon: React.ComponentType<{ className?: string }> };

// =============================================================================
// Constants — API base
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
  : "https://api.tirepro.com.co/api";

// =============================================================================
// Helpers — build nav links based on plan + role
// =============================================================================

function buildLinks(plan: string, isAdmin: boolean): NavLink[] {
  if (plan === "distribuidor") {
    return [
      { name: "Resumen",   path: "/dashboard/distribuidor", icon: LayoutDashboard },
      { name: "Analista",  path: "/dashboard/analistaDist", icon: Glasses         },
      { name: "Pedidos",   path: "/dashboard/pedidosDist",  icon: ShoppingCart    },
      { name: "Catalogo",  path: "/dashboard/catalogoDist", icon: Package         },
      { name: "Desechos",  path: "/dashboard/desechosDist", icon: Trash2          },
      { name: "Clientes",  path: "/dashboard/clientes",     icon: User2           },
      { name: "Vehículos", path: "/dashboard/vehiculoDist", icon: Truck           },
      { name: "Buscar",    path: "/dashboard/buscarDist",   icon: Search          },
      { name: "Agregar",   path: "/dashboard/agregarDist",  icon: Plus            },
    ];
  }
  if (isAdmin) {
    return [
      { name: "Resumen",    path: "/dashboard/resumen",    icon: LayoutDashboard },
      { name: "Analista",   path: "/dashboard/analista",   icon: Glasses         },
      { name: "Detalle",    path: "/dashboard/detalle",    icon: ClipboardList   },
      { name: "Inventario", path: "/dashboard/inventario", icon: Package         },
      { name: "Vehículos",  path: "/dashboard/vehiculo",   icon: Car             },
      { name: "Agregar",    path: "/dashboard/agregar",    icon: Plus            },
      { name: "Buscar",     path: "/dashboard/buscar",     icon: Search          },
    ];
  }
  return [
    { name: "Agregar", path: "/dashboard/agregarConductor", icon: Plus },
  ];
}

// =============================================================================
// Avatar — company logo or initial
// =============================================================================

function CompanyAvatar({
  company, size = "md",
}: {
  company: CompanyData; size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-16 h-16" : "w-10 h-10";
  const text = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-base";

  return (
    <div
      className={`${dim} rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center`}
      style={{ background: "linear-gradient(135deg, #0A183A, #1E76B6)" }}
    >
      {company.profileImage ? (
        <img
          src={company.profileImage}
          alt={company.name}
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <span className={`${text} font-black text-white`}>
          {company.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Nav item — shared between desktop + mobile
// =============================================================================

function NavItem({
  link, active, collapsed, onClick,
}: {
  link: NavLink; active: boolean; collapsed: boolean; onClick?: () => void;
}) {
  const Icon = link.icon;

  return (
    <Link
      href={link.path}
      onClick={onClick}
      className="group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold transition-all duration-200"
      style={
        active
          ? {
              background: "linear-gradient(135deg, #0A183A 0%, #1E76B6 100%)",
              color: "white",
              boxShadow: "0 4px 12px rgba(10,24,58,0.25)",
            }
          : {
              color: "#173D68",
              background: "transparent",
            }
      }
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(30,118,182,0.08)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }
      }}
    >
      <div
        className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-200"
        style={{
          background: active ? "rgba(255,255,255,0.15)" : "rgba(30,118,182,0.08)",
        }}
      >
        <Icon className="w-4 h-4" />
      </div>
      {!collapsed && (
        <span className="leading-none truncate">{link.name}</span>
      )}
    </Link>
  );
}

// =============================================================================
// Main Sidebar component
// =============================================================================

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
  const [user,    setUser]    = useState<UserData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);

  // -- Bootstrap: load user from localStorage ----------------------------------
  useEffect(() => {
    const raw   = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (raw && token) {
      setUser(JSON.parse(raw));
    } else {
      localStorage.clear();
      window.location.href = "/login";
    }
  }, []);

  // -- Fetch company once we have the id ---------------------------------------
  useEffect(() => {
    if (!user?.companyId) return;
    fetch(`${API_BASE}/companies/${user.companyId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setCompany)
      .catch(err => console.error("Error fetching company:", err));
  }, [user?.companyId]);

  // Still loading
  if (!user || !company) return null;

  const isAdmin = user.role === "admin";
  const links   = buildLinks(company.plan, isAdmin);

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  function closeMobile() { setIsMobileOpen(false); }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      {/* -- Mobile backdrop ------------------------------------------------ */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* -- Mobile top bar ------------------------------------------------- */}
      <nav
        className="fixed top-3 left-1/2 -translate-x-1/2 z-50 lg:hidden"
        style={{ width: "calc(100% - 1.5rem)" }}
      >
        <div
          className="flex items-center justify-between px-4 h-13 rounded-2xl"
          style={{
            background: "white",
            border: "1px solid rgba(52,140,203,0.18)",
            boxShadow: "0 4px 24px rgba(10,24,58,0.1)",
            height: 52,
          }}
        >
          <CompanyAvatar company={company} size="sm" />

          <div className="text-center">
            <p className="text-xs font-black text-[#0A183A] leading-none">{company.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{user.name}</p>
          </div>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl transition-all"
            style={{ background: "rgba(30,118,182,0.08)", border: "1px solid rgba(52,140,203,0.15)" }}
          >
            {isMobileOpen
              ? <X className="w-4 h-4 text-[#1E76B6]" />
              : <Menu className="w-4 h-4 text-[#1E76B6]" />
            }
          </button>
        </div>
      </nav>

      {/* -- Mobile slide-in panel ------------------------------------------ */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-72 flex flex-col lg:hidden transition-transform duration-300"
        style={{
          transform: isMobileOpen ? "translateX(0)" : "translateX(100%)",
          background: "white",
          borderLeft: "1px solid rgba(52,140,203,0.15)",
          boxShadow: "-8px 0 32px rgba(10,24,58,0.1)",
        }}
      >
        {/* Mobile panel header */}
        <div
          className="px-5 py-5"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Menú</p>
            <button
              onClick={closeMobile}
              className="p-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {/* Big logo box */}
          <div
            className="w-full rounded-2xl overflow-hidden flex items-center justify-center mb-3"
            style={{
              height: 88,
              background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.2)",
            }}
          >
            {company.profileImage ? (
              <img
                src={company.profileImage}
                alt={company.name}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <span className="text-4xl font-black text-white">
                {company.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <p className="font-black text-white text-sm truncate text-center">{company.name}</p>
          <p className="text-[11px] text-white/60 mt-0.5 truncate text-center">{user.name}</p>
        </div>

        {/* Mobile nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {links.map(link => (
            <NavItem
              key={link.path}
              link={link}
              active={pathname === link.path}
              collapsed={false}
              onClick={closeMobile}
            />
          ))}
        </nav>

        {/* Mobile footer */}
        <div
          className="px-3 pb-4 pt-3 space-y-1"
          style={{ borderTop: "1px solid rgba(52,140,203,0.1)" }}
        >
          {company.plan !== "mini" && isAdmin && (
            <Link
              href="/settings"
              onClick={closeMobile}
              className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-[#173D68] transition-all hover:bg-[rgba(30,118,182,0.08)]"
            >
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.08)" }}>
                <Settings className="w-4 h-4 text-[#1E76B6]" />
              </div>
              Ajustes
            </Link>
          )}
          <a href="/marketplace" onClick={closeMobile}
            className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#348CCB]/70 hover:bg-[rgba(30,118,182,0.06)]">
            <div className="p-1 rounded-md" style={{ background: "rgba(30,118,182,0.06)" }}>
              <ShoppingCart className="w-3.5 h-3.5 text-[#348CCB]/60" />
            </div>
            Marketplace
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-red-500 transition-all hover:bg-red-50"
          >
            <div className="p-1.5 rounded-lg bg-red-50">
              <LogOut className="w-4 h-4" />
            </div>
            Cerrar sesión
          </button>
        </div>

        {/* TirePro logo */}
        <div
          className="flex items-center justify-center px-4 py-3"
          style={{ borderTop: "1px solid rgba(52,140,203,0.1)" }}
        >
          <Image src={logo} alt="TirePro" className="h-7 w-auto" />
        </div>
      </div>

      {/* -- Desktop sidebar ------------------------------------------------ */}
      <aside
        className="fixed top-4 left-4 hidden lg:flex flex-col"
        style={{
          height: "calc(100vh - 2rem)",
          width: collapsed ? 64 : 224,
          background: "white",
          border: "1px solid rgba(52,140,203,0.15)",
          boxShadow: "0 4px 32px rgba(10,24,58,0.08)",
          borderRadius: 20,
          transition: "width 300ms ease",
          overflow: "hidden",
        }}
      >
        {/* Desktop header */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
            padding: collapsed ? "14px 8px" : "16px",
          }}
        >
          {collapsed ? (
            <CompanyAvatar company={company} size="sm" />
          ) : (
            <>
              <div
                className="w-full rounded-2xl overflow-hidden flex items-center justify-center mb-3"
                style={{
                  height: 80,
                  background: "rgba(255,255,255,0.12)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                }}
              >
                {company.profileImage ? (
                  <img
                    src={company.profileImage}
                    alt={company.name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-4xl font-black text-white">
                    {company.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="font-black text-white text-sm leading-none truncate w-full text-center">
                {company.name}
              </p>
              <p className="text-[11px] text-white/60 mt-1 truncate w-full text-center">
                {user.name}
              </p>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <div
          className="flex-shrink-0 flex px-2 py-2"
          style={{ justifyContent: collapsed ? "center" : "flex-end" }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg transition-all hover:scale-105"
            style={{
              background: "rgba(30,118,182,0.08)",
              border: "1px solid rgba(52,140,203,0.15)",
            }}
          >
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5 text-[#1E76B6]" />
              : <ChevronLeft  className="w-3.5 h-3.5 text-[#1E76B6]" />
            }
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {links.map(link => (
            <NavItem
              key={link.path}
              link={link}
              active={pathname === link.path}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Desktop footer */}
        <div
          className="flex-shrink-0 px-2 pb-3 pt-2 space-y-0.5"
          style={{ borderTop: "1px solid rgba(52,140,203,0.1)" }}
        >
          <a
            href="/marketplace"
            className="group flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#348CCB]/70 transition-all hover:bg-[rgba(30,118,182,0.06)] hover:text-[#1E76B6]"
          >
            <div className="flex-shrink-0 p-1 rounded-md" style={{ background: "rgba(30,118,182,0.06)" }}>
              <ShoppingCart className="w-3.5 h-3.5 text-[#348CCB]/60" />
            </div>
            {!collapsed && <span className="truncate">Marketplace</span>}
          </a>
          {company.plan !== "mini" && isAdmin && (
            <Link
              href="/settings"
              className="group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-[#173D68] transition-all hover:bg-[rgba(30,118,182,0.08)]"
            >
              <div className="flex-shrink-0 p-1.5 rounded-lg" style={{ background: "rgba(30,118,182,0.08)" }}>
                <Settings className="w-4 h-4 text-[#1E76B6]" />
              </div>
              {!collapsed && <span className="truncate">Ajustes</span>}
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-red-500 transition-all hover:bg-red-50"
          >
            <div className="flex-shrink-0 p-1.5 rounded-lg bg-red-50">
              <LogOut className="w-4 h-4" />
            </div>
            {!collapsed && <span className="truncate">Cerrar sesión</span>}
          </button>

          {/* TirePro logo */}
          <div
            className="flex items-center justify-center pt-2 mt-1"
            style={{ borderTop: "1px solid rgba(52,140,203,0.08)" }}
          >
            <Image
              src={logo}
              alt="TirePro"
              className="w-auto transition-all duration-300"
              style={{ height: collapsed ? 20 : 28 }}
            />
          </div>
        </div>
      </aside>
    </>
  );
}