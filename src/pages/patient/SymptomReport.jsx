import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const TRIAGE_STYLES = {
  expected: { border: "border-emerald-700", bg: "bg-emerald-950/60", icon: "✓", iconColor: "text-emerald-400", label: "Expected", labelColor: "text-emerald-400" },
  unexpected: { border: "border-yellow-700", bg: "bg-yellow-950/60", icon: "!", iconColor: "text-yellow-400", label: "Noted", labelColor: "text-yellow-400" },
  escalate: { border: "border-red-700", bg: "bg-red-950/60", icon: "⚠", iconColor: "text-red-400", label: "Doctor Alerted", labelColor: "text-red-400" },
};

export default function SymptomReport({ appointmentId, onClose }) {
  const { authFetch } = useAuth();
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("mild");
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await authFetch("/api/patient/symptoms", {
        method: "POST",
        body: JSON.stringify({ description, severity, appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to submit."); return; }
      setTriage(data.triage);
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const style = triage ? (TRIAGE_STYLES[triage.assessment] || TRIAGE_STYLES.escalate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Report a Symptom</h2>
            <p className="text-slate-400 text-xs mt-0.5">{triage ? "We've received your report" : "Describe what you're experiencing"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-6 space-y-5">
          {!triage ? (
            <>
              {error && <div className="px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">What are you experiencing?</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                  placeholder="Describe your symptom in your own words..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">How severe is it?</label>
                <div className="flex gap-2">
                  {["mild", "moderate", "severe"].map((s) => (
                    <button key={s} onClick={() => setSeverity(s)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition capitalize ${
                        severity === s
                          ? s === "mild" ? "bg-emerald-700 border-emerald-600 text-white"
                            : s === "moderate" ? "bg-yellow-700 border-yellow-600 text-white"
                            : "bg-red-700 border-red-600 text-white"
                          : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={`rounded-xl border p-5 ${style.bg} ${style.border}`}>
              <div className="flex items-start gap-3">
                <span className={`text-2xl leading-none mt-0.5 ${style.iconColor}`}>{style.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-semibold ${style.labelColor}`}>{style.label}</span>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{triage.confidence}% confidence</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{triage.patientMessage}</p>
                  {triage.assessment === "escalate" && (
                    <p className="text-red-400 text-xs mt-3 font-medium">If this is an emergency, call 911 immediately.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-slate-800 flex gap-3">
          {!triage ? (
            <>
              <button onClick={onClose} className="flex-1 border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white transition">Cancel</button>
              <button onClick={handleSubmit} disabled={loading || !description.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing...</span> : "Submit Report"}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
