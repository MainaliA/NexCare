const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../nexcare.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('patient', 'doctor')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id),
    doctor_id TEXT NOT NULL REFERENCES users(id),
    date DATETIME NOT NULL,
    status TEXT DEFAULT 'completed' CHECK(status IN ('scheduled', 'completed', 'cancelled')),
    prescription_text TEXT,
    diagnosis_text TEXT,
    daily_actions TEXT,
    llm_summary TEXT,
    pre_visit_checklist TEXT
  );
  CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL REFERENCES appointments(id),
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    times TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS symptoms (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id),
    appointment_id TEXT REFERENCES appointments(id),
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'low' CHECK(severity IN ('low', 'medium', 'high')),
    triage_result TEXT CHECK(triage_result IN ('expected', 'unexpected', 'escalate')),
    triage_reasoning TEXT,
    triage_confidence INTEGER,
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS patient_actions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id),
    action_type TEXT NOT NULL CHECK(action_type IN ('medicine_taken', 'chatbot_used', 'symptom_reported')),
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES users(id),
    doctor_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('new_symptom', 'missed_medicine', 'escalation')),
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'acted_on')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL REFERENCES appointments(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
