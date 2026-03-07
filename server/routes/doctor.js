import express from "express";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { generatePreVisitChecklist, generateSummary } from "./llm.js";
import dailyReportRouter from "./daily-report.js";

const router = express.Router();

router.use(authMiddleware, requireRole("doctor"));

// GET /api/doctor/patients
router.get("/patients", (req, res) => {
  try {
    const db = req.app.get("db");
    const rows = db.prepare(
      `
      SELECT
        u.id as patient_id,
        u.name as patient_name,
        u.email as patient_email,
        a.id as latest_appointment_id,
        a.date as latest_appointment_date,
        a.diagnosis_text as latest_diagnosis_text,
        (SELECT COUNT(*) FROM alerts al WHERE al.patient_id = u.id AND al.doctor_id = ? AND al.status = 'unread') as unread_alert_count
      FROM users u
      LEFT JOIN (
        SELECT a1.*
        FROM appointments a1
        JOIN (
          SELECT patient_id, MAX(date) as max_date
          FROM appointments
          WHERE doctor_id = ?
          GROUP BY patient_id
        ) latest
        ON a1.patient_id = latest.patient_id AND a1.date = latest.max_date
        WHERE a1.doctor_id = ?
      ) a
      ON a.patient_id = u.id
      WHERE u.role = 'patient'
      AND EXISTS (SELECT 1 FROM appointments ax WHERE ax.patient_id = u.id AND ax.doctor_id = ?)
      ORDER BY u.name ASC
      `
    ).all(req.user.id, req.user.id, req.user.id, req.user.id);

    const patients = rows.map((r) => ({
      id: r.patient_id,
      name: r.patient_name,
      email: r.patient_email,
      latestAppointment: r.latest_appointment_id
        ? {
            id: r.latest_appointment_id,
            date: r.latest_appointment_date,
            diagnosis_text: r.latest_diagnosis_text,
          }
        : null,
      unreadAlertCount: r.unread_alert_count,
    }));

    res.json({ patients });
  } catch (error) {
    console.error("Doctor patients error:", error);
    res.status(500).json({ error: "Failed to load patients" });
  }
});

