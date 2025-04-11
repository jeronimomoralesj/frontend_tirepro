import { AuthProvider } from "./context/AuthProvider";
import './globals.css';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TirePro",
  description: "Gestión inteligente de llantas para tu flota.",
  icons: {
    icon: '../logo.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </AuthProvider>
  );
}