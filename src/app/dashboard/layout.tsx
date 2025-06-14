"use client";

import React from "react";
import Sidebar from "./sidebar";

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  
  return (
    <div className="flex min-h-screen">
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
          transition-all 
          duration-300 
          ease-in-out
          p-6 md:p-8
          ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}
        `}
      >
        <div className="pt-16 lg:pt-4">
          {children}
        </div>
      </main>
    </div>
  );
}