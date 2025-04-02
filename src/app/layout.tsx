"use client";

import { AuthProvider } from "./context/AuthProvider";
import './globals.css'; 

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </AuthProvider>
  );
}
