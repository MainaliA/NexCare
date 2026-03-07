// lib/llm.ts — Person D owns this; Person B calls triageSymptom + chatWithContext

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
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
  dailyActions: string
): Promise<string> {
  const system = `You are a medical information translator. Convert the doctor's notes into a clear, warm, patient-friendly JSON summary.

Rules:
- Write at an 8th-grade reading level
- Explain medical terms in parentheses: "hypertension (high blood pressure)"
- Use encouraging but honest tone
- Never add medical information beyond what the doctor wrote
- If the diagnosis involves a serious condition, acknowledge the emotional weight

Respond ONLY with valid JSON in this exact shape:
{
  "whatIsHappening": "2-3 sentence plain explanation",
  "medications": [{ "name": "...", "dosage": "...", "instruction": "plain text" }],
  "dailyPlan": ["action 1", "action 2"],
  "warningSign": ["call doctor if ...", "go to ER if ..."]
}`;

  const user = `DIAGNOSIS: ${diagnosis}\nPRESCRIPTION: ${prescription}\nDAILY ACTIONS: ${dailyActions}`;
  const raw = await callClaude(system, user);
  return raw; // caller parses JSON
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
  existingPrescription: string
): Promise<TriageResult> {
  const system = `You are a medical triage assistant. Classify a patient's reported symptom.

Respond ONLY with valid JSON in this exact shape:
{
  "assessment": "expected" | "unexpected" | "escalate",
  "confidence": <0-100>,
  "reasoning": "brief medical reasoning (1-2 sentences)",
  "patientMessage": "warm, simple message to show the patient (max 2 sentences)",
  "doctorAlert": true | false,
  "urgency": "routine" | "soon" | "urgent"
}

Classification:
- "expected": Known side effect or typical symptom progression
- "unexpected": Not clearly related, but not immediately dangerous
- "escalate": Potentially serious — chest pain, difficulty breathing, allergic reaction, sudden vision changes, etc.
- When in doubt, escalate. Patient safety > accuracy.`;

  const user = `EXISTING DIAGNOSIS: ${existingDiagnosis}
CURRENT PRESCRIPTION: ${existingPrescription}
NEW SYMPTOM: ${symptomDescription}
PATIENT-REPORTED SEVERITY: ${severity}`;

  try {
    const raw = await callClaude(system, user);
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as TriageResult;
  } catch {
    // Safe fallback — always escalate if parsing fails
    return {
      assessment: "escalate",
      confidence: 50,
      reasoning: "Unable to assess automatically. Manual review required.",
      patientMessage: "We've flagged this for your doctor to review. Please contact them if symptoms worsen.",
      doctorAlert: true,
      urgency: "soon",
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
  doctorName: string
): Promise<string> {
  const system = `You are a medical information assistant for ${patientName}.
You may ONLY discuss information from the following doctor's notes.

DIAGNOSIS: ${diagnosis}
PRESCRIPTION: ${prescription}
DAILY ACTIONS: ${dailyActions}

Rules:
- Only answer questions answerable from the notes above
- If asked about anything not covered, say: "That's not in your doctor's notes. Please bring this up with Dr. ${doctorName} at your next appointment."
- Never diagnose, never suggest medications, never contradict the doctor
- If the patient expresses worry, acknowledge it warmly
- If the patient describes a NEW symptom, say: "This sounds like something Dr. ${doctorName} should know about. Please use the 'Report Symptom' button on your dashboard."
- Keep responses to 2-4 sentences unless asked for more detail
- Use simple, everyday language`;

  const messages = [
    ...history,
    { role: "user" as const, content: message },
  ];

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system,
    messages,
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
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
  weeklyAdherence: number
): Promise<string> {
  const system = `Generate a concise daily tracking report for a doctor about their patient. Be factual and clinical. Format as 3-4 sentences. Flag anything concerning. End with a one-word status: STABLE / MONITOR / ATTENTION NEEDED.`;

  const user = `PATIENT: ${patientName}
DIAGNOSIS: ${diagnosis}
TODAY'S DATA:
- Medicines taken: ${takenCount}/${totalCount}
  Missed: ${missedMedicines.join(", ") || "none"}
- Chatbot interactions: ${chatCount} sessions
- New symptoms reported: ${symptoms.join("; ") || "none"}
- Overall adherence this week: ${weeklyAdherence}%`;

  return callClaude(system, user);
}
