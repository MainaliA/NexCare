// app/(patient)/dashboard/page.tsx — Person B

import { redirect }        from "next/navigation";
import Link                from "next/link";
import { getCurrentUser }  from "@/lib/auth";
import { prisma }          from "@/lib/db";
import EmptyState          from "@/components/patient/EmptyState";
import LLMSummaryCard      from "@/components/patient/LLMSummaryCard";
import MedicineChecklist   from "@/components/patient/MedicineChecklist";
import SymptomModalTrigger from "@/components/patient/SymptomModalTrigger";

export default async function PatientDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient") redirect("/login");

  // Fetch latest appointment with medicines
  const appointment = await prisma.appointment.findFirst({
    where: { patientId: user.id, status: "completed" },
    orderBy: { date: "desc" },
    include: { medicines: true, doctor: { select: { name: true } } },
  });

  // Fetch today's medicine taken actions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const takenActions = await prisma.patientAction.findMany({
    where: {
      patientId:  user.id,
      actionType: "medicine_taken",
      timestamp:  { gte: todayStart },
    },
  });

  const takenNames = new Set(
    takenActions.map((a) => {
      try { return JSON.parse(a.details ?? "{}").medicineName as string; }
      catch { return ""; }
    })
  );

  const medicinesWithStatus = (appointment?.medicines ?? []).map((m) => ({
    id:        m.id,
    name:      m.name,
    dosage:    m.dosage,
    frequency: m.frequency,
    times:     JSON.parse(m.times) as string[],
    taken:     takenNames.has(m.name),
  }));

  // Parse LLM summary
  let summary = null;
  if (appointment?.llmSummary) {
    try { summary = JSON.parse(appointment.llmSummary); }
    catch { /* will show raw text fallback */ }
  }

  const doctorName = appointment?.doctor?.name ?? "your doctor";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">N</div>
            <span className="font-semibold text-white">NexCare</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:block">
              Hello, {user.name.split(" ")[0]} 👋
            </span>
            {appointment && (
              <Link href="/chat" className="btn-ghost text-sm">
                💬 Ask a Question
              </Link>
            )}
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {!appointment ? (
          <EmptyState name={user.name} />
        ) : (
          <div className="space-y-6">
            {/* Top bar */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white">Your Health Summary</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  Last visit with {doctorName} ·{" "}
                  {new Date(appointment.date).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </p>
              </div>
              <SymptomModalTrigger appointmentId={appointment.id} />
            </div>

            {/* Status bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center">
                <p className="text-2xl font-bold text-white">{medicinesWithStatus.filter((m) => m.taken).length}/{medicinesWithStatus.length}</p>
                <p className="text-xs text-slate-400 mt-1">Medicines today</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-bold text-white">
                  {Math.ceil((new Date(appointment.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) + 14)}d
                </p>
                <p className="text-xs text-slate-400 mt-1">Until follow-up</p>
              </div>
              <div className="card text-center">
                <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
                  appointment.status === "completed" ? "badge-green" : "badge-yellow"
                }`}>
                  {appointment.status}
                </span>
                <p className="text-xs text-slate-400 mt-1">Appointment</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: AI Summary */}
              <div>
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
                  Doctor's Notes — Plain Language
                </h2>
                {summary ? (
                  <LLMSummaryCard summary={summary} />
                ) : (
                  <div className="card">
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">
                      {appointment.diagnosisText}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Medicines + Actions */}
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
                  Today's Checklist
                </h2>
                {medicinesWithStatus.length > 0 ? (
                  <MedicineChecklist medicines={medicinesWithStatus} />
                ) : (
                  <div className="card text-slate-400 text-sm text-center py-8">
                    No medicines prescribed.
                  </div>
                )}

                {/* Quick links */}
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/chat"
                    className="card flex flex-col items-center gap-2 text-center hover:border-blue-800 hover:bg-blue-900/10 transition-colors cursor-pointer"
                  >
                    <span className="text-2xl">💬</span>
                    <span className="text-sm font-medium text-white">Ask About This</span>
                    <span className="text-xs text-slate-500">AI answers from your notes</span>
                  </Link>
                  <SymptomModalTrigger appointmentId={appointment.id} compact />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
