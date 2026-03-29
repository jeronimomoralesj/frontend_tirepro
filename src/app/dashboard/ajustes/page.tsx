"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Car,
  LogOut,
  User,
  X,
  Building,
  UserPlus,
  Trash2,
  AlertCircle,
  Tag,
  Mail,
  Shield,
  Users,
  PlusCircle,
  ChevronRight,
  Upload,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  Link2,
  Link2Off,
  ShoppingCart,
  Package,
  Clock,
} from "lucide-react";
import CambiarContrasena from "./CambiarContraseña";

// =============================================================================
// Types
// =============================================================================

export type UserData = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: string;
  plates: string[];
};


export type CompanyData = {
  id: string;
  name: string;
  profileImage: string;
  periodicity: number;
  plan: string;
  emailAtencion?: string | null;
  _count: {
    users: number;
    tires: number;
    vehicles: number;
  };
};

export type DistributorCompany = {
  id: string;
  name: string;
  plan: string;
  profileImage: string;
  // The GET /:companyId/distributors endpoint returns access objects with nested distributor
  distributor?: DistributorCompany;
  distributorId?: string;
};

// =============================================================================
// Helpers
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "https://api.tirepro.com.co/api";

function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
}

// =============================================================================
// Toast
// =============================================================================

type Toast = { id: number; message: string; type: "success" | "error" };

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto transition-all"
          style={{
            background: t.type === "success" ? "rgba(22,163,74,0.96)" : "rgba(220,38,38,0.96)",
            minWidth: 260, maxWidth: 360,
          }}
          onClick={() => onDismiss(t.id)}
        >
          {t.type === "success"
            ? <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />}
          <span className="text-white text-sm font-medium flex-1">{t.message}</span>
          <X className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Design-system micro-components
// =============================================================================

/** White panel card */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "white", border: "1px solid rgba(52,140,203,0.15)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}
    >
      {children}
    </div>
  );
}

/** Section heading row inside a card */
function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(30,118,182,0.1)" }}>
        <Icon className="w-4 h-4 text-[#1E76B6]" />
      </div>
      <h3 className="text-sm font-black text-[#0A183A] tracking-tight">{title}</h3>
    </div>
  );
}

/** Input field styled to brand */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E76B6] transition-all";
const inputStyle = { background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.2)", color: "#0A183A" };

