"use client";

import { useState } from "react";

export default function RegisterUserPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState(""); // Company ID from registered company
  const [role, setRole] = useState("regular");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/users/register`
          : "http://ec2-54-227-84-39.compute-1.amazonaws.com:6001/api/users/register",
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
        throw new Error(data.message || "Failed to register user");
      }

      // Assuming the backend returns an object with a "user" property
      setUserId(data.user.id);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error");
      }
    }
     finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Register User</h1>

      {userId ? (
        <div className="p-4 bg-green-100 text-green-800 border border-green-400 rounded">
          ✅ User registered successfully! User ID: <strong>{userId}</strong>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 bg-white shadow-md rounded w-80">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 p-2 w-full border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 p-2 w-full border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 p-2 w-full border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Company ID</label>
            <input
              type="text"
              required
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="mt-1 p-2 w-full border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 p-2 w-full border rounded"
            >
              <option value="regular">Regular</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register User"}
          </button>

          {error && <p className="text-red-600 mt-2">{error}</p>}
        </form>
      )}
    </div>
  );
}
