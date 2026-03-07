import "dotenv/config";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db, initSchema } from "./db.js";
import { DEMO_CHECKLIST_MARIA, DEMO_SUMMARY_MARIA } from "./demo-cache.js";

function isoDaysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function clearAll() {
  db.exec(`
    DELETE FROM chat_messages;
    DELETE FROM alerts;
    DELETE FROM patient_actions;
    DELETE FROM symptoms;
    DELETE FROM medicines;
    DELETE FROM appointments;
    DELETE FROM users;
  `);
}

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

function seed() {
  initSchema();
  clearAll();

  const doctorId = uuidv4();
  const mariaId = uuidv4();
  const jamesId = uuidv4();
  const lisaId = uuidv4();

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`
  ).run(doctorId, "doctor@demo.com", hash("password123"), "Dr. Sarah Chen", "doctor");

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`
  ).run(mariaId, "maria@demo.com", hash("password123"), "Maria Garcia", "patient");

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`
  ).run(jamesId, "james@demo.com", hash("password123"), "James Park", "patient");

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`
  ).run(lisaId, "lisa@demo.com", hash("password123"), "Lisa Wong", "patient");

  // Maria: completed appointment with diabetes prescription + medicines
  const mariaApptId = uuidv4();
  db.prepare(
    `INSERT INTO appointments
      (id, patient_id, doctor_id, date, status, prescription_text, diagnosis_text, daily_actions, llm_summary, pre_visit_checklist)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    mariaApptId,
    mariaId,
    doctorId,
    isoDaysFromNow(-10),
    "completed",
    "Metformin 500mg twice daily with meals.\nGlipizide 5mg once daily 30 minutes before breakfast.\nMonitor for GI upset with Metformin; watch for hypoglycemia symptoms with Glipizide.",
    "Type 2 Diabetes Mellitus. HbA1c 7.8%.",
    "Check fasting blood glucose each morning and log it. Aim for 30 minutes walking daily. Limit carbs ~45g/meal. Hydrate well. Keep a food diary.",
    DEMO_SUMMARY_MARIA,
    JSON.stringify(DEMO_CHECKLIST_MARIA)
  );

  const mariaMeds = [
    {
      name: "Metformin",
      dosage: "500mg",
      frequency: "BID with meals",
      times: ["08:00", "20:00"],
    },
    {
      name: "Glipizide",
      dosage: "5mg",
      frequency: "Daily before breakfast",
      times: ["07:30"],
    },
  ];

  for (const med of mariaMeds) {
    db.prepare(
      `INSERT INTO medicines (id, appointment_id, name, dosage, frequency, times)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), mariaApptId, med.name, med.dosage, med.frequency, JSON.stringify(med.times));
  }

  // Lisa: completed appointment + escalation alert
  const lisaApptId = uuidv4();
  db.prepare(
    `INSERT INTO appointments
      (id, patient_id, doctor_id, date, status, prescription_text, diagnosis_text, daily_actions, llm_summary, pre_visit_checklist)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    lisaApptId,
    lisaId,
    doctorId,
    isoDaysFromNow(-5),
    "completed",
    "Continue beta blocker as prescribed. Consider low-sodium diet. Monitor blood pressure daily.",
    "Hypertension with history of palpitations.",
    "Measure blood pressure every morning. Avoid excess caffeine. Walk 20 minutes daily if tolerated. Report dizziness or chest pain immediately.",
    null,
    null
  );

  db.prepare(
    `INSERT INTO alerts (id, patient_id, doctor_id, type, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    lisaId,
    doctorId,
    "escalation",
    "Lisa Wong reported chest tightness last night. Please review promptly.",
    "unread",
    isoDaysFromNow(-1)
  );

  console.log("Seed complete.");
  console.log("Doctor:", "doctor@demo.com / password123");
  console.log("Patient:", "maria@demo.com / password123");
  console.log("Patient:", "james@demo.com / password123");
  console.log("Patient:", "lisa@demo.com / password123");
}

seed();

