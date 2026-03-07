"use client";

import { useState } from "react";

interface TriageResult {
  assessment: "expected" | "unexpected" | "escalate";
  confidence: number;
  patientMessage: string;
  doctorAlert: boolean;
  urgency: string;
}

interface Props {
  appointmentId: string;
  onClose: () => void;
}

const SEVERITY_OPTIONS = [
  { value: "low",    label: "Mild",     desc: "Noticeable but manageable",    color: "green" },
  { value: "medium", label: "Moderate", desc: "Affecting daily activities",   color: "yellow" },
  { value: "high",   label: "Severe",   desc: "Significantly impacting life", color: "red" },
];

export default function SymptomModal({ appointmentId, onClose }: Props) {
  const [description, setDescription] = useState("");
  const [severity, setSeverity]       = useState("low");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<TriageResult | null>(null);
  const [error, setError]             = useState("");

  async function handleSubmit() {
    if (!description.trim()) { setError("Please describe your symptom."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/patient/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, severity, appointmentId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit symptom");
      setResult(await res.json());
    } catch {
      setError("Something went wrong. Please try again or contact your doctor directly.");
    } finally {
      setLoading(false);
    }
  }

  const assessmentStyle = {
    expected:   { bg: "bg-green-900/30",  border: "border-green-800",  icon: "✓", iconColor: "text-green-400",  label: "Expected" },
    unexpected: { bg: "bg-yellow-900/30", border: "border-yellow-800", icon: "!", iconColor: "text-yellow-400", label: "Needs attention" },
    escalate:   { bg: "bg-red-900/30",    border: "border-red-800",    icon: "⚠", iconColor: "text-red-400",    label: "Doctor notified" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!result ? onClose : undefined} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Report a Symptom</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!result ? (
            <>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What are you experiencing?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setError(""); }}
                  rows={4}
                  className="input resize-none"
                  placeholder="e.g. I've been feeling nauseous since this morning, especially after taking my medicine..."
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">How severe is it?</label>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSeverity(opt.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        severity === opt.value
                          ? opt.color === "green"  ? "bg-green-900/40 border-green-600"
                          : opt.color === "yellow" ? "bg-yellow-900/40 border-yellow-600"
                          : "bg-red-900/40 border-red-600"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{opt.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !description.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI is reviewing your symptom…
                  </>
                ) : (
                  "Submit Symptom"
                )}
              </button>
            </>
          ) : (
            /* Triage Result */
            <div className={`rounded-xl p-5 border ${assessmentStyle[result.assessment].bg} ${assessmentStyle[result.assessment].border}`}>
              <div className="flex items-start gap-3 mb-3">
                <span className={`text-2xl ${assessmentStyle[result.assessment].iconColor}`}>
                  {assessmentStyle[result.assessment].icon}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${assessmentStyle[result.assessment].iconColor}`}>
                    {assessmentStyle[result.assessment].label}
                    {result.confidence > 0 && (
                      <span className="ml-1 text-xs opacity-70">({result.confidence}% confidence)</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">{result.patientMessage}</p>
                </div>
              </div>
              {result.doctorAlert && (
                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700/50">
                  🔔 Your doctor has been notified and will follow up with you.
                </p>
              )}
              <button onClick={onClose} className="btn-primary w-full mt-4">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
