"use client";

import { useState } from "react";
import Link         from "next/link";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  { label: "Patient (Maria — diabetes, has summary)",  email: "maria@demo.com", password: "patient123", role: "patient" },
  { label: "Patient (James — new, no appointments)",   email: "james@demo.com", password: "patient123", role: "patient" },
  { label: "Patient (Lisa — AFib, has alert)",         email: "lisa@demo.com",  password: "patient123", role: "patient" },
  { label: "Doctor (Dr. Sarah Chen)",                  email: "doctor@demo.com", password: "doctor123",  role: "doctor" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      router.push(data.user.role === "doctor" ? "/doctor/dashboard" : "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(acc: typeof DEMO_ACCOUNTS[0]) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl mx-auto mb-4">N</div>
          <h1 className="text-2xl font-bold text-white">Welcome to NexCare</h1>
          <p className="text-slate-400 mt-1 text-sm">Your health, clearly explained</p>
        </div>

        {/* Demo accounts */}
        <div className="card">
          <p className="text-xs text-slate-400 font-medium mb-3">⚡ Quick demo — click to fill:</p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => fillDemo(acc)}
                className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs text-slate-300"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input" placeholder="you@example.com" required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input" placeholder="••••••••" required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
