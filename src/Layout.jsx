// src/components/Layout.jsx
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const dashboardLink = user?.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav Bar */}
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to={dashboardLink} className="text-2xl font-bold tracking-tight">
            NexCare
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {user?.name}{" "}
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-800 border border-slate-700 ml-1">
                {user?.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
