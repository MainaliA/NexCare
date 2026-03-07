"use client";

import { useState } from "react";

interface Medication { name: string; dosage: string; instruction: string; }
interface Summary {
  whatIsHappening: string;
  medications: Medication[];
  dailyPlan: string[];
  warningSign: string[];
}

interface Props { summary: Summary; }

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "hi", label: "हिंदी" },
  { code: "zh", label: "中文" },
  { code: "tl", label: "Filipino" },
];

export default function LLMSummaryCard({ summary }: Props) {
  const [lang, setLang] = useState("en");
  const [translated, setTranslated] = useState<Summary | null>(null);
  const [translating, setTranslating] = useState(false);

  const display = translated ?? summary;

  async function handleTranslate(code: string) {
    setLang(code);
    if (code === "en") { setTranslated(null); return; }
    setTranslating(true);
    try {
      const res = await fetch("/api/patient/translate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, language: code }),
        credentials: "include",
      });
      if (res.ok) setTranslated(await res.json());
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">View in:</span>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => handleTranslate(l.code)}
            disabled={translating}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              lang === l.code
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
            }`}
          >
            {l.label}
          </button>
        ))}
        {translating && <span className="text-xs text-slate-500 animate-pulse">Translating…</span>}
      </div>

      {/* What's Happening */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-white">What's Happening</h3>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">{display.whatIsHappening}</p>
      </div>

      {/* Medications */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-green-900/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-white">Your Medications</h3>
        </div>
        <div className="space-y-3">
          {display.medications.map((med, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-slate-800/60">
              <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{med.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{med.instruction}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Plan */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-900/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-white">Your Daily Plan</h3>
        </div>
        <ul className="space-y-2">
          {display.dailyPlan.map((action, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="text-purple-400 font-bold mt-0.5">→</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Warning Signs */}
      <div className="card border-red-900/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-900/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-white">Warning Signs</h3>
        </div>
        <ul className="space-y-2">
          {display.warningSign.map((sign, i) => (
            <li key={i} className="flex gap-2 text-sm text-red-300">
              <span className="text-red-400 shrink-0">⚠</span>
              <span>{sign}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-800">
          This is a summary only. Always follow your doctor's full instructions.
        </p>
      </div>
    </div>
  );
}
