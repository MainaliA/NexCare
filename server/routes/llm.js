// server/routes/llm.js
// ============================================================
// THE AI BRAIN — Person D's core module
// All LLM-powered features flow through this file.
// Other routes import from here; they never call Claude directly.
// ============================================================

const demoCache = require("../demo-cache");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// Set to true to force demo-cache responses (useful for offline dev / demo rehearsal)
const FORCE_DEMO_CACHE = process.env.FORCE_DEMO_CACHE === "true";

// ------------------------------------------------------------------
// Base API call — every other function uses this
// ------------------------------------------------------------------
async function callClaude(systemPrompt, userMessage, options = {}) {
  const { maxTokens = 1024, temperature = 0.3 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Claude API error ${response.status}:`, errorBody);
      throw new Error(`Claude API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!text) throw new Error("Empty response from Claude");
    return text;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("AI service timed out. Please try again.");
    }
    throw error;
  }
}

// For multi-turn chatbot conversations
async function callClaudeWithHistory(systemPrompt, messages, options = {}) {
  const { maxTokens = 1024, temperature = 0.3 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Claude API error ${response.status}:`, errorBody);
      throw new Error(`Claude API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!text) throw new Error("Empty response from Claude");
    return text;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("AI service timed out. Please try again.");
    }
    throw error;
  }
}

// ==================================================================
// FUNCTION 1: SUMMARY GENERATOR
// ==================================================================

const SUMMARY_SYSTEM_PROMPT = `You are a compassionate medical information translator who helps patients understand their doctor's notes.

Your job: Convert clinical notes into a clear, warm, patient-friendly summary.

FORMAT your response in exactly these three sections using markdown headers:

## 🔍 What We Found
Explain the diagnosis in simple terms. If there are medical terms, explain them in parentheses: "hypertension (high blood pressure)". Be honest but reassuring.

## 💊 Your Medicines
List each medicine with:
- What it's called
- What it does in simple terms
- When and how to take it
- Common side effects to watch for (only from the prescription notes)

## 📋 Your Daily Plan
Translate the doctor's daily action recommendations into a simple checklist. Be specific about times and amounts when provided.

RULES:
- Write at an 8th-grade reading level
- Use short sentences and everyday words
- NEVER add medical information beyond what the doctor wrote
- If the diagnosis is serious or scary, acknowledge it warmly: "We understand this may feel overwhelming, but your doctor has a clear plan for you."
- If the notes are vague, summarize what's there without guessing
- End with: "💬 Have questions? Tap **Ask About This** below to chat with your medical assistant."`;

async function generateSummary(diagnosis, prescription, dailyActions, patientName, language) {
  // Demo-cache shortcircuit
  if (FORCE_DEMO_CACHE) {
    console.log("[LLM] FORCE_DEMO_CACHE: returning cached summary");
    return demoCache.DEMO_SUMMARY_MARIA;
  }

  let prompt = SUMMARY_SYSTEM_PROMPT;
  if (language && language !== "en") {
    const langMap = { es: "Spanish", zh: "Mandarin Chinese", fr: "French", ko: "Korean", ja: "Japanese", ar: "Arabic" };
    const langName = langMap[language] || language;
    prompt += `\n\nIMPORTANT: Write the ENTIRE summary in ${langName}. Keep the emoji headers.`;
  }

  const userMessage = `Please create a patient-friendly summary of these doctor's notes.

PATIENT: ${patientName || "the patient"}

DIAGNOSIS:
${diagnosis}

PRESCRIPTION:
${prescription}

DAILY ACTION RECOMMENDATIONS:
${dailyActions}`;

  try {
    return await callClaude(prompt, userMessage, { maxTokens: 1500, temperature: 0.3 });
  } catch (error) {
    console.error("Summary generation failed:", error);
    console.log("[LLM] Falling back to demo-cache summary");
    // If the diagnosis looks like Maria's diabetes case, use the cached version
    if (diagnosis && diagnosis.toLowerCase().includes("diabetes")) {
      return demoCache.DEMO_SUMMARY_MARIA;
    }
    return `## Summary Temporarily Unavailable\n\nWe're having trouble generating your summary right now. Your doctor's notes have been saved — please check back shortly.\n\n💬 Have questions? Tap **Ask About This** below to chat with your medical assistant.`;
  }
}

