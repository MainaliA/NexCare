// lib/llm.ts — MERGED: Person D's Express LLM + Person B's Next.js interface + demo cache fallbacks

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = "claude-sonnet-4-20250514";
const FORCE_DEMO_CACHE = process.env.FORCE_DEMO_CACHE === "true";

// ── Demo cache fallbacks ─────────────────────────────────────────────────────

const DEMO_SUMMARY = JSON.stringify({
  whatIsHappening: "You have Type 2 Diabetes (a condition where your body has trouble managing blood sugar levels). Your HbA1c is a bit high at 8.2%, so we're starting medication to bring it down. Your blood pressure is slightly elevated too.",
  medications: [
    { name: "Metformin 500mg", dosage: "500mg", instruction: "Take one tablet twice a day — with breakfast and dinner. Helps control blood sugar." },
    { name: "Lisinopril 5mg", dosage: "5mg", instruction: "Take one tablet every morning. Helps lower blood pressure and protect kidneys." },
  ],
  dailyPlan: ["Check blood sugar every morning before eating", "Walk for 20 minutes after dinner", "Drink 8 glasses of water daily", "Avoid sugary drinks"],
  warningSign: ["Call Dr. Chen if blood sugar is above 300 or below 70", "Go to the ER if you feel confused, shaky, or have chest pain", "Call the clinic if you notice unusual swelling in legs or ankles"],
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

// ── Base helper ──────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string> {
  const msg = await client.messages.create({ model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: "user", content: userMessage }] });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

// ── 1. Summary Generator ─────────────────────────────────────────────────────

export async function generateSummary(diagnosis: string, prescription: string, dailyActions: string): Promise<string> {
  if (FORCE_DEMO_CACHE) return DEMO_SUMMARY;
  const system = `You are a medical information translator. Convert doctor's notes into patient-friendly JSON.\nRules: 8th-grade reading level, explain medical terms in parentheses, warm tone, never add info beyond what doctor wrote.\nRespond ONLY with valid JSON: { "whatIsHappening": "...", "medications": [{"name":"...","dosage":"...","instruction":"..."}], "dailyPlan": ["..."], "warningSign": ["..."] }`;
  try { return await callClaude(system, `DIAGNOSIS: ${diagnosis}\nPRESCRIPTION: ${prescription}\nDAILY ACTIONS: ${dailyActions}`, 1500); }
  catch { return DEMO_SUMMARY; }
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

export async function triageSymptom(symptomDescription: string, severity: string, existingDiagnosis: string, existingPrescription: string): Promise<TriageResult> {
  if (FORCE_DEMO_CACHE) {
    return /chest|breath|heart|faint|collapse|seizure/i.test(symptomDescription) ? { ...DEMO_TRIAGE_ESCALATE } : { ...DEMO_TRIAGE_EXPECTED };
  }
  const system = `You are a medical triage assistant. Classify a patient's symptom.\nRespond ONLY with JSON: { "assessment": "expected"|"unexpected"|"escalate", "confidence": 0-100, "reasoning": "...", "patientMessage": "...", "doctorAlert": true|false, "urgency": "routine"|"soon"|"urgent" }\nWhen in doubt, ALWAYS escalate.`;
  const user = `DIAGNOSIS: ${existingDiagnosis}\nPRESCRIPTION: ${existingPrescription}\nSYMPTOM: ${symptomDescription}\nSEVERITY: ${severity}`;
  try {
    const raw = await callClaude(system, user, 500);
    const result = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()) as TriageResult;
    if (!["expected", "unexpected", "escalate"].includes(result.assessment)) { result.assessment = "escalate"; result.doctorAlert = true; }
    return result;
  } catch {
    return { assessment: "escalate", confidence: 50, reasoning: "Unable to assess automatically.", patientMessage: "We've flagged this for your doctor to review.", doctorAlert: true, urgency: "soon" };
  }
}

// ── 3. Chatbot (with symptom detection) ──────────────────────────────────────

