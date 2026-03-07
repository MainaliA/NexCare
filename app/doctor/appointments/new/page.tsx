// app/doctor/appointments/new/page.tsx — MISSING: Person C's new appointment form
"use client";

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";

interface PatientOption { id: string; name: string; email: string; }
interface MedicineRow   { name: string; dosage: string; frequency: string; times: string; }

export default function NewAppointmentPage() {
  const router = useRouter();
  const [patients, setPatients]       = useState<PatientOption[]>([]);
  const [patientId, setPatientId]     = useState("");
  const [date, setDate]               = useState("");
  const [diagnosis, setDiagnosis]     = useState("");
  const [prescription, setPrescription] = useState("");
  const [dailyActions, setDailyActions] = useState("");
  const [medicines, setMedicines]     = useState<MedicineRow[]>([
    { name: "", dosage: "", frequency: "once daily", times: "08:00" },
  ]);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<{ llmSummary: string } | null>(null);
  const [error, setError]             = useState("");

  useEffect(() => {
    fetch("/api/doctor/patients", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function addMedicine() {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "once daily", times: "08:00" }]);
  }

  function updateMedicine(idx: number, field: keyof MedicineRow, value: string) {
    setMedicines(medicines.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function removeMedicine(idx: number) {
    if (medicines.length > 1) setMedicines(medicines.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!patientId || !date || !diagnosis) { setError("Patient, date, and diagnosis are required."); return; }
    setLoading(true); setError("");

    try {
      const res = await fetch("/api/doctor/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId, date,
          diagnosisText: diagnosis,
          prescriptionText: prescription,
          dailyActions,
          medicines: medicines.filter((m) => m.name.trim()).map((m) => ({
            ...m,
            times: m.times.split(",").map((t) => t.trim()),
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-900/50 flex items-center justify-center mx-auto text-3xl">✓</div>
          <h1 className="text-2xl font-bold text-white">Appointment Created</h1>
          <p className="text-slate-400">AI summary has been generated for the patient.</p>
          {result.llmSummary && (
            <div className="card text-left">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Generated Summary Preview:</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{result.llmSummary.substring(0, 500)}…</p>
            </div>
          )}
          <button onClick={() => router.push("/doctor/dashboard")} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white">← Back</button>
          <h1 className="font-semibold text-white">New Appointment</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Patient + Date */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="input">
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>

        {/* Diagnosis */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Diagnosis</label>
          <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
            rows={3} className="input resize-none" placeholder="e.g., Type 2 Diabetes Mellitus — HbA1c 8.2%..." />
        </div>

        {/* Prescription */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Prescription</label>
          <textarea value={prescription} onChange={(e) => setPrescription(e.target.value)}
            rows={3} className="input resize-none" placeholder="e.g., Metformin 500mg twice daily with meals..." />
        </div>

        {/* Daily Actions */}
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Daily Action Recommendations</label>
          <textarea value={dailyActions} onChange={(e) => setDailyActions(e.target.value)}
            rows={3} className="input resize-none" placeholder="e.g., Check blood glucose every morning..." />
        </div>

        {/* Medicines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-300">Medicines</label>
            <button onClick={addMedicine} className="btn-ghost text-xs">+ Add Medicine</button>
          </div>
          <div className="space-y-3">
            {medicines.map((med, idx) => (
              <div key={idx} className="card grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Name</label>
                  <input value={med.name} onChange={(e) => updateMedicine(idx, "name", e.target.value)}
                    className="input text-sm" placeholder="Metformin" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Dosage</label>
                  <input value={med.dosage} onChange={(e) => updateMedicine(idx, "dosage", e.target.value)}
                    className="input text-sm" placeholder="500mg" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Times</label>
                  <input value={med.times} onChange={(e) => updateMedicine(idx, "times", e.target.value)}
                    className="input text-sm" placeholder="08:00,20:00" />
                </div>
                <button onClick={() => removeMedicine(idx)} className="text-red-400 text-xs pb-2">Remove</button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
          {loading ? "Creating appointment & generating AI summary…" : "Create Appointment"}
        </button>
      </main>
    </div>
  );
}
