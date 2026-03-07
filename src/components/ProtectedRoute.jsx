import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role, children }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard"} />;
  }

  return children;
}