export interface ChatResult {
  reply: string;
  symptomDetected: string | null;
}

// Symptom keywords used for demo-cache matching
const SYMPTOM_KEYWORDS = ["dizzy", "dizziness", "headache", "pain", "nausea", "nauseous", "vomit", "vomiting", "bleeding", "swelling", "rash", "numbness", "tingling", "fever", "chills", "faint", "fainting"];

export async function chatWithContext(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  diagnosis: string,
  prescription: string,
  dailyActions: string,
  patientName: string,
  doctorName: string,
): Promise<ChatResult> {
  // ── Demo cache mode ──
  if (FORCE_DEMO_CACHE) {
    const lower = message.toLowerCase();

    // Check for symptom keywords first
    const matchedSymptom = SYMPTOM_KEYWORDS.find((kw) => lower.includes(kw));
    if (matchedSymptom) {
      return {
        reply: `I'm sorry to hear you're experiencing ${matchedSymptom}. This sounds like something Dr. ${doctorName} should know about. I've flagged it for review. If it gets worse or you feel it's an emergency, please contact the clinic or call 911 right away.`,
        symptomDetected: `${matchedSymptom} reported by patient`,
      };
    }

    // Standard knowledge replies
    if (lower.includes("side effect")) {
      return { reply: "Metformin can sometimes cause stomach upset or nausea, especially when you first start it. Taking it with food helps. This usually gets better after the first week.", symptomDetected: null };
    }
    if (lower.includes("hba1c")) {
      return { reply: "HbA1c is a blood test showing your average blood sugar over 2-3 months. Yours was 8.2%, and the goal is closer to 7% or below.", symptomDetected: null };
    }
    if (lower.includes("medicine") || lower.includes("when") || lower.includes("take")) {
      return { reply: "Take your Metformin twice a day with meals — once at breakfast and once at dinner. Your Lisinopril should be taken once in the morning. Setting a phone alarm can help you remember!", symptomDetected: null };
    }
    if (lower.includes("fruit") || lower.includes("eat") || lower.includes("food") || lower.includes("diet")) {
      return { reply: "Your doctor recommends watching your carb intake. Fruit is okay in small portions — a small apple or handful of berries is fine. Pairing fruit with protein like almonds helps slow sugar absorption.", symptomDetected: null };
    }
    if (lower.includes("exercise") || lower.includes("walk") || lower.includes("active")) {
      return { reply: "Your daily plan includes walking for 20 minutes after dinner. Even a slow, gentle walk helps with blood sugar control. Start small and build up gradually.", symptomDetected: null };
    }
    if (lower.includes("water") || lower.includes("drink")) {
      return { reply: "Your doctor recommends drinking at least 8 glasses of water throughout the day. Staying hydrated helps your kidneys and supports the medications you're taking.", symptomDetected: null };
    }
    if (lower.includes("worried") || lower.includes("scared") || lower.includes("anxious") || lower.includes("nervous")) {
      return { reply: "It's completely normal to feel that way after a diagnosis. The important thing is that your doctor has a clear treatment plan, and you're taking great steps by staying informed. You're not alone in this.", symptomDetected: null };
    }

    return {
      reply: `That's a great question. I'd recommend discussing this specific detail with Dr. ${doctorName} at your next appointment.`,
      symptomDetected: null,
    };
  }

  // ── Live Claude mode ──
  const system = `You are a friendly medical info assistant for ${patientName}. ONLY discuss info from these notes:

DIAGNOSIS: ${diagnosis}
PRESCRIPTION: ${prescription}
DAILY ACTIONS: ${dailyActions}

Rules:
1. Only answer questions answerable from the notes above.
2. If asked about anything not in the notes, say: "That's not in your doctor's notes. Please bring this up with Dr. ${doctorName} at your next appointment."
3. Never diagnose, suggest medications, or contradict the doctor.
4. If the patient expresses worry, acknowledge it warmly.
5. Keep responses to 2-4 sentences. Use simple, everyday language.
6. If the patient describes a NEW SYMPTOM that is NOT already mentioned in the diagnosis or prescription notes above, respond warmly and then include this exact tag on its own line at the END of your response: [SYMPTOM_DETECTED: brief description of the symptom]. Only use this tag for genuinely new symptoms, not for things already covered in the notes.`;

  const messages = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const msg = await client.messages.create({ model: MODEL, max_tokens: 512, system, messages });
    const block = msg.content[0];
    if (block.type !== "text") throw new Error("Unexpected response type");

    const rawReply = block.text;

    // Parse [SYMPTOM_DETECTED: ...] tag
    const symptomMatch = rawReply.match(/\[SYMPTOM_DETECTED:\s*(.+?)\]/);
    const cleanReply = rawReply.replace(/\n?\[SYMPTOM_DETECTED:\s*.+?\]\n?/, "").trim();
    const symptomDetected = symptomMatch ? symptomMatch[1].trim() : null;

    return { reply: cleanReply, symptomDetected };
  } catch {
    return {
      reply: "I'm having trouble right now. Please try again, or contact your doctor's office if urgent.",
      symptomDetected: null,
    };
  }
}

