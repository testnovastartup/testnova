import OpenAI from "openai";
import { supabase } from "../../lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { requirementId } = req.body;

    if (!requirementId) {
      return res.status(400).json({ error: "requirementId is required" });
    }

    const { data: requirement, error: dbError } = await supabase
      .from("requirements")
      .select("*")
      .eq("id", requirementId)
      .single();

    if (dbError || !requirement) {
      return res.status(404).json({ error: "Requirement not found" });
    }

    const prompt = `
You are a senior QA architect.

Analyze the following software requirement and recommend a practical test coverage strategy.

Requirement Title:
${requirement.title}

Requirement Description:
${requirement.description}

Return JSON only in this format:

{
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "recommended_test_types": [
    "Functional Testing",
    "Boundary Testing",
    "Negative Testing",
    "API Testing",
    "UI Testing",
    "Integration Testing",
    "Regression Testing",
    "Security Testing",
    "Performance Testing"
  ],
  "coverage_focus": [
    "focus area 1",
    "focus area 2",
    "focus area 3"
  ],
  "test_case_priority": "LOW | MEDIUM | HIGH",
  "automation_recommendation": "YES | NO | PARTIAL",
  "reasoning": [
    "reason 1",
    "reason 2",
    "reason 3"
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert QA test strategist. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: "Failed to parse OpenAI response as JSON",
        raw,
      });
    }

    return res.status(200).json({
      success: true,
      requirement,
      coverage: parsed,
    });
  } catch (error) {
    console.error("recommend-coverage error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