// ==================================================================
// FUNCTION 2: SYMPTOM TRIAGE AGENT
// ==================================================================

const TRIAGE_SYSTEM_PROMPT = `You are a medical triage classification assistant. Your ONLY job is to classify a patient's newly reported symptom relative to their existing diagnosis and treatment.

CLASSIFICATION RULES:
- "expected": Known side effect of their medication OR typical symptom of their diagnosed condition. Examples: mild nausea with metformin, fatigue during chemotherapy, increased thirst with diabetes.
- "unexpected": Not clearly related to diagnosis or treatment, not immediately dangerous. Examples: new mild rash, occasional joint pain, change in appetite.
- "escalate": Potentially serious, time-sensitive, or could indicate a dangerous complication. Examples: chest pain, difficulty breathing, allergic reaction signs, sudden vision changes, severe abdominal pain, signs of hypo/hyperglycemic crisis.

CRITICAL SAFETY RULE: When in doubt, ALWAYS escalate. Patient safety overrides classification accuracy.

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no backticks, pure JSON):
{
  "assessment": "expected" | "unexpected" | "escalate",
  "confidence": <number 0-100>,
  "reasoning": "<1-2 sentence clinical reasoning>",
  "patientMessage": "<warm, simple 1-3 sentence message for the patient>",
  "doctorAlert": true | false,
  "urgency": "routine" | "soon" | "urgent"
}

PATIENT MESSAGE GUIDELINES:
- "expected": Reassure but advise monitoring.
- "unexpected": Acknowledge without alarming. Note it for doctor review.
- "escalate": Be calm but clear. Mention the doctor has been alerted. If potentially life-threatening, mention calling 911.`;

async function triageSymptom(symptomDescription, severity, existingDiagnosis, existingPrescription, doctorName) {
  // Demo-cache shortcircuit
  if (FORCE_DEMO_CACHE) {
    const isEscalation = /chest|breath|heart|faint|collapse|seizure/i.test(symptomDescription);
    console.log(`[LLM] FORCE_DEMO_CACHE: returning ${isEscalation ? "escalate" : "expected"} triage`);
    return isEscalation ? demoCache.DEMO_TRIAGE_ESCALATE : demoCache.DEMO_TRIAGE_EXPECTED;
  }

  const userMessage = `EXISTING DIAGNOSIS: ${existingDiagnosis}

CURRENT PRESCRIPTION: ${existingPrescription}

NEW SYMPTOM REPORTED BY PATIENT:
Description: ${symptomDescription}
Patient-reported severity: ${severity}

Classify this symptom. Doctor's name for the patient message: Dr. ${doctorName || "your doctor"}.`;

  try {
    const raw = await callClaude(TRIAGE_SYSTEM_PROMPT, userMessage, {
      maxTokens: 500,
      temperature: 0.1,
    });

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const result = JSON.parse(cleaned);

    // Safety validation
    if (!["expected", "unexpected", "escalate"].includes(result.assessment)) {
      result.assessment = "escalate";
      result.doctorAlert = true;
      result.urgency = "soon";
    }

    return result;
  } catch (error) {
    console.error("Triage failed:", error);
    console.log("[LLM] Falling back to demo-cache triage");

    // Smart fallback: keyword-match to decide expected vs escalate
    const escalationKeywords = /chest|breath|heart|faint|collapse|seizure|vision|swelling|allergic|severe pain/i;
    const expectedKeywords = /nausea|tired|fatigue|thirst|stomach|appetite|diarrhea|dizzy/i;

    if (escalationKeywords.test(symptomDescription)) {
      return { ...demoCache.DEMO_TRIAGE_ESCALATE };
    }
    if (expectedKeywords.test(symptomDescription)) {
      return { ...demoCache.DEMO_TRIAGE_EXPECTED };
    }

    // Unknown symptom — default to escalate for safety
    return {
      assessment: "escalate",
      confidence: 0,
      reasoning: "Automated triage was unable to classify this symptom. Escalating for safety.",
      patientMessage: `We weren't able to automatically assess this symptom. We've notified Dr. ${doctorName || "your doctor"} to review it. If you feel this is an emergency, please call 911.`,
      doctorAlert: true,
      urgency: "soon",
    };
  }
}

