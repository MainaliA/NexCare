const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("./db");

async function seed() {
  console.log("Seeding database...");
  db.exec(`DELETE FROM chat_messages; DELETE FROM alerts; DELETE FROM patient_actions;
    DELETE FROM symptoms; DELETE FROM medicines; DELETE FROM appointments; DELETE FROM users;`);

  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const doctorId = "doctor-sarah-chen";
  const mariaId = "patient-maria-garcia";
  const jamesId = "patient-james-park";
  const lisaId = "patient-lisa-wong";

  for (const [id, email, name, role] of [
    [doctorId, "doctor@demo.com", "Dr. Sarah Chen", "doctor"],
    [mariaId, "maria@demo.com", "Maria Garcia", "patient"],
    [jamesId, "james@demo.com", "James Park", "patient"],
    [lisaId, "lisa@demo.com", "Lisa Wong", "patient"],
  ]) {
    db.prepare("INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)").run(id, email, hash("password123"), name, role);
  }

  const mariaApptId = "appt-maria-diabetes";
  const mariaSummary = `## 🔍 What We Found\n\nYou have **Type 2 Diabetes Mellitus** — this means your body is having trouble managing blood sugar levels on its own. Your HbA1c is 7.8% (a 3-month average of your blood sugar — ideally we'd like it closer to 7% or below).\n\nThe good news: this is very manageable, and your doctor has a clear plan.\n\n## 💊 Your Medicines\n\n- **Metformin 500mg** — Helps your body use insulin more effectively. Take it **twice daily with meals** (morning and evening). You might notice some stomach upset at first — taking it with food helps.\n\n- **Glipizide 5mg** — Helps your pancreas release more insulin. Take it **once daily, 30 minutes before breakfast**. Watch for signs of low blood sugar (shakiness, sweating, dizziness).\n\n## 📋 Your Daily Plan\n\n- Check your blood sugar every morning before breakfast and log it\n- Take Metformin with breakfast and dinner\n- Take Glipizide 30 minutes before breakfast\n- Walk for at least 30 minutes after lunch or dinner\n- Limit carbs to about 45g per meal\n- Drink at least 8 glasses of water daily\n\n💬 Have questions? Tap **Ask About This** below to chat with your medical assistant.`;

  db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, date, status, diagnosis_text, prescription_text, daily_actions, llm_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(mariaApptId, mariaId, doctorId, new Date(Date.now() - 3 * 86400000).toISOString(), "completed",
      "Type 2 Diabetes Mellitus — HbA1c 7.8%, fasting glucose 142 mg/dL.",
      "Metformin 500mg twice daily with meals. Glipizide 5mg once daily 30 min before breakfast.",
      "Check blood sugar every morning. Walk 30 min daily. Limit carbs to 45g per meal.", mariaSummary);

  db.prepare("INSERT INTO medicines (id, appointment_id, name, dosage, frequency, times) VALUES (?, ?, ?, ?, ?, ?)").run("med-metformin", mariaApptId, "Metformin", "500mg", "twice daily with meals", JSON.stringify(["08:00", "20:00"]));
  db.prepare("INSERT INTO medicines (id, appointment_id, name, dosage, frequency, times) VALUES (?, ?, ?, ?, ?, ?)").run("med-glipizide", mariaApptId, "Glipizide", "5mg", "once daily before breakfast", JSON.stringify(["07:30"]));

  for (let d = 1; d <= 3; d++) {
    const ts = new Date(Date.now() - d * 86400000); ts.setHours(8, 0, 0, 0);
    db.prepare("INSERT INTO patient_actions (id, patient_id, action_type, details, timestamp) VALUES (?, ?, ?, ?, ?)").run(uuidv4(), mariaId, "medicine_taken", JSON.stringify({ medicineId: "med-metformin", medicineName: "Metformin" }), ts.toISOString());
  }

  const lisaApptId = "appt-lisa-heart";
  db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, date, status, diagnosis_text, prescription_text, daily_actions, llm_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(lisaApptId, lisaId, doctorId, new Date(Date.now() - 7 * 86400000).toISOString(), "completed",
      "Hypertensive Heart Disease — Stage 2 hypertension (BP 158/96). Left ventricular hypertrophy noted on ECG.",
      "Lisinopril 10mg once daily. Amlodipine 5mg once daily.",
      "Monitor blood pressure twice daily. Low-sodium diet. Avoid strenuous exercise until next visit.",
      `## 🔍 What We Found\n\nYou have **high blood pressure** putting strain on your heart. BP 158/96 — goal is below 130/80.\n\n## 💊 Your Medicines\n\n- **Lisinopril 10mg** — Relaxes blood vessels. Take every morning.\n- **Amlodipine 5mg** — Also lowers blood pressure. Take once daily.\n\n## 📋 Your Daily Plan\n\n- Check blood pressure twice daily (morning and evening)\n- Keep sodium under 1500mg per day\n- Avoid strenuous exercise until your next visit\n\n💬 Have questions? Tap **Ask About This** below to chat with your medical assistant.`);

  db.prepare("INSERT INTO medicines (id, appointment_id, name, dosage, frequency, times) VALUES (?, ?, ?, ?, ?, ?)").run(uuidv4(), lisaApptId, "Lisinopril", "10mg", "once daily", JSON.stringify(["09:00"]));
  db.prepare("INSERT INTO medicines (id, appointment_id, name, dosage, frequency, times) VALUES (?, ?, ?, ?, ?, ?)").run(uuidv4(), lisaApptId, "Amlodipine", "5mg", "once daily", JSON.stringify(["09:00"]));

  db.prepare("INSERT INTO alerts (id, patient_id, doctor_id, type, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    uuidv4(), lisaId, doctorId, "escalation",
    'Lisa Wong reported: "chest tightness and difficulty breathing when walking" — Triage: ESCALATE (92% confidence).',
    "unread", new Date(Date.now() - 2 * 3600000).toISOString()
  );

  console.log("✓ Seed complete");
  console.log("  doctor@demo.com  — Dr. Sarah Chen");
  console.log("  maria@demo.com   — Maria Garcia (diabetes, has appointment)");
  console.log("  james@demo.com   — James Park (new patient)");
  console.log("  lisa@demo.com    — Lisa Wong (heart condition, has alert)");
}

seed().catch(console.error);
