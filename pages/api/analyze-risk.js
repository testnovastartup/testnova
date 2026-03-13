import OpenAI from 'openai'
import { supabase } from '../../lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { requirementId } = req.body

    if (!requirementId) {
      return res.status(400).json({ error: 'requirementId is required' })
    }

    const { data: requirement, error: requirementError } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', requirementId)
      .single()

    if (requirementError || !requirement) {
      return res.status(404).json({
        error: requirementError?.message || 'Requirement not found',
      })
    }

    const prompt = `
You are a senior QA architect.

Analyze the following software requirement and assign a risk score from 1 to 10.

Risk level mapping:
- 1.0 to 3.9 = LOW
- 4.0 to 6.4 = MEDIUM
- 6.5 to 8.4 = HIGH
- 8.5 to 10.0 = CRITICAL

Requirement title:
${requirement.title || ''}

Requirement description:
${requirement.description || ''}

Return ONLY valid JSON in this exact format:
{
  "risk_score": 8.5,
  "risk_level": "HIGH",
  "reasons": ["reason 1", "reason 2", "reason 3"]
}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = completion.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('OpenAI returned empty response')
    }

    let result
    try {
      result = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      throw new Error('AI response was not valid JSON')
    }

    const normalizedResult = {
      risk_score: Number(result.risk_score),
      risk_level: result.risk_level,
      reasons: Array.isArray(result.reasons) ? result.reasons : [],
    }

    const payload = {
      requirement_id: requirementId,
      project_id: requirement.project_id,
      score: normalizedResult.risk_score,
      explanation: normalizedResult.risk_level,
      reasons: normalizedResult.reasons,
    }

    const { error: insertError } = await supabase
      .from('risk_scores')
      .insert(payload)

    if (insertError) {
      return res.status(500).json({
        error: `Failed to save risk score: ${insertError.message}`,
      })
    }

    return res.status(200).json(normalizedResult)
  } catch (error) {
    console.error('analyze-risk error:', error)
    return res.status(500).json({
      error: error.message || 'Internal server error',
    })
  }
}
