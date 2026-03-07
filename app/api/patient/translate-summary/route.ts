// POST /api/patient/translate-summary — Person B bonus: multilingual summary

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser }            from "@/lib/auth";
import Anthropic                     from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: `Translate the following medical summary JSON into ${langName}.
Keep all JSON keys in English. Only translate the string values.
Maintain the same warm, simple tone.
Respond ONLY with valid JSON matching the exact same structure.`,
    messages: [{ role: "user", content: JSON.stringify(summary) }],
  });

  const block = msg.content[0];
  if (block.type !== "text") throw new Error("bad response");

  try {
    const cleaned = block.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch {
    return NextResponse.json(summary); // fallback to original
  }
}
