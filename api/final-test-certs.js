// Vercel Serverless Function: Final Test Certs index
// GET /api/final-test-certs → returns the certs index JSON

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const FILE_PATH = 'public/data/final-test-certs.json'

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'https://afl-cable-docs.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GITHUB_TOKEN not configured')

    const ghRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!ghRes.ok) {
      if (ghRes.status === 404) return res.json({})
      throw new Error(`GitHub API ${ghRes.status}`)
    }

    const data = await ghRes.json()
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
    return res.json(content)
  } catch (err) {
    console.error('Final test certs API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
