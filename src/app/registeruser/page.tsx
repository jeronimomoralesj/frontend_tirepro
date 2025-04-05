"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterUserPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("admin"); // Default to admin for first user
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();

  // Get company ID from URL params
  useEffect(() => {
    const companyIdParam = searchParams.get("companyId");
    if (companyIdParam) {
      setCompanyId(companyIdParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate input
      if (!name.trim()) {
        throw new Error("El nombre del usuario es obligatorio");
      }
      if (!email.trim()) {
        throw new Error("El correo electrónico es obligatorio");
      }
      if (!password.trim() || password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }
      if (!companyId.trim()) {
        throw new Error("El ID de la empresa es obligatorio");
      }

      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/register`
          : "https://api.tirepro.com.co/api/users/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password, companyId, role }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al registrar el usuario");
      }

      // Assuming the backend returns an object with a "user" property
      setUserId(data.user.id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-b from-[#0A183A] to-[#173D68] text-white">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Registrar Usuario
            </h1>
            <p className="mt-2 text-[#348CCB]">
              Crea tu cuenta para acceder al sistema
            </p>
          </div>

          {userId ? (
            <div className="overflow-hidden rounded-lg bg-white/10 backdrop-blur-lg">
              <div className="p-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E76B6]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold">¡Registro Exitoso!</h2>
                  <div className="text-sm text-gray-200">
                    Tu usuario ha sido registrado correctamente
                  </div>
                  <div className="mt-2 rounded-md bg-[#0A183A]/50 p-4">
                    <p className="text-sm font-medium">ID de Usuario:</p>
                    <p className="mt-1 select-all break-all text-lg font-mono font-bold text-[#348CCB]">
                      {userId}
                    </p>
                  </div>
                  <button
                    onClick={handleGoToDashboard}
                    className="mt-4 inline-flex items-center rounded-md bg-[#1E76B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#348CCB] focus:outline-none focus:ring-2 focus:ring-[#348CCB]"
                  >
                    Ir al Panel de Control
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-white/10 backdrop-blur-lg shadow-xl">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white">
                      Nombre Completo
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full appearance-none rounded-md border-0 bg-white/5 px-3 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#1E76B6] sm:text-sm sm:leading-6"
                        placeholder="Ingresa tu nombre completo"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white">
                      Correo Electrónico
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full appearance-none rounded-md border-0 bg-white/5 px-3 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#1E76B6] sm:text-sm sm:leading-6"
                        placeholder="ejemplo@correo.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white">
                      Contraseña
                    </label>
                    <div className="mt-1">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full appearance-none rounded-md border-0 bg-white/5 px-3 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#1E76B6] sm:text-sm sm:leading-6"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white">
                      ID de Empresa
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        required
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="block w-full appearance-none rounded-md border-0 bg-white/5 px-3 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#1E76B6] sm:text-sm sm:leading-6"
                        placeholder="Ingresa el ID de la empresa"
                        readOnly={searchParams.has("companyId")}
                      />
                    </div>
                    {searchParams.has("companyId") && (
                      <p className="mt-1 text-xs text-[#348CCB]">
                        ID de empresa detectado automáticamente
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white">
                      Rol de Usuario
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="mt-1 block w-full appearance-none rounded-md border-0 bg-white/5 px-3 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-[#1E76B6] sm:text-sm sm:leading-6"
                    >
                      <option value="admin">Administrador</option>
                      <option value="regular">Usuario Regular</option>
                    </select>
                    {searchParams.has("companyId") && (
                      <p className="mt-1 text-xs text-[#348CCB]">
                        Primer usuario registrado como administrador por defecto
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full justify-center rounded-md bg-[#1E76B6] px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#348CCB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#348CCB] disabled:opacity-70 transition-all duration-200"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Registrando...
                        </div>
                      ) : (
                        "Registrar Usuario"
                      )}
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="mt-4 text-center text-xs text-gray-400">
                    Al registrarte, aceptas nuestros{" "}
                    <a href="#" className="text-[#348CCB] hover:underline">
                      Términos de Servicio
                    </a>{" "}
                    y{" "}
                    <a href="#" className="text-[#348CCB] hover:underline">
                      Política de Privacidad
                    </a>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}