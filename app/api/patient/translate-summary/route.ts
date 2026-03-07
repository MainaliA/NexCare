// POST /api/patient/translate-summary — multilingual summary (Gemini)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser }            from "@/lib/auth";
import { GoogleGenerativeAI }        from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish", hi: "Hindi", zh: "Simplified Chinese", tl: "Filipino (Tagalog)",
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { summary, language } = await req.json() as {
    summary: {
      whatIsHappening: string;
      medications: Array<{ name: string; dosage: string; instruction: string }>;
      dailyPlan: string[];
      warningSign: string[];
    };
    language: string;
  };

  const langName = LANGUAGE_NAMES[language] ?? language;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `Translate the following medical summary JSON into ${langName}.\nKeep all JSON keys in English. Only translate the string values.\nMaintain the same warm, simple tone.\nRespond ONLY with valid JSON matching the exact same structure.`,
      generationConfig: { maxOutputTokens: 1500 },
    });

    const result = await model.generateContent(JSON.stringify(summary));
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch {
    return NextResponse.json(summary); // fallback to original
  }
}
