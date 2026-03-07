// app/doctor/dashboard/page.tsx — MISSING: Person C's doctor dashboard

import { redirect }       from "next/navigation";
import Link               from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export default async function DoctorDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor") redirect("/login");

  // Get patients with their latest appointments
  const appointments = await prisma.appointment.findMany({
    where:   { doctorId: user.id },
    include: { patient: true, medicines: true },
    orderBy: { date: "desc" },
  });

  // Group by patient (latest appointment only)
  const patientMap = new Map<string, typeof appointments[0]>();
  for (const appt of appointments) {
    if (!patientMap.has(appt.patientId)) patientMap.set(appt.patientId, appt);
  }

  // Get unread alerts
  const alerts = await prisma.alert.findMany({
    where:   { doctorId: user.id, status: "unread" },
    include: { patient: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const alertsByPatient = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const list = alertsByPatient.get(alert.patientId) ?? [];
    list.push(alert);
    alertsByPatient.set(alert.patientId, list);
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">N</div>
            <span className="font-semibold text-white">NexCare</span>
            <span className="badge-blue text-xs ml-2">Doctor</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user.name}</span>
            <Link href="/doctor/appointments/new" className="btn-primary text-sm">
              + New Appointment
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-300">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-red-400 uppercase tracking-wide mb-3">
              ⚠ Unread Alerts ({alerts.length})
            </h2>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className={`card border ${
                  alert.type === "escalation" ? "border-red-800 bg-red-900/10" : "border-yellow-800 bg-yellow-900/10"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={alert.type === "escalation" ? "badge-red" : "badge-yellow"}>
                          {alert.type}
                        </span>
                        <span className="text-sm font-medium text-white">{alert.patient.name}</span>
                      </div>
                      <p className="text-sm text-slate-300">{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <form action={`/api/doctor/alerts/${alert.id}/acknowledge`} method="POST">
                      <button className="btn-ghost text-xs">Acknowledge</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patients Grid */}
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Your Patients ({patientMap.size})
        </h2>
        {patientMap.size === 0 ? (
          <div className="card text-center py-12 text-slate-400">
            <p>No patients yet. Create an appointment to get started.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(patientMap.entries()).map(([patientId, appt]) => {
              const patientAlerts = alertsByPatient.get(patientId) ?? [];
              const hasEscalation = patientAlerts.some((a) => a.type === "escalation");
              const statusColor = hasEscalation ? "bg-red-500" : patientAlerts.length > 0 ? "bg-yellow-500" : "bg-green-500";

              return (
                <Link
                  key={patientId}
                  href={`/doctor/patients/${patientId}`}
                  className="card hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{appt.patient.name}</h3>
                    <div className="flex items-center gap-2">
                      {patientAlerts.length > 0 && (
                        <span className="badge-red text-xs">{patientAlerts.length}</span>
                      )}
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-1 mb-2">
                    {appt.diagnosisText ?? "No diagnosis"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {new Date(appt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className={appt.status === "completed" ? "badge-green" : "badge-yellow"}>
                      {appt.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
