const express = require("express");
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middleware/auth");
const { generateSummary, generatePreVisitChecklist } = require("./llm");

const router = express.Router();

router.get("/patients", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    const patients = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.email,
        (SELECT COUNT(*) FROM alerts a WHERE a.patient_id = u.id AND a.doctor_id = ? AND a.status = 'unread') as alert_count,
        (SELECT COUNT(*) FROM alerts a WHERE a.patient_id = u.id AND a.doctor_id = ? AND a.status = 'unread' AND a.type = 'escalation') as escalation_count
      FROM users u JOIN appointments ap ON u.id = ap.patient_id
      WHERE ap.doctor_id = ? AND u.role = 'patient'
    `).all(req.user.id, req.user.id, req.user.id);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = patients.map((p) => {
      const latestAppt = db.prepare("SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC LIMIT 1").get(p.id);
      const medicines = latestAppt ? db.prepare("SELECT * FROM medicines WHERE appointment_id = ?").all(latestAppt.id) : [];
      const taken = db.prepare("SELECT COUNT(*) as count FROM patient_actions WHERE patient_id = ? AND action_type = 'medicine_taken' AND timestamp >= ?").get(p.id, weekAgo).count;
      const expected = medicines.length * 7;
      return {
        ...p,
        latestAppointment: latestAppt,
        readinessScore: expected > 0 ? Math.min(100, Math.round((taken / expected) * 100)) : 100,
        status: p.escalation_count > 0 ? "red" : p.alert_count > 0 ? "yellow" : "green",
      };
    });
    res.json({ patients: result });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/patients/:id", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    const patient = db.prepare("SELECT id, name, email FROM users WHERE id = ? AND role = 'patient'").get(req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    const appointments = db.prepare(`
      SELECT a.*, d.name as doctor_name FROM appointments a
      JOIN users d ON a.doctor_id = d.id WHERE a.patient_id = ? ORDER BY a.date DESC
    `).all(req.params.id).map((a) => ({ ...a, medicines: db.prepare("SELECT * FROM medicines WHERE appointment_id = ?").all(a.id) }));
    const symptoms = db.prepare("SELECT * FROM symptoms WHERE patient_id = ? ORDER BY reported_at DESC").all(req.params.id);
    const actions = db.prepare("SELECT * FROM patient_actions WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 50").all(req.params.id);
    const alerts = db.prepare("SELECT * FROM alerts WHERE patient_id = ? AND doctor_id = ? ORDER BY created_at DESC").all(req.params.id, req.user.id);
    res.json({ patient, appointments, symptoms, actions, alerts });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/appointments", authMiddleware, async (req, res) => {
  try {
    const db = req.app.get("db");
    const { patientId, date, prescriptionText, diagnosisText, dailyActions, medicines = [] } = req.body;
    if (!patientId || !diagnosisText) return res.status(400).json({ error: "patientId and diagnosisText required" });
    const patient = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'patient'").get(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const apptId = uuidv4();
    let llmSummary = null, checklist = null;
    try {
      [llmSummary, checklist] = await Promise.all([
        generateSummary(diagnosisText, prescriptionText || "", dailyActions || "", patient.name),
        generatePreVisitChecklist(diagnosisText, prescriptionText || ""),
      ]);
    } catch (e) { console.error("LLM failed:", e.message); }

    db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, date, status, prescription_text, diagnosis_text, daily_actions, llm_summary, pre_visit_checklist)
      VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`)
      .run(apptId, patientId, req.user.id, date || new Date().toISOString(), prescriptionText || "", diagnosisText, dailyActions || "", llmSummary, JSON.stringify(checklist || []));

    for (const m of medicines) {
      if (!m.name || !m.dosage || !m.frequency) continue;
      db.prepare("INSERT INTO medicines (id, appointment_id, name, dosage, frequency, times) VALUES (?, ?, ?, ?, ?, ?)")
        .run(uuidv4(), apptId, m.name, m.dosage, m.frequency, JSON.stringify(m.times || []));
    }
    const appointment = { ...db.prepare("SELECT * FROM appointments WHERE id = ?").get(apptId), medicines: db.prepare("SELECT * FROM medicines WHERE appointment_id = ?").all(apptId) };
    res.json({ appointment, llmSummary, checklist });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to create appointment" }); }
});

router.get("/alerts", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    const alerts = db.prepare(`SELECT al.*, u.name as patient_name FROM alerts al JOIN users u ON al.patient_id = u.id
      WHERE al.doctor_id = ? AND al.status != 'acted_on' ORDER BY al.created_at DESC`).all(req.user.id);
    res.json({ alerts });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/alerts/:id/acknowledge", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    db.prepare("UPDATE alerts SET status = 'read' WHERE id = ? AND doctor_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/patients/:id/reschedule", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    const appt = db.prepare("SELECT * FROM appointments WHERE patient_id = ? AND doctor_id = ? ORDER BY date DESC LIMIT 1").get(req.params.id, req.user.id);
    if (!appt) return res.status(404).json({ error: "No appointment found" });
    db.prepare("UPDATE appointments SET date = ?, status = 'scheduled' WHERE id = ?").run(req.body.newDate, appt.id);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

module.exports = router;
