import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const TABS = ["Timeline", "Daily Report", "Alerts"];

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold text-white mt-4 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300 text-sm">$1</li>')
    .replace(/\n\n/g, '<div class="mt-3"></div>').replace(/\n/g, "<br/>");
}

export default function PatientDetail() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [tab, setTab] = useState("Timeline");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [ackingId, setAckingId] = useState(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");

  useEffect(() => {
    authFetch(`/api/doctor/patients/${id}`).then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const loadReport = async () => {
    if (report) return;
    setReportLoading(true);
    try { const res = await authFetch(`/api/doctor/patients/${id}/daily-report`); setReport(await res.json()); }
    catch { /* ignore */ } finally { setReportLoading(false); }
  };

  const handleTab = (t) => { setTab(t); if (t === "Daily Report") loadReport(); };

  const acknowledge = async (alertId) => {
    setAckingId(alertId);
    try {
      await authFetch(`/api/doctor/alerts/${alertId}/acknowledge`, { method: "POST" });
      setData((prev) => ({ ...prev, alerts: prev.alerts.filter((a) => a.id !== alertId) }));
    } catch { /* ignore */ } finally { setAckingId(null); }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    try { await authFetch(`/api/doctor/patients/${id}/reschedule`, { method: "POST", body: JSON.stringify({ newDate: rescheduleDate }) }); setShowReschedule(false); }
    catch { /* ignore */ }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data?.patient) return <div className="text-center py-32 text-slate-500">Patient not found.</div>;

  const { patient, appointments = [], symptoms = [], actions = [], alerts = [] } = data;
  const latestAppt = appointments[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const medTotal = latestAppt?.medicines?.length || 0;
  const medTaken = actions.filter((a) => a.action_type === "medicine_taken" && a.timestamp >= weekAgo).length;
  const readiness = medTotal > 0 ? Math.min(100, Math.round((medTaken / (medTotal * 7)) * 100)) : 100;
  const readinessColor = readiness >= 80 ? "text-emerald-400" : readiness >= 50 ? "text-yellow-400" : "text-red-400";

  const timeline = [
    ...appointments.map((a) => ({ type: "appointment", date: a.date, label: `Appointment: ${a.diagnosis_text?.substring(0, 60)}${a.diagnosis_text?.length > 60 ? "..." : ""}` })),
    ...symptoms.map((s) => ({ type: "symptom", date: s.reported_at, label: `Symptom: ${s.description}`, badge: s.triage_result })),
    ...actions.filter((a) => a.action_type === "medicine_taken").map((a) => ({ type: "medicine", date: a.timestamp, label: (() => { try { return `Took ${JSON.parse(a.details).medicineName}`; } catch { return "Took medicine"; } })() })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const dotColor = (type) => type === "appointment" ? "bg-indigo-500" : type === "symptom" ? "bg-orange-500" : "bg-emerald-500";

  return (
    <div>
      {showReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowReschedule(false)} />
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-white">Request Reschedule</h3>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1.5">New Date</label>
              <input type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReschedule(false)} className="flex-1 border border-slate-700 py-2.5 rounded-lg text-sm text-slate-300">Cancel</button>
              <button onClick={handleReschedule} disabled={!rescheduleDate} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 py-2.5 rounded-lg text-sm font-semibold text-white">Reschedule</button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate("/doctor/dashboard")} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to dashboard
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">{patient.name}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{patient.email}</p>
          {latestAppt && <p className="text-slate-300 text-sm mt-2">{latestAppt.diagnosis_text?.substring(0, 100)}{latestAppt.diagnosis_text?.length > 100 ? "..." : ""}</p>}
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold ${readinessColor}`}>{readiness}%</p>
          <p className="text-slate-400 text-xs mt-1">weekly readiness</p>
          <button onClick={() => setShowReschedule(true)} className="mt-3 text-xs border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 px-3 py-1.5 rounded-lg transition">Request Reschedule</button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => handleTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>
            {t}{t === "Alerts" && alerts.length > 0 && <span className="ml-1.5 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{alerts.length}</span>}
          </button>
        ))}
      </div>

      {tab === "Timeline" && (
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-800" />
          {timeline.length === 0 ? <p className="text-slate-500 text-sm py-8">No activity yet.</p> : (
            <div className="space-y-4">
              {timeline.map((item, i) => (
                <div key={i} className="relative flex items-start gap-3">
                  <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 border-slate-950 mt-0.5 ${dotColor(item.type)}`} />
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                    <p className="text-sm text-slate-200">{item.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500">{new Date(item.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      {item.badge && <span className={`text-xs px-2 py-0.5 rounded-full border ${item.badge === "escalate" ? "bg-red-950 text-red-300 border-red-800" : item.badge === "unexpected" ? "bg-yellow-950 text-yellow-300 border-yellow-800" : "bg-emerald-950 text-emerald-300 border-emerald-800"}`}>{item.badge}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Daily Report" && (
        <div className="space-y-4">
          {reportLoading ? <div className="flex items-center gap-3 py-12 justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /><p className="text-slate-400 text-sm">Generating...</p></div>
          : report ? (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">AI Summary</h3>
                <div className="text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(report.report) }} />
              </div>
              {report.raw && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[["Medicines Taken", `${report.raw.medicineTaken}/${report.raw.medicineTotal}`], ["Chatbot Sessions", report.raw.chatbotSessions], ["New Symptoms", report.raw.newSymptoms], ["Weekly Adherence", `${report.raw.weeklyAdherence}%`]].map(([label, value]) => (
                    <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-white">{value}</p>
                      <p className="text-xs text-slate-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <div className="text-center py-12 text-slate-500 text-sm">Loading report...</div>}
        </div>
      )}

      {tab === "Alerts" && (
        <div className="space-y-3">
          {alerts.length === 0 ? <p className="text-center py-12 text-slate-500 text-sm">No active alerts.</p>
          : alerts.map((alert) => (
            <div key={alert.id} className={`rounded-xl border p-4 flex items-start gap-4 ${alert.type === "escalation" ? "bg-red-950/40 border-red-800/60" : "bg-yellow-950/40 border-yellow-800/60"}`}>
              <span className={`text-lg flex-shrink-0 ${alert.type === "escalation" ? "text-red-400" : "text-yellow-400"}`}>{alert.type === "escalation" ? "⚠" : "!"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 text-sm">{alert.message}</p>
                <p className="text-slate-500 text-xs mt-1">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => acknowledge(alert.id)} disabled={ackingId === alert.id} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition flex-shrink-0 disabled:opacity-50">
                {ackingId === alert.id ? "..." : "Acknowledge"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