// ==================================================================
// FUNCTION 3: CONTEXTUAL CHATBOT
// ==================================================================

function buildChatSystemPrompt(patientName, doctorName, diagnosis, prescription, dailyActions) {
  return `You are a friendly, patient medical information assistant for ${patientName}. You help patients understand their health information in simple, everyday language.

IMPORTANT: You may ONLY discuss information from the following doctor's notes:

---
DIAGNOSIS: ${diagnosis}
PRESCRIPTION: ${prescription}
DAILY ACTION RECOMMENDATIONS: ${dailyActions}
---

RULES:
1. ONLY answer questions answerable from the notes above.
2. If asked about ANYTHING not in the notes, say: "That's not covered in your doctor's notes from this visit. I'd recommend bringing this up with Dr. ${doctorName} at your next appointment, or calling the office if it feels urgent."
3. NEVER diagnose, suggest medications, or contradict the doctor.
4. If the patient describes a NEW SYMPTOM not in the notes, respond warmly and include this exact tag on its own line at the END: [SYMPTOM_DETECTED: <brief description>]
5. If the patient expresses worry, acknowledge their feelings and explain the relevant notes in simpler terms.
6. Keep responses concise: 2-4 sentences for simple questions.
7. Warm, conversational tone — like a kind nurse explaining to a family member.
8. NEVER start with "Based on your doctor's notes" — just answer naturally.`;
}

async function chatWithContext(message, history, patientName, doctorName, diagnosis, prescription, dailyActions) {
  // Demo-cache shortcircuit
  if (FORCE_DEMO_CACHE) {
    const cachedReply = findCachedChatResponse(message);
    console.log(`[LLM] FORCE_DEMO_CACHE: returning cached chat (match: ${!!cachedReply})`);
    return {
      reply: cachedReply || `That's a great question. Your doctor's notes mention your treatment plan, but I'd recommend discussing this specific question with Dr. ${doctorName} at your next appointment.`,
      symptomDetected: null,
    };
  }

  const systemPrompt = buildChatSystemPrompt(patientName, doctorName, diagnosis, prescription, dailyActions);
  const messages = [...history, { role: "user", content: message }];

  try {
    const reply = await callClaudeWithHistory(systemPrompt, messages, {
      maxTokens: 800,
      temperature: 0.4,
    });

    const symptomMatch = reply.match(/\[SYMPTOM_DETECTED:\s*(.+?)\]/);
    const cleanReply = reply.replace(/\[SYMPTOM_DETECTED:\s*.+?\]/, "").trim();

    return {
      reply: cleanReply,
      symptomDetected: symptomMatch ? symptomMatch[1].trim() : null,
    };
  } catch (error) {
    console.error("Chatbot error:", error);
    console.log("[LLM] Falling back to demo-cache chat");

    // Try to match against cached demo responses
    const cachedReply = findCachedChatResponse(message);
    if (cachedReply) {
      return { reply: cachedReply, symptomDetected: null };
    }

    return {
      reply: "I'm having a little trouble right now. Please try again in a moment, or contact your doctor's office directly if you need immediate help.",
      symptomDetected: null,
    };
  }
}

// Helper: fuzzy-match user message against demo-cache chat keys
function findCachedChatResponse(message) {
  const lower = message.toLowerCase();
  for (const [keyword, response] of Object.entries(demoCache.DEMO_CHAT_RESPONSES)) {
    if (lower.includes(keyword)) {
      return response;
    }
  }
  return null;
}

// ==================================================================
// FUNCTION 4: DAILY REPORT GENERATOR
// ==================================================================

