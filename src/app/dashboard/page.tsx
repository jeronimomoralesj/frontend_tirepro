"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Retrieve the user data from localStorage
    const storedUser = localStorage.getItem("user");
    
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Check the user role: if admin, push to 'dashboard/resumen';
      // otherwise, redirect to 'dashboard/agregarConductor'
      if (user.role === "admin") {
        router.push("dashboard/resumen");
      } else {
        router.push("dashboard/agregarConductor");
      }
    } else {
      // Optionally, if no user is found redirect to login
      router.push("/login");
    }
  }, [router]);

  return null;
}
