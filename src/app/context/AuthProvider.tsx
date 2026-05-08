"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (user: User, token: string) => void;
  logout: () => void;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  placas?: string[];
};

const AuthContext = createContext<AuthContextType | null>(null);

// Wipe just the auth-related keys, not the whole bucket — preserves
// the marketplace cart, saved-addresses book, language preference,
// etc. so a stale-session logout doesn't punish the buyer.
function clearStoredSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("companyId");
  } catch { /* private mode — nothing to clean */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    const storedCompanyId = localStorage.getItem("companyId");

    if (!storedUser || !storedToken) return;

    let cancelled = false;
    try {
      const parsedUser: User = JSON.parse(storedUser);
      setUser({ ...parsedUser, companyId: storedCompanyId as string });
      setToken(storedToken);
    } catch {
      // Corrupted user JSON — same outcome as a stale session.
      clearStoredSession();
      return;
    }

    // Verify the stored JWT still maps to a live user. If the user
    // was deleted (or the token is otherwise invalid) the backend
    // returns 401; we clear the session and bounce to /login. Any
    // network error is swallowed so a temporary backend hiccup
    // doesn't kick everyone out — only an explicit 401 logs out.
    const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
    fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          clearStoredSession();
          setUser(null);
          setToken(null);
          // Don't bounce away from public pages (e.g. /marketplace
          // browsing while signed-out). Only force /login when the
          // current route is something that actually requires the
          // session — easiest heuristic: anything under /dashboard.
          if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
            window.location.href = "/login";
          }
          return;
        }
        if (res.ok) {
          // Refresh the cached user record so changes made elsewhere
          // (role bumps, plan upgrades, profile edits) are picked up.
          try {
            const fresh = await res.json();
            if (cancelled) return;
            const merged: User = {
              id:        fresh.id,
              name:      fresh.name,
              email:     fresh.email,
              role:      fresh.role,
              companyId: fresh.companyId ?? "",
              placas:    (fresh as { placas?: string[] }).placas,
            };
            setUser(merged);
            localStorage.setItem("user", JSON.stringify(merged));
            if (merged.companyId) localStorage.setItem("companyId", merged.companyId);
          } catch { /* ignore parse errors — keep cached user */ }
        }
      })
      .catch(() => { /* network error — keep the cached session */ });

    return () => { cancelled = true; };
  }, []);

async function login(email: string, password: string) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let errorMessage = "Invalid credentials";
      try {
        const errorData = await res.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch {
        errorMessage = res.statusText || "Invalid credentials";
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();

    // Marketplace-only users don't have a companyId — that's fine, they
    // simply don't have access to the dashboard. Login still succeeds and
    // the post-login redirect (in /login) sends them to /marketplace.
    setUser(data.user);
    setToken(data.access_token);

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.user.companyId) {
      localStorage.setItem("companyId", data.user.companyId);
    } else {
      localStorage.removeItem("companyId");
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

  
  function register(user: User, token: string) {
    setUser(user);
    setToken(token);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    if (user.companyId) {
      localStorage.setItem("companyId", user.companyId);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.clear();
    window.location.href = "/login"; // Full reload ensures state is cleared.
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
