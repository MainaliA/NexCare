import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function DoctorDashboard() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [ackingId, setAckingId] = useState(null);

  useEffect(() => {
    Promise.all([
      authFetch("/api/doctor/patients").then((r) => r.json()),
      authFetch("/api/doctor/alerts").then((r) => r.json()),
    ])
      .then(([p, a]) => { setPatients(p.patients || []); setAlerts(a.alerts || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const acknowledge = async (id) => {
    setAckingId(id);
    try {
      await authFetch(`/api/doctor/alerts/${id}/acknowledge`, { method: "POST" });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ } finally { setAckingId(null); }
  };

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const statusColor = (s) => s === "red" ? "bg-red-400" : s === "yellow" ? "bg-yellow-400" : "bg-emerald-400";
  const readinessColor = (n) => n >= 80 ? "text-emerald-400" : n >= 50 ? "text-yellow-400" : "text-red-400";
  const barColor = (n) => n >= 80 ? "bg-emerald-400" : n >= 50 ? "bg-yellow-400" : "bg-red-400";

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
        </div>
        <button onClick={() => navigate("/doctor/appointments/new")}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Appointment
        </button>
      </div>

      {alerts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />Active Alerts ({alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className={`rounded-xl border p-4 flex items-start gap-4 ${alert.type === "escalation" ? "bg-red-950/40 border-red-800/60" : "bg-yellow-950/40 border-yellow-800/60"}`}>
                <span className={`text-lg flex-shrink-0 ${alert.type === "escalation" ? "text-red-400" : "text-yellow-400"}`}>{alert.type === "escalation" ? "⚠" : "!"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{alert.patient_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${alert.type === "escalation" ? "text-red-300 border-red-700 bg-red-950" : "text-yellow-300 border-yellow-700 bg-yellow-950"}`}>{alert.type.replace("_", " ")}</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{alert.message}</p>
                  <p className="text-slate-500 text-xs mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => navigate(`/doctor/patients/${alert.patient_id}`)} className="text-xs border border-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition">View</button>
                  <button onClick={() => acknowledge(alert.id)} disabled={ackingId === alert.id} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                    {ackingId === alert.id ? "..." : "Acknowledge"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-3">Your Patients ({filtered.length})</h2>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">{search ? "No patients match your search." : "No patients yet."}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => navigate(`/doctor/patients/${p.id}`)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="font-semibold text-white truncate">{p.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{p.latestAppointment?.diagnosis_text?.substring(0, 50) || "No diagnosis on file"}{p.latestAppointment?.diagnosis_text?.length > 50 ? "..." : ""}</p>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${statusColor(p.status)}`} />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Readiness</span>
                  <span className={`text-sm font-bold ${readinessColor(p.readinessScore ?? 0)}`}>{p.readinessScore ?? 0}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(p.readinessScore ?? 0)}`} style={{ width: `${p.readinessScore ?? 0}%` }} />
                </div>
                {p.alert_count > 0 && (
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${p.escalation_count > 0 ? "bg-red-950 text-red-300 border border-red-800" : "bg-yellow-950 text-yellow-300 border border-yellow-800"}`}>
                    {p.alert_count} alert{p.alert_count > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
