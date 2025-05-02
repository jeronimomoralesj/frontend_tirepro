"use client";

import { useState, useEffect } from "react";
import { Cookie, Check, X, Info } from "lucide-react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!;

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if the user has already made a choice
    const cookieValue = getCookie("tirepro_consent");
    if (cookieValue === "true" || cookieValue === "false") {
      setIsVisible(false);
    }
  }, []);

  const handleAccept = () => {
    setCookie("tirepro_consent", "true", 365);
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    window.gtag?.("config", GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    });
    setIsVisible(false);
  };

  const handleDecline = () => {
    setCookie("tirepro_consent", "false", 365);
    window.gtag?.("consent", "update", { analytics_storage: "denied" });
    setIsVisible(false);
  };

  // Helper function to set cookie
  const setCookie = (name: string, value: string, days: number) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/; SameSite=Lax";
  };

  // Helper function to get cookie
  const getCookie = (name: string) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-2 sm:px-6 md:py-4">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg bg-[#0A183A] shadow-lg ring-1 ring-[#348CCB]/20 shadow-[#1E76B6]/10">
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#173D68]">
                  <Cookie size={20} className="text-[#348CCB]" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <Info size={16} className="text-[#1E76B6]" />
                      Política de Cookies
                    </h3>
                    <p className="mt-2 text-sm text-gray-200">
                      Usamos cookies para analizar el tráfico y mejorar la experiencia.
                      Puedes aceptar o rechazar su uso.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleDecline}
                  className="flex-1 sm:flex-initial py-2 px-4 bg-transparent border border-[#1E76B6] text-white rounded-md hover:bg-[#173D68] transition-colors duration-200 text-sm flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Rechazar
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 sm:flex-initial py-2 px-4 bg-[#1E76B6] text-white font-medium rounded-md hover:bg-[#348CCB] transition-colors duration-200 text-sm flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Aceptar cookies
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}