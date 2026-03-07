
const DEMO_SUMMARY_MARIA = `## 🔍 What We Found

You have **Type 2 Diabetes Mellitus** — this means your body is having trouble managing blood sugar levels on its own. Your HbA1c is 7.8% (a 3-month average of your blood sugar — ideally we'd like it closer to 7% or below).

The good news: this is very manageable, and your doctor has a clear plan.

## 💊 Your Medicines

- **Metformin 500mg** — Helps your body use insulin more effectively. Take it **twice daily with meals** (morning and evening). You might notice some stomach upset at first — taking it with food helps.

- **Glipizide 5mg** — Helps your pancreas release more insulin. Take it **once daily, 30 minutes before breakfast**. Watch for signs of low blood sugar (shakiness, sweating, dizziness) — keep a snack handy.

## 📋 Your Daily Plan

- ✅ Check your blood sugar every morning before breakfast and log it
- ✅ Take Metformin with breakfast and dinner
- ✅ Take Glipizide 30 minutes before breakfast
- ✅ Walk for at least 30 minutes after lunch or dinner
- ✅ Limit carbs to about 45g per meal
- ✅ Drink at least 8 glasses of water daily
- ✅ Keep a food diary to bring to your next visit

💬 Have questions? Tap **Ask About This** below to chat with your medical assistant.`;

const DEMO_CHECKLIST_MARIA = [
  "Fast for 12 hours before your appointment",
  "Bring your blood sugar log from the past 2 weeks",
  "Bring your food diary",
  "Write down any questions you want to ask your doctor",
];

const DEMO_TRIAGE_EXPECTED = {
  assessment: "expected",
  confidence: 85,
  reasoning: "Mild nausea is a well-documented side effect of Metformin, particularly during the first 2 weeks of treatment.",
  patientMessage: "Mild nausea is common when starting Metformin. It usually improves after the first week or two. Make sure you're taking it with food. If it doesn't get better, let us know.",
  doctorAlert: false,
  urgency: "routine",
};

const DEMO_TRIAGE_ESCALATE = {
  assessment: "escalate",
  confidence: 92,
  reasoning: "Chest tightness in a patient with Type 2 Diabetes is a potential cardiovascular concern requiring prompt evaluation.",
  patientMessage: "This is something your doctor should know about right away. We've sent an alert to Dr. Chen's dashboard. If it gets worse or you feel short of breath, please call 911 immediately.",
  doctorAlert: true,
  urgency: "urgent",
};

const DEMO_DAILY_REPORT_MARIA = `Maria took 2 of her 3 scheduled doses today — the evening Metformin was missed. She had 2 chatbot sessions, asking about Metformin side effects and dietary questions about fruit intake, suggesting active engagement with her treatment plan. No new symptoms were reported today. Weekly adherence stands at 81%, slightly below target.

**Status: MONITOR**`;

const DEMO_CHAT_RESPONSES = {
  "side effects": "Metformin can sometimes cause stomach upset, nausea, or diarrhea, especially when you first start it. This usually gets better after the first week or two. Taking it with food — as your doctor recommended — helps a lot. If it doesn't improve after 2 weeks, mention it to Dr. Chen.",
  "hba1c": "Great question! HbA1c is a blood test showing your average blood sugar over 2-3 months. Think of it as a \"report card\" for blood sugar control. Yours was 7.8%, and the goal is to get closer to 7% or below. Your medicines and daily plan are designed to help bring that number down.",
  "fruit": "Your doctor recommends limiting carbs to about 45g per meal. Fruit has natural sugars that count toward that limit, but it's not off-limits! A small apple or handful of berries is fine. Pairing fruit with protein (like almonds) helps slow sugar absorption.",
};

module.exports = {
  DEMO_SUMMARY_MARIA,
  DEMO_CHECKLIST_MARIA,
  DEMO_TRIAGE_EXPECTED,
  DEMO_TRIAGE_ESCALATE,
  DEMO_DAILY_REPORT_MARIA,
  DEMO_CHAT_RESPONSES,
};
