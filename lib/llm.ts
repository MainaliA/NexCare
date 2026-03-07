// lib/llm.ts — MERGED: Person D's Express LLM brain + Person B's Next.js interface
// Combines the robust fallback/demo-cache logic from server/routes/llm.js
// with the Next.js-compatible Anthropic SDK calls from the original lib/llm.ts

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = "claude-sonnet-4-20250514";
const FORCE_DEMO_CACHE = process.env.FORCE_DEMO_CACHE === "true";

// ── Demo Cache (from Person D's server/demo-cache.js) ────────────────────────

const DEMO_SUMMARY = JSON.stringify({
  whatIsHappening: "You have Type 2 Diabetes (a condition where your body has trouble managing blood sugar levels). Your HbA1c is a bit high at 8.2%, so we're starting medication to bring it down. Your blood pressure is slightly elevated too.",
  medications: [
    { name: "Metformin 500mg", dosage: "500mg", instruction: "Take one tablet twice a day — with breakfast and dinner. Helps control blood sugar." },
    { name: "Lisinopril 5mg", dosage: "5mg", instruction: "Take one tablet every morning. Helps lower blood pressure and protect kidneys." },
  ],
  dailyPlan: [
    "Check blood sugar every morning before eating",
    "Walk for 20 minutes after dinner",
    "Drink 8 glasses of water daily",
    "Avoid sugary drinks",
  ],
  warningSign: [
    "Call Dr. Chen if blood sugar is above 300 or below 70",
    "Go to the ER if you feel confused, shaky, or have chest pain",
    "Call the clinic if you notice unusual swelling in legs or ankles",
  ],
});

const DEMO_TRIAGE_EXPECTED: TriageResult = {
  assessment: "expected", confidence: 85,
  reasoning: "Mild nausea is a well-documented side effect of Metformin.",
  patientMessage: "Mild nausea is common when starting Metformin. It usually improves after the first week or two. Make sure you're taking it with food.",
  doctorAlert: false, urgency: "routine",
};

const DEMO_TRIAGE_ESCALATE: TriageResult = {
  assessment: "escalate", confidence: 92,
  reasoning: "Chest tightness in a patient with Type 2 Diabetes is a potential cardiovascular concern.",
  patientMessage: "This is something your doctor should know about right away. We've sent an alert. If it gets worse, call 911.",
  doctorAlert: true, urgency: "urgent",
};

// ── Shared helper ────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

// ── 1. Summary Generator ─────────────────────────────────────────────────────

export async function generateSummary(
  diagnosis: string,
  prescription: string,
  dailyActions: string,
): Promise<string> {
  if (FORCE_DEMO_CACHE) return DEMO_SUMMARY;

  const system = `You are a medical information translator. Convert the doctor's notes into a clear, warm, patient-friendly JSON summary.

Rules:
- Write at an 8th-grade reading level
- Explain medical terms in parentheses: "hypertension (high blood pressure)"
- Use encouraging but honest tone
- Never add medical information beyond what the doctor wrote

Respond ONLY with valid JSON in this exact shape:
{
  "whatIsHappening": "2-3 sentence plain explanation",
  "medications": [{ "name": "...", "dosage": "...", "instruction": "plain text" }],
  "dailyPlan": ["action 1", "action 2"],
  "warningSign": ["call doctor if ...", "go to ER if ..."]
}`;

  const user = `DIAGNOSIS: ${diagnosis}\nPRESCRIPTION: ${prescription}\nDAILY ACTIONS: ${dailyActions}`;
  try {
    return await callClaude(system, user, 1500);
  } catch (error) {
    console.error("Summary generation failed:", error);
    return DEMO_SUMMARY; // fallback
  }
}

// ── 2. Symptom Triage ────────────────────────────────────────────────────────

export interface TriageResult {
  assessment: "expected" | "unexpected" | "escalate";
  confidence: number;
  reasoning: string;
  patientMessage: string;
  doctorAlert: boolean;
  urgency: "routine" | "soon" | "urgent";
}

