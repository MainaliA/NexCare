// app/(patient)/chat/page.tsx — Person B

import { redirect }       from "next/navigation";
import Link               from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";
import ChatInterface      from "@/components/patient/ChatInterface";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient") redirect("/login");

  const appointment = await prisma.appointment.findFirst({
    where: { patientId: user.id, status: "completed" },
    orderBy: { date: "desc" },
    include: { doctor: { select: { name: true } } },
  });

  if (!appointment) redirect("/dashboard");

  const doctorName    = appointment.doctor?.name ?? "your doctor";
  const diagnosisSummary = appointment.diagnosisText
    ? appointment.diagnosisText.slice(0, 120) + (appointment.diagnosisText.length > 120 ? "…" : "")
    : "No diagnosis on record";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">N</div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">NexCare Assistant</p>
              <p className="text-xs text-slate-400 mt-0.5">Grounded on Dr. {doctorName}'s notes</p>
            </div>
          </div>
          <span className="badge-green text-xs">Online</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <ChatInterface
          appointmentId={appointment.id}
          diagnosisSummary={diagnosisSummary}
          doctorName={doctorName.replace("Dr. ", "")}
        />
      </main>
    </div>
  );
}
