import { useState } from "react";

// ─── Shared Mock Data ─────────────────────────────────────────────────────────

const initialTasks = [
  { id: 1, label: "Take Lisinopril 10mg", done: false },
  { id: 2, label: "Monitor blood pressure", done: false },
  { id: 3, label: "Schedule follow-up with primary care physician", done: false },
];

const mockPatients = [
  {
    id: 1,
    name: "Sarah Chen",
    age: 67,
    condition: "Hypertension",
    adherence: 67,
    status: "yellow",
    discharge: "March 5, 2026",
    lastUpdated: "2 minutes ago",
    riskScore: "MEDIUM",
    riskReason: "1 missed medication + elevated BP readings",
    nudgeMessage: "Hi Sarah — we noticed you haven't logged your blood pressure today. Please remember to take Lisinopril and record your reading.",
  },
  {
    id: 2,
    name: "James Park",
    age: 45,
    condition: "Type 2 Diabetes",
    adherence: 90,
    status: "green",
    discharge: "February 28, 2026",
    lastUpdated: "12 minutes ago",
    riskScore: "LOW",
    riskReason: "Strong medication adherence, no new symptoms",
    nudgeMessage: "Hi James — great work staying on track! Just a reminder to log your glucose reading for today.",
  },
  {
    id: 3,
    name: "Lisa Wong",
    age: 58,
    condition: "Heart Condition",
    adherence: 33,
    status: "red",
    discharge: "March 3, 2026",
    lastUpdated: "1 hour ago",
    riskScore: "HIGH",
    riskReason: "2 missed medications + new symptoms reported",
    nudgeMessage: "Hi Lisa — we noticed you've missed some medications and reported new symptoms. Please contact your doctor or call emergency services if you feel unwell.",
  },
  {
    id: 4,
    name: "Marco Rivera",
    age: 52,
    condition: "Asthma",
    adherence: 85,
    status: "green",
    discharge: "March 1, 2026",
    lastUpdated: "5 minutes ago",
    riskScore: "LOW",
    riskReason: "Consistent inhaler usage, no symptom reports",
    nudgeMessage: "Hi Marco — just a reminder to log your inhaler usage for today and avoid known triggers.",
  },
];

const initialAlerts = [
  {
    id: 1,
    patientName: "Lisa Wong",
    type: "escalation",
    message: "Patient reported chest tightness and shortness of breath. Triage flagged as urgent.",
    timestamp: "Today, 9:42 AM",
    status: "unread",
  },
  {
    id: 2,
    patientName: "Sarah Chen",
    type: "missed_medicine",
    message: "Patient has not logged blood pressure medication for 2 consecutive days.",
    timestamp: "Today, 8:15 AM",
    status: "unread",
  },
  {
    id: 3,
    patientName: "James Park",
    type: "new_symptom",
    message: "Patient reported unusual fatigue and mild dizziness after taking Metformin.",
    timestamp: "Yesterday, 6:30 PM",
    status: "unread",
  },
];

// ─── Reusable Checkmark ───────────────────────────────────────────────────────