const DAILY_REPORT_SYSTEM_PROMPT = `You are a clinical reporting assistant generating concise daily tracking reports for doctors. Be factual, clinical, scannable.

Write 3-5 short sentences covering:
1. Medication adherence (taken vs missed)
2. Patient engagement (chatbot usage, what they asked about)
3. Symptom reports (any new ones, their triage)
4. Concerning patterns or positive trends

End with a status on its own line:
**Status: STABLE** — On track, no concerns
**Status: MONITOR** — Minor deviations (missed dose, frequent chatbot use)
**Status: ATTENTION NEEDED** — Missed multiple doses, new concerning symptoms, non-adherence

Be direct. No fluff.`;

async function generateDailyReport(input) {
  // Demo-cache shortcircuit
  if (FORCE_DEMO_CACHE) {
    console.log("[LLM] FORCE_DEMO_CACHE: returning cached daily report");
    return demoCache.DEMO_DAILY_REPORT_MARIA;
  }

  const userMessage = `Generate a daily tracking report:

PATIENT: ${input.patientName}
DIAGNOSIS: ${input.diagnosis}

TODAY'S DATA:
- Medicines taken: ${input.medicineTakenCount}/${input.medicineTotalCount}
  ${input.missedMedicines.length > 0 ? `Missed: ${input.missedMedicines.join(", ")}` : "All taken on time"}
- Chatbot interactions: ${input.chatbotSessionCount} session(s)
  ${input.chatTopics.length > 0 ? `Topics: ${input.chatTopics.join(", ")}` : "No chatbot usage"}
- New symptoms: ${input.newSymptoms.length > 0 ? input.newSymptoms.map((s) => `${s.description} (triage: ${s.triageResult})`).join("; ") : "None"}
- Weekly adherence: ${input.weeklyAdherencePercent}%`;

  try {
    return await callClaude(DAILY_REPORT_SYSTEM_PROMPT, userMessage, {
      maxTokens: 400,
      temperature: 0.2,
    });
  } catch (error) {
    console.error("Daily report generation failed:", error);
    console.log("[LLM] Falling back to demo-cache daily report");
    return demoCache.DEMO_DAILY_REPORT_MARIA;
  }
}

// ==================================================================
// FUNCTION 5: PRE-VISIT CHECKLIST (Bonus)
// ==================================================================

async function generatePreVisitChecklist(diagnosis, prescription) {
  if (FORCE_DEMO_CACHE) {
    console.log("[LLM] FORCE_DEMO_CACHE: returning cached checklist");
    return demoCache.DEMO_CHECKLIST_MARIA;
  }

  const systemPrompt = `Generate a pre-visit checklist of 3-5 items for a patient. Return ONLY a JSON array of strings. No markdown. Always end with "Write down any questions you want to ask your doctor."`;

  try {
    const raw = await callClaude(systemPrompt, `DIAGNOSIS: ${diagnosis}\nPRESCRIPTION: ${prescription}`, {
      maxTokens: 300,
      temperature: 0.2,
    });
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.log("[LLM] Falling back to demo-cache checklist");
    return demoCache.DEMO_CHECKLIST_MARIA;
  }
}

// ==================================================================
// FUNCTION 6: SEVERITY DETECTION (Bonus — empathy calibration)
// ==================================================================

async function detectSeverity(diagnosis) {
  try {
    const raw = await callClaude(
      `Classify this diagnosis as one word: mild, moderate, or serious. Respond with ONLY that one word.`,
      diagnosis,
      { maxTokens: 10, temperature: 0 }
    );
    const cleaned = raw.trim().toLowerCase();
    if (["mild", "moderate", "serious"].includes(cleaned)) return cleaned;
    return "moderate";
  } catch {
    return "moderate";
  }
}

// ==================================================================
// EXPORTS
// ==================================================================

module.exports = {
  callClaude,
  callClaudeWithHistory,
  generateSummary,
  triageSymptom,
  chatWithContext,
  generateDailyReport,
  generatePreVisitChecklist,
  detectSeverity,
};
