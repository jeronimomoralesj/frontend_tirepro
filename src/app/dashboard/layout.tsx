"use client";

import React from "react";
import Sidebar from "./sidebar";
import RouteGuard from "./RouteGuard";

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // Apply Saturn V class on mount if active
  React.useEffect(() => {
    try {
      if (localStorage.getItem("saturnVActive") === "1") {
        document.documentElement.classList.add("saturn-v");
      }
    } catch { /* */ }
  }, []);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content */}
      <main
        className={`
          flex-1
          min-w-0
          overflow-x-hidden
          transition-all
          duration-300
          ease-in-out
          ${collapsed ? "lg:ml-20" : "lg:ml-64"}
        `}
        style={{ maxWidth: "100%", boxSizing: "border-box" }}
      >
        <div className="pt-16 lg:pt-4 px-4 md:px-6">
          <RouteGuard>{children}</RouteGuard>
        </div>
      </main>
    </div>
  );
}