// ── 4. Daily Report ──────────────────────────────────────────────────────────

export async function generateDailyReport(patientName: string, diagnosis: string, takenCount: number, totalCount: number, missedMedicines: string[], chatCount: number, symptoms: string[], weeklyAdherence: number): Promise<string> {
  if (FORCE_DEMO_CACHE) return `${patientName} took ${takenCount}/${totalCount} doses today. ${chatCount} chatbot session(s). ${symptoms.length > 0 ? `Reported: ${symptoms.join("; ")}` : "No new symptoms."} Weekly adherence: ${weeklyAdherence}%.\n\n**Status: ${weeklyAdherence >= 80 ? "STABLE" : "MONITOR"}**`;
  const system = `Generate a concise daily report for a doctor. 3-5 sentences. End with Status: STABLE / MONITOR / ATTENTION NEEDED.`;
  const user = `PATIENT: ${patientName}\nDIAGNOSIS: ${diagnosis}\nMedicines: ${takenCount}/${totalCount}, Missed: ${missedMedicines.join(", ") || "none"}\nChatbot: ${chatCount} sessions\nSymptoms: ${symptoms.join("; ") || "none"}\nAdherence: ${weeklyAdherence}%`;
  try { return await callClaude(system, user, 400); }
  catch { return `${patientName}: ${takenCount}/${totalCount} meds taken. Adherence: ${weeklyAdherence}%.\n\n**Status: MONITOR**`; }
}

// ── 5. Pre-Visit Checklist ──────────────────────────────────────────────────

const DEMO_CHECKLIST = [
  "Fast for 12 hours before your appointment",
  "Bring your blood sugar log from the past 2 weeks",
  "Bring your food diary",
  "List any new symptoms you've experienced since your last visit",
  "Write down any questions you want to ask your doctor",
];

export async function generatePreVisitChecklist(
  diagnosis: string,
  prescription: string,
): Promise<string[]> {
  if (FORCE_DEMO_CACHE) return DEMO_CHECKLIST;

  const system =
    "Generate a pre-visit checklist of 3-5 items for a patient returning for a follow-up. " +
    "Items should be specific to their diagnosis and treatment. " +
    "Return ONLY a JSON array of strings. No markdown. No backticks. " +
    'Always include "Write down any questions you want to ask your doctor" as the last item.';

  try {
    const raw = await callClaude(
      system,
      `DIAGNOSIS: ${diagnosis}\nPRESCRIPTION: ${prescription}`,
      300,
    );

    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }

    console.error("generatePreVisitChecklist: unexpected shape, falling back to demo");
    return DEMO_CHECKLIST;
  } catch (error) {
    console.error("generatePreVisitChecklist failed:", error);
    return DEMO_CHECKLIST;
  }
}
