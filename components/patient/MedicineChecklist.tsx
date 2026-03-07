"use client";

import { useState } from "react";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  taken: boolean;
}

interface Props { medicines: Medicine[]; }

export default function MedicineChecklist({ medicines: initial }: Props) {
  const [medicines, setMedicines] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const takenCount = medicines.filter((m) => m.taken).length;

  async function handleTake(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/patient/medicines/${id}/take`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setMedicines((prev) =>
          prev.map((m) => (m.id === id ? { ...m, taken: true } : m))
        );
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-900/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-white">Today's Medicines</h3>
        </div>
        <span className={`text-sm font-medium ${takenCount === medicines.length ? "text-green-400" : "text-slate-400"}`}>
          {takenCount}/{medicines.length} taken
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${medicines.length ? (takenCount / medicines.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-3">
        {medicines.map((med) => (
          <div
            key={med.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              med.taken ? "bg-green-900/20 border border-green-900/40" : "bg-slate-800/60"
            }`}
          >
            <button
              onClick={() => !med.taken && handleTake(med.id)}
              disabled={med.taken || loading === med.id}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                med.taken
                  ? "bg-green-500 border-green-500"
                  : "border-slate-600 hover:border-green-500"
              }`}
            >
              {med.taken && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {loading === med.id && (
                <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${med.taken ? "text-slate-400 line-through" : "text-white"}`}>
                {med.name}
              </p>
              <p className="text-xs text-slate-500">{med.dosage} · {med.frequency}</p>
            </div>

            <div className="flex gap-1 flex-wrap justify-end">
              {med.times.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {takenCount === medicines.length && medicines.length > 0 && (
        <div className="mt-4 text-center text-sm text-green-400 font-medium py-2">
          ✓ All medicines taken today — great job!
        </div>
      )}
    </div>
  );
}