/** Brand gradient button */
function PrimaryBtn({ children, onClick, disabled, type = "button", className = "" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  type?: "button" | "submit"; className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 ${className}`}
      style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}
    >
      {children}
    </button>
  );
}

/** Ghost / outline button */
function GhostBtn({ children, onClick, className = "" }: {
  children: React.ReactNode; onClick?: () => void; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-gray-100 ${className}`}
      style={{ border: "1px solid rgba(10,24,58,0.12)", color: "#0A183A" }}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Email Atencion Card (distributor proposal email)
// =============================================================================

const COLOMBIAN_CITIES = [
  "Bogota","Medellin","Cali","Barranquilla","Cartagena","Bucaramanga","Cucuta",
  "Pereira","Santa Marta","Ibague","Manizales","Villavicencio","Pasto","Monteria",
  "Neiva","Armenia","Popayan","Valledupar","Sincelejo","Tunja","Riohacha",
  "Florencia","Quibdo","Yopal","Mocoa","Leticia","Arauca","San Jose del Guaviare",
  "Puerto Carreno","Mitu","Inirida","Sogamoso","Duitama","Girardot","Zipaquira",
  "Facatativa","Fusagasuga","Soacha","Bello","Envigado","Itagui","Sabaneta",
  "Rionegro","Apartado","Turbo","Palmira","Buenaventura","Tulua","Buga",
  "Cartago","Soledad","Maicao","Barrancabermeja","Piedecuesta","Floridablanca",
  "Giron","Dosquebradas","La Virginia","Tuquerres","Ipiales","Tumaco",
];

type CoberturaItem = { ciudad: string; direccion: string; lat: number | null; lng: number | null };

function DistributorProfileEditor({ companyId, toast }: {
  companyId: string;
  toast: (msg: string, type: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    telefono: "", descripcion: "", bannerImage: "", direccion: "", ciudad: "", sitioWeb: "",
    cobertura: [] as CoberturaItem[], tipoEntrega: "ambos", colorMarca: "#1E76B6",
  });
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<{ display: string; city: string; address: string; lat: number; lng: number }[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressDebounce = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/marketplace/distributor/${companyId}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          // Migrate old string[] cobertura to new format
          let cob: CoberturaItem[] = [];
          if (Array.isArray(data.cobertura)) {
            cob = data.cobertura.map((c: any) =>
              typeof c === "string" ? { ciudad: c, direccion: "", lat: null, lng: null } : c
            );
          }
          setForm({
            telefono: data.telefono ?? "", descripcion: data.descripcion ?? "",
            bannerImage: data.bannerImage ?? "", direccion: data.direccion ?? "",
            ciudad: data.ciudad ?? "", sitioWeb: data.sitioWeb ?? "",
            cobertura: cob, tipoEntrega: data.tipoEntrega ?? "ambos",
            colorMarca: data.colorMarca ?? "#1E76B6",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  // Debounced address search via Nominatim
  function handleAddressSearch(query: string) {
    setAddressQuery(query);
    setAddressResults([]);
    if (addressDebounce.current) clearTimeout(addressDebounce.current);
    if (query.length < 3) return;
    addressDebounce.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Colombia")}&format=json&limit=5&countrycodes=co&accept-language=es`);
        if (res.ok) {
          const data = await res.json();
          setAddressResults(data.map((r: any) => {
            const parts = (r.display_name ?? "").split(",").map((s: string) => s.trim());
            const city = parts.find((p: string) => COLOMBIAN_CITIES.some((c) => p.toLowerCase().includes(c.toLowerCase()))) ?? parts[1] ?? "";
            return {
              display: r.display_name ?? query,
              city: city.replace("Bogotá D.C.", "Bogota").replace("Bogotá", "Bogota").replace("Medellín", "Medellin"),
              address: parts.slice(0, 2).join(", "),
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
            };
          }));
        }
      } catch { /* */ }
      setAddressSearching(false);
    }, 400);
  }

  function addCoveragePoint(result: { city: string; address: string; lat: number; lng: number }) {
    setForm((f) => ({
      ...f,
      cobertura: [...f.cobertura, { ciudad: result.city || addressQuery, direccion: result.address, lat: result.lat, lng: result.lng }],
    }));
    setAddressQuery("");
    setAddressResults([]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/marketplace/distributor/${companyId}/profile`, {
        method: "PATCH", body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast("Perfil del marketplace actualizado", "success");
    } catch { toast("Error al guardar", "error"); }
    setSaving(false);
  }

  const inputCls = "w-full px-3 py-2 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all";

  if (loading) return null;

  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle icon={Building} title="Perfil en Marketplace" />
      <p className="text-xs text-gray-400 mb-4">
        Esta informacion aparece en tu pagina publica del marketplace.
        <a href={`/marketplace/distributor/${companyId}`} target="_blank" rel="noopener" className="ml-1 text-[#1E76B6] font-bold hover:underline">Ver mi pagina</a>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Telefono</label>
          <input type="tel" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            placeholder="+57 300 123 4567" className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sitio Web</label>
          <input type="url" value={form.sitioWeb} onChange={(e) => setForm((f) => ({ ...f, sitioWeb: e.target.value }))}
            placeholder="https://..." className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ciudad principal</label>
          <input type="text" value={form.ciudad} onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
            placeholder="Bogota" className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Direccion principal</label>
          <input type="text" value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            placeholder="Calle 80 #45-12" className={inputCls} />
        </div>
      </div>

      {/* Color picker */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Color de marca</label>
        <div className="flex items-center gap-3">
          <input type="color" value={form.colorMarca} onChange={(e) => setForm((f) => ({ ...f, colorMarca: e.target.value }))}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 cursor-pointer" />
          <span className="text-xs font-mono text-gray-500">{form.colorMarca}</span>
          <div className="flex gap-1">
            {["#1E76B6", "#ef4444", "#22c55e", "#f97316", "#8b5cf6", "#0A183A"].map((c) => (
              <button key={c} onClick={() => setForm((f) => ({ ...f, colorMarca: c }))}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: form.colorMarca === c ? "#0A183A" : "transparent" }} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descripcion</label>
        <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          rows={3} placeholder="Describe tu empresa, servicios y especialidades..." className={`${inputCls} resize-none`} />
      </div>
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Imagen de portada (URL)</label>
        <input type="url" value={form.bannerImage} onChange={(e) => setForm((f) => ({ ...f, bannerImage: e.target.value }))}
          placeholder="https://...imagen-portada.jpg" className={inputCls} />
        {form.bannerImage && (
          <div className="mt-2 h-20 rounded-xl overflow-hidden bg-gray-100">
            <img src={form.bannerImage} alt="Banner" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Delivery type */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo de entrega</label>
        <div className="flex rounded-xl overflow-hidden border border-[#348CCB]/30">
          {[{ value: "domicilio", label: "Domicilio" }, { value: "recogida", label: "Recogida" }, { value: "ambos", label: "Ambos" }].map((t) => (
            <button key={t.value} type="button" onClick={() => setForm((f) => ({ ...f, tipoEntrega: t.value }))}
              className="flex-1 px-3 py-2 text-xs font-bold transition-all"
              style={{ background: form.tipoEntrega === t.value ? "#0A183A" : "#F0F7FF", color: form.tipoEntrega === t.value ? "white" : "#173D68" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coverage locations */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          Puntos de cobertura ({form.cobertura.length})
        </label>

        {/* Existing points */}
        {form.cobertura.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {form.cobertura.map((loc, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: form.colorMarca, border: "2px solid white", boxShadow: `0 0 0 1px ${form.colorMarca}40` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#0A183A]">{loc.ciudad}</p>
                  {loc.direccion && <p className="text-[10px] text-gray-400 truncate">{loc.direccion}</p>}
                </div>
                {loc.lat && loc.lng && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 flex-shrink-0">
                    📍 {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                  </span>
                )}
                <button onClick={() => setForm((f) => ({ ...f, cobertura: f.cobertura.filter((_, j) => j !== i) }))}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Add new — single smart search */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={addressQuery}
                onChange={(e) => handleAddressSearch(e.target.value)}
                placeholder="Buscar direccion, barrio o ciudad..."
                className={inputCls}
              />
              {addressSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[#348CCB]" />
              )}
            </div>
          </div>

          {/* Search results dropdown */}
          {addressResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {addressResults.map((r, i) => (
                <button key={i} onClick={() => addCoveragePoint(r)}
                  className="w-full text-left px-4 py-3 hover:bg-[#F0F7FF] transition-colors border-b border-gray-50 last:border-0">
                  <p className="text-xs font-bold text-[#0A183A]">{r.city || "Colombia"}</p>
                  <p className="text-[10px] text-gray-400 truncate">{r.display}</p>
                </button>
              ))}
            </div>
          )}

          {/* Quick add Colombian cities */}
          {!addressQuery && form.cobertura.length < 3 && (
            <div className="mt-2">
              <p className="text-[9px] text-gray-400 mb-1.5">Agregar rapidamente:</p>
              <div className="flex flex-wrap gap-1">
                {COLOMBIAN_CITIES.slice(0, 10)
                  .filter((c) => !form.cobertura.some((loc) => loc.ciudad === c))
                  .slice(0, 6)
                  .map((city) => (
                    <button key={city} onClick={() => {
                      handleAddressSearch(city);
                      // Also auto-search so they get results
                      setTimeout(() => {
                        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", Colombia")}&format=json&limit=1&countrycodes=co`)
                          .then((r) => r.ok ? r.json() : [])
                          .then((data) => {
                            if (data.length > 0) {
                              addCoveragePoint({ city, address: "", lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                            } else {
                              setForm((f) => ({ ...f, cobertura: [...f.cobertura, { ciudad: city, direccion: "", lat: null, lng: null }] }));
                            }
                          })
                          .catch(() => setForm((f) => ({ ...f, cobertura: [...f.cobertura, { ciudad: city, direccion: "", lat: null, lng: null }] })));
                        setAddressQuery("");
                      }, 100);
                    }}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium text-[#1E76B6] bg-[#1E76B6]/5 hover:bg-[#1E76B6]/10 transition-colors">
                      + {city}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PrimaryBtn onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        Guardar Perfil
      </PrimaryBtn>
    </Card>
  );
}

