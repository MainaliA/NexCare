
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { triageSymptom } = require("./llm");
const { authMiddleware } = require("../middleware/auth-compat");

const router = express.Router();

// POST /api/patient/symptoms
router.post("/symptoms", authMiddleware, async (req, res) => {
  try {
    const db = req.app.get("db");
    const user = req.user;

    if (!user || user.role !== "patient") {
      return res.status(403).json({ error: "Only patients can report symptoms" });
    }

    const { description, severity = "medium", appointmentId } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Symptom description is required" });
    }

    // -- Find the relevant appointment for medical context --
    let appointment;
    if (appointmentId) {
      appointment = db.prepare(`
        SELECT a.*, d.name as doctor_name, d.id as doc_id
        FROM appointments a
        JOIN users d ON a.doctor_id = d.id
        WHERE a.id = ? AND a.patient_id = ?
      `).get(appointmentId, user.id);
    } else {
      // Fall back to most recent completed appointment
      appointment = db.prepare(`
        SELECT a.*, d.name as doctor_name, d.id as doc_id
        FROM appointments a
        JOIN users d ON a.doctor_id = d.id
        WHERE a.patient_id = ? AND a.status = 'completed'
        ORDER BY a.date DESC LIMIT 1
      `).get(user.id);
    }

    // -- No appointment context: save symptom without triage --
    if (!appointment) {
      const symptomId = uuidv4();
      db.prepare(`
        INSERT INTO symptoms (id, patient_id, description, severity, triage_result, triage_reasoning, reported_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(symptomId, user.id, description, severity, "unexpected",
        "No appointment context available for triage.", new Date().toISOString());

      return res.json({
        symptom: { id: symptomId, description, severity },
        triage: {
          assessment: "unexpected",
          confidence: 0,
          reasoning: "No prior appointment data available.",
          patientMessage: "We've recorded your symptom. Since we don't have your recent visit details, please mention this to your doctor.",
          doctorAlert: false,
          urgency: "routine",
        },
      });
    }

    // -- Run AI triage --
    const triageResult = await triageSymptom(
      description,
      severity,
      appointment.diagnosis_text || "",
      appointment.prescription_text || "",
      appointment.doctor_name
    );

    // -- Determine final severity (AI may upgrade it) --
    const finalSeverity =
      triageResult.urgency === "urgent" ? "high" :
      triageResult.urgency === "soon" ? "medium" :
      severity;

    // -- Save symptom --
    const symptomId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO symptoms (id, patient_id, appointment_id, description, severity, triage_result, triage_reasoning, triage_confidence, reported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      symptomId, user.id, appointment.id, description, finalSeverity,
      triageResult.assessment, triageResult.reasoning, triageResult.confidence, now
    );

    // -- Log the action --
    db.prepare(`
      INSERT INTO patient_actions (id, patient_id, action_type, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), user.id, "symptom_reported", JSON.stringify({
      symptomId,
      description: description.substring(0, 200),
      triage: triageResult.assessment,
      confidence: triageResult.confidence,
    }), now);

    // -- Create alert for doctor if triage says so --
    if (triageResult.doctorAlert) {
      db.prepare(`
        INSERT INTO alerts (id, patient_id, doctor_id, type, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), user.id, appointment.doc_id,
        triageResult.assessment === "escalate" ? "escalation" : "new_symptom",
        `${user.name} reported: "${description}" — Triage: ${triageResult.assessment.toUpperCase()} (${triageResult.confidence}% confidence). ${triageResult.reasoning}`,
        "unread", now
      );
    }

    // -- Return to frontend --
    res.json({
      symptom: { id: symptomId, description, severity: finalSeverity },
      triage: triageResult,
    });
  } catch (error) {
    console.error("Symptom reporting error:", error);
    res.status(500).json({
      error: "Something went wrong. If this is urgent, please call your doctor directly.",
    });
  }
});

module.exports = router;