export async function triageSymptom(
  symptomDescription: string,
  severity: string,
  existingDiagnosis: string,
  existingPrescription: string,
): Promise<TriageResult> {
  if (FORCE_DEMO_CACHE) {
    const isEscalation = /chest|breath|heart|faint|collapse|seizure/i.test(symptomDescription);
    return isEscalation ? { ...DEMO_TRIAGE_ESCALATE } : { ...DEMO_TRIAGE_EXPECTED };
  }

  const system = `You are a medical triage classification assistant. Classify a patient's reported symptom.

Respond ONLY with valid JSON:
{
  "assessment": "expected" | "unexpected" | "escalate",
  "confidence": <0-100>,
  "reasoning": "brief reasoning",
  "patientMessage": "warm message for the patient",
  "doctorAlert": true | false,
  "urgency": "routine" | "soon" | "urgent"
}

When in doubt, ALWAYS escalate. Patient safety > accuracy.`;

  const user = `EXISTING DIAGNOSIS: ${existingDiagnosis}
CURRENT PRESCRIPTION: ${existingPrescription}
NEW SYMPTOM: ${symptomDescription}
PATIENT-REPORTED SEVERITY: ${severity}`;

  try {
    const raw = await callClaude(system, user, 500);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned) as TriageResult;
    // Safety validation
    if (!["expected", "unexpected", "escalate"].includes(result.assessment)) {
      result.assessment = "escalate";
      result.doctorAlert = true;
    }
    return result;
  } catch {
    // Safe fallback — always escalate if parsing fails
    return {
      assessment: "escalate", confidence: 50,
      reasoning: "Unable to assess automatically. Manual review required.",
      patientMessage: "We've flagged this for your doctor to review. Please contact them if symptoms worsen.",
      doctorAlert: true, urgency: "soon",
    };
  }
}

// ── 3. Chatbot ───────────────────────────────────────────────────────────────

export async function chatWithContext(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  diagnosis: string,
  prescription: string,
  dailyActions: string,
  patientName: string,
  doctorName: string,
): Promise<string> {
  if (FORCE_DEMO_CACHE) {
    const lower = message.toLowerCase();
    if (lower.includes("side effect")) return "Metformin can sometimes cause stomach upset or nausea, especially when you first start it. This usually gets better after the first week. Taking it with food helps a lot.";
    if (lower.includes("hba1c"))       return "HbA1c is a blood test showing your average blood sugar over 2-3 months. Yours was 8.2%, and the goal is to get it closer to 7% or below.";
    return `That's a great question. Based on your doctor's notes, I'd recommend discussing this specific detail with Dr. ${doctorName} at your next appointment.`;
  }

  const system = `You are a friendly medical information assistant for ${patientName}.
You may ONLY discuss information from the following doctor's notes.

DIAGNOSIS: ${diagnosis}
PRESCRIPTION: ${prescription}
DAILY ACTIONS: ${dailyActions}

Rules:
- Only answer questions answerable from the notes above
- If asked about anything not covered, say: "That's not in your doctor's notes. Please bring this up with Dr. ${doctorName}."
- Never diagnose, never suggest medications, never contradict the doctor
- Keep responses to 2-4 sentences
- Use simple, everyday language`;

  const messages = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system,
      messages,
    });
    const block = msg.content[0];
    if (block.type !== "text") throw new Error("Unexpected response type");
    return block.text;
  } catch (error) {
    console.error("Chatbot error:", error);
    return "I'm having a little trouble right now. Please try again in a moment, or contact your doctor's office directly if urgent.";
  }
}

// ── 4. Daily Report ──────────────────────────────────────────────────────────

export async function generateDailyReport(
  patientName: string,
  diagnosis: string,
  takenCount: number,
  totalCount: number,
  missedMedicines: string[],
  chatCount: number,
  symptoms: string[],
  weeklyAdherence: number,
): Promise<string> {
  if (FORCE_DEMO_CACHE) {
    return `${patientName} took ${takenCount} of ${totalCount} scheduled doses today. ${chatCount} chatbot session(s). ${symptoms.length > 0 ? `Reported: ${symptoms.join("; ")}` : "No new symptoms."} Weekly adherence: ${weeklyAdherence}%.\n\n**Status: ${weeklyAdherence >= 80 ? "STABLE" : "MONITOR"}**`;
  }

  const system = `Generate a concise daily tracking report for a doctor. Be factual and clinical. 3-5 sentences. End with Status: STABLE / MONITOR / ATTENTION NEEDED.`;

  const user = `PATIENT: ${patientName}\nDIAGNOSIS: ${diagnosis}\nMedicines: ${takenCount}/${totalCount}, Missed: ${missedMedicines.join(", ") || "none"}\nChatbot: ${chatCount} sessions\nSymptoms: ${symptoms.join("; ") || "none"}\nWeekly adherence: ${weeklyAdherence}%`;

  try {
    return await callClaude(system, user, 400);
  } catch {
    return `${patientName}: ${takenCount}/${totalCount} medicines taken. Weekly adherence: ${weeklyAdherence}%.\n\n**Status: MONITOR**`;
  }
}
