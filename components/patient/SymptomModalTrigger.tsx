"use client";

import { useState } from "react";
import SymptomModal from "./SymptomModal";

interface Props { appointmentId: string; compact?: boolean; }

export default function SymptomModalTrigger({ appointmentId, compact }: Props) {
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="card flex flex-col items-center gap-2 text-center hover:border-orange-800 hover:bg-orange-900/10 transition-colors w-full"
        >
          <span className="text-2xl">🩺</span>
          <span className="text-sm font-medium text-white">Report Symptom</span>
          <span className="text-xs text-slate-500">AI reviews & alerts doctor</span>
        </button>
        {open && <SymptomModal appointmentId={appointmentId} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost flex items-center gap-2 text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Report Symptom
      </button>
      {open && <SymptomModal appointmentId={appointmentId} onClose={() => setOpen(false)} />}
    </>
  );
}
