'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Plus, Settings, Search, Car, ChartPie,
  LogOut, Glasses, LifeBuoy, User, Menu, X,
  ChevronLeft, ChevronRight, Truck, User2, Trash2,
  Trash, ClipboardList, Package, ShoppingCart, BookOpen, BarChart3,
  Sparkles,
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

function buildLinks(plan: string, isAdmin: boolean, role?: string): NavLink[] {
  if (role === "viewer" || role === "regular") {
    return [
      { name: "Agregar", path: "/dashboard/agregarConductor", icon: Plus },
    ];
  }

  if (plan === "distribuidor") {
    if (role === "catalogo" || role === "catalogo_admin") {
      return [
        { name: "Catálogo", path: "/dashboard/catalogoSku", icon: BookOpen },
      ];
    }
    if (role === "marketplace_tracker") {
      return [
        { name: "Catálogo",     path: "/dashboard/catalogoSku",                 icon: BookOpen      },
        { name: "Perfil",       path: "/dashboard/marketplace/perfil",          icon: User2         },
        { name: "Pedidos",      path: "/dashboard/marketplace/pedidos",         icon: ShoppingCart  },
        { name: "Productos",    path: "/dashboard/marketplace/productos",       icon: Package       },
        { name: "Estadísticas", path: "/dashboard/marketplace/estadisticas",    icon: BarChart3     },
      ];
    }
    return [
      { name: "Resumen",   path: "/dashboard/distribuidor", icon: LayoutDashboard },
      { name: "Pedidos",   path: "/dashboard/pedidosDist",  icon: ShoppingCart    },
      { name: "Desechos",  path: "/dashboard/desechosDist", icon: Trash2          },
      { name: "Gestión",   path: "/dashboard/clientes",     icon: User2           },
      { name: "Vehículos", path: "/dashboard/vehiculoDist", icon: Truck           },
      { name: "Catálogo",  path: "/dashboard/catalogoSku",  icon: BookOpen        },
      { name: "Buscar",    path: "/dashboard/buscarDist",   icon: Search          },
      { name: "Agregar",   path: "/dashboard/agregarDist",  icon: Plus            },
    ];
  }

  if (plan === "plus" || plan === "pro") {
    const links: NavLink[] = [
      { name: "Resumen",    path: "/dashboard/resumen",    icon: LayoutDashboard },
    ];
    if (isAdmin) {
      links.push(
        { name: "Modo IA",  path: "/chat",          icon: Sparkles },
      );
    }
    links.push(
      { name: "Analista",   path: "/dashboard/analista",   icon: Glasses         },
      { name: "Detalle",    path: "/dashboard/detalle",    icon: ClipboardList   },
      { name: "Inventario", path: "/dashboard/inventario", icon: Package         },
      { name: "Vehículos",  path: "/dashboard/vehiculo",   icon: Car             },
      { name: "Agregar",    path: isAdmin ? "/dashboard/agregar" : "/dashboard/agregarConductor", icon: Plus },
      { name: "Buscar",     path: "/dashboard/buscar",     icon: Search          },
    );
    return links;
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
      style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}
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
  link, active, collapsed, onClick, badge,
}: {
  link: NavLink; active: boolean; collapsed: boolean; onClick?: () => void;
  badge?: number;
}) {
  const Icon = link.icon;
  const showBadge = typeof badge === "number" && badge > 0;

  return (
    <Link
      href={link.path}
      onClick={onClick}
      className="group flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 active:scale-[0.98]"
      style={
        active
          ? {
              background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)",
              color: "white",
              boxShadow: "0 4px 16px -4px rgba(10,24,58,0.3)",
            }
          : {
              color: "#173D68",
              background: "transparent",
            }
      }
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(10,24,58,0.04)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }
      }}
    >
      <div
        className="relative flex-shrink-0 p-1.5 rounded-lg transition-all duration-200"
        style={{
          background: active ? "rgba(255,255,255,0.15)" : "rgba(10,24,58,0.05)",
        }}
      >
        <Icon className="w-4 h-4" />
        {showBadge && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center text-white tabular-nums"
            style={{ background: "#ef4444", boxShadow: "0 0 0 1.5px white" }}
            aria-label={`${badge} notificaciones`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className="leading-none truncate flex-1">{link.name}</span>
      )}
      {!collapsed && showBadge && (
        <span
          className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white tabular-nums"
          style={{ background: "#ef4444" }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
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
  const [user,          setUser]          = useState<UserData | null>(null);
  const [company,       setCompany]       = useState<CompanyData | null>(null);
  const [openBidsCount,      setOpenBidsCount]      = useState<number>(0);
  const [pendingQuotesCount, setPendingQuotesCount] = useState<number>(0);
  const [pendingMarketplaceCount, setPendingMarketplaceCount] = useState<number>(0);

  useEffect(() => {
    const raw   = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!raw || !token) {
      localStorage.clear();
      window.location.href = "/login";
      return;
    }
    try { setUser(JSON.parse(raw)); } catch { /* fall through to server fetch */ }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const fresh = await res.json();
        if (!fresh?.id) return;
        const reconciled: UserData = {
          name:      fresh.name,
          role:      fresh.role,
          companyId: fresh.companyId ?? "",
        };
        try {
          const stored = JSON.parse(localStorage.getItem("user") ?? "{}");
          localStorage.setItem("user", JSON.stringify({
            ...stored, ...reconciled,
            id: fresh.id, email: fresh.email,
            userPlan: fresh.userPlan ?? stored.userPlan ?? "free",
            company: fresh.company ?? stored.company ?? null,
          }));
        } catch { /* ignore */ }
        setUser(reconciled);
      } catch { /* network blip */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.companyId) return;
    import("@/shared/fetchCompany")
      .then(({ fetchCompany }) => fetchCompany(user.companyId))
      .then((c) => setCompany(c as CompanyData))
      .catch((err) => console.error("Error fetching company:", err));
  }, [user?.companyId]);

  useEffect(() => {
    if (typeof document === "undefined" || !isMobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isMobileOpen]);

  useEffect(() => {
    if (!user?.companyId || company?.plan !== "distribuidor") {
      setOpenBidsCount(0);
      return;
    }
    let cancelled = false;
    async function tick() {
      try {
        const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
        const res = await fetch(
          `${API_BASE}/marketplace/bid-requests/available?distributorId=${user!.companyId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOpenBidsCount(Array.isArray(data) ? data.length : 0);
      } catch { /* silent */ }
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user?.companyId, company?.plan]);

  useEffect(() => {
    if (!user?.companyId || company?.plan === "distribuidor") {
      setPendingQuotesCount(0);
      return;
    }
    let cancelled = false;
    async function tick() {
      try {
        const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const [ordersRes, bidsRes] = await Promise.all([
          fetch(`${API_BASE}/purchase-orders/company?companyId=${user!.companyId}`, { headers }),
          fetch(`${API_BASE}/marketplace/bid-requests/company?companyId=${user!.companyId}`, { headers }),
        ]);
        let count = 0;
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          if (Array.isArray(data)) {
            for (const o of data as Array<{ status?: string; items?: Array<{ tipo?: string; status?: string }> }>) {
              if (o.status === "cotizacion_recibida") count += 1;
              for (const it of (o.items ?? [])) {
                if (it.tipo === "reencauche"
                    && (it.status === "en_reencauche_bucket" || it.status === "aprobada")) {
                  count += 1;
                }
              }
            }
          }
        }
        if (bidsRes.ok) {
          const bids = await bidsRes.json();
          if (Array.isArray(bids)) {
            for (const b of bids as Array<{ status?: string; responses?: Array<{ status?: string }> }>) {
              if (b.status !== "abierta") continue;
              if ((b.responses ?? []).some((r) => r.status === "cotizada")) count += 1;
            }
          }
        }
        if (!cancelled) setPendingQuotesCount(count);
      } catch { /* silent */ }
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user?.companyId, company?.plan]);

  useEffect(() => {
    if (!user?.companyId || company?.plan !== "distribuidor") {
      setPendingMarketplaceCount(0);
      return;
    }
    let cancelled = false;
    async function tick() {
      try {
        const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
        const res = await fetch(
          `${API_BASE}/marketplace/orders/distributor?distributorId=${user!.companyId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const pending = Array.isArray(data)
          ? data.filter((o: { status?: string }) => o.status === "pendiente").length
          : 0;
        setPendingMarketplaceCount(pending);
      } catch { /* silent */ }
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user?.companyId, company?.plan]);

  if (!user || !company) return null;

  const isAdmin = user.role === "admin";
  const canSeeSettings =
    isAdmin ||
    user.role === "catalogo" ||
    user.role === "catalogo_admin" ||
    user.role === "marketplace_tracker";
  const links   = buildLinks(company.plan, isAdmin, user.role);

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
        className="fixed left-0 right-0 z-50 lg:hidden px-3"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div
          className="flex items-center gap-2.5 pl-2 pr-1.5 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "saturate(180%) blur(12px)",
            WebkitBackdropFilter: "saturate(180%) blur(12px)",
            border: "1px solid rgba(10,24,58,0.08)",
            boxShadow: "0 4px 24px -8px rgba(10,24,58,0.1)",
            height: 50,
          }}
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
               style={{ background: "linear-gradient(135deg,#0A183A,#173D68)" }}>
            {company.profileImage ? (
              <img src={company.profileImage} alt={company.name} className="w-full h-full object-contain p-0.5" />
            ) : (
              <span className="text-xs font-black text-white">{company.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-[#0A183A] leading-tight truncate">{company.name}</p>
            <p className="text-[10px] text-gray-500 leading-tight truncate">{user.name}</p>
          </div>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex-shrink-0 flex items-center justify-center rounded-xl transition-all active:scale-95"
            style={{
              width: 36,
              height: 36,
              background: "rgba(10,24,58,0.04)",
              border: "1px solid rgba(10,24,58,0.08)",
            }}
          >
            {isMobileOpen
              ? <X className="w-4 h-4 text-[#173D68]" />
              : <Menu className="w-4 h-4 text-[#173D68]" />
            }
          </button>
        </div>
      </nav>

      {/* -- Mobile slide-in panel ------------------------------------------ */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col lg:hidden transition-transform duration-300 ease-out w-[88%] max-w-sm"
        style={{
          transform: isMobileOpen ? "translateX(0)" : "translateX(105%)",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "saturate(180%) blur(16px)",
          WebkitBackdropFilter: "saturate(180%) blur(16px)",
          borderLeft: "1px solid rgba(10,24,58,0.08)",
          boxShadow: "-12px 0 48px rgba(10,24,58,0.15)",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Mobile panel header */}
        <div
          className="px-4 py-4"
          style={{
            background: "linear-gradient(135deg, #0A183A 0%, #173D68 60%, #1E76B6 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Menú</p>
            <button
              onClick={closeMobile}
              aria-label="Cerrar menú"
              className="p-1.5 rounded-lg active:scale-95"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              {company.profileImage ? (
                <img src={company.profileImage} alt={company.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-lg font-black text-white">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-white text-sm truncate">{company.name}</p>
              <p className="text-[11px] text-white/60 truncate">{user.name}</p>
            </div>
          </div>
        </div>

        {/* Mobile nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {links.map(link => (
            <NavItem
              key={link.path}
              link={link}
              active={pathname === link.path}
              collapsed={false}
              onClick={closeMobile}
              badge={
                link.path === "/dashboard/pedidosDist"           ? openBidsCount + pendingMarketplaceCount
                : link.path === "/dashboard/marketplace/pedidos" ? pendingMarketplaceCount
                : link.path === "/dashboard/analista"            ? pendingQuotesCount
                : undefined
              }
            />
          ))}
        </nav>

        {/* Mobile footer */}
        <div
          className="px-3 pb-4 pt-3 space-y-1"
          style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}
        >
          {company.plan !== "mini" && canSeeSettings && (
            <Link
              href="/settings"
              onClick={closeMobile}
              className="flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-[#173D68] transition-all hover:bg-[rgba(10,24,58,0.04)]"
            >
              <div className="p-1.5 rounded-lg" style={{ background: "rgba(10,24,58,0.05)" }}>
                <Settings className="w-4 h-4 text-[#173D68]" />
              </div>
              Ajustes
            </Link>
          )}
          <a href="/marketplace" onClick={closeMobile}
            className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#173D68]/50 hover:bg-[rgba(10,24,58,0.03)]">
            <div className="p-1 rounded-md" style={{ background: "rgba(10,24,58,0.04)" }}>
              <ShoppingCart className="w-3.5 h-3.5 text-[#173D68]/40" />
            </div>
            Marketplace
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-red-400 transition-all hover:bg-red-50/60"
          >
            <div className="p-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.06)" }}>
              <LogOut className="w-4 h-4" />
            </div>
            Cerrar sesión
          </button>
        </div>

        {/* TirePro logo */}
        <div
          className="flex items-center justify-center px-4 py-3"
          style={{ borderTop: "1px solid rgba(10,24,58,0.05)" }}
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
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          border: "1px solid rgba(10,24,58,0.08)",
          boxShadow: "0 4px 32px -8px rgba(10,24,58,0.1)",
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
              background: "rgba(10,24,58,0.04)",
              border: "1px solid rgba(10,24,58,0.08)",
            }}
          >
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5 text-[#173D68]" />
              : <ChevronLeft  className="w-3.5 h-3.5 text-[#173D68]" />
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
              badge={
                link.path === "/dashboard/pedidosDist"           ? openBidsCount + pendingMarketplaceCount
                : link.path === "/dashboard/marketplace/pedidos" ? pendingMarketplaceCount
                : link.path === "/dashboard/analista"            ? pendingQuotesCount
                : undefined
              }
            />
          ))}
        </nav>

        {/* Desktop footer */}
        <div
          className="flex-shrink-0 px-2 pb-3 pt-2 space-y-0.5"
          style={{ borderTop: "1px solid rgba(10,24,58,0.06)" }}
        >
          <a
            href="/marketplace"
            className="group flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#173D68]/50 transition-all hover:bg-[rgba(10,24,58,0.03)] hover:text-[#173D68]"
          >
            <div className="flex-shrink-0 p-1 rounded-md" style={{ background: "rgba(10,24,58,0.04)" }}>
              <ShoppingCart className="w-3.5 h-3.5 text-[#173D68]/40" />
            </div>
            {!collapsed && <span className="truncate">Marketplace</span>}
          </a>
          {company.plan !== "mini" && canSeeSettings && (
            <Link
              href="/settings"
              className="group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-[#173D68] transition-all hover:bg-[rgba(10,24,58,0.04)]"
            >
              <div className="flex-shrink-0 p-1.5 rounded-lg" style={{ background: "rgba(10,24,58,0.05)" }}>
                <Settings className="w-4 h-4 text-[#173D68]" />
              </div>
              {!collapsed && <span className="truncate">Ajustes</span>}
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-bold text-red-400 transition-all hover:bg-red-50/60"
          >
            <div className="flex-shrink-0 p-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.06)" }}>
              <LogOut className="w-4 h-4" />
            </div>
            {!collapsed && <span className="truncate">Cerrar sesión</span>}
          </button>

          {/* TirePro logo */}
          <div
            className="flex items-center justify-center pt-2 mt-1"
            style={{ borderTop: "1px solid rgba(10,24,58,0.05)" }}
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
