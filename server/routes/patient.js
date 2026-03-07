import express from "express";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import symptomsRouter from "./symptoms.js";

const router = express.Router();

router.use(authMiddleware, requireRole("patient"));

// GET /api/patient/appointments
router.get("/appointments", (req, res) => {
  try {
    const db = req.app.get("db");
    const appts = db.prepare(
      `SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC`
    ).all(req.user.id);

    const medsByAppt = new Map();
    if (appts.length) {
      const apptIds = appts.map((a) => a.id);
      const placeholders = apptIds.map(() => "?").join(",");
      const meds = db.prepare(
        `SELECT * FROM medicines WHERE appointment_id IN (${placeholders})`
      ).all(...apptIds);
      for (const m of meds) {
        const arr = medsByAppt.get(m.appointment_id) || [];
        arr.push(m);
        medsByAppt.set(m.appointment_id, arr);
      }
    }

    res.json({
      appointments: appts.map((a) => ({
        ...a,
        medicines: medsByAppt.get(a.id) || [],
      })),
    });
  } catch (error) {
    console.error("Patient appointments error:", error);
    res.status(500).json({ error: "Failed to load appointments" });
  }
});

// GET /api/patient/medicines/today
router.get("/medicines/today", (req, res) => {
  try {
    const db = req.app.get("db");
    const appointment = db.prepare(
      `SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC LIMIT 1`
    ).get(req.user.id);

    if (!appointment) return res.json({ medicines: [], taken: [] });

    const medicines = db.prepare(
      `SELECT * FROM medicines WHERE appointment_id = ?`
    ).all(appointment.id);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const actions = db.prepare(
      `SELECT * FROM patient_actions WHERE patient_id = ? AND action_type = 'medicine_taken' AND timestamp >= ? AND timestamp <= ?`
    ).all(req.user.id, start, end);

    const taken = [];
    for (const a of actions) {
      try {
        const details = JSON.parse(a.details || "{}");
        if (details.medicineId) taken.push(details.medicineId);
      } catch {}
    }

    res.json({ medicines, taken });
  } catch (error) {
    console.error("Medicines today error:", error);
    res.status(500).json({ error: "Failed to load medicines" });
  }
});

// POST /api/patient/medicines/:id/take
router.post("/medicines/:id/take", (req, res) => {
  try {
    const db = req.app.get("db");
    const medicineId = req.params.id;

    const medicine = db.prepare(
      `SELECT m.*, a.patient_id FROM medicines m
       JOIN appointments a ON m.appointment_id = a.id
       WHERE m.id = ?`
    ).get(medicineId);

    if (!medicine) return res.status(404).json({ error: "Medicine not found" });
    if (medicine.patient_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    db.prepare(
      `INSERT INTO patient_actions (id, patient_id, action_type, details, timestamp)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      req.user.id,
      "medicine_taken",
      JSON.stringify({ medicineId }),
      new Date().toISOString()
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Take medicine error:", error);
    res.status(500).json({ error: "Failed to mark medicine as taken" });
  }
});

// POST /api/patient/actions
router.post("/actions", (req, res) => {
  try {
    const db = req.app.get("db");
    const { actionType, details } = req.body || {};
    if (!actionType) return res.status(400).json({ error: "actionType is required" });

    db.prepare(
      `INSERT INTO patient_actions (id, patient_id, action_type, details, timestamp)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      uuidv4(),
      req.user.id,
      actionType,
      details ? JSON.stringify(details) : null,
      new Date().toISOString()
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Patient actions error:", error);
    res.status(500).json({ error: "Failed to record action" });
  }
});

// POST /api/patient/symptoms
router.use("/", symptomsRouter);

export default router;

