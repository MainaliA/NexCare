import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid email or password."); return; }
      login(data.token, data.user);
      navigate(data.user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    } catch {
      setError("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed."); return; }
      login(data.token, data.user);
      navigate(data.user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard");
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">NexCare</h1>
          <p className="text-slate-400 text-sm mt-2">AI-powered care coordination</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password" required value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-white text-slate-900 font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50 transition mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            No account?{" "}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 transition">Sign up</Link>
          </p>
        </div>

        <div className="mt-6">
          <p className="text-center text-xs text-slate-600 mb-3 uppercase tracking-widest">Demo accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Dr. Sarah Chen", email: "doctor@demo.com" },
              { label: "Maria Garcia", email: "maria@demo.com" },
              { label: "James Park", email: "james@demo.com" },
              { label: "Lisa Wong", email: "lisa@demo.com" },
            ].map(({ label, email }) => (
              <button
                key={email} onClick={() => quickLogin(email)}
                className="text-xs py-2 px-3 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition text-left"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
