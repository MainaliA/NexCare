const express = require("express");
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middleware/auth");
const { generateSummary } = require("./llm");

const router = express.Router();

router.get("/appointments", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    const appointments = db.prepare(`
      SELECT a.*, d.name as doctor_name FROM appointments a
      JOIN users d ON a.doctor_id = d.id
      WHERE a.patient_id = ? ORDER BY a.date DESC
    `).all(req.user.id).map((a) => ({
      ...a, medicines: db.prepare("SELECT * FROM medicines WHERE appointment_id = ?").all(a.id),
    }));
    res.json({ appointments });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to load appointments" }); }
});

router.get("/appointments/:id/summary", authMiddleware, async (req, res) => {
  try {
    const db = req.app.get("db");
    const appt = db.prepare("SELECT * FROM appointments WHERE id = ? AND patient_id = ?")
      .get(req.params.id, req.user.id);
    if (!appt) return res.status(404).json({ error: "Not found" });
    const summary = await generateSummary(
      appt.diagnosis_text || "", appt.prescription_text || "",
      appt.daily_actions || "", req.user.name, req.query.lang
    );
    res.json({ summary });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to generate summary" }); }
});

router.get("/medicines/today", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    const appt = db.prepare(`
      SELECT * FROM appointments WHERE patient_id = ? AND status = 'completed'
      ORDER BY date DESC LIMIT 1
    `).get(req.user.id);
    if (!appt) return res.json({ medicines: [], taken: [] });
    const medicines = db.prepare("SELECT * FROM medicines WHERE appointment_id = ?").all(appt.id);
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const taken = db.prepare(`
      SELECT * FROM patient_actions WHERE patient_id = ? AND action_type = 'medicine_taken' AND timestamp >= ?
    `).all(req.user.id, startOfDay.toISOString());
    res.json({ medicines, taken });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed to load medicines" }); }
});

router.post("/medicines/:id/take", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    const med = db.prepare("SELECT * FROM medicines WHERE id = ?").get(req.params.id);
    if (!med) return res.status(404).json({ error: "Medicine not found" });
    db.prepare("INSERT INTO patient_actions (id, patient_id, action_type, details, timestamp) VALUES (?, ?, 'medicine_taken', ?, ?)")
      .run(uuidv4(), req.user.id, JSON.stringify({ medicineId: med.id, medicineName: med.name }), new Date().toISOString());
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/actions", authMiddleware, (req, res) => {
  try {
    const db = req.app.get("db");
    const { actionType, details } = req.body;
    if (!actionType) return res.status(400).json({ error: "actionType required" });
    db.prepare("INSERT INTO patient_actions (id, patient_id, action_type, details, timestamp) VALUES (?, ?, ?, ?, ?)")
      .run(uuidv4(), req.user.id, actionType, JSON.stringify(details || {}), new Date().toISOString());
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
});

module.exports = router;
