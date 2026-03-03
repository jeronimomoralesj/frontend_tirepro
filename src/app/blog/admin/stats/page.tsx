"use client";

import React, { useEffect, useState, useCallback } from "react";

// ─── Types matching Prisma schema ────────────────────────────────────────────

type LifecycleEntry = { valor: string; fecha: string };
type CostEntry = { valor: number; fecha: string };
type Inspection = {
  fecha: string;
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  cpk: number;
  cpkProyectado: number;
  cpt?: number;
  cptProyectado?: number;
  diasEnUso?: number;
  mesesEnUso?: number;
  kilometrosRecorridos?: number;
  kmActualVehiculo?: number;
  imageUrl?: string;
};
type PrimeraVida = { diseno: string; cpk: number; costo: number; kilometros: number };
type Desechos = { causales: string; milimetrosDesechados: number; remanente: number; fecha: string };

type Tire = {
  id: string;
  companyId: string;
  vehicleId?: string | null;
  placa: string;
  vida: LifecycleEntry[];
  marca: string;
  diseno: string;
  profundidadInicial: number;
  dimension: string;
  eje: string;
  costo: CostEntry[];
  posicion: number;
  inspecciones: Inspection[];
  primeraVida: PrimeraVida[];
  kilometrosRecorridos: number;
  fechaInstalacion?: string | null;
  diasAcumulados: number;
  eventos: { valor: string; fecha: string }[];
  desechos?: Desechos | null;
};

type Vehicle = {
  id: string;
  placa: string;
  kilometrajeActual: number;
  tipovhc: string;
  tireCount: number;
  cliente?: string | null;
  companyId: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  puntos: number;
  isVerified: boolean;
  preferredLanguage?: string | null;
};

type Company = {
  id: string;
  name: string;
  plan: string;
  tireCount: number;
  userCount: number;
  vehicleCount: number;
  periodicity: number;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  seen: boolean;
  timestamp: string;
  tireId?: string | null;
  vehicleId?: string | null;
  companyId?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getLastVida = (tire: Tire): string => {
  if (!Array.isArray(tire.vida) || tire.vida.length === 0) return "nueva";
  return tire.vida[tire.vida.length - 1].valor.toLowerCase();
};

const isActive = (tire: Tire): boolean => getLastVida(tire) !== "fin";

const getLatestInspection = (tire: Tire): Inspection | null => {
  if (!Array.isArray(tire.inspecciones) || tire.inspecciones.length === 0) return null;
  return [...tire.inspecciones].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )[0];
};

const getMinDepth = (insp: Inspection): number =>
  Math.min(insp.profundidadInt ?? Infinity, insp.profundidadCen ?? Infinity, insp.profundidadExt ?? Infinity);

const getTotalCost = (tire: Tire): number =>
  (Array.isArray(tire.costo) ? tire.costo : []).reduce((s, c) => s + (c.valor || 0), 0);

const calcCPK = (tire: Tire): number => {
  const km = tire.kilometrosRecorridos || 0;
  const cost = getTotalCost(tire);
  return km > 0 ? cost / km : 0;
};

const classifyCondition = (tire: Tire): "optimo" | "60_dias" | "30_dias" | "urgente" | "sin_inspeccion" => {
  const last = getLatestInspection(tire);
  if (!last) return "sin_inspeccion";
  const min = getMinDepth(last);
  if (min > 7) return "optimo";
  if (min > 6) return "60_dias";
  if (min > 5) return "30_dias";
  return "urgente";
};

const fmt = (n: number, decimals = 0) =>
  n.toLocaleString("es-CO", { maximumFractionDigits: decimals });

const fmtCOP = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M COP`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(0)}K COP`
    : `${fmt(n)} COP`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-2"
      style={{ background: accent }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{label}</p>
        <span className="text-white/60">{icon}</span>
      </div>
      <p className="text-3xl font-extrabold text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-white/60">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-[#0A183A] mb-4 flex items-center gap-2">
      {children}
    </h2>
  );
}

