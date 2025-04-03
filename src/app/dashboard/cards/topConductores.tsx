"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import { Loader2, User, Mail, Award } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  puntos: number;
}

const TopConductores = () => {
  const auth = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.user?.companyId) return;

    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/users/company/${auth.user.companyId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Error al obtener los conductores");

        const usersData: User[] = await response.json();
        setUsers(usersData); // ✅ The backend already sorts by "puntos DESC"
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [auth.user?.companyId]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <User className="h-6 w-6 text-blue-600" />
        Conductores Destacados
      </h3>

      {loading ? (
        <div className="flex justify-center items-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Cargando...</span>
        </div>
      ) : error ? (
        <p className="text-red-600 text-sm text-center">{error}</p>
      ) : users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">#</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Nombre</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Correo Electrónico</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-800 font-semibold flex items-center gap-2">
                    {index === 0 ? <Award className="h-4 w-4 text-yellow-500" /> : null}
                    {index === 1 ? <Award className="h-4 w-4 text-gray-400" /> : null}
                    {index === 2 ? <Award className="h-4 w-4 text-orange-400" /> : null}
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 text-gray-800">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    {user.email}
                  </td>
                  <td className="py-3 px-4 text-gray-800 font-semibold">{user.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No hay conductores disponibles.</p>
      )}
    </div>
  );
};

export default TopConductores;
