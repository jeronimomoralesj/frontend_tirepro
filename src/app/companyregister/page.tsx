"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompanyRegisterPage() {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("Básico");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate input
      if (!name.trim()) {
        throw new Error("El nombre de la empresa es obligatorio");
      }

      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/companies/register`
          : "http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/companies/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            plan: plan === "Básico" ? "basic" : plan.toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al registrar la empresa");
      }

      // Assuming the backend returns the new company object with an "id" field.
      setCompanyId(data.id);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(companyId);
    alert("ID de empresa copiado al portapapeles");
  };

  const handleCreateUser = () => {
    // Navigate to user creation page with companyId
    router.push(`/users/create?companyId=${companyId}`);
  };

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-b from-[#0A183A] to-[#173D68] text-white">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Registrar Empresa
            </h1>
            <p className="mt-2 text-[#348CCB]">
              Crea tu cuenta empresarial para comenzar
            </p>
          </div>

          {companyId ? (
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
                    Tu empresa ha sido registrada correctamente
                  </div>
                  <div className="mt-2 rounded-md bg-[#0A183A]/50 p-4">
                    <p className="text-sm font-medium">ID de Empresa:</p>
                    <p className="mt-1 select-all break-all text-lg font-mono font-bold text-[#348CCB]">
                      {companyId}
                    </p>
                  </div>
                  <div className="mt-2 text-sm text-yellow-300">
                    <p className="font-semibold">¡IMPORTANTE!</p>
                    <p>
                      Guarda este ID de empresa. Lo necesitarás para crear el
                      primer usuario.
                    </p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleCopyId}
                      className="mt-4 inline-flex items-center rounded-md border border-[#1E76B6] bg-[#1E76B6]/20 px-4 py-2 text-sm font-medium text-white hover:bg-[#1E76B6]/30 focus:outline-none focus:ring-2 focus:ring-[#348CCB]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                      Copiar ID
                    </button>
                    <button
                      onClick={handleCreateUser}
                      className="mt-4 inline-flex items-center rounded-md bg-[#1E76B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#348CCB] focus:outline-none focus:ring-2 focus:ring-[#348CCB]"
                    >
                      Crear Primer Usuario
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-white/10 backdrop-blur-lg shadow-xl">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white">
                      Nombre de la Empresa
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full appearance-none rounded-md border-0 bg-white/5 px-3 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#1E76B6] sm:text-sm sm:leading-6"
                        placeholder="Ingresa el nombre de tu empresa"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white">
                      Plan de Suscripción
                    </label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="mt-1 block w-full appearance-none rounded-md border-0 bg-white/5 px-3 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-[#1E76B6] sm:text-sm sm:leading-6"
                    >
                      <option value="Básico">Básico</option>
                      <option value="Pro">Pro</option>
                      <option value="Empresarial">Empresarial</option>
                    </select>
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
                        "Registrar Empresa"
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
