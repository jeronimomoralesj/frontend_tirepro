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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");
      const storedCompanyId = localStorage.getItem("companyId");

      if (storedUser && storedToken) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser({ ...parsedUser, companyId: storedCompanyId as string });
        setToken(storedToken);
      }
    }
  }, []);

  // Updated login: properly throw errors so they can be caught in the login page
  async function login(email: string, password: string) {
    try {
      const res = await fetch("https://api.tirepro.com.co/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
  
      if (!res.ok) {
        // Get specific error message from API if available
        let errorMessage = "Invalid credentials";
        try {
          const errorData = await res.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If parsing fails, use status text
          errorMessage = res.statusText || "Invalid credentials";
        }
        
        throw new Error(errorMessage);
      }
  
      const data = await res.json();
  
      // Make sure data.user has companyId
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
      // Re-throw the error so it can be caught by the login page
      throw error;
    }
  }
  
  // Updated register: simply set the user and token in state and localStorage.
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