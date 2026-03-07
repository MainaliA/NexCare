
const express = require("express");
const { generateDailyReport } = require("./llm");
// If Person A mounts this file from outside routes/, change to require("./routes/llm")
const { authMiddleware } = require("../middleware/auth-compat");

const router = express.Router();

// GET /api/doctor/patients/:id/daily-report
router.get("/:id/daily-report", authMiddleware, async (req, res) => {
  try {
    const db = req.app.get("db");
    const doctorUser = req.user; // from auth middleware
    const patientId = req.params.id;

    // -- Verify patient exists --
    const patient = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'patient'").get(patientId);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // -- Get latest completed appointment for diagnosis context --
    const latestAppointment = db.prepare(`
      SELECT * FROM appointments 
      WHERE patient_id = ? AND status = 'completed'
      ORDER BY date DESC LIMIT 1
    `).get(patientId);

    // -- Get medicines for that appointment --
    const medicines = latestAppointment
      ? db.prepare("SELECT * FROM medicines WHERE appointment_id = ?").all(latestAppointment.id)
      : [];

    // -- Today's date boundaries --
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    // -- Today's patient actions --
    const todaysActions = db.prepare(`
      SELECT * FROM patient_actions 
      WHERE patient_id = ? AND timestamp >= ? AND timestamp <= ?
    `).all(patientId, startOfToday, endOfToday);

    const medicineTakenActions = todaysActions.filter(a => a.action_type === "medicine_taken");
    const chatbotActions = todaysActions.filter(a => a.action_type === "chatbot_used");

    // -- Figure out which medicines were taken --
    const takenMedicineIds = new Set();
    for (const action of medicineTakenActions) {
      try {
        const details = JSON.parse(action.details || "{}");
        if (details.medicineId) takenMedicineIds.add(details.medicineId);
      } catch {}
    }

    const missedMedicines = medicines
      .filter(m => !takenMedicineIds.has(m.id))
      .map(m => `${m.name} ${m.dosage}`);

    // -- Chat topics --
    const chatTopics = [];
    for (const action of chatbotActions) {
      try {
        const details = JSON.parse(action.details || "{}");
        if (details.questionPreview) chatTopics.push(details.questionPreview);
      } catch {}
    }

    // -- Symptoms reported today --
    const todaysSymptoms = db.prepare(`
      SELECT * FROM symptoms 
      WHERE patient_id = ? AND reported_at >= ? AND reported_at <= ?
    `).all(patientId, startOfToday, endOfToday);

    // -- Weekly adherence --
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weeklyMedicineActions = db.prepare(`
      SELECT COUNT(*) as count FROM patient_actions 
      WHERE patient_id = ? AND action_type = 'medicine_taken' AND timestamp >= ?
    `).get(patientId, weekAgo);

    const expectedWeeklyDoses = medicines.length * 7;
    const weeklyAdherence = expectedWeeklyDoses > 0
      ? Math.round((weeklyMedicineActions.count / expectedWeeklyDoses) * 100)
      : 100;

    // -- Call the AI --
    const reportInput = {
      patientName: patient.name,
      diagnosis: latestAppointment?.diagnosis_text || "No diagnosis on file",
      medicineTakenCount: medicineTakenActions.length,
      medicineTotalCount: medicines.length,
      missedMedicines,
      chatbotSessionCount: chatbotActions.length,
      chatTopics,
      newSymptoms: todaysSymptoms.map(s => ({
        description: s.description,
        triageResult: s.triage_result || "unknown",
      })),
      weeklyAdherencePercent: weeklyAdherence,
    };

    const report = await generateDailyReport(reportInput);

    res.json({
      report,
      raw: {
        medicineTaken: medicineTakenActions.length,
        medicineTotal: medicines.length,
        missedMedicines,
        chatbotSessions: chatbotActions.length,
        chatTopics,
        newSymptoms: todaysSymptoms.length,
        weeklyAdherence,
      },
    });
  } catch (error) {
    console.error("Daily report error:", error);
    res.status(500).json({ error: "Failed to generate daily report" });
  }
});

module.exports = router;