function EmailAtencionCard({ companyId, initialEmail, onSaved, toast }: {
  companyId: string; initialEmail: string;
  onSaved: (email: string) => void;
  toast: (msg: string, type: "success" | "error") => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!email.trim() || !email.includes("@")) { toast("Ingrese un email válido", "error"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(
        `${(process.env.NEXT_PUBLIC_API_URL ?? "https://api.tirepro.com.co")}/api/companies/${companyId}/email-atencion`,
        { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: email.trim() }) },
      );
      if (!res.ok) throw new Error();
      onSaved(email.trim());
      toast("Email de propuestas actualizado", "success");
    } catch { toast("Error al guardar email", "error"); }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(52,140,203,0.18)", boxShadow: "0 4px 24px rgba(10,24,58,0.05)" }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
        <Mail className="w-5 h-5 text-white/80" />
        <div>
          <p className="text-sm font-bold text-white">Email para Propuestas de Compra</p>
          <p className="text-[10px] text-white/60">Los clientes enviarán sus pedidos de llantas a este email</p>
        </div>
      </div>
      <div className="p-5 space-y-3 bg-white">
        <p className="text-xs text-[#348CCB]">
          Cuando un cliente cree una propuesta de compra, recibirá una notificación en este correo con un enlace para ver y cotizar el pedido en TirePro.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ventas@miempresa.com"
            className="flex-1 px-3 py-2.5 border border-[#348CCB]/30 rounded-xl text-sm text-[#0A183A] bg-[#F0F7FF] placeholder-[#93b8d4] focus:outline-none focus:border-[#1E76B6] focus:ring-2 focus:ring-[#1E76B6]/20 transition-all"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Guardar
          </button>
        </div>
        {initialEmail && (
          <p className="text-[10px] text-[#348CCB]">
            Actual: <span className="font-bold text-[#0A183A]">{initialEmail}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Tab nav definition
// =============================================================================

type TabId = "profile" | "orders" | "company" | "users" | "addUser" | "distributors";

// =============================================================================
// Main Page
// =============================================================================

const AjustesPage: React.FC = () => {
  const router = useRouter();

  const [user,    setUser]    = useState<UserData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [users,   setUsers]   = useState<UserData[]>([]);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);
  const [toasts,  setToasts]  = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [showChange,   setShowChange]   = useState(false);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);

  const [newUserData, setNewUserData] = useState({ name: "", email: "", password: "", role: "regular" });
  const [notifChannel, setNotifChannel] = useState<string>("none");
  const [notifContact, setNotifContact] = useState("");
  const [savingNotif, setSavingNotif] = useState(false);
  const [plateInputs, setPlateInputs] = useState<Record<string, string>>({});
  const [savingUser,  setSavingUser]  = useState(false);
  const [marketplaceOrders, setMarketplaceOrders] = useState<any[]>([]);

  // Saturn V mode
  const [showSaturnChallenge, setShowSaturnChallenge] = useState(false);
  const [saturnUnlocked, setSaturnUnlocked] = useState(false);
  const [saturnActive, setSaturnActive] = useState(false);
  const [saturnAnswers, setSaturnAnswers] = useState({
    stage1: "", stage1count: "", stage2: "", stage2count: "", stage3: "", stage3count: "",
    engineType1: "", engineType2: "", cathode: "", battery1: "", battery2: "",
  });
  const [saturnError, setSaturnError] = useState("");
  const [saturnSaving, setSaturnSaving] = useState(false);

  // Distributor tab
  const [searchQuery,           setSearchQuery]           = useState("");
  const [searchResults,         setSearchResults]         = useState<DistributorCompany[]>([]);
  const [selectedDistributors,  setSelectedDistributors]  = useState<DistributorCompany[]>([]);
  const [connectedDistributors, setConnectedDistributors] = useState<DistributorCompany[]>([]);
  const [searchLoading,         setSearchLoading]         = useState(false);
  const [grantingAccess,        setGrantingAccess]        = useState(false);

  // -- Toast helper ---------------------------------------------------------
  const toast = useCallback((message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // -- Data fetchers ---------------------------------------------------------
  const fetchCompany = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/companies/${companyId}`);
      if (!res.ok) throw new Error("Error al cargar empresa");
      setCompany(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
  }, []);

  const fetchUsers = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/users?companyId=${companyId}`);
      if (!res.ok) throw new Error("Error al cargar usuarios");
      setUsers(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
  }, []);

  const fetchConnectedDistributors = useCallback(async (companyId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/companies/${companyId}/distributors`);
      if (res.ok) setConnectedDistributors(await res.json());
    } catch { /* silent */ }
  }, []);

  // -- Auth init -------------------------------------------------------------
  useEffect(() => {
    const storedUser  = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (!storedUser || !storedToken) { localStorage.clear(); router.push("/login"); return; }
    const parsed: UserData = JSON.parse(storedUser);
    setUser(parsed);
    // Fetch notification prefs
    authFetch(`${API_BASE}/users/${parsed.id}/notification-prefs`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setNotifChannel(data.notifChannel ?? "none");
          setNotifContact(data.notifContact ?? "");
          if (data.saturnVUnlocked) {
            setSaturnUnlocked(true);
            try { localStorage.setItem("saturnV", "1"); } catch {}
            try {
              if (localStorage.getItem("saturnVActive") === "1") {
                setSaturnActive(true);
                document.documentElement.classList.add("saturn-v");
              }
            } catch {}
          }
        }
      })
      .catch(() => {});
    // Fetch marketplace orders
    if (parsed.id) {
      const token = localStorage.getItem("token") ?? "";
      authFetch(`${API_BASE}/marketplace/orders/user?userId=${parsed.id}`)
        .then((r) => r.ok ? r.json() : [])
        .then(setMarketplaceOrders)
        .catch(() => {});
    }
    if (parsed.companyId) {
      fetchCompany(parsed.companyId);
      if (parsed.role === "admin") {
        fetchUsers(parsed.companyId);
        fetchConnectedDistributors(parsed.companyId);
      }
    } else {
      setError("No hay empresa asignada al usuario");
    }
    setLoading(false);
  }, [router, fetchCompany, fetchUsers, fetchConnectedDistributors]);

  // -- Distributor search (debounced) ----------------------------------------
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      if (!user) return;
      setSearchLoading(true);
      try {
        const res = await authFetch(
          `${API_BASE}/companies/search/by-name?q=${encodeURIComponent(searchQuery)}&exclude=${user.companyId}`
        );
        if (!res.ok) throw new Error();
        const data: DistributorCompany[] = await res.json();
        setSearchResults(data.filter((c) => c.plan === "distribuidor"));
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, user]);

  // -- Handlers --------------------------------------------------------------
  const handleLogout = () => { localStorage.clear(); window.location.href = "/login"; };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      const res = await authFetch(`${API_BASE}/companies/${company.id}/logo`, {
        method: "PATCH", body: JSON.stringify({ imageBase64: base64 }),
      });
      if (!res.ok) { toast("Error al actualizar el logo", "error"); return; }
      setCompany(await res.json());
      toast("Logo actualizado exitosamente", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      toast("Complete todos los campos", "error"); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserData.email)) {
      toast("Correo electrónico inválido", "error"); return;
    }
    if (newUserData.password.length < 6) {
      toast("La contraseña debe tener al menos 6 caracteres", "error"); return;
    }
    if (!user) return;
    setSavingUser(true);
    try {
      const res = await authFetch(`${API_BASE}/users/register`, {
        method: "POST",
        body: JSON.stringify({
          ...newUserData,
          companyId: user.companyId,
          email: newUserData.email.toLowerCase().trim(),
          name: newUserData.name.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al crear usuario");
      }
      const result = await res.json();
      toast(result.message || "Usuario creado exitosamente", "success");
      fetchUsers(user.companyId);
      setNewUserData({ name: "", email: "", password: "", role: "regular" });
      setActiveTab("users");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error inesperado", "error");
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    try {
      const res = await authFetch(`${API_BASE}/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar usuario");
      toast("Usuario eliminado", "success");
      if (user) fetchUsers(user.companyId);
    } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
  };

  const handleAddPlate = async (userId: string) => {
    const plate = plateInputs[userId]?.trim();
    if (!plate) { toast("Ingrese una placa válida", "error"); return; }
    try {
      // Backend: PATCH /users/add-plate/:id  with body { plate }
      const res = await authFetch(`${API_BASE}/users/add-plate/${userId}`, {
        method: "PATCH", body: JSON.stringify({ plate }),
      });
      if (!res.ok) throw new Error("Error al agregar placa");
      const updated: UserData = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plates: updated.plates } : u));
      setPlateInputs((prev) => ({ ...prev, [userId]: "" }));
      toast("Placa agregada", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
  };

  const handleRemovePlate = async (userId: string, plate: string) => {
    try {
      // Backend: PATCH /users/remove-plate/:id  with body { plate }
      const res = await authFetch(`${API_BASE}/users/remove-plate/${userId}`, {
        method: "PATCH", body: JSON.stringify({ plate }),
      });
      if (!res.ok) throw new Error("Error al remover placa");
      const updated: UserData = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plates: updated.plates } : u));
      toast("Placa removida", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
  };

  // Distributor access
  const addToSelection = (d: DistributorCompany) =>
    setSelectedDistributors((prev) => prev.some((x) => x.id === d.id) ? prev : [...prev, d]);

  const removeFromSelection = (id: string) =>
    setSelectedDistributors((prev) => prev.filter((d) => d.id !== id));

  const handleGrantAccess = async () => {
    if (!selectedDistributors.length) { toast("Selecciona al menos un distribuidor", "error"); return; }
    setGrantingAccess(true);
    try {
      await Promise.all(selectedDistributors.map((d) =>
        authFetch(`${API_BASE}/companies/${user!.companyId}/distributors/${d.id}`, { method: "POST" })
      ));
      toast("Acceso otorgado exitosamente", "success");
      setSelectedDistributors([]); setSearchQuery(""); setSearchResults([]);
      fetchConnectedDistributors(user!.companyId);
    } catch { toast("Error al otorgar acceso", "error"); }
    finally { setGrantingAccess(false); }
  };

  const handleRevokeAccess = async (distributorId: string) => {
    if (!window.confirm("¿Revocar acceso a este distribuidor?")) return;
    try {
      const res = await authFetch(
        `${API_BASE}/companies/${user!.companyId}/distributors/${distributorId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Error al revocar acceso");
      toast("Acceso revocado exitosamente", "success");
      fetchConnectedDistributors(user!.companyId);
    } catch (e) { toast(e instanceof Error ? e.message : "Error", "error"); }
  };

  // -- Tab definitions -------------------------------------------------------
  const tabs: { id: TabId; label: string; icon: React.ElementType; adminOnly?: boolean; hideForDistributor?: boolean }[] = [
    { id: "profile",      label: "Perfil",          icon: User                             },
    { id: "orders",       label: "Mis Pedidos",     icon: ShoppingCart                     },
    { id: "company",      label: "Empresa",         icon: Building                         },
    { id: "users",        label: "Usuarios",        icon: Users,    adminOnly: true        },
    { id: "addUser",      label: "Nuevo Usuario",   icon: UserPlus, adminOnly: true        },
    { id: "distributors", label: "Distribuidores",  icon: Link2,    adminOnly: true, hideForDistributor: true },
  ];

  // ==========================================================================
  // Render
  // ==========================================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#ffffff" }}>
        <div className="flex items-center gap-3 text-[#1E76B6]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Cargando ajustes…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      {/* -- Sticky header -- */}
      <div
        className="sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(52,140,203,0.15)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #173D68)" }}>
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-[#0A183A] text-base sm:text-lg leading-none tracking-tight">Ajustes</h1>
            <p className="text-xs text-[#348CCB] mt-0.5">
              {user?.name ?? ""} · {company?.name ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:bg-red-50"
          style={{ border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="flex-1 text-red-700">{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* -- Tab nav -- */}
        <Card className="p-1.5">
          <nav className="grid gap-1" style={{ gridTemplateColumns: `repeat(${tabs.filter((t) => (!t.adminOnly || user?.role === "admin") && (!t.hideForDistributor || company?.plan !== "distribuidor")).length}, minmax(0,1fr))` }}>
            {tabs
              .filter((t) => (!t.adminOnly || user?.role === "admin") && (!t.hideForDistributor || company?.plan !== "distribuidor"))
              .map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
                    style={{
                      background: active ? "linear-gradient(135deg, #0A183A, #173D68)" : "transparent",
                      color: active ? "white" : "#6B7280",
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">{tab.label}</span>
                  </button>
                );
              })}
          </nav>
        </Card>

        {/* ================================================================ */}
        {/* PROFILE TAB                                                       */}
        {/* ================================================================ */}
        {activeTab === "profile" && user && (
          <div className="space-y-4">
            {/* User info card */}
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}>
                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-[#0A183A] text-lg leading-tight truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <span
                    className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: user.role === "admin" ? "#0A183A" : "#1E76B6" }}
                  >
                    <Shield className="w-2.5 h-2.5" />
                    {user.role === "admin" ? "Administrador" : "Usuario Regular"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Nombre", value: user.name },
                  { label: "Correo", value: user.email },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                    <div className="px-3 py-2.5 rounded-xl text-sm font-medium text-[#0A183A] break-all" style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.12)" }}>
                      {value}
                    </div>
                  </div>
                ))}

                {user.plates && user.plates.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Placas asignadas</p>
                    <div className="flex flex-wrap gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(10,24,58,0.03)", border: "1px solid rgba(52,140,203,0.12)" }}>
                      {user.plates.map((plate) => (
                        <span key={plate} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(30,118,182,0.1)", color: "#1E76B6" }}>
                          <Tag className="w-2.5 h-2.5" />{plate}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Security card */}
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={Shield} title="Seguridad" />
              <button
                onClick={() => setShowChange(!showChange)}
                className="w-full flex items-center justify-between p-4 rounded-xl transition-all hover:bg-gray-50"
                style={{ border: "1px solid rgba(52,140,203,0.15)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}>
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#0A183A]">Cambiar Contraseña</p>
                    <p className="text-xs text-gray-500">Actualiza tu contraseña de acceso</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-[#1E76B6] transition-transform ${showChange ? "rotate-90" : ""}`} />
              </button>
              {showChange && (
                <div className="mt-3 p-4 rounded-xl" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                  <CambiarContrasena />
                </div>
              )}
            </Card>

            {/* Notification preferences card */}
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={Mail} title="Mis Notificaciones" />
              <p className="text-xs text-gray-400 mb-4">
                Elige como quieres recibir alertas cuando el agente detecte problemas en tus llantas.
              </p>

              <div className="space-y-2.5 mb-4">
                {[
                  { key: "email", label: "Correo electronico", desc: "Recibe alertas por email", placeholder: "tu@email.com" },
                  { key: "whatsapp", label: "WhatsApp", desc: "Recibe alertas por mensaje de WhatsApp", placeholder: "+57 300 123 4567" },
                  { key: "none", label: "Solo en plataforma", desc: "Las alertas solo aparecen dentro de TirePro", placeholder: "" },
                ].map((opt) => {
                  const active = notifChannel === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setNotifChannel(opt.key)}
                      className="w-full text-left rounded-xl p-4 transition-all"
                      style={{
                        border: active ? "2px solid #1E76B6" : "1px solid rgba(52,140,203,0.15)",
                        background: active ? "rgba(30,118,182,0.04)" : "white",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ border: active ? "2px solid #1E76B6" : "2px solid #cbd5e1", background: active ? "#1E76B6" : "transparent" }}
                        >
                          {active && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: active ? "#0A183A" : "#334155" }}>{opt.label}</p>
                          <p className="text-xs text-gray-400">{opt.desc}</p>
                          {active && opt.key !== "none" && (
                            <input
                              type={opt.key === "email" ? "email" : "text"}
                              value={notifContact}
                              onChange={(e) => setNotifContact(e.target.value)}
                              placeholder={opt.placeholder}
                              onClick={(e) => e.stopPropagation()}
                              className={inputCls + " mt-3"}
                              style={inputStyle}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <PrimaryBtn
                disabled={savingNotif}
                onClick={async () => {
                  if (!user) return;
                  setSavingNotif(true);
                  try {
                    const res = await authFetch(`${API_BASE}/users/${user.id}/notification-prefs`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        notifChannel: notifChannel === "none" ? null : notifChannel,
                        notifContact: notifChannel === "none" ? null : notifContact.trim() || null,
                      }),
                    });
                    if (!res.ok) throw new Error();
                    toast("Preferencias de notificacion guardadas", "success");
                  } catch {
                    toast("Error al guardar preferencias", "error");
                  }
                  setSavingNotif(false);
                }}
              >
                {savingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Guardar preferencias
              </PrimaryBtn>
            </Card>

            {/* Saturn V trigger / toggle */}
            {saturnUnlocked ? (
              <div
                className="mt-6 rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: saturnActive ? "linear-gradient(135deg, #0a0a0a, #1a1a2e)" : "rgba(10,24,58,0.03)",
                  border: saturnActive ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(52,140,203,0.1)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🚀</span>
                  <div>
                    <p className="text-xs font-black" style={{ color: saturnActive ? "#f97316" : "#0A183A" }}>Saturn V Mode</p>
                    <p className="text-[10px]" style={{ color: saturnActive ? "rgba(255,255,255,0.4)" : "#94a3b8" }}>
                      {saturnActive ? "Houston, estamos en orbita." : "Modo espacial desbloqueado"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !saturnActive;
                    setSaturnActive(next);
                    localStorage.setItem("saturnVActive", next ? "1" : "0");
                    document.documentElement.classList.toggle("saturn-v", next);
                  }}
                  className="relative w-11 h-6 rounded-full transition-all"
                  style={{ background: saturnActive ? "#f97316" : "rgba(0,0,0,0.1)" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                    style={{ left: saturnActive ? 22 : 2 }}
                  />
                </button>
              </div>
            ) : (
              <div className="flex justify-center pt-8 pb-2">
                <button
                  onClick={() => setShowSaturnChallenge(true)}
                  className="text-2xl transition-all hover:scale-125 active:scale-95"
                  style={{ opacity: 0.25 }}
                >
                  🚀
                </button>
              </div>
            )}
          </div>
        )}

        {/* Saturn V challenge modal */}
        {showSaturnChallenge && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          >
            <div
              className="w-full sm:max-w-md max-h-[95vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {/* Header */}
              <div className="px-5 py-3.5 flex-shrink-0 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🚀</span>
                  <div>
                    <h3 className="text-sm font-black text-white" style={{ fontFamily: "'DM Mono', monospace" }}>SATURN V</h3>
                    <p className="text-[9px] text-white/30">Demuestra lo que sabes</p>
                  </div>
                </div>
                <button onClick={() => { setShowSaturnChallenge(false); setSaturnError(""); }} className="text-white/60 hover:text-white transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Questions — scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ background: "#0d0d0d" }}>

                {/* Q1: Saturn V stages */}
                <div>
                  <p className="text-[9px] text-white/90 uppercase tracking-widest font-bold mb-2">1 · Motor y cantidad por etapa del Saturn V</p>
                  <div className="space-y-1.5">
                    {([
                      { key: "stage1", countKey: "stage1count", label: "S-IC" },
                      { key: "stage2", countKey: "stage2count", label: "S-II" },
                      { key: "stage3", countKey: "stage3count", label: "S-IVB" },
                    ] as const).map(({ key, countKey, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-white/80 w-10 flex-shrink-0">{label}</span>
                        <input
                          type="text"
                          value={saturnAnswers[key]}
                          onChange={(e) => setSaturnAnswers((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder="Motor"
                          className="flex-1 px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        />
                        <input
                          type="number"
                          value={saturnAnswers[countKey]}
                          onChange={(e) => setSaturnAnswers((p) => ({ ...p, [countKey]: e.target.value }))}
                          placeholder="#"
                          className="w-12 px-2 py-1.5 rounded-md text-xs text-center bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

                {/* Q2: Engine cycles */}
                <div>
                  <p className="text-[9px] text-white/90 uppercase tracking-widest font-bold mb-2">2 · Dos tipos de ciclo de motor cohete</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={saturnAnswers.engineType1}
                      onChange={(e) => setSaturnAnswers((p) => ({ ...p, engineType1: e.target.value }))}
                      placeholder="Ciclo 1"
                      className="px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                    />
                    <input
                      type="text"
                      value={saturnAnswers.engineType2}
                      onChange={(e) => setSaturnAnswers((p) => ({ ...p, engineType2: e.target.value }))}
                      placeholder="Ciclo 2"
                      className="px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                    />
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

                {/* Q3: Cathode/Anode */}
                <div>
                  <p className="text-[9px] text-white/90 uppercase tracking-widest font-bold mb-2">3 · Electrodo positivo en una celda</p>
                  <div className="flex gap-2">
                    {(["catodo", "anodo"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSaturnAnswers((p) => ({ ...p, cathode: opt }))}
                        className="flex-1 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all"
                        style={{
                          background: saturnAnswers.cathode === opt ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.03)",
                          border: saturnAnswers.cathode === opt ? "1.5px solid #f97316" : "1.5px solid rgba(255,255,255,0.06)",
                          color: saturnAnswers.cathode === opt ? "#f97316" : "rgba(255,255,255,0.8)",
                        }}
                      >
                        {opt === "catodo" ? "Catodo" : "Anodo"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

                {/* Q4: Battery types */}
                <div>
                  <p className="text-[9px] text-white/90 uppercase tracking-widest font-bold mb-2">4 · Dos tipos de baterias de litio</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={saturnAnswers.battery1}
                      onChange={(e) => setSaturnAnswers((p) => ({ ...p, battery1: e.target.value }))}
                      placeholder="Tipo 1"
                      className="px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                    />
                    <input
                      type="text"
                      value={saturnAnswers.battery2}
                      onChange={(e) => setSaturnAnswers((p) => ({ ...p, battery2: e.target.value }))}
                      placeholder="Tipo 2"
                      className="px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-orange-400/50"
                    />
                  </div>
                </div>

                {saturnError && (
                  <p className="text-[11px] text-red-400 font-bold flex items-center gap-1.5 pt-2">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" /> {saturnError}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="px-5 py-3 flex-shrink-0" style={{ background: "#0d0d0d", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button
                  disabled={saturnSaving}
                  onClick={async () => {
                    const norm = (s: string) => s.trim().toLowerCase().replace(/[-\s]/g, "");

                    // 1. Saturn V stages
                    const s1 = norm(saturnAnswers.stage1);
                    const s2 = norm(saturnAnswers.stage2);
                    const s3 = norm(saturnAnswers.stage3);
                    const c1 = saturnAnswers.stage1count.trim();
                    const c2 = saturnAnswers.stage2count.trim();
                    const c3 = saturnAnswers.stage3count.trim();
                    const stagesOk = s1 === "f1" && c1 === "5" && s2 === "j2" && c2 === "5" && s3 === "j2" && c3 === "1";

                    // 2. Engine cycle types (accept any 2 valid types)
                    const VALID_CYCLES = new Set([
                      "abierto", "cicloabierto", "opencycle",
                      "cerrado", "ciclocerrado", "closedcycle",
                      "fullflow", "flujocompleto",
                      "presurizado", "pressurefed", "alimentadoporpresion",
                      "expander", "expandercycle",
                      "gasgen", "gasgenerator", "generadordegas",
                      "stagedcombustion", "combustionescalonada",
                      "electricpump", "bombaelectrica",
                      "coldgas", "gasfrio",
                      "monopropelente", "monopropellant", "monoprop",
                      "bipropelente", "bipropellant", "biprop",
                    ]);
                    const e1 = norm(saturnAnswers.engineType1);
                    const e2 = norm(saturnAnswers.engineType2);
                    const enginesOk = e1 !== e2 && VALID_CYCLES.has(e1) && VALID_CYCLES.has(e2);

                    // 3. Cathode is positive
                    const cathodeOk = saturnAnswers.cathode === "catodo";

                    // 4. Battery types (accept any 2 valid types)
                    const VALID_BATTERIES = new Set([
                      "lfp", "lifepo4", "fosfatodehierro",
                      "nmc", "nmc811", "nmc622", "nmc532",
                      "nca",
                      "lco", "cobaltodilitio",
                      "lmo", "manganeso",
                      "lto", "titanato",
                      "solidstate", "estadosolido", "solidostate",
                      "lis", "litioazufre", "lithiumsulfur",
                      "sodium", "sodio", "naion", "sodiumion",
                      "liion", "iondelitio",
                      "lipo", "litiopolimero",
                    ]);
                    const b1 = norm(saturnAnswers.battery1);
                    const b2 = norm(saturnAnswers.battery2);
                    const batteriesOk = b1 !== b2 && VALID_BATTERIES.has(b1) && VALID_BATTERIES.has(b2);

                    // Build error messages
                    const errors: string[] = [];
                    if (!stagesOk) errors.push("Etapas del Saturn V");
                    if (!enginesOk) errors.push("Tipos de motor");
                    if (!cathodeOk) errors.push("Electrodo positivo");
                    if (!batteriesOk) errors.push("Tipos de bateria");

                    if (errors.length > 0) {
                      setSaturnError(`Incorrecto: ${errors.join(", ")}.`);
                      return;
                    }

                    setSaturnSaving(true);
                    try {
                      if (user) {
                        await authFetch(`${API_BASE}/users/${user.id}/notification-prefs`, {
                          method: "PATCH",
                          body: JSON.stringify({ saturnVUnlocked: true }),
                        });
                      }
                      setSaturnUnlocked(true);
                      localStorage.setItem("saturnV", "1");
                      setShowSaturnChallenge(false);
                      setSaturnError("");
                      toast("Saturn V Mode desbloqueado.", "success");
                    } catch {
                      setSaturnError("Error al guardar. Intenta de nuevo.");
                    } finally {
                      setSaturnSaving(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    color: "white",
                    boxShadow: "0 0 20px rgba(249,115,22,0.3)",
                  }}
                >
                  {saturnSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Autorizar Lanzamiento"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* ORDERS TAB                                                        */}
        {/* ================================================================ */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={ShoppingCart} title="Historial de Pedidos" />
              {marketplaceOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-bold text-[#0A183A]">Sin pedidos</p>
                  <p className="text-xs mt-1">Tus compras del marketplace apareceran aqui.</p>
                  <a href="/marketplace" className="inline-block mt-3 px-4 py-2 rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #1E76B6, #0A183A)" }}>
                    Ir al Marketplace
                  </a>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  {marketplaceOrders.map((o: any) => {
                    const imgs = Array.isArray(o.listing?.imageUrls) ? o.listing.imageUrls : [];
                    const cover = imgs.length > 0 ? imgs[o.listing?.coverIndex ?? 0] ?? imgs[0] : null;
                    const fmtCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
                    const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
                      pendiente:  { label: "Pendiente",  color: "#f97316", bg: "rgba(249,115,22,0.1)" },
                      confirmado: { label: "Confirmado", color: "#1E76B6", bg: "rgba(30,118,182,0.1)" },
                      enviado:    { label: "Enviado",    color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
                      entregado:  { label: "Entregado",  color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
                      cancelado:  { label: "Cancelado",  color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
                    };
                    const st = statusMeta[o.status] ?? statusMeta.pendiente;
                    return (
                      <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-white" style={{ border: "1px solid rgba(52,140,203,0.1)" }}>
                        <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {cover ? <img src={cover} alt="" className="w-full h-full object-contain p-1.5" /> : <Package className="w-5 h-5 text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={`/marketplace/product/${o.listingId}`} className="text-sm font-bold text-[#0A183A] hover:text-[#1E76B6] truncate">
                              {o.listing?.marca} {o.listing?.modelo}
                            </a>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {o.listing?.dimension} · {o.quantity} uds · #{o.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(o.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        </div>
                        <p className="text-sm font-black text-[#0A183A] flex-shrink-0">{fmtCOP(o.totalCop)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================================================================ */}
        {/* COMPANY TAB                                                       */}
        {/* ================================================================ */}
        {activeTab === "company" && company && (
          <div className="space-y-4">
            {/* Logo + name */}
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Logo */}
                <div className="relative flex-shrink-0 group">
                  <div className="w-24 h-20 rounded-2xl overflow-hidden bg-[#F0F7FF] flex items-center justify-center p-1.5" style={{ border: "2px solid rgba(52,140,203,0.2)" }}>
                    <img
                      src={logoPreview || company.profileImage}
                      alt={company.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  {user?.role === "admin" && (
                    <label className="absolute inset-0 flex items-center justify-center rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(10,24,58,0.5)" }}>
                      <Upload className="w-5 h-5 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-black text-[#0A183A] leading-tight">{company.name}</h2>
                  <span
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-black text-white"
                    style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Plan {company.plan}
                  </span>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Usuarios",  value: company._count.users,    icon: Users,     grad: "linear-gradient(135deg, #0A183A, #173D68)" },
                { label: "Vehículos", value: company._count.vehicles,  icon: Car,       grad: "linear-gradient(135deg, #173D68, #1E76B6)" },
                { label: "Llantas",   value: company._count.tires,     icon: Building2, grad: "linear-gradient(135deg, #1E76B6, #348CCB)" },
              ].map(({ label, value, icon: Icon, grad }) => (
                <Card key={label} className="p-4 sm:p-5 flex flex-col gap-2">
                  <div className="p-2 rounded-xl self-start" style={{ background: grad }}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-black leading-none">{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                </Card>
              ))}
            </div>

            {/* Email de atención para propuestas (distribuidor) */}
            {user?.role === "admin" && (
              <EmailAtencionCard companyId={company.id} initialEmail={company.emailAtencion ?? ""} onSaved={(email) => setCompany((c) => c ? { ...c, emailAtencion: email } : c)} toast={toast} />
            )}

            {/* Distributor marketplace profile */}
            {user?.role === "admin" && company.plan === "distribuidor" && (
              <DistributorProfileEditor companyId={company.id} toast={toast} />
            )}

            {/* Admin config note */}
            {user?.role === "admin" && (
              <div className="rounded-2xl p-5 sm:p-6" style={{ background: "linear-gradient(135deg, #0A183A 0%, #173D68 100%)" }}>
                <SectionTitle icon={Settings} title="" />
                <div className="flex items-center gap-3 mb-5">
                  <Settings className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="font-black text-white text-sm">Configuración adicional</p>
                    <p className="text-xs text-white/60 mt-0.5">Contacta a soporte para cambios en la empresa</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Shield, label: "Configuración de Seguridad", sub: "Permisos y acceso" },
                    { icon: Mail,   label: "Contactar Soporte",           sub: "Ayuda técnica" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Icon className="w-4 h-4 text-[#348CCB] flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">{label}</p>
                        <p className="text-[10px] text-white/50">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* USERS TAB                                                         */}
        {/* ================================================================ */}
        {activeTab === "users" && user?.role === "admin" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#0A183A]">{users.length} usuario{users.length !== 1 ? "s" : ""}</p>
              <PrimaryBtn onClick={() => setActiveTab("addUser")}>
                <UserPlus className="w-4 h-4" /> Nuevo
              </PrimaryBtn>
            </div>

            {users.length === 0 ? (
              <Card className="p-10 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-400">No hay usuarios aún</p>
              </Card>
            ) : (
              users.map((u) => (
                <Card key={u.id} className="overflow-hidden">
                  {/* User header */}
                  <div className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(52,140,203,0.1)", background: "rgba(10,24,58,0.02)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E76B6, #348CCB)" }}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-[#0A183A] truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: u.role === "admin" ? "#0A183A" : "#1E76B6" }}>
                        <Shield className="w-2.5 h-2.5" />{u.role === "admin" ? "Admin" : "Regular"}
                      </span>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 rounded-xl transition-all hover:bg-red-50"
                        style={{ color: "#DC2626" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Plates section */}
                  <div className="p-4 sm:p-5">
                    <SectionTitle icon={Tag} title="Placas Asignadas" />
                    {u.plates?.length ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {u.plates.map((plate) => (
                          <span
                            key={plate}
                            className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-bold group"
                            style={{ background: "rgba(30,118,182,0.08)", color: "#1E76B6", border: "1px solid rgba(30,118,182,0.2)" }}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {plate}
                            <button
                              onClick={() => handleRemovePlate(u.id, plate)}
                              className="p-0.5 rounded-full hover:bg-red-100 transition-colors"
                              style={{ color: "#DC2626" }}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4 mb-4 rounded-xl text-xs text-gray-400 font-medium" style={{ border: "2px dashed rgba(52,140,203,0.15)" }}>
                        Sin placas asignadas
                      </div>
                    )}

                    {/* Add plate form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nueva placa…"
                        value={plateInputs[u.id] ?? ""}
                        onChange={(e) => setPlateInputs((prev) => ({ ...prev, [u.id]: e.target.value.toUpperCase() }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAddPlate(u.id)}
                        className={`${inputCls} flex-1`}
                        style={inputStyle}
                      />
                      <PrimaryBtn onClick={() => handleAddPlate(u.id)}>
                        <PlusCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Agregar</span>
                      </PrimaryBtn>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* ADD USER TAB                                                      */}
        {/* ================================================================ */}
        {activeTab === "addUser" && user?.role === "admin" && (
          <Card className="p-5 sm:p-6 max-w-xl mx-auto">
            <SectionTitle icon={UserPlus} title="Nuevo Usuario" />
            <form onSubmit={handleAddUser} className="space-y-4">
              <Field label="Nombre" required>
                <input
                  type="text" value={newUserData.name} placeholder="Nombre completo"
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className={inputCls} style={inputStyle}
                />
              </Field>
              <Field label="Correo Electrónico" required>
                <input
                  type="email" value={newUserData.email} placeholder="usuario@ejemplo.com"
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className={inputCls} style={inputStyle}
                />
              </Field>
              <Field label="Contraseña" required>
                <input
                  type="password" value={newUserData.password} placeholder="Mínimo 6 caracteres"
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className={inputCls} style={inputStyle}
                />
              </Field>
              <Field label="Rol">
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className={inputCls} style={inputStyle}
                >
                  <option value="regular">Usuario Regular</option>
                  <option value="admin">Administrador</option>
                </select>
              </Field>
              <div className="pt-2 flex gap-2">
                <GhostBtn onClick={() => setActiveTab("users")} className="flex-1">Cancelar</GhostBtn>
                <PrimaryBtn type="submit" disabled={savingUser} className="flex-1">
                  {savingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando…</> : <><UserPlus className="w-4 h-4" /> Crear Usuario</>}
                </PrimaryBtn>
              </div>
            </form>
          </Card>
        )}

        {/* ================================================================ */}
        {/* DISTRIBUTORS TAB                                                  */}
        {/* ================================================================ */}
        {activeTab === "distributors" && user?.role === "admin" && company?.plan !== "distribuidor" && (
          <div className="space-y-4 max-w-2xl mx-auto">

            {/* Search */}
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={Search} title="Buscar Distribuidor" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-9`}
                  style={inputStyle}
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E76B6] animate-spin" />
                )}
              </div>

              {/* Search results */}
              {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                <p className="text-center text-sm text-gray-400 py-6">No se encontraron distribuidores</p>
              )}
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => addToSelection(d)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all hover:bg-[#F0F7FF]"
                      style={{ border: "1px solid rgba(52,140,203,0.15)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center flex-shrink-0 p-1" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                          <img src={d.profileImage} alt={d.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#0A183A] truncate">{d.name}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#1E76B6" }}>Distribuidor</span>
                        </div>
                      </div>
                      <PlusCircle className="w-5 h-5 text-[#1E76B6] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Selected for granting */}
            {selectedDistributors.length > 0 && (
              <Card className="p-5 sm:p-6" style={{ background: "rgba(30,118,182,0.04)" } as React.CSSProperties}>
                <SectionTitle icon={Link2} title="Distribuidores Seleccionados" />
                <div className="space-y-2 mb-4">
                  {selectedDistributors.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#F0F7FF] flex items-center justify-center flex-shrink-0 p-0.5" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                          <img src={d.profileImage} alt={d.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <span className="text-sm font-bold text-[#0A183A] truncate">{d.name}</span>
                      </div>
                      <button onClick={() => removeFromSelection(d.id)} style={{ color: "#DC2626" }}>
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <PrimaryBtn onClick={handleGrantAccess} disabled={grantingAccess} className="w-full">
                  {grantingAccess
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Otorgando…</>
                    : <><CheckCircle className="w-4 h-4" /> Otorgar Acceso ({selectedDistributors.length})</>}
                </PrimaryBtn>
              </Card>
            )}

            {/* Connected distributors */}
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={Link2} title="Distribuidores Conectados" />
              {connectedDistributors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <Building2 className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No hay distribuidores conectados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {connectedDistributors.map((access) => {
                    // Backend returns access objects with nested distributor
                    const dist = (access as DistributorCompany & { distributor?: DistributorCompany }).distributor ?? access;
                    const distId = (access as DistributorCompany & { distributorId?: string }).distributorId ?? dist.id;
                    return (
                      <div key={dist.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center flex-shrink-0 p-1" style={{ border: "1px solid rgba(52,140,203,0.15)" }}>
                            <img src={dist.profileImage} alt={dist.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0A183A] truncate">{dist.name}</p>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-700">
                              <CheckCircle className="w-2.5 h-2.5" /> Conectado
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeAccess(distId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-red-50"
                          style={{ color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}
                        >
                          <Link2Off className="w-3.5 h-3.5" /> Revocar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default AjustesPage;