"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import { 
  Trash2, 
  Loader2, 
  User, 
  Mail, 
  Shield, 
  Search, 
  Filter, 
  CheckCircle,
  XCircle,
  UserPlus 
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  placas: string[];  
}


export default function ManageUsers() {
  const auth = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // "all", "admin", "regular"

  useEffect(() => {
    if (!auth.user?.companyId) return;

    async function fetchUsers() {
      try {
        const res = await fetch(`https://api.tirepro.com.co/api/users/company/${auth.user.companyId}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        
        const data: User[] = await res.json();
        setUsers(data.map(user => ({ ...user, placas: user.placas || [] })));          
      } catch{
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [auth.user?.companyId, auth.token]);

  async function deleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;
  
    setDeleting(userId);
  
    try {
      const res = await fetch(`https://api.tirepro.com.co/api/users/${userId}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
          "X-Company-ID": auth.user?.companyId ?? "", // ✅ Ensure it's sent
        },
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
  
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert(error.message);
    } finally {
      setDeleting(null);
    }
  }
  

  async function addPlacaToUser(userId: string) {
    const newPlaca = prompt("Ingrese la nueva placa:")?.toUpperCase();
    if (!newPlaca) return;
  
    try {
      const res = await fetch(`https://api.tirepro.com.co/api/users/${userId}/add-placa`, {
        method: "PATCH",  // ✅ Ensure method is PATCH (not POST)
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ placa: newPlaca }),
      });
  
      if (!res.ok) {
        throw new Error("Error al agregar la placa");
      }
  
      // ✅ Update UI state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? { ...user, placas: [...user.placas, newPlaca] }
            : user
        )
      );
    } catch (error) {
      console.error("❌ Error adding placa:", error);
      alert("Error al agregar la placa.");
    }
  }

  // Filter users based on search query and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      searchQuery === "" || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = 
      selectedFilter === "all" || 
      (selectedFilter === "admin" && user.role === "admin") ||
      (selectedFilter === "regular" && user.role === "regular");
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-[#0A183A] to-[#173D68] p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Miembros equipo</h2>
              <p className="text-[#348CCB] mt-1 text-sm">Maneja tus usuarios y permisos</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Buscar usuarios..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/30 focus:border-[#1E76B6]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <select
                  className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E76B6]/30 focus:border-[#1E76B6] appearance-none bg-white"
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                >
                  <option value="all">Todos los usuario</option>
                  <option value="admin">Admins</option>
                  <option value="regular">Regularer</option>
                </select>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* User List */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E76B6]" />
            <span className="ml-2 text-gray-500">Loading users...</span>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-16 px-4 text-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-lg max-w-md">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium mb-2">Error Loading Users</h3>
              <p>{error}</p>
              <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Try Again
              </button>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex justify-center items-center py-16 px-4 text-center">
            <div className="bg-gray-50 p-6 rounded-lg max-w-md">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Users Found</h3>
              <p className="text-gray-500">
                {searchQuery || selectedFilter !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "No users have been added to your company yet"}
              </p>
              <button className="mt-4 px-4 py-2 bg-[#1E76B6] text-white rounded-lg hover:bg-[#348CCB] transition-colors flex items-center gap-2 mx-auto">
                <UserPlus size={16} />
                <span>Add First User</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-gray-600 text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Usuario</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Rol</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0A183A] flex items-center justify-center text-white font-medium">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
  <div className="flex flex-wrap gap-1">
    {user.placas.length > 0 ? (
      user.placas.map((placa) => (
        <span 
          key={placa} 
          className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium"
        >
          {placa}
        </span>
      ))
    ) : (
      <span className="text-gray-400 text-xs">Sin placas</span>
    )}
  </div>
</td>
<td className="px-6 py-4 text-right">
  <div className="flex items-center justify-end gap-2">
    {/* ✅ Only allow adding placas if the user is NOT an admin */}
    {user.role !== "admin" && (
      <button 
        onClick={() => addPlacaToUser(user.id)}
        className="text-gray-500 hover:text-blue-600 transition p-1 rounded-full hover:bg-blue-50"
        title="Agregar placa"
      >
        <UserPlus className="h-5 w-5" />
      </button>
    )}

    {user.id !== auth.user?.id && (
      <button
        onClick={() => deleteUser(user.id)}
        disabled={deleting === user.id}
        className="text-gray-500 hover:text-red-600 transition p-1 rounded-full hover:bg-red-50"
        title="Eliminar usuario"
      >
        {deleting === user.id ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
      </button>
    )}
  </div>
</td>


                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === "admin" 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {user.role === "admin" ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        <span>{user.role}</span>
                      </div>
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Stats Footer */}
        {!loading && !error && filteredUsers.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 text-sm text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </div>
            <div className="flex items-center gap-4">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                <span>{users.filter(u => u.role === "admin").length} Admins</span>
              </span>
              <span className="text-blue-600 flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{users.filter(u => u.role !== "admin").length} Regulares</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}