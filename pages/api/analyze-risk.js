import OpenAI from "openai";
import { supabase } from "../../lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {

  const { requirementId } = req.body;

  const { data: requirement } = await supabase
    .from("requirements")
    .select("*")
    .eq("id", requirementId)
    .single();

  const prompt = `
You are a senior QA architect.

Analyze the following software requirement and assign a risk score from 1 to 10.

Requirement:
${requirement.title}

Description:
${requirement.description}

Return JSON:

{
 "risk_score": number,
 "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
 "reasons": ["reason1","reason2","reason3"]
}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  const result = JSON.parse(completion.choices[0].message.content);

  await supabase
    .from("risk_scores")
    .insert({
      requirement_id: requirementId,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      reasons: result.reasons
    });

  res.status(200).json(result);

}