function Checkmark({ size = 3 }) {
  return (
    <svg className={`w-${size} h-${size} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Reschedule Modal ─────────────────────────────────────────────────────────

function RescheduleModal({ patientName, onClose, onConfirm }) {
  const [date, setDate] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-white mb-1">Schedule Visit</h3>
        <p className="text-slate-400 text-sm mb-5">Select a new date for {patientName}</p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white mb-5 focus:outline-none focus:border-indigo-500 transition"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(date); onClose(); }}
            disabled={!date}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition"
          >
            Confirm Date
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Appointment Panel ────────────────────────────────────────────────────

function AddAppointmentPanel({ onClose, onSubmit }) {
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    patientName: "",
    date: "",
    diagnosis: "",
    medicines: [{ name: "", dosage: "", frequency: "" }],
  });
  const [doctorSummary, setDoctorSummary] = useState("");
  const [patientSummary, setPatientSummary] = useState("");

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateMedicine = (i, field, value) => {
    const updated = [...form.medicines];
    updated[i] = { ...updated[i], [field]: value };
    setForm((f) => ({ ...f, medicines: updated }));
  };

  const addMedicine = () =>
    setForm((f) => ({
      ...f,
      medicines: [...f.medicines, { name: "", dosage: "", frequency: "" }],
    }));

  const removeMedicine = (i) =>
    setForm((f) => ({ ...f, medicines: f.medicines.filter((_, idx) => idx !== i) }));

  const handleSubmit = () => {
    setStep("loading");
    const validMeds = form.medicines.filter(
      (m) => m.name.trim() && m.dosage.trim() && m.frequency.trim()
    );
    const medList = validMeds.length > 0
      ? validMeds.map((m) => `${m.name} ${m.dosage} (${m.frequency})`).join(", ")
      : "no medicines prescribed";

    setTimeout(() => {
      setDoctorSummary(
        `Appointment confirmed for ${form.patientName}${form.date ? " on " + form.date : ""}. ` +
        `Diagnosis: ${form.diagnosis}. Prescribed: ${medList}. ` +
        `Patient summary generated and sent to their dashboard.`
      );
      setPatientSummary(
        `You were seen by your doctor and diagnosed with ${form.diagnosis}. ` +
        `In plain terms, this means your doctor has identified a condition that needs care and monitoring. ` +
        (validMeds.length > 0 ? `You have been prescribed: ${medList}. ` : "") +
        `Please take your medications as directed and follow your daily care checklist. ` +
        `If you experience any unusual symptoms, contact your doctor directly.`
      );
      setStep("summary");
    }, 1800);
  };

  const handleConfirm = () => {
    onSubmit({ ...form, patientSummary });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">New Appointment</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {step === "summary" ? "Review before sending to patient" : "Fill in the patient's care details"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-5">
          {step === "form" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5 block">Patient</label>
                  <select
                    value={form.patientName}
                    onChange={(e) => set("patientName", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="">Select patient...</option>
                    {mockPatients.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5 block">Diagnosis</label>
                <textarea
                  value={form.diagnosis}
                  onChange={(e) => set("diagnosis", e.target.value)}
                  rows={3}
                  placeholder="e.g. Hypertension — elevated blood pressure readings over 140/90..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5 block">Medicines</label>
                <div className="space-y-3">
                  {form.medicines.map((med, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Medicine {i + 1}</span>
                        {form.medicines.length > 1 && (
                          <button onClick={() => removeMedicine(i)} className="text-xs text-red-400 hover:text-red-300 transition">Remove</button>
                        )}
                      </div>
                      <input
                        value={med.name}
                        onChange={(e) => updateMedicine(i, "name", e.target.value)}
                        placeholder="Medicine name"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={med.dosage}
                          onChange={(e) => updateMedicine(i, "dosage", e.target.value)}
                          placeholder="Dosage (e.g. 10mg)"
                          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                        />
                        <input
                          value={med.frequency}
                          onChange={(e) => updateMedicine(i, "frequency", e.target.value)}
                          placeholder="Frequency (e.g. once daily)"
                          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addMedicine}
                    className="w-full border border-dashed border-slate-700 rounded-lg py-2 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition"
                  >
                    + Add Medicine
                  </button>
                </div>
              </div>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Generating patient summary...</p>
            </div>
          )}

          {step === "summary" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Ready to send to {form.patientName}
              </div>
              <div className="bg-slate-950 border border-slate-700 rounded-xl p-5">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">Your Confirmation</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{doctorSummary}</p>
              </div>
              <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-5">
                <h3 className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-3">
                  What {form.patientName} Will See
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">{patientSummary}</p>
              </div>
              <p className="text-xs text-slate-500">
                This will appear on {form.patientName}'s dashboard immediately after you confirm.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-slate-800 flex gap-3">
          {step === "form" && (
            <>
              <button onClick={onClose} className="flex-1 border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white transition">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.patientName || !form.diagnosis}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition"
              >
                Generate Summary →
              </button>
            </>
          )}
          {step === "summary" && (
            <>
              <button onClick={() => setStep("form")} className="flex-1 border border-slate-700 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white transition">
                ← Edit
              </button>
              <button onClick={handleConfirm} className="flex-1 bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition">
                Send to Patient ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Patient Screen ───────────────────────────────────────────────────────────

function PatientScreen({ tasks, onToggle, onBack, patientSummary }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const demoText =
    "Patient discharged after evaluation for hypertension. Started on Lisinopril 10 mg once daily. Follow up with primary care physician in 2 weeks. Monitor blood pressure daily. Seek medical attention for chest pain or severe headache.";

  const demoResult = {
    summary: "The patient was treated for high blood pressure and was prescribed Lisinopril to help lower it.",
    medications: ["Lisinopril 10 mg once daily"],
    steps: [
      "Follow up with primary care physician in 2 weeks",
      "Monitor blood pressure daily",
      "Seek medical attention for chest pain or severe headache",
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1">
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold">NexCare</h1>
            <p className="text-slate-400 text-sm">AI assistant that simplifies medical information for patients and caregivers</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-slate-900 p-6 border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Medical Document</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-64 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm placeholder-slate-600"
            placeholder="Paste medical notes, discharge summary, or lab results here..."
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                setLoading(true);
                setTimeout(() => { setResult(demoResult); setLoading(false); }, 1200);
              }}
              className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition"
            >
              Simplify
            </button>
            <button
              onClick={() => setText(demoText)}
              className="border border-slate-700 px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition"
            >
              Load Example
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {patientSummary && (
            <div className="rounded-xl p-5 bg-gradient-to-br from-indigo-900/80 to-slate-900 border border-indigo-600/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <h3 className="font-semibold text-indigo-300 text-sm uppercase tracking-widest">
                  New Care Plan From Your Doctor
                </h3>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{patientSummary}</p>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-lg mb-2">Plain Language Summary</h3>
            {loading ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <p className="text-slate-400 text-sm">Analyzing medical document...</p>
              </div>
            ) : (
              <p className="text-slate-300 text-sm">
                {result ? result.summary : "AI explanation will appear here."}
              </p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-lg mb-2">Medications</h3>
            {result ? (
              <ul className="space-y-1">
                {result.medications.map((m, i) => (
                  <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">Extracted medications will appear here.</p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="font-semibold text-lg mb-3">Today's Care Checklist</h3>
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  onClick={() => onToggle(task.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition border ${
                    task.done
                      ? "bg-emerald-950/60 border-emerald-800/60 hover:bg-emerald-950"
                      : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    task.done ? "bg-emerald-500 border-emerald-500" : "border-slate-500"
                  }`}>
                    {task.done && <Checkmark size={3} />}
                  </div>
                  <span className={`text-sm transition ${task.done ? "line-through text-slate-500" : "text-slate-200"}`}>
                    {task.label}
                  </span>
                  {task.done && <span className="ml-auto text-xs text-emerald-500 font-medium">Done</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Doctor Screen ────────────────────────────────────────────────────────────

function DoctorScreen({ tasks, onBack, onPatientSummary }) {
  const [showPanel, setShowPanel] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("patients");
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(mockPatients[0]);
  const [nudgeSent, setNudgeSent] = useState(false);

  // Reset nudge when patient changes
  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setNudgeSent(false);
  };

  const completed = tasks.filter((t) => t.done).length;
  const adherence = selectedPatient.adherence;
  const missed = tasks.filter((t) => !t.done);

  const adherenceColor = adherence >= 80 ? "text-emerald-400" : adherence >= 50 ? "text-yellow-400" : "text-red-400";
  const unreadCount = alerts.filter((a) => a.status === "unread").length;

  const filteredPatients = mockPatients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewAppointment = (data) => {
    setAppointments((prev) => [data, ...prev]);
    onPatientSummary(data.patientSummary);
  };

  const handleAcknowledge = (id) =>
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "read" } : a));

  const handleConfirmReschedule = () =>
    setAlerts((prev) => prev.map((a) =>
      a.id === rescheduleTarget?.id ? { ...a, status: "read" } : a
    ));

  const statusDotColor = (status) =>
    status === "green" ? "bg-emerald-400" : status === "yellow" ? "bg-yellow-400" : "bg-red-400";

  const riskColors = {
    LOW: { text: "text-emerald-400", bg: "bg-emerald-950 border-emerald-800" },
    MEDIUM: { text: "text-yellow-400", bg: "bg-yellow-950/50 border-yellow-800/50" },
    HIGH: { text: "text-red-400", bg: "bg-red-950 border-red-900" },
  };

  const alertMeta = {
    escalation: {
      label: "🚨 Escalation",
      card: "bg-red-950 border-red-800",
      badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    },
    missed_medicine: {
      label: "💊 Missed Medication",
      card: "bg-yellow-950/40 border-yellow-800/50",
      badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    },
    new_symptom: {
      label: "⚠️ New Symptom",
      card: "bg-yellow-950/40 border-yellow-800/50",
      badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    },
  };

  const risk = riskColors[selectedPatient.riskScore] || riskColors.LOW;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {showPanel && (
        <AddAppointmentPanel
          onClose={() => setShowPanel(false)}
          onSubmit={handleNewAppointment}
        />
      )}
      {rescheduleTarget && (
        <RescheduleModal
          patientName={rescheduleTarget.patientName}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={handleConfirmReschedule}
        />
      )}

      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1">
              ← Back
            </button>
            <div>
              <h1 className="text-3xl font-bold">NexCare</h1>
              <p className="text-slate-400 text-sm">Doctor dashboard — patient adherence tracking</p>
            </div>
          </div>
          <button
            onClick={() => setShowPanel(true)}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            + New Appointment
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 flex gap-6">
          {["patients", "alerts"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-medium border-b-2 transition flex items-center gap-2 capitalize ${
                activeTab === tab
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab}
              {tab === "alerts" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">

        {/* ── Patients Tab ── */}
        {activeTab === "patients" && (
          <>
            {/* Selected Patient Card */}
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Selected Patient</p>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                    <p className="text-slate-400 text-sm mt-1">
                      {selectedPatient.age} yrs · {selectedPatient.condition} · Discharged {selectedPatient.discharge}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Last data received: {selectedPatient.lastUpdated}
                    </p>
                  </div>
                  <div className={`text-5xl font-bold text-right ${adherenceColor}`}>
                    {adherence}%
                    <p className="text-sm font-normal text-slate-400 mt-1">adherence</p>
                  </div>
                </div>

                {/* AI Risk Score */}
                <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${risk.bg}`}>
                  <span className="text-lg">🤖</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                      AI Risk Prediction
                    </p>
                    <p className={`text-sm font-bold ${risk.text}`}>
                      {selectedPatient.riskScore} RISK
                      <span className="font-normal text-slate-400 ml-2">— {selectedPatient.riskReason}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Status Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-xl border p-5 flex items-start gap-3 ${
                    task.done ? "bg-emerald-950 border-emerald-800" : "bg-red-950 border-red-900"
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    task.done ? "bg-emerald-500 border-emerald-500" : "border-red-500"
                  }`}>
                    {task.done && <Checkmark size={3} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{task.label}</p>
                    <p className={`text-xs mt-1 ${task.done ? "text-emerald-400" : "text-red-400"}`}>
                      {task.done ? "Completed today" : "Not yet completed"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Nudge Panel */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
              <h3 className="font-semibold text-lg mb-1">Send Reminder</h3>
              <p className="text-slate-400 text-sm mb-4">
                {missed.length === 0
                  ? "All tasks completed — no reminder needed today."
                  : `${selectedPatient.name} has ${missed.length} incomplete task${missed.length > 1 ? "s" : ""} today.`}
              </p>

              {/* Message preview */}
              {missed.length > 0 && !nudgeSent && (
                <div className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Message preview</p>
                  <p className="text-slate-300 text-sm leading-relaxed italic">
                    "{selectedPatient.nudgeMessage}"
                  </p>
                </div>
              )}

              {nudgeSent ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Reminder sent to {selectedPatient.name}
                </div>
              ) : (
                <button
                  onClick={() => setNudgeSent(true)}
                  disabled={missed.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg text-sm font-semibold transition"
                >
                  Send Reminder →
                </button>
              )}
            </div>

            {/* Search + Patient Grid */}
            <div>
              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patients by name..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className={`rounded-xl border p-5 cursor-pointer transition ${
                      selectedPatient.id === p.id
                        ? "bg-indigo-950 border-indigo-600"
                        : "bg-slate-900 border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white text-sm">{p.name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{p.age} yrs · {p.condition}</p>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${statusDotColor(p.status)}`} />
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500">Adherence</span>
                      <span className={`text-sm font-bold ${p.adherence >= 80 ? "text-emerald-400" : p.adherence >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                        {p.adherence}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.adherence >= 80 ? "bg-emerald-400" : p.adherence >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                        style={{ width: `${p.adherence}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Appointments */}
            {appointments.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Recent Appointments</h2>
                <div className="space-y-3">
                  {appointments.map((a, i) => (
                    <div key={i} className="rounded-xl bg-slate-900 border border-slate-800 p-5 hover:border-slate-600 transition flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{a.patientName}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{a.date || "No date set"} · {a.diagnosis}</p>
                      </div>
                      <span className="text-xs text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-full flex-shrink-0 ml-4">
                        Summary sent
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Alerts Tab ── */}
        {activeTab === "alerts" && (
          <div className="space-y-3">
            {alerts.filter((a) => a.status === "unread").length === 0 ? (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-10 text-center">
                <p className="text-emerald-400 font-medium text-sm">All clear — no active alerts</p>
                <p className="text-slate-500 text-xs mt-1">Your patients are on track.</p>
              </div>
            ) : (
              alerts.filter((a) => a.status === "unread").map((alert) => {
                const meta = alertMeta[alert.type] || alertMeta.new_symptom;
                return (
                  <div key={alert.id} className={`rounded-xl border p-5 ${meta.card}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-slate-500">{alert.timestamp}</span>
                        </div>
                        <p className="text-sm font-semibold text-white mb-1">{alert.patientName}</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{alert.message}</p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-xs border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => setRescheduleTarget({ id: alert.id, patientName: alert.patientName })}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          Schedule Visit
                        </button>
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          Send Reminder
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Landing Screen ───────────────────────────────────────────────────────────

function LandingScreen({ onSelect }) {
  const features = [
    { icon: "📄", title: "Simplify Instructions", desc: "Convert discharge notes into plain language anyone can understand." },
    { icon: "✅", title: "Track Care Tasks", desc: "Turn medications and follow-ups into a daily actionable checklist." },
    { icon: "🔔", title: "Alert Clinicians", desc: "Let doctors see missed tasks and nudge patients before it's too late." },
  ];

  return (
    <div className="bg-gray-900 min-h-screen">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8">
          <span className="text-white text-sm font-bold tracking-widest uppercase">NexCare</span>
          <span className="text-sm font-semibold text-slate-400">Frontier Hackathon 2026</span>
        </nav>
      </header>

      <div className="relative isolate overflow-hidden pt-14">
        <img
          src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=2830&q=80"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-slate-950/55" />

        <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 overflow-hidden blur-3xl">
          <div
            style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
            className="relative left-1/2 aspect-video w-full -translate-x-1/2 bg-gradient-to-tr from-pink-400 to-indigo-500 opacity-20"
          />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <div className="hidden sm:mb-8 sm:flex sm:justify-center">
              <div className="rounded-full px-3 py-1 text-sm text-gray-400 ring-1 ring-white/10">
                AI-powered care coordination — built at Frontier 2026
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl leading-tight">
                Turn complex care instructions into clear action.
              </h1>
              <p className="mt-6 text-lg text-gray-400 sm:text-xl">
                NexCare helps patients understand discharge instructions, complete next-step checklists, and keeps doctors informed when follow-through breaks down.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => onSelect("patient")}
                  className="w-56 rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white shadow hover:bg-indigo-500 hover:scale-105 transition-all"
                >
                  Continue as Patient
                </button>
                <button
                  onClick={() => onSelect("doctor")}
                  className="w-56 rounded-xl bg-white px-6 py-4 text-base font-semibold text-gray-900 shadow hover:bg-gray-100 hover:scale-105 transition-all"
                >
                  Continue as Doctor
                </button>
              </div>
              <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                {features.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-xl bg-slate-900/80 border border-slate-700 p-5 hover:border-indigo-600/50 hover:bg-slate-800/80 transition-all cursor-default"
                  >
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-10 text-xs text-slate-500">
                Does not diagnose or replace licensed clinicians. Designed to improve clarity, coordination, and adherence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [tasks, setTasks] = useState(initialTasks);
  const [patientSummary, setPatientSummary] = useState(null);

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  if (screen === "patient")
    return (
      <PatientScreen
        tasks={tasks}
        onToggle={toggleTask}
        onBack={() => setScreen("landing")}
        patientSummary={patientSummary}
      />
    );
  if (screen === "doctor")
    return (
      <DoctorScreen
        tasks={tasks}
        onBack={() => setScreen("landing")}
        onPatientSummary={setPatientSummary}
      />
    );
  return <LandingScreen onSelect={setScreen} />;
}