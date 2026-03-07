// server/routes/chat.js
// ============================================================
// CHATBOT ENDPOINT — Person D owns this
// Multi-turn conversation grounded in doctor's notes
// ============================================================

import express from "express";
import { v4 as uuidv4 } from "uuid";
import { chatWithContext, triageSymptom } from "./llm.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();

// POST /api/chat — Send a message, get a grounded response
router.post("/", authMiddleware, requireRole("patient"), async (req, res) => {
  try {
    const user = req.user;
    const { appointmentId, message, history = [] } = req.body;

    if (!appointmentId || !message) {
      return res.status(400).json({ error: "appointmentId and message are required" });
    }

    const db = req.app.get("db");

    // Get appointment context
    const appointment = db.prepare(`
      SELECT a.*, 
             p.name as patient_name, 
             d.name as doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      WHERE a.id = ?
    `).get(appointmentId);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    if (appointment.patient_id !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Call the chatbot
    const { reply, symptomDetected } = await chatWithContext(
      message,
      history,
      appointment.patient_name,
      appointment.doctor_name,
      appointment.diagnosis_text || "No diagnosis on file",
      appointment.prescription_text || "No prescription on file",
      appointment.daily_actions || "No daily action plan on file"
    );

    // Save conversation to DB
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO chat_messages (id, appointment_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), appointmentId, "user", message, now);
    db.prepare(`INSERT INTO chat_messages (id, appointment_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), appointmentId, "assistant", reply, now);

    // Log chatbot usage
    db.prepare(`INSERT INTO patient_actions (id, patient_id, action_type, details, timestamp) VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), user.id, "chatbot_used", JSON.stringify({
        appointmentId,
        questionPreview: message.substring(0, 100),
        symptomDetected: symptomDetected || null,
      }), now);

    // If symptom detected in chat, auto-triage and alert
    let symptomData = null;
    if (symptomDetected) {
      const triageResult = await triageSymptom(
        symptomDetected,
        "medium",
        appointment.diagnosis_text || "",
        appointment.prescription_text || "",
        appointment.doctor_name
      );

      // Save symptom
      const symptomId = uuidv4();
      db.prepare(`INSERT INTO symptoms (id, patient_id, appointment_id, description, severity, triage_result, triage_reasoning, triage_confidence, reported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          symptomId, user.id, appointmentId, symptomDetected,
          triageResult.urgency === "urgent" ? "high" : "medium",
          triageResult.assessment, triageResult.reasoning, triageResult.confidence, now
        );

      // Create alert if needed
      if (triageResult.doctorAlert) {
        db.prepare(`INSERT INTO alerts (id, patient_id, doctor_id, type, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(
            uuidv4(), user.id, appointment.doctor_id,
            triageResult.assessment === "escalate" ? "escalation" : "new_symptom",
            `${user.name} mentioned during chat: "${symptomDetected}" — Triage: ${triageResult.assessment.toUpperCase()} (${triageResult.confidence}% confidence). ${triageResult.reasoning}`,
            "unread", now
          );
      }

      symptomData = { description: symptomDetected, triage: triageResult };
    }

    res.json({ reply, symptomDetected: symptomData });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET /api/chat?appointmentId=xxx — Load chat history
router.get("/", authMiddleware, (req, res) => {
  try {
    const { appointmentId } = req.query;

    if (!appointmentId) {
      return res.status(400).json({ error: "appointmentId is required" });
    }

    const db = req.app.get("db");
    const messages = db.prepare(
      `SELECT * FROM chat_messages WHERE appointment_id = ? ORDER BY timestamp ASC`
    ).all(appointmentId);

    res.json({ messages });
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

export default router;
