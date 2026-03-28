"use client";

import React, { useEffect, useState } from "react";
import { Users, Tag, Search, Timer, Camera, AlertTriangle, ArrowLeft } from "lucide-react";

export type UserData = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
  plates: string[];
};

type Vehicle = { id: string; placa: string; tipovhc: string; tireCount: number; kilometrajeActual: number };
type Tire = { id: string; placa: string; marca: string; posicion: number };

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

const inputCls =
  "w-full px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

const UserPlateInspection: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlate, setSelectedPlate] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [tires, setTires] = useState<Tire[]>([]);
  const [tireUpdates, setTireUpdates] = useState<Record<string, { profundidadInt: number; profundidadCen: number; profundidadExt: number; image: File | null }>>({});
  const [newKilometraje, setNewKilometraje] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      try {
        const parsedUser: UserData = JSON.parse(storedUser);
        setUser(parsedUser);
        if (parsedUser.companyId) fetchUsers(parsedUser.companyId);
        else { setUserError("No company assigned"); setUserLoading(false); }
      } catch { setUserError("Error parsing user"); setUserLoading(false); }
    } else { setUserError("User not found"); setUserLoading(false); }
  }, []);

  async function fetchUsers(companyId: string) {
    try {
      const res = await fetch(`${API_BASE}/users?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(data); setUserLoading(false);
    } catch { setUserError("Error fetching users"); setUserLoading(false); }
  }

  async function handlePlateSelection(plate: string) {
    setSelectedPlate(plate);
    setError("");
    setLoading(true);
    try {
      const vRes = await fetch(`${API_BASE}/vehicles/by-placa?placa=${plate}`);
      if (!vRes.ok) throw new Error("Vehicle not found");
      const v = await vRes.json();
      setVehicle({ id: v.id, placa: v.placa, tipovhc: v.tipovhc, tireCount: v._count?.tires ?? 0, kilometrajeActual: v.kilometrajeActual });
      setNewKilometraje(v.kilometrajeActual);

      const tRes = await fetch(`${API_BASE}/tires/vehicle?vehicleId=${v.id}`);
      if (!tRes.ok) throw new Error("Error fetching tires");
      const tData = await tRes.json();
      setTires(tData);
      const init: typeof tireUpdates = {};
      tData.forEach((t: Tire) => { init[t.id] = { profundidadInt: 0, profundidadCen: 0, profundidadExt: 0, image: null }; });
      setTireUpdates(init);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  function handleInputChange(tireId: string, field: string, value: any) {
    setTireUpdates((prev) => ({ ...prev, [tireId]: { ...prev[tireId], [field]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const invalid = tires.filter((t) => { const u = tireUpdates[t.id]; return isNaN(u.profundidadInt) || isNaN(u.profundidadCen) || isNaN(u.profundidadExt); });
      if (invalid.length) throw new Error("Ingrese valores numéricos válidos para todas las profundidades");

      await Promise.all(tires.map(async (tire) => {
        const u = tireUpdates[tire.id];
        const res = await fetch(`${API_BASE}/tires/${tire.id}/inspection`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profundidadInt: Number(u.profundidadInt),
            profundidadCen: Number(u.profundidadCen),
            profundidadExt: Number(u.profundidadExt),
            newKilometraje: Number(newKilometraje),
            imageUrl: u.image ? await convertFileToBase64(u.image) : "",
          }),
        });
        if (!res.ok) throw new Error(`Error al actualizar ${tire.placa}`);
      }));
      alert("Inspecciones actualizadas exitosamente");
      setSelectedPlate(""); setVehicle(null); setTires([]); setNewKilometraje(0);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  if (userLoading) return <div className="flex items-center justify-center py-20 text-[#1E76B6]"><div className="animate-spin w-5 h-5 border-2 border-[#1E76B6] border-t-transparent rounded-full" /></div>;
  if (userError) return <div className="max-w-md mx-auto mt-8 p-4 bg-red-50 rounded-xl text-red-600 text-sm">{userError}</div>;
  if (!user) return null;

  const filteredUsers = users.filter((u) => u.email === user.email);
  const availablePlates = filteredUsers[0]?.plates ?? [];
  const filteredPlates = searchQuery.trim() ? availablePlates.filter((p) => p.toLowerCase().includes(searchQuery.toLowerCase())) : availablePlates;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {!selectedPlate ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0A183A]">Inspección por Conductor</h1>
              <p className="text-sm text-[#348CCB] mt-1">Seleccione una placa para registrar inspección</p>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#348CCB]" />
              <input
                type="text"
                placeholder="Buscar placa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputCls} pl-10`}
              />
            </div>

            {/* Plates grid */}
            {filteredPlates.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredPlates.map((plate) => (
                  <button
                    key={plate}
                    onClick={() => handlePlateSelection(plate)}
                    className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl text-sm font-bold text-[#0A183A] transition-all hover:shadow-md active:scale-95"
                    style={{ border: "1px solid rgba(52,140,203,0.2)" }}
                  >
                    <Tag className="w-4 h-4 text-[#1E76B6]" />
                    {plate}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#348CCB] text-sm">
                {searchQuery ? `No se encontraron placas para "${searchQuery}"` : "No hay placas asignadas"}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Back button */}
            <button
              onClick={() => { setSelectedPlate(""); setVehicle(null); setTires([]); setError(""); setSearchQuery(""); }}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#1E76B6] mb-4 hover:text-[#0A183A] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a mis placas
            </button>

            {/* Vehicle header */}
            <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
              <div className="px-5 py-4 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #0A183A, #173D68)" }}>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-[#348CCB]" />
                </div>
                <div>
                  <p className="font-mono font-black text-white text-lg tracking-wider">{selectedPlate}</p>
                  {vehicle && <p className="text-xs text-white/50">{vehicle.tipovhc} — {vehicle.tireCount} llantas</p>}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Kilometraje */}
              {vehicle && (
                <div className="px-5 py-4 bg-white">
                  <label className="block text-xs font-semibold text-[#173D68] uppercase tracking-wider mb-1.5">
                    <Timer className="w-3.5 h-3.5 inline mr-1" />Kilometraje actual
                  </label>
                  <input
                    type="number"
                    value={newKilometraje}
                    onChange={(e) => setNewKilometraje(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            {/* Tire inspection cards */}
            {tires.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {tires.map((tire) => (
                  <div key={tire.id} className="bg-white rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                    {/* Tire header */}
                    <div className="px-4 py-3 flex items-center gap-3" style={{ background: "rgba(30,118,182,0.06)" }}>
                      <Camera className="w-4 h-4 text-[#1E76B6]" />
                      <span className="font-mono font-bold text-[#0A183A] text-sm">{tire.placa}</span>
                      <span className="text-[10px] text-[#348CCB]">P{tire.posicion} — {tire.marca}</span>
                    </div>

                    <div className="p-4">
                      {/* 3 depth fields in a row */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {(["profundidadInt", "profundidadCen", "profundidadExt"] as const).map((field) => (
                          <div key={field}>
                            <label className="block text-[10px] font-semibold text-[#173D68] uppercase tracking-wider mb-1 text-center">
                              {field === "profundidadInt" ? "Interior" : field === "profundidadCen" ? "Central" : "Exterior"}
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={30}
                              step={0.1}
                              value={tireUpdates[tire.id]?.[field] ?? 0}
                              onChange={(e) => handleInputChange(tire.id, field, Number(e.target.value))}
                              className={`${inputCls} text-center font-bold`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Image upload */}
                      <label className="block text-[10px] font-semibold text-[#173D68] uppercase tracking-wider mb-1">Foto (opcional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleInputChange(tire.id, "image", e.target.files?.[0] ?? null)}
                        className="w-full text-xs text-[#348CCB] file:mr-3 file:rounded-xl file:border-0 file:bg-[#1E76B6] file:text-white file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-[#173D68] file:transition-colors"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}
                >
                  {loading ? "Actualizando..." : "Actualizar Inspecciones"}
                </button>
              </form>
            )}

            {vehicle && tires.length === 0 && !loading && (
              <div className="text-center py-12 bg-[#F0F7FF] rounded-xl text-[#348CCB] text-sm">
                No se encontraron llantas para este vehículo.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserPlateInspection;
