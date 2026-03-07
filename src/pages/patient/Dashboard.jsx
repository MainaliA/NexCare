import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SymptomReport from "./SymptomReport";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "zh", label: "ZH" },
  { code: "fr", label: "FR" },
];

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-semibold text-white mt-5 mb-2 first:mt-0">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300 text-sm leading-relaxed">$1</li>')
    .replace(/\n\n/g, '<div class="mt-3"></div>')
    .replace(/\n/g, "<br/>");
}

export default function PatientDashboard() {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [takenIds, setTakenIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [lang, setLang] = useState("en");
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const latest = appointments[0] || null;

  useEffect(() => {
    Promise.all([
      authFetch("/api/patient/appointments").then((r) => r.json()),
      authFetch("/api/patient/medicines/today").then((r) => r.json()),
    ])
      .then(([apptData, medData]) => {
        const appts = apptData.appointments || [];
        setAppointments(appts);
        setMedicines(medData.medicines || []);
        setTakenIds(new Set((medData.taken || []).map((t) => t.details ? JSON.parse(t.details).medicineId : null).filter(Boolean)));
        if (appts[0]?.llm_summary) setSummaryText(appts[0].llm_summary);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLangChange = async (newLang) => {
    setLang(newLang);
    if (newLang === "en" && latest?.llm_summary) { setSummaryText(latest.llm_summary); return; }
    if (!latest) return;
    setSummaryLoading(true);
    try {
      const res = await authFetch(`/api/patient/appointments/${latest.id}/summary?lang=${newLang}`);
      if (res.ok) { const data = await res.json(); setSummaryText(data.summary); }
    } catch { /* keep current */ } finally { setSummaryLoading(false); }
  };

  const markTaken = async (medId) => {
    setTakenIds((prev) => new Set([...prev, medId]));
    try { await authFetch(`/api/patient/medicines/${medId}/take`, { method: "POST" }); }
    catch { setTakenIds((prev) => { const n = new Set(prev); n.delete(medId); return n; }); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">No appointments yet</h2>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">Your care plan will appear here after your doctor adds you following your visit.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showSymptomModal && <SymptomReport appointmentId={latest.id} onClose={() => setShowSymptomModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Hello, {user?.name?.split(" ")[0]}</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date(latest.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-1">
          {LANGUAGES.map(({ code, label }) => (
            <button key={code} onClick={() => handleLangChange(code)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition ${
                lang === code ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 text-slate-400 hover:text-white"
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Your Care Summary</h3>
              {summaryLoading && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
            </div>
            {summaryLoading ? (
              <div className="space-y-2 animate-pulse">{[...Array(6)].map((_, i) => <div key={i} className={`h-3 bg-slate-800 rounded ${i % 3 === 0 ? "w-1/2" : "w-full"}`} />)}</div>
            ) : summaryText ? (
              <div className="prose-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(summaryText) }} />
            ) : (
              <p className="text-slate-500 text-sm">Summary not available yet.</p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate(`/patient/chat/${latest.id}`)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 px-4 py-3 rounded-xl text-sm font-semibold text-white transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Ask About This
            </button>
            <button onClick={() => setShowSymptomModal(true)}
              className="flex-1 border border-slate-700 hover:border-slate-500 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report Symptom
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">Today's Medicines</h3>
          {medicines.length === 0 ? (
            <p className="text-slate-500 text-sm">No medicines for today.</p>
          ) : (
            <ul className="space-y-3">
              {medicines.map((med) => {
                const taken = takenIds.has(med.id);
                return (
                  <li key={med.id} className={`rounded-lg border p-3 transition ${taken ? "bg-emerald-950/50 border-emerald-800/60" : "bg-slate-950 border-slate-700"}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => !taken && markTaken(med.id)} disabled={taken}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${taken ? "bg-emerald-500 border-emerald-500" : "border-slate-500 hover:border-indigo-400"}`}>
                        {taken && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${taken ? "text-slate-400 line-through" : "text-white"}`}>{med.name} {med.dosage}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{med.frequency}</p>
                        {med.times && (() => { try { return <p className="text-xs text-indigo-400 mt-1">{JSON.parse(med.times).join(" · ")}</p>; } catch { return null; } })()}
                      </div>
                      {taken && <span className="text-xs text-emerald-500 font-medium flex-shrink-0">Done</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