// GET /api/doctor/patients/:id
router.get("/patients/:id", (req, res) => {
  try {
    const db = req.app.get("db");
    const patientId = req.params.id;

    const patient = db.prepare(
      `SELECT id, email, name, role, created_at FROM users WHERE id = ? AND role = 'patient'`
    ).get(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const appointments = db.prepare(
      `SELECT * FROM appointments WHERE patient_id = ? AND doctor_id = ? ORDER BY date DESC`
    ).all(patientId, req.user.id);

    const apptIds = appointments.map((a) => a.id);
    const medicinesByAppt = new Map();
    if (apptIds.length) {
      const placeholders = apptIds.map(() => "?").join(",");
      const meds = db.prepare(
        `SELECT * FROM medicines WHERE appointment_id IN (${placeholders})`
      ).all(...apptIds);
      for (const m of meds) {
        const arr = medicinesByAppt.get(m.appointment_id) || [];
        arr.push(m);
        medicinesByAppt.set(m.appointment_id, arr);
      }
    }

    const symptoms = db.prepare(
      `SELECT * FROM symptoms WHERE patient_id = ? ORDER BY reported_at DESC`
    ).all(patientId);

    const actions = db.prepare(
      `SELECT * FROM patient_actions WHERE patient_id = ? ORDER BY timestamp DESC`
    ).all(patientId);

    const alerts = db.prepare(
      `SELECT * FROM alerts WHERE patient_id = ? AND doctor_id = ? ORDER BY created_at DESC`
    ).all(patientId, req.user.id);

    res.json({
      patient,
      appointments: appointments.map((a) => ({ ...a, medicines: medicinesByAppt.get(a.id) || [] })),
      symptoms,
      actions,
      alerts,
    });
  } catch (error) {
    console.error("Doctor patient detail error:", error);
    res.status(500).json({ error: "Failed to load patient detail" });
  }
});

// POST /api/doctor/appointments
router.post("/appointments", async (req, res) => {
  try {
    const db = req.app.get("db");
    const {
      patientId,
      date,
      prescriptionText,
      diagnosisText,
      dailyActions,
      medicines = [],
      language,
    } = req.body || {};

    if (!patientId || !date) {
      return res.status(400).json({ error: "patientId and date are required" });
    }

    const patient = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'patient'`).get(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const apptId = uuidv4();

    // Generate AI summary + checklist (best-effort)
    let llmSummary = null;
    let checklist = null;
    try {
      llmSummary = await generateSummary(diagnosisText || "", prescriptionText || "", dailyActions || "", patient.name, language);
    } catch (e) {
      console.warn("generateSummary failed:", e?.message || e);
    }
    try {
      checklist = await generatePreVisitChecklist(diagnosisText || "", prescriptionText || "");
    } catch (e) {
      console.warn("generatePreVisitChecklist failed:", e?.message || e);
    }

    db.prepare(
      `INSERT INTO appointments
        (id, patient_id, doctor_id, date, status, prescription_text, diagnosis_text, daily_actions, llm_summary, pre_visit_checklist)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      apptId,
      patientId,
      req.user.id,
      new Date(date).toISOString(),
      "completed",
      prescriptionText || null,
      diagnosisText || null,
      dailyActions || null,
      llmSummary,
      checklist ? JSON.stringify(checklist) : null
    );

    for (const med of medicines) {
      if (!med?.name || !med?.dosage || !med?.frequency || !med?.times) continue;
      const times = Array.isArray(med.times) ? med.times : med.times;
      db.prepare(
        `INSERT INTO medicines (id, appointment_id, name, dosage, frequency, times)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), apptId, med.name, med.dosage, med.frequency, JSON.stringify(times));
    }

    const appointment = db.prepare(`SELECT * FROM appointments WHERE id = ?`).get(apptId);
    res.json({ appointment, llmSummary, checklist });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

// GET /api/doctor/alerts
router.get("/alerts", (req, res) => {
  try {
    const db = req.app.get("db");
    const alerts = db.prepare(
      `SELECT * FROM alerts WHERE doctor_id = ? ORDER BY created_at DESC`
    ).all(req.user.id);
    res.json({ alerts });
  } catch (error) {
    console.error("Doctor alerts error:", error);
    res.status(500).json({ error: "Failed to load alerts" });
  }
});

// POST /api/doctor/alerts/:id/acknowledge
router.post("/alerts/:id/acknowledge", (req, res) => {
  try {
    const db = req.app.get("db");
    const alertId = req.params.id;

    const alert = db.prepare(`SELECT * FROM alerts WHERE id = ? AND doctor_id = ?`).get(alertId, req.user.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });

    db.prepare(`UPDATE alerts SET status = 'read' WHERE id = ?`).run(alertId);
    res.json({ success: true });
  } catch (error) {
    console.error("Acknowledge alert error:", error);
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
});

// POST /api/doctor/patients/:id/reschedule
router.post("/patients/:id/reschedule", (req, res) => {
  try {
    const db = req.app.get("db");
    const patientId = req.params.id;
    const { newDate, reason, appointmentId } = req.body || {};

    if (!newDate) return res.status(400).json({ error: "newDate is required" });

    let appt;
    if (appointmentId) {
      appt = db.prepare(`SELECT * FROM appointments WHERE id = ? AND doctor_id = ? AND patient_id = ?`).get(
        appointmentId,
        req.user.id,
        patientId
      );
    } else {
      appt = db.prepare(
        `SELECT * FROM appointments WHERE doctor_id = ? AND patient_id = ? ORDER BY date DESC LIMIT 1`
      ).get(req.user.id, patientId);
    }

    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    db.prepare(`UPDATE appointments SET date = ? , status = 'scheduled' WHERE id = ?`).run(
      new Date(newDate).toISOString(),
      appt.id
    );

    if (reason) {
      db.prepare(
        `INSERT INTO alerts (id, patient_id, doctor_id, type, message, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        uuidv4(),
        patientId,
        req.user.id,
        "new_symptom",
        `Reschedule requested: ${reason}`,
        "unread",
        new Date().toISOString()
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Reschedule error:", error);
    res.status(500).json({ error: "Failed to reschedule" });
  }
});

// GET /api/doctor/patients/:id/daily-report
router.use("/patients", dailyReportRouter);

export default router;

