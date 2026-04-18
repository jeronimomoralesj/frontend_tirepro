"use client";

import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type Inspection = {
  profundidadInt: number;
  profundidadCen: number;
  profundidadExt: number;
  fecha: string;
};

export type Tire = {
  id: string;
  placa: string;
  inspecciones: Inspection[];
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  tire?: {
    placa?: string;
  };
  vehicle?: {
    placa?: string;
  };
};

const translations = {
  es: {
    title: "Notificaciones",
    noAlerts: "No hay alertas",
    tire: "Llanta",
    vehicle: "Vehículo",
  },
  en: {
    title: "Notifications",
    noAlerts: "No alerts",
    tire: "Tire",
    vehicle: "Vehicle",
  },
};

export default function Notificaciones() {
  const [open,     setOpen]     = useState(false);
  const [notes,    setNotes]    = useState<Notification[]>([]);
  const [language, setLanguage] = useState<"es">("es");

  // Language detection
  useEffect(() => {
    setLanguage("es");
  }, []);

  const t = translations[language];

  useEffect(() => {
    async function loadAlerts() {
      const companyId = localStorage.getItem("companyId");
      if (!companyId) return;

      // AuthProvider stores the JWT at localStorage key "token"
      const token = localStorage.getItem("token") ?? "";

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notifications?companyId=${companyId}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        if (!res.ok) throw new Error("No pude obtener notificaciones");
        const data: Notification[] = await res.json();
        setNotes(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadAlerts();
  }, []);

  return (
    <div className="relative">
      {/* Bell */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full hover:bg-white/10 transition"
      >
        <Bell className="h-5 w-5 text-white" />
        {notes.length > 0 && (
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {/* Pop-over */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-30"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h3 className="text-lg font-semibold">{t.title}</h3>
              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-64 overflow-y-auto">
              {notes.length === 0 ? (
                <div className="p-4 text-gray-500">{t.noAlerts}</div>
              ) : (
                <ul>
                  {notes.map((n) => (
                    <li
                      key={n.id}
                      className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <p className="font-medium text-gray-800">{n.title}</p>
                      <p className="text-sm text-gray-600">{n.message}</p>

                      {n.tire?.placa && (
                        <p className="text-xs text-gray-500">
                          {t.tire}: {n.tire.placa}
                        </p>
                      )}
                      {n.vehicle?.placa && (
                        <p className="text-xs text-gray-500">
                          {t.vehicle}: {n.vehicle.placa}
                        </p>
                      )}

                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.timestamp).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}