import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function MicButton({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => onTranscript(e.results[0][0].transcript);
    rec.onend = () => setListening(false); rec.onerror = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  };
  return (
    <button type="button" onClick={toggle} title="Voice input"
      className={`p-2 rounded-lg border transition ${listening ? "bg-red-700 border-red-600 text-white animate-pulse" : "border-slate-700 text-slate-500 hover:text-white hover:border-slate-500"}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
    </button>
  );
}

export default function NewAppointment() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patientId: "", date: new Date().toISOString().slice(0, 16), diagnosisText: "", prescriptionText: "", dailyActions: "" });
  const [medicines, setMedicines] = useState([{ name: "", dosage: "", frequency: "", times: "" }]);
  const [step, setStep] = useState("form");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch("/api/doctor/patients").then((r) => r.json()).then((d) => setPatients(d.patients || [])).catch(console.error);
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const append = (field, t) => setForm((f) => ({ ...f, [field]: (f[field] ? f[field] + " " : "") + t }));
  const updateMed = (i, field, value) => setMedicines((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  const addMed = () => setMedicines((prev) => [...prev, { name: "", dosage: "", frequency: "", times: "" }]);
  const removeMed = (i) => setMedicines((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setStep("loading");
    try {
      const res = await authFetch("/api/doctor/appointments", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          medicines: medicines.filter((m) => m.name.trim()).map((m) => ({
            name: m.name, dosage: m.dosage, frequency: m.frequency,
            times: m.times ? m.times.split(",").map((t) => t.trim()) : [],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed."); setStep("form"); return; }
      setResult(data); setStep("done");
    } catch { setError("Could not connect to server."); setStep("form"); }
  };

  const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500";
  const textareaCls = inputCls + " resize-none";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/doctor/dashboard")} className="text-slate-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">New Appointment</h2>
          <p className="text-slate-400 text-sm">{step === "done" ? "Summary generated successfully" : "Fill in the patient's care details"}</p>
        </div>
      </div>

      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Generating patient summary with AI...</p>
        </div>
      )}

      {step === "form" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Patient</label>
            <select required value={form.patientId} onChange={(e) => set("patientId", e.target.value)} className={inputCls}>
              <option value="">Select a patient...</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
            <input type="datetime-local" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </div>
          {[
            { field: "diagnosisText", label: "Diagnosis", placeholder: "Describe the diagnosis and findings..." },
            { field: "prescriptionText", label: "Prescription", placeholder: "Medications and dosing instructions..." },
            { field: "dailyActions", label: "Daily Action Recommendations", placeholder: "What the patient should do each day..." },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">{label}</label>
                <MicButton onTranscript={(t) => append(field, t)} />
              </div>
              <textarea rows={3} value={form[field]} onChange={(e) => set(field, e.target.value)} placeholder={placeholder} className={textareaCls} required={field === "diagnosisText"} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Medicines</label>
            <div className="space-y-3">
              {medicines.map((med, i) => (
                <div key={i} className="bg-slate-950 border border-slate-700 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Medicine {i + 1}</span>
                    {medicines.length > 1 && <button type="button" onClick={() => removeMed(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>}
                  </div>
                  <input value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)} placeholder="Medicine name" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} placeholder="Dosage (e.g. 10mg)" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                    <input value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} placeholder="Frequency" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <input value={med.times} onChange={(e) => updateMed(i, "times", e.target.value)} placeholder="Times, comma-separated (e.g. 08:00, 20:00)" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                </div>
              ))}
              <button type="button" onClick={addMed} className="w-full border border-dashed border-slate-700 rounded-lg py-2.5 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition">+ Add Medicine</button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate("/doctor/dashboard")} className="flex-1 border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white transition">Cancel</button>
            <button type="submit" disabled={!form.patientId || !form.diagnosisText} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition">Generate Summary &amp; Save</button>
          </div>
        </form>
      )}

      {step === "done" && result && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Appointment saved &amp; patient summary generated
          </div>
          <div className="bg-indigo-950/60 border border-indigo-800 rounded-xl p-5">
            <h3 className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-3">What the Patient Will See</h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.llmSummary || "Summary pending."}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/doctor/dashboard")} className="flex-1 border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white transition">Back to Dashboard</button>
            <button onClick={() => { setStep("form"); setForm({ patientId: "", date: new Date().toISOString().slice(0, 16), diagnosisText: "", prescriptionText: "", dailyActions: "" }); setMedicines([{ name: "", dosage: "", frequency: "", times: "" }]); setResult(null); }}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition">New Appointment</button>
          </div>
        </div>
      )}
    </div>
  );
}
