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
  date: string;
};

export default function Notificaciones() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Notification[]>([]);

  useEffect(() => {
    async function loadAlerts() {
      const companyId = localStorage.getItem("companyId");
      if (!companyId) return;

      try {
        // 1️⃣ fetch all tires for this company
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "https://api.tirepro.com.co"}/api/tires?companyId=${companyId}`
        );
        if (!res.ok) throw new Error("No pude obtener llantas");
        const data: Tire[] = await res.json();

        // 2️⃣ build notifications for any with last‐inspection minDepth ≤ 4
        const alerts: Notification[] = [];

        data.forEach((t) => {
          if (!t.inspecciones?.length) return;
          // pick the most recent inspection
          const latest = t.inspecciones.reduce((prev, curr) =>
            new Date(curr.fecha) > new Date(prev.fecha) ? curr : prev
          );
          const minDepth = Math.min(
            latest.profundidadInt,
            latest.profundidadCen,
            latest.profundidadExt
          );
          if (minDepth <= 4) {
            alerts.push({
              id: t.id,
              title: `Neumático ${t.placa}`,
              message: `Profundidad crítica: ${minDepth.toFixed(1)} mm`,
              date: latest.fecha,
            });
          }
        });

        setNotes(alerts);
      } catch (err) {
        console.error(err);
      }
    }

    loadAlerts();
  }, []);

  return (
    <div className="relative">
      {/* Bell button */}
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
              <h3 className="text-lg font-semibold">Notificaciones</h3>
              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-64 overflow-y-auto">
              {notes.length === 0 ? (
                <div className="p-4 text-gray-500">No hay alertas</div>
              ) : (
                <ul>
                  {notes.map((n) => (
                    <li
                      key={n.id}
                      className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <p className="font-medium text-gray-800">{n.title}</p>
                      <p className="text-sm text-gray-600">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.date).toLocaleString()}
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
