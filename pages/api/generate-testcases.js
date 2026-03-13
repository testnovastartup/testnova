import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { projectId, requirementId, title, description } = req.body
    console.log('API BODY:', { projectId, requirementId, title, description })
    if (!projectId || !requirementId || !title || !description) {
      return res.status(400).json({
        error: 'Missing projectId, requirementId, title, or description',
      })
    }

    const prompt = `
You are a senior software QA engineer.

Generate 8 practical test cases for this requirement.

Requirement title:
${title}

Requirement description:
${description}

Return only valid JSON array in this exact structure:
[
  {
    "title": "string",
    "steps": "string",
    "expected_result": "string"
  }
]
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert QA test designer. Return only valid JSON. No markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    })

    const raw = completion.choices[0].message.content
    const parsed = JSON.parse(raw)

    const rows = parsed.map((item) => ({
      project_id: projectId,
      requirement_id: requirementId,
      title: item.title,
      steps: item.steps,
      expected_result: item.expected_result,
    }))
    console.log('ROWS TO INSERT:', rows)
    const { data, error } = await supabase
      .from('test_cases')
      .insert(rows)
      .select()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      success: true,
      inserted: data,
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Unknown server error',
    })
  }
}
