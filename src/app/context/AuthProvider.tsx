"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AuthContextType = {
  user: any;
  token: string | null;
  // Instead of performing the fetch, these functions now simply set the auth state.
  login: (user: any, token: string) => void;
  register: (user: any, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");
      const storedCompanyId = localStorage.getItem("companyId");

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        setUser({ ...parsedUser, companyId: storedCompanyId });
        setToken(storedToken);
      }
    }
  }, []);

  // Updated login: simply set the user and token in state and localStorage.
  async function login(email: string, password: string) {
    try {
      const res = await fetch("http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      if (!res.ok) throw new Error("Invalid credentials");
  
      const data = await res.json();
  
      // Make sure data.user has companyId.
      if (!data.user.companyId) {
        throw new Error("User has no assigned companyId");
      }
  
      setUser(data.user);
      setToken(data.access_token);
  
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("companyId", data.user.companyId);
    } catch (error) {
      console.error("Login error:", error);
    }
  }
  

  // Updated register: simply set the user and token in state and localStorage.
  function register(user: any, token: string) {
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
    window.location.href = "/login"; // Full reload ensures state is cleared
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
