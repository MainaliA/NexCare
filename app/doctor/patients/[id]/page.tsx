// app/doctor/patients/[id]/page.tsx — MISSING: Person C's patient detail page

import { redirect }       from "next/navigation";
import Link               from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor") redirect("/login");

  const { id } = await params;

  const patient = await prisma.user.findFirst({ where: { id, role: "patient" } });
  if (!patient) redirect("/doctor/dashboard");

  const appointments = await prisma.appointment.findMany({
    where: { patientId: id, doctorId: user.id },
    include: { medicines: true },
    orderBy: { date: "desc" },
  });

  const symptoms = await prisma.symptom.findMany({
    where: { patientId: id },
    orderBy: { reportedAt: "desc" },
    take: 20,
  });

  const recentActions = await prisma.patientAction.findMany({
    where: { patientId: id },
    orderBy: { timestamp: "desc" },
    take: 30,
  });

  const alerts = await prisma.alert.findMany({
    where: { patientId: id, doctorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Calculate today's medicine adherence
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayTaken = recentActions.filter(
    (a) => a.actionType === "medicine_taken" && a.timestamp >= todayStart
  ).length;
  const latestAppt = appointments[0];
  const totalMeds = latestAppt?.medicines.length ?? 0;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/doctor/dashboard" className="text-slate-400 hover:text-white">
            ← Back
          </Link>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">N</div>
          <span className="font-semibold text-white">{patient.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{todayTaken}/{totalMeds}</p>
            <p className="text-xs text-slate-400">Meds today</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{appointments.length}</p>
            <p className="text-xs text-slate-400">Appointments</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{symptoms.length}</p>
            <p className="text-xs text-slate-400">Symptoms</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{alerts.filter((a) => a.status === "unread").length}</p>
            <p className="text-xs text-slate-400">Active alerts</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Appointments */}
          <div>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Appointments</h2>
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div key={appt.id} className="card">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {new Date(appt.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                    <span className={appt.status === "completed" ? "badge-green" : "badge-yellow"}>{appt.status}</span>
                  </div>
                  <p className="text-sm text-slate-300 mb-1">{appt.diagnosisText}</p>
                  <p className="text-xs text-slate-500">{appt.prescriptionText}</p>
                  {appt.medicines.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {appt.medicines.map((m) => (
                        <span key={m.id} className="badge-blue text-xs">{m.name} {m.dosage}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Symptoms + Alerts */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Symptom Reports</h2>
              {symptoms.length === 0 ? (
                <div className="card text-sm text-slate-500 text-center py-6">No symptoms reported</div>
              ) : (
                <div className="space-y-2">
                  {symptoms.map((s) => (
                    <div key={s.id} className={`card border ${
                      s.triageResult === "escalate" ? "border-red-800" :
                      s.triageResult === "unexpected" ? "border-yellow-800" : "border-slate-800"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={
                          s.triageResult === "escalate" ? "badge-red" :
                          s.triageResult === "unexpected" ? "badge-yellow" : "badge-green"
                        }>
                          {s.triageResult ?? "pending"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(s.reportedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{s.description}</p>
                      {s.triageReasoning && (
                        <p className="text-xs text-slate-500 mt-1">AI: {s.triageReasoning}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Alerts</h2>
              {alerts.length === 0 ? (
                <div className="card text-sm text-slate-500 text-center py-6">No alerts</div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((a) => (
                    <div key={a.id} className={`card ${a.status === "unread" ? "border-red-800" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={a.type === "escalation" ? "badge-red" : "badge-yellow"}>{a.type}</span>
                        <span className={a.status === "unread" ? "badge-red" : "badge-green"}>{a.status}</span>
                      </div>
                      <p className="text-sm text-slate-300">{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
