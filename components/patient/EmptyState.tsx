"use client";

export default function EmptyState({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">No appointments yet, {name.split(" ")[0]}</h2>
      <p className="text-slate-400 max-w-sm leading-relaxed">
        After your visit, Dr. Chen will add your appointment summary here. You'll see your diagnosis, medications, and daily plan — all in plain language.
      </p>
      <div className="mt-8 px-5 py-4 rounded-xl bg-slate-800/60 border border-slate-700 max-w-sm text-left">
        <p className="text-sm text-slate-300 font-medium mb-1">📋 What you'll see after your visit:</p>
        <ul className="text-sm text-slate-400 space-y-1 mt-2">
          <li>• Plain-language explanation of your diagnosis</li>
          <li>• Your medicines and when to take them</li>
          <li>• Daily action plan from your doctor</li>
          <li>• Warning signs to watch for</li>
          <li>• AI assistant to answer your questions</li>
        </ul>
      </div>
    </div>
  );
}
