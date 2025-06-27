"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Edit, Trash2, HelpCircle, TrendingUp } from "lucide-react";

// Language translations
const translations = {
  es: {
    title: "Gestión de Ingresos",
    tooltip: "Administra y haz seguimiento de todos tus ingresos. Puedes agregar, editar y eliminar registros de ingresos.",
    totalIncome: "Total de ingresos:",
    addIncome: "Agregar Ingreso",
    noIncomesTitle: "No hay ingresos registrados",
    noIncomesDesc: "Comienza agregando tu primer ingreso para empezar a hacer seguimiento de tus finanzas.",
    addFirstIncome: "Agregar Primer Ingreso",
    editIncome: "Editar Ingreso",
    newIncome: "Nuevo Ingreso",
    titleField: "Título",
    dateField: "Fecha",
    amountField: "Monto",
    noteField: "Nota",
    titlePlaceholder: "Nombre del ingreso",
    amountPlaceholder: "0.00",
    notePlaceholder: "Información adicional (opcional)",
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando...",
    deleteConfirm: "¿Eliminar este ingreso?",
    connectionError: "Error de conexión",
    retry: "Reintentar",
    errorSaving: "Error guardando ingreso",
    errorDeleting: "Error eliminando ingreso"
  },
  en: {
    title: "Income Management",
    tooltip: "Manage and track all your income. You can add, edit and delete income records.",
    totalIncome: "Total income:",
    addIncome: "Add Income",
    noIncomesTitle: "No income records",
    noIncomesDesc: "Start by adding your first income to begin tracking your finances.",
    addFirstIncome: "Add First Income",
    editIncome: "Edit Income",
    newIncome: "New Income",
    titleField: "Title",
    dateField: "Date",
    amountField: "Amount",
    noteField: "Note",
    titlePlaceholder: "Income name",
    amountPlaceholder: "0.00",
    notePlaceholder: "Additional information (optional)",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    deleteConfirm: "Delete this income?",
    connectionError: "Connection error",
    retry: "Retry",
    errorSaving: "Error saving income",
    errorDeleting: "Error deleting income"
  }
};

type Income = {
  id: string;
  title: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export default function IncomeCard() {
  const [language, setLanguage] = useState<'en'|'es'>('es');
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [form, setForm] = useState({ title: "", date: "", amount: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6001").replace(/\/$/, "");

  // Language detection (similar to the chart component)
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      // Check for saved language preference
      const saved = localStorage.getItem('preferredLanguage') as 'en'|'es';
      if (saved) {
        setLanguage(saved);
        return;
      }
      
      try {
        // Try geolocation-based detection
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject('no geo');
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
        );
        
        if (resp.ok) {
          const { countryCode } = await resp.json();
          const lang = (countryCode === 'US' || countryCode === 'CA') ? 'en' : 'es';
          setLanguage(lang);
          localStorage.setItem('preferredLanguage', lang);
          return;
        }
      } catch {
        // fallback to browser language
      }
      
      // Browser fallback
      const browser =
  navigator.language ||
  (Array.isArray((navigator as Navigator & { languages?: string[] }).languages)
    ? (navigator as Navigator & { languages: string[] }).languages[0]
    : null) ||
  'es';

      const lang = browser.toLowerCase().startsWith('en') ? 'en' : 'es';
      setLanguage(lang);
      localStorage.setItem('preferredLanguage', lang);
    };

    detectAndSetLanguage();
  }, []);

  const t = translations[language];

  // Pull token from whichever key you're storing it under
  const getToken = () =>
    localStorage.getItem("token") || localStorage.getItem("access_token") || "";

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // If we see 401, kick back to login
  const handleUnauthorized = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const fetchIncomes = async () => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/incomes`, {
        headers: authHeaders(),
      });
      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setIncomes(await res.json());
    } catch (err: unknown) {
      console.error("Error fetching incomes:", err);
      setError(err.message || "Error cargando ingresos");
    }
  };

  const fetchTotal = async () => {
    try {
      const res = await fetch(`${API}/api/incomes/stats`, {
        headers: authHeaders(),
      });
      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const stats = await res.json();
      setTotalIncome(stats._sum.amount || 0);
    } catch (err) {
      console.error("Error fetching total:", err);
    }
  };

  useEffect(() => {
    fetchIncomes();
    fetchTotal();
  }, []);

  const openModal = (inc?: Income) => {
    if (inc) {
      setEditingIncome(inc);
      setForm({
        title: inc.title,
        date: inc.date.split("T")[0],
        amount: inc.amount.toString(),
        note: inc.note || "",
      });
    } else {
      setEditingIncome(null);
      setForm({ title: "", date: "", amount: "", note: "" });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIncome(null);
    setForm({ title: "", date: "", amount: "", note: "" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.amount) return;
    setLoading(true);
    try {
      const url = editingIncome
        ? `${API}/api/incomes/${editingIncome.id}`
        : `${API}/api/incomes`;
      const method = editingIncome ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          title: form.title,
          date: form.date, 
          amount: parseFloat(form.amount),
          note: form.note,
        }),
      });
      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await fetchIncomes();
      await fetchTotal();
      closeModal();
    } catch (err) {
      console.error("Error saving income:", err);
      alert(t.errorSaving);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      const res = await fetch(`${API}/api/incomes/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await fetchIncomes();
      await fetchTotal();
    } catch (err) {
      console.error("Error eliminando ingreso:", err);
      alert(t.errorDeleting);
    }
  };

  const fmtCur = (n: number) =>
    language === 'en' 
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
      : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n);
  
  const fmtDate = (s: string) => 
    language === 'en'
      ? new Date(s).toLocaleDateString("en-US")
      : new Date(s).toLocaleDateString("es-CO");

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">{t.connectionError}</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
          <button 
            onClick={fetchIncomes} 
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {t.title}
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{t.totalIncome}</span>
                <span className="text-lg font-semibold text-green-600">
                  {fmtCur(totalIncome)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="group relative">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-8 w-64 p-3 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t.tooltip}
                </p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t.addIncome}
            </button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {incomes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">{t.noIncomesTitle}</h4>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto leading-relaxed text-sm">
              {t.noIncomesDesc}
            </p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.addFirstIncome}
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {incomes.map((inc, index) => (
              <div
                key={inc.id}
                className="group bg-gray-50 border border-gray-100 rounded-xl p-4 hover:bg-gray-100 hover:border-gray-200 transition-all duration-200"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                      {inc.title}
                    </h4>
                    <time className="text-xs text-gray-500 mb-2 block">
                      {fmtDate(inc.date)}
                    </time>
                    {inc.note && (
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                        {inc.note}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                      {fmtCur(inc.amount)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={() => openModal(inc)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors duration-150"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDelete(inc.id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors duration-150"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{
              animation: 'modalSlideIn 0.3s ease-out forwards'
            }}
          >
            {/* Modal Header */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {editingIncome ? t.editIncome : t.newIncome}
                </h2>
                <button 
                  onClick={closeModal}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-150"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t.titleField}
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 outline-none"
                    placeholder={t.titlePlaceholder}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t.dateField}
                  </label>
                  <input
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t.amountField}
                  </label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 outline-none"
                    placeholder={t.amountPlaceholder}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t.noteField}
                  </label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 outline-none resize-none"
                    placeholder={t.notePlaceholder}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={closeModal}
                  className="flex-1 h-12 px-6 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-150 disabled:opacity-50"
                  disabled={loading}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 shadow-sm"
                  disabled={loading}
                >
                  {loading ? t.saving : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}