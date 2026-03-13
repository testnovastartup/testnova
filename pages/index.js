import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [testCases, setTestCases] = useState([])
  const [riskLoading, setRiskLoading] = useState(false)
  const [riskResult, setRiskResult] = useState(null)

  // TODO: 把这里替换成你自己的真实 UUID
  const projectId = '06e0f905-e6ac-4198-97bd-b18633c7d4d6'
  const requirementId = 'd955bcc9-efaa-4320-b958-0c693c3243a3'

  const requirementTitle = 'User Login'
  const requirementDescription =
    'User should be able to login using email and password. System should validate credentials and create authenticated session.'

  async function analyzeRisk() {
    try {
      setRiskLoading(true)
      setMessage('Analyzing risk...')
      setRiskResult(null)

      const response = await fetch('/api/analyze-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze risk')
      }

      setRiskResult(data)
      setMessage('Risk analysis completed.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setRiskLoading(false)
    }
  }

  async function handleGenerate() {
    try {
      setLoading(true)
      setMessage('Generating test cases...')
      setTestCases([])

      const response = await fetch('/api/generate-testcases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          requirementId,
          title: requirementTitle,
          description: requirementDescription,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate test cases')
      }

      const { data: rows, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('project_id', projectId)
        .eq('requirement_id', requirementId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      setTestCases(rows || [])
      setMessage('AI test cases generated successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="title">🚀 TestNova</h1>
        <p className="subtitle">AI-powered QA testing platform</p>

        <div className="card">
          <h2>Requirement</h2>
          <p><strong>Title:</strong> {requirementTitle}</p>
          <p><strong>Description:</strong> {requirementDescription}</p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="button" onClick={analyzeRisk} disabled={riskLoading}>
              {riskLoading ? 'Analyzing...' : 'Analyze Risk'}
            </button>

            <button className="button" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Test Cases'}
            </button>
          </div>

          {message && <p className="message">{message}</p>}
        </div>

        <div className="card">
          <h2>Risk Analysis</h2>

          {!riskResult ? (
            <p>No risk analysis yet.</p>
          ) : (
            <div className="testCase">
              <p><strong>Risk Score:</strong> {riskResult.risk_score}</p>
              <p><strong>Risk Level:</strong> {riskResult.risk_level}</p>

              <p><strong>Reasons:</strong></p>
              <ul>
                {Array.isArray(riskResult.reasons) &&
                  riskResult.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Generated Test Cases</h2>

          {testCases.length === 0 ? (
            <p>No test cases yet.</p>
          ) : (
            testCases.map((item) => (
              <div key={item.id} className="testCase">
                <h3>{item.title}</h3>
                <p><strong>Steps:</strong><br />{item.steps}</p>
                <p><strong>Expected Result:</strong><br />{item.expected_result}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
