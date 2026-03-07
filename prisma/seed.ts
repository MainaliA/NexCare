// prisma/seed.ts — Person A runs this; creates demo data for everyone

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ────────────────────────────────────────────────────
  const doctorHash  = await bcrypt.hash("doctor123",  10);
  const mariaHash   = await bcrypt.hash("patient123", 10);
  const jamesHash   = await bcrypt.hash("patient123", 10);
  const lisaHash    = await bcrypt.hash("patient123", 10);

  const doctor = await prisma.user.upsert({
    where: { email: "doctor@demo.com" },
    update: {},
    create: { email: "doctor@demo.com", passwordHash: doctorHash, name: "Dr. Sarah Chen", role: "doctor" },
  });

  const maria = await prisma.user.upsert({
    where: { email: "maria@demo.com" },
    update: {},
    create: { email: "maria@demo.com", passwordHash: mariaHash, name: "Maria Garcia", role: "patient" },
  });

  const james = await prisma.user.upsert({
    where: { email: "james@demo.com" },
    update: {},
    create: { email: "james@demo.com", passwordHash: jamesHash, name: "James Park", role: "patient" },
  });

  const lisa = await prisma.user.upsert({
    where: { email: "lisa@demo.com" },
    update: {},
    create: { email: "lisa@demo.com", passwordHash: lisaHash, name: "Lisa Wong", role: "patient" },
  });

  // ── Maria's Appointment (Diabetes follow-up — completed) ─────
  const mariaAppt = await prisma.appointment.create({
    data: {
      patientId: maria.id,
      doctorId:  doctor.id,
      date:      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status:    "completed",
      diagnosisText:    "Type 2 Diabetes Mellitus — HbA1c 8.2%. Mild hypertension noted. Kidney function within normal range.",
      prescriptionText: "Metformin 500mg twice daily with meals. Lisinopril 5mg once daily in the morning.",
      dailyActions:     "Check blood glucose every morning before eating. Walk 20 minutes after dinner. Avoid sugary drinks. Drink 8 glasses of water daily.",
      llmSummary: JSON.stringify({
        whatIsHappening: "You have Type 2 Diabetes (a condition where your body has trouble managing blood sugar levels). Your HbA1c (a 3-month average blood sugar reading) is a bit high at 8.2%, so we're starting medication to help bring it down. Your blood pressure is slightly elevated, so we're treating that too.",
        medications: [
          { name: "Metformin 500mg", dosage: "500mg", instruction: "Take one tablet twice a day — once with breakfast, once with dinner. This helps control your blood sugar." },
          { name: "Lisinopril 5mg", dosage: "5mg", instruction: "Take one tablet every morning. This helps lower your blood pressure and protect your kidneys." },
        ],
        dailyPlan: [
          "Check your blood sugar every morning before eating and write it down",
          "Walk for 20 minutes after dinner — even a slow walk helps",
          "Drink 8 glasses of water throughout the day",
          "Avoid sugary drinks like soda, juice, and sweetened coffee",
        ],
        warningSign: [
          "Call Dr. Chen if your blood sugar is above 300 or below 70",
          "Go to the ER immediately if you feel confused, shaky, or have chest pain",
          "Call the clinic if you notice unusual swelling in your legs or ankles",
        ],
      }),
    },
  });

  await prisma.medicine.createMany({
    data: [
      { appointmentId: mariaAppt.id, name: "Metformin",  dosage: "500mg", frequency: "twice daily", times: JSON.stringify(["08:00", "20:00"]) },
      { appointmentId: mariaAppt.id, name: "Lisinopril", dosage: "5mg",   frequency: "once daily",  times: JSON.stringify(["08:00"]) },
    ],
  });

  // Pre-log that Maria took her morning medicines today
  await prisma.patientAction.createMany({
    data: [
      { patientId: maria.id, actionType: "medicine_taken", details: JSON.stringify({ medicineName: "Metformin",  time: "08:15" }) },
      { patientId: maria.id, actionType: "medicine_taken", details: JSON.stringify({ medicineName: "Lisinopril", time: "08:15" }) },
    ],
  });

  // ── Lisa's Appointment (Heart condition — with alert) ────────
  const lisaAppt = await prisma.appointment.create({
    data: {
      patientId: lisa.id,
      doctorId:  doctor.id,
      date:      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
      status:    "completed",
      diagnosisText:    "Atrial fibrillation (irregular heartbeat). Moderate risk per CHA2DS2-VASc score of 3.",
      prescriptionText: "Apixaban (Eliquis) 5mg twice daily. Metoprolol 25mg twice daily.",
      dailyActions:     "Do not miss any doses of blood thinner. Avoid alcohol completely. No NSAIDs (ibuprofen, Advil, Motrin). Call immediately if you notice unusual bruising or bleeding.",
      llmSummary: JSON.stringify({
        whatIsHappening: "You have atrial fibrillation — this means your heart is beating with an irregular rhythm instead of a steady beat. This is a common condition, but it's important to manage it carefully to prevent blood clots.",
        medications: [
          { name: "Apixaban (Eliquis) 5mg", dosage: "5mg", instruction: "Take twice a day — morning and evening. This blood thinner prevents clots. NEVER skip this medicine." },
          { name: "Metoprolol 25mg", dosage: "25mg", instruction: "Take twice a day — morning and evening. This helps slow your heart rate to a healthy rhythm." },
        ],
        dailyPlan: [
          "Take your medicines at the same time every day — set an alarm if needed",
          "Avoid alcohol completely — it can trigger irregular heartbeat",
          "Do NOT take ibuprofen, Advil, or Motrin — use acetaminophen (Tylenol) instead for pain",
          "Check for unusual bruising or bleeding each day",
        ],
        warningSign: [
          "Call 911 immediately if you feel chest pain, severe shortness of breath, or faint",
          "Go to the ER if you notice unusual bleeding that won't stop",
          "Call Dr. Chen immediately if you feel your heart racing or pounding",
        ],
      }),
    },
  });

  await prisma.medicine.createMany({
    data: [
      { appointmentId: lisaAppt.id, name: "Apixaban (Eliquis)", dosage: "5mg", frequency: "twice daily", times: JSON.stringify(["08:00", "20:00"]) },
      { appointmentId: lisaAppt.id, name: "Metoprolol",          dosage: "25mg", frequency: "twice daily", times: JSON.stringify(["08:00", "20:00"]) },
    ],
  });

  // Lisa reported a symptom → creates an alert
  const lisaSymptom = await prisma.symptom.create({
    data: {
      patientId:      lisa.id,
      appointmentId:  lisaAppt.id,
      description:    "I feel my heart racing and I'm a little dizzy",
      severity:       "high",
      triageResult:   "escalate",
      triageReasoning: "Palpitations and dizziness in a patient with known AFib and anticoagulation therapy require prompt evaluation.",
    },
  });

  await prisma.alert.create({
    data: {
      patientId: lisa.id,
      doctorId:  doctor.id,
      type:      "escalation",
      message:   `${lisa.name} reported: "${lisaSymptom.description}" — Triage: ESCALATE. Palpitations + dizziness in AFib patient.`,
      status:    "unread",
    },
  });

  console.log("✅ Seed complete!");
  console.log("─────────────────────────────────");
  console.log("Demo accounts:");
  console.log("  Doctor:  doctor@demo.com  / doctor123");
  console.log("  Patient: maria@demo.com   / patient123  (diabetes, has appointment)");
  console.log("  Patient: james@demo.com   / patient123  (new patient, no appointments)");
  console.log("  Patient: lisa@demo.com    / patient123  (AFib, has alert)");
  console.log("─────────────────────────────────");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
