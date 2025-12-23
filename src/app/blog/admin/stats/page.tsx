"use client";

import React, { useEffect, useState } from "react";

type LifecycleEvent = {
  fecha: string;
  valor: string;
  observacion?: string;
};

type CostEntry = {
  fecha: string;
  valor: number;
  descripcion?: string;
};

type Inspection = {
  fecha: string;
  profundidadInt: string | number;
  profundidadCen: string | number;
  profundidadExt: string | number;
  observaciones?: string;
};

type Tire = {
  vida: LifecycleEvent[];
  marca: string;
  profundidadInicial: number;
  kilometrosRecorridos: number;
  costo: CostEntry[];
  diseno: string;
  inspecciones: Inspection[];
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  isActive: boolean;
};

export default function StatsPage() {
  // Tire States
  const [tires, setTires] = useState<Tire[]>([]);
  const [tireLoading, setTireLoading] = useState(true);
  const [tireError, setTireError] = useState<string | null>(null);

  // User States
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTires = async () => {
      try {
        const res = await fetch("http://localhost:6001/api/tires/all");
        if (!res.ok) throw new Error("Failed to fetch tires");
        const data = await res.json();
        setTires(data);
      } catch (err) {
        const error = err as Error;
        setTireError(error.message);
      } finally {
        setTireLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:6001/api/users/all");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        const error = err as Error;
        setUserError(error.message);
      } finally {
        setUserLoading(false);
      }
    };

    fetchTires();
    fetchUsers();
  }, []);

  // Helper Functions
  const groupBy = <T extends Record<string, unknown>>(
    items: T[],
    key: keyof T
  ): Record<string, T[]> => {
    return items.reduce((acc, item) => {
      const k = String(item[key] || "Desconocido");
      acc[k] = acc[k] || [];
      acc[k].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  };

  const calcCPK = (tire: Tire) => {
    const cost = (tire.costo || []).reduce((sum: number, c: CostEntry) => sum + (c.valor || 0), 0);
    const km = tire.kilometrosRecorridos || 0;
    return km > 0 ? cost / km : 0;
  };

  const formatAvg = (arr: number[]) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "N/A";

  // Tire Statistics
  const totalTires = tires.length;
  const activeTires = tires.filter(t => t.vida?.slice(-1)[0]?.valor !== "fin").length;
  const retiredTires = totalTires - activeTires;
  const totalKm = tires.reduce((sum, t) => sum + (t.kilometrosRecorridos || 0), 0);
  const avgDepth = tires.length > 0 
    ? (tires.reduce((sum, t) => sum + (t.profundidadInicial || 0), 0) / tires.length).toFixed(2)
    : "0";
  const avgCPK = formatAvg(tires.map(calcCPK));

  const byBrand = groupBy(tires, "marca");
  const byDiseno = groupBy(tires, "diseno");

  const criticalTires = tires.filter(t => {
    const latest = [...(t.inspecciones || [])].sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )[0];
    const avgProf = latest
      ? (Number(latest.profundidadInt) +
          Number(latest.profundidadCen) +
          Number(latest.profundidadExt)) /
        3
      : null;
    return avgProf !== null && avgProf <= 2;
  }).length;

  // User Statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const usersByRole = users.reduce((acc: Record<string, number>, user) => {
    const role = user.role || "desconocido";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  // Recent users (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentUsers = users.filter(u => 
    new Date(u.createdAt) >= thirtyDaysAgo
  ).length;

  const loading = tireLoading || userLoading;
  const hasError = tireError || userError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard de Gestión</h1>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-blue-600 font-medium">Cargando datos...</span>
          </div>
        )}

        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">
              {tireError && `Error de llantas: ${tireError}`}
              {tireError && userError && " | "}
              {userError && `Error de usuarios: ${userError}`}
            </p>
          </div>
        )}

        {!loading && !hasError && (
          <div className="space-y-8">
            {/* Quick Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <QuickStatCard 
                title="Total Llantas" 
                value={totalTires} 
                icon="🚛" 
                color="blue"
              />
              <QuickStatCard 
                title="Total Usuarios" 
                value={totalUsers} 
                icon="👥" 
                color="green"
              />
              <QuickStatCard 
                title="Llantas Críticas" 
                value={criticalTires} 
                icon="⚠️" 
                color="red"
              />
              <QuickStatCard 
                title="Usuarios Activos" 
                value={activeUsers} 
                icon="✅" 
                color="emerald"
              />
            </div>

            {/* Tire Statistics Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
                🚛 Estadísticas de Llantas
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                <StatCard title="Total de Llantas" value={totalTires} />
                <StatCard title="Activas" value={activeTires} />
                <StatCard title="Retiradas" value={retiredTires} />
                <StatCard title="Total KM Recorridos" value={totalKm.toLocaleString()} />
                <StatCard title="Profundidad Promedio" value={avgDepth + " mm"} />
                <StatCard title="CPK Promedio" value={avgCPK} />
              </div>

              {/* By Brand */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">🏷️ Por Marca</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Object.entries(byBrand).map(([brand, group]) => (
                    <div key={brand} className="bg-gray-50 p-4 rounded-lg border">
                      <p className="font-semibold text-gray-700 mb-2">{brand}</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Total: {group.length}</p>
                        <p>CPK Promedio: {formatAvg(group.map(calcCPK))}</p>
                        <p>KM Promedio: {formatAvg(group.map(t => t.kilometrosRecorridos))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Design */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">🎨 Por Diseño</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Object.entries(byDiseno).map(([design, group]) => (
                    <div key={design} className="bg-gray-50 p-4 rounded-lg border">
                      <p className="font-semibold text-gray-700 mb-2">{design}</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Total: {group.length}</p>
                        <p>CPK Promedio: {formatAvg(group.map(calcCPK))}</p>
                        <p>KM Promedio: {formatAvg(group.map(t => t.kilometrosRecorridos))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Statistics Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
                👥 Estadísticas de Usuarios
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard title="Total Usuarios" value={totalUsers} />
                <StatCard title="Usuarios Activos" value={activeUsers} />
                <StatCard title="Usuarios Inactivos" value={inactiveUsers} />
                <StatCard title="Nuevos (30 días)" value={recentUsers} />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">🔐 Por Rol</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Object.entries(usersByRole).map(([role, count]) => (
                    <div key={role} className="bg-gray-50 p-4 rounded-lg border">
                      <p className="font-semibold text-gray-700 mb-2 capitalize">{role}</p>
                      <p className="text-2xl font-bold text-blue-600">{count}</p>
                      <p className="text-sm text-gray-500">
                        {((count / totalUsers) * 100).toFixed(1)}% del total
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStatCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: string; 
  color: string; 
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    emerald: "bg-emerald-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500"
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full ${colorClasses[color]} flex items-center justify-center text-white text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  );
}