function StatRow({ label, value, bar, barColor }: { label: string; value: string | number; bar?: number; barColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600 flex-1 truncate">{label}</span>
      <div className="flex items-center gap-3">
        {bar !== undefined && (
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(bar, 100)}%`, background: barColor || "#1E76B6" }}
            />
          </div>
        )}
        <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{value}</span>
      </div>
    </div>
  );
}

function PillBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ borderColor: color + "40", background: color + "10" }}>
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
      <span className="text-xl font-extrabold" style={{ color }}>{count}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.tirepro.com.co";

  const safeJson = async (res: Response, label: string) => {
    if (!res.ok) throw new Error(`${label}: ${res.status}`);
    return res.json();
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!storedUser) { setLoading(false); return; }
    const currentUser: User = JSON.parse(storedUser);
    const { companyId } = currentUser;

    const errs: string[] = [];

    const results = await Promise.allSettled([
      fetch(`${API}/api/tires?companyId=${companyId}`).then(r => safeJson(r, "tires")),
      fetch(`${API}/api/vehicles?companyId=${companyId}`).then(r => safeJson(r, "vehicles")),
      fetch(`${API}/api/users?companyId=${companyId}`).then(r => safeJson(r, "users")),
      fetch(`${API}/api/companies/${companyId}`).then(r => safeJson(r, "company")),
      fetch(`${API}/api/notifications?companyId=${companyId}`).then(r => safeJson(r, "notifications")),
    ]);

    if (results[0].status === "fulfilled") {
      const raw: Tire[] = results[0].value;
      setTires(raw.map(t => ({
        ...t,
        vida: Array.isArray(t.vida) ? t.vida : [],
        costo: Array.isArray(t.costo) ? t.costo : [],
        inspecciones: Array.isArray(t.inspecciones) ? t.inspecciones : [],
        primeraVida: Array.isArray(t.primeraVida) ? t.primeraVida : [],
        eventos: Array.isArray(t.eventos) ? t.eventos : [],
      })));
    } else { errs.push("No se pudieron cargar llantas"); }

    if (results[1].status === "fulfilled") setVehicles(results[1].value);
    else errs.push("No se pudieron cargar vehículos");

    if (results[2].status === "fulfilled") setUsers(results[2].value);
    else errs.push("No se pudieron cargar usuarios");

    if (results[3].status === "fulfilled") setCompany(results[3].value);
    else errs.push("No se pudo cargar la compañía");

    if (results[4].status === "fulfilled") setNotifications(results[4].value);
    // notifications failure is silent

    if (errs.length) setErrors(errs);
    setLoading(false);
  }, [API]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Tire KPIs ────────────────────────────────────────────────────────────
  const activeTires = tires.filter(isActive);
  const retiredTires = tires.filter(t => !isActive(t));
  const totalKm = activeTires.reduce((s, t) => s + (t.kilometrosRecorridos || 0), 0);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const gastoTotal = tires.reduce((s, t) => s + getTotalCost(t), 0);
  const gastoMes = tires.reduce((s, t) => {
    return s + (Array.isArray(t.costo) ? t.costo : []).reduce((ss, c) => {
      const d = new Date(c.fecha);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth ? ss + (c.valor || 0) : ss;
    }, 0);
  }, 0);

  const tiresWithInspections = activeTires.filter(t => getLatestInspection(t) !== null);
  const avgCPK = tiresWithInspections.length
    ? tiresWithInspections.reduce((s, t) => {
        const last = getLatestInspection(t);
        return s + (last?.cpk || 0);
      }, 0) / tiresWithInspections.length
    : 0;

  const avgCPKProyectado = tiresWithInspections.length
    ? tiresWithInspections.reduce((s, t) => {
        const last = getLatestInspection(t);
        return s + (last?.cpkProyectado || 0);
      }, 0) / tiresWithInspections.length
    : 0;

  // Semáforo
  const semaforoCount = {
    optimo: 0, "60_dias": 0, "30_dias": 0, urgente: 0, sin_inspeccion: 0,
  };
  activeTires.forEach(t => { semaforoCount[classifyCondition(t)]++; });

  // Critical = urgente + depth ≤ 2
  const criticalDepth = activeTires.filter(t => {
    const last = getLatestInspection(t);
    return last && getMinDepth(last) <= 2;
  }).length;

  // Vida distribution
  const vidaCount: Record<string, number> = {};
  activeTires.forEach(t => {
    const v = getLastVida(t);
    vidaCount[v] = (vidaCount[v] || 0) + 1;
  });

  // By brand
  const byBrand: Record<string, Tire[]> = {};
  activeTires.forEach(t => {
    const b = t.marca || "Desconocido";
    byBrand[b] = byBrand[b] || [];
    byBrand[b].push(t);
  });

  // By eje
  const byEje: Record<string, Tire[]> = {};
  activeTires.forEach(t => {
    const e = t.eje || "Sin eje";
    byEje[e] = byEje[e] || [];
    byEje[e].push(t);
  });

  // Avg depth
  const avgDepth =
    tiresWithInspections.length
      ? tiresWithInspections.reduce((s, t) => {
          const last = getLatestInspection(t)!;
          return s + (last.profundidadInt + last.profundidadCen + last.profundidadExt) / 3;
        }, 0) / tiresWithInspections.length
      : 0;

  // Reencauche tires
  const reencaucheTires = activeTires.filter(t =>
    getLastVida(t).startsWith("reencauche")
  ).length;

  // ─── Vehicle KPIs ─────────────────────────────────────────────────────────
  const vehiclesByType: Record<string, number> = {};
  vehicles.forEach(v => {
    const t = v.tipovhc || "Desconocido";
    vehiclesByType[t] = (vehiclesByType[t] || 0) + 1;
  });

  const avgKmVehicle = vehicles.length
    ? vehicles.reduce((s, v) => s + (v.kilometrajeActual || 0), 0) / vehicles.length
    : 0;

  const vehiclesWithTires = vehicles.filter(v => v.tireCount > 0).length;

  const vehiclesByCliente: Record<string, number> = {};
  vehicles.forEach(v => {
    const c = v.cliente || "Sin cliente";
    vehiclesByCliente[c] = (vehiclesByCliente[c] || 0) + 1;
  });

  // ─── User KPIs ────────────────────────────────────────────────────────────
  const usersByRole: Record<string, number> = {};
  users.forEach(u => {
    usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
  });

  const verifiedUsers = users.filter(u => u.isVerified).length;
  const totalPoints = users.reduce((s, u) => s + (u.puntos || 0), 0);

  // ─── Notifications ────────────────────────────────────────────────────────
  const unseenNotifications = notifications.filter(n => !n.seen).length;
  const criticalNotifications = notifications.filter(n => n.type === "critical").length;
  const warningNotifications = notifications.filter(n => n.type === "warning").length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#0A183A] to-[#1E76B6] px-6 py-5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Panel de Estadísticas
            </h1>
            {company && (
              <p className="text-blue-200 text-sm mt-0.5">
                {company.name} · Plan <span className="capitalize font-semibold">{company.plan}</span>
              </p>
            )}
          </div>
          <p className="text-blue-200 text-sm hidden sm:block">
            {now.toLocaleDateString("es-CO", { dateStyle: "long" })}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            {errors.map((e, i) => (
              <p key={i} className="text-red-700 text-sm">⚠️ {e}</p>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E76B6]" />
            <span className="ml-3 text-[#1E76B6] font-medium">Cargando estadísticas…</span>
          </div>
        )}

        {!loading && (
          <>
            {/* ── Global KPIs ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard label="Llantas activas" value={activeTires.length} accent="#0A183A" icon={<span className="text-xl">🛞</span>} />
              <KPICard label="Vehículos" value={vehicles.length} accent="#173D68" icon={<span className="text-xl">🚛</span>} />
              <KPICard label="Usuarios" value={users.length} accent="#1E76B6" icon={<span className="text-xl">👥</span>} />
              <KPICard label="Críticas (≤2mm)" value={criticalDepth} sub="Requieren cambio" accent="#b91c1c" icon={<span className="text-xl">⚠️</span>} />
              <KPICard label="Alertas sin ver" value={unseenNotifications} accent="#d97706" icon={<span className="text-xl">🔔</span>} />
              <KPICard label="Reencauches" value={reencaucheTires} accent="#065f46" icon={<span className="text-xl">♻️</span>} />
            </div>

            {/* ── Financiero ── */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <SectionTitle>💰 Resumen Financiero</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Gasto del mes</p>
                  <p className="text-2xl font-extrabold text-[#0A183A]">{fmtCOP(gastoMes)}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Inversión total</p>
                  <p className="text-2xl font-extrabold text-[#0A183A]">{fmtCOP(gastoTotal)}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">CPK promedio</p>
                  <p className="text-2xl font-extrabold text-[#1E76B6]">${fmt(avgCPK, 0)}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">CPK proyectado</p>
                  <p className="text-2xl font-extrabold text-[#173D68]">${fmt(avgCPKProyectado, 0)}</p>
                </div>
              </div>
            </div>

            {/* ── Llantas ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Semáforo */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <SectionTitle>🚦 Estado de Llantas (Semáforo)</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <PillBadge label="Óptimo (>7mm)" count={semaforoCount.optimo} color="#059669" />
                  <PillBadge label="60 días (>6mm)" count={semaforoCount["60_dias"]} color="#2563eb" />
                  <PillBadge label="30 días (>5mm)" count={semaforoCount["30_dias"]} color="#d97706" />
                  <PillBadge label="Urgente (≤5mm)" count={semaforoCount.urgente} color="#dc2626" />
                  <PillBadge label="Sin inspección" count={semaforoCount.sin_inspeccion} color="#6b7280" />
                  <PillBadge label="Retiradas" count={retiredTires.length} color="#374151" />
                </div>
              </div>

              {/* Vida */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <SectionTitle>🔄 Distribución por Vida</SectionTitle>
                <div className="space-y-1">
                  {Object.entries(vidaCount).sort((a, b) => b[1] - a[1]).map(([v, c]) => (
                    <StatRow
                      key={v}
                      label={v.charAt(0).toUpperCase() + v.slice(1)}
                      value={c}
                      bar={(c / activeTires.length) * 100}
                    />
                  ))}
                  {Object.keys(vidaCount).length === 0 && (
                    <p className="text-gray-400 text-sm">Sin datos</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">KM totales</p>
                    <p className="text-xl font-bold text-[#0A183A]">{fmt(totalKm)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Prof. promedio</p>
                    <p className="text-xl font-bold text-[#1E76B6]">{avgDepth.toFixed(1)} mm</p>
                  </div>
                </div>
              </div>

              {/* By Brand */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <SectionTitle>🏷️ Por Marca</SectionTitle>
                <div className="space-y-1">
                  {Object.entries(byBrand)
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([brand, group]) => {
                      const brandCPK =
                        group.filter(t => getLatestInspection(t)).length > 0
                          ? group.reduce((s, t) => {
                              const l = getLatestInspection(t);
                              return s + (l?.cpk || 0);
                            }, 0) / group.filter(t => getLatestInspection(t)).length
                          : 0;
                      return (
                        <StatRow
                          key={brand}
                          label={brand}
                          value={`${group.length} · CPK $${fmt(brandCPK, 0)}`}
                          bar={(group.length / activeTires.length) * 100}
                        />
                      );
                    })}
                </div>
              </div>

              {/* By Eje */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <SectionTitle>⚙️ Por Eje</SectionTitle>
                <div className="space-y-1">
                  {Object.entries(byEje)
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([eje, group]) => (
                      <StatRow
                        key={eje}
                        label={eje}
                        value={group.length}
                        bar={(group.length / activeTires.length) * 100}
                      />
                    ))}
                </div>
              </div>
            </div>

            {/* ── Vehículos ── */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <SectionTitle>🚚 Estadísticas de Vehículos</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total vehículos</p>
                  <p className="text-3xl font-extrabold text-[#0A183A]">{vehicles.length}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Con llantas</p>
                  <p className="text-3xl font-extrabold text-[#1E76B6]">{vehiclesWithTires}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">KM promedio</p>
                  <p className="text-3xl font-extrabold text-[#173D68]">{fmt(avgKmVehicle, 0)}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Tipos distintos</p>
                  <p className="text-3xl font-extrabold text-[#065f46]">{Object.keys(vehiclesByType).length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wider">Por tipo de vehículo</h3>
                  <div className="space-y-1">
                    {Object.entries(vehiclesByType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <StatRow
                          key={type}
                          label={type}
                          value={count}
                          bar={(count / vehicles.length) * 100}
                          barColor="#1E76B6"
                        />
                      ))}
                  </div>
                </div>
                {Object.keys(vehiclesByCliente).length > 1 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wider">Por cliente</h3>
                    <div className="space-y-1">
                      {Object.entries(vehiclesByCliente)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cliente, count]) => (
                          <StatRow
                            key={cliente}
                            label={cliente}
                            value={count}
                            bar={(count / vehicles.length) * 100}
                            barColor="#173D68"
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Usuarios ── */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <SectionTitle>👥 Estadísticas de Usuarios</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total</p>
                  <p className="text-3xl font-extrabold text-[#0A183A]">{users.length}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Verificados</p>
                  <p className="text-3xl font-extrabold text-[#059669]">{verifiedUsers}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Sin verificar</p>
                  <p className="text-3xl font-extrabold text-[#d97706]">{users.length - verifiedUsers}</p>
                </div>
                <div className="rounded-xl bg-[#f8faff] border border-blue-100 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Puntos totales</p>
                  <p className="text-3xl font-extrabold text-[#1E76B6]">{fmt(totalPoints)}</p>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wider">Por rol</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(usersByRole).map(([role, count]) => (
                  <div key={role} className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs capitalize text-gray-500 mb-1">{role}</p>
                    <p className="text-2xl font-bold text-[#0A183A]">{count}</p>
                    <p className="text-xs text-gray-400">{((count / users.length) * 100).toFixed(0)}% del total</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Notificaciones ── */}
            {notifications.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <SectionTitle>🔔 Notificaciones</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <PillBadge label="Total" count={notifications.length} color="#6b7280" />
                  <PillBadge label="Sin ver" count={unseenNotifications} color="#2563eb" />
                  <PillBadge label="Críticas" count={criticalNotifications} color="#dc2626" />
                  <PillBadge label="Advertencias" count={warningNotifications} color="#d97706" />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications
                    .filter(n => !n.seen)
                    .slice(0, 10)
                    .map(n => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                          n.type === "critical"
                            ? "bg-red-50 border border-red-100"
                            : n.type === "warning"
                            ? "bg-amber-50 border border-amber-100"
                            : "bg-blue-50 border border-blue-100"
                        }`}
                      >
                        <span className="mt-0.5">
                          {n.type === "critical" ? "🔴" : n.type === "warning" ? "🟡" : "🔵"}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800">{n.title}</p>
                          <p className="text-gray-600 text-xs">{n.message}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── Compañía ── */}
            {company && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <SectionTitle>🏢 Información de la Compañía</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatRow label="Plan" value={company.plan} />
                  <StatRow label="Llantas (BD)" value={company.tireCount} />
                  <StatRow label="Vehículos (BD)" value={company.vehicleCount} />
                  <StatRow label="Usuarios (BD)" value={company.userCount} />
                  <StatRow label="Periodicidad" value={`${company.periodicity} mes(es)`} />
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}