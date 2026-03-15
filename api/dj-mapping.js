// Vercel Serverless Function: DJ Mapping CRUD
// GET  /api/dj-mapping         → returns full mapping
// GET  /api/dj-mapping?dj=123  → returns single entry
// POST /api/dj-mapping         → add/update entries, commits to GitHub
// DELETE /api/dj-mapping       → remove an entry, commits to GitHub

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const FILE_PATH = 'public/data/dj-mapping.json'

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not configured')

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status}: ${body}`)
  }
  return res.json()
}

async function getCurrentFile() {
  const data = await githubRequest(`contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`)
  const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
  return { content, sha: data.sha }
}

async function commitFile(content, sha, message) {
  return githubRequest(`contents/${FILE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
      sha,
      branch: GITHUB_BRANCH,
    }),
  })
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const { content } = await getCurrentFile()
      const { dj } = req.query || {}

      if (dj) {
        const key = dj.replace(/\D/g, '')
        const productCode = content[key] || null
        return res.json({ djNumber: key, productCode })
      }
      return res.json(content)
    }

    if (req.method === 'POST') {
      const { entries } = req.body // { entries: { "12345678": "LMDXXXXXX", ... } }
      if (!entries || typeof entries !== 'object') {
        return res.status(400).json({ error: 'Body must include { entries: { djNumber: productCode, ... } }' })
      }

      // Validate entries
      for (const [dj, code] of Object.entries(entries)) {
        const cleanDj = dj.replace(/\D/g, '')
        if (cleanDj.length !== 8) {
          return res.status(400).json({ error: `DJ number "${dj}" must be 8 digits` })
        }
        if (typeof code !== 'string' || code.length !== 13) {
          return res.status(400).json({ error: `Product code "${code}" for DJ ${dj} must be exactly 13 characters` })
        }
      }

      const { content, sha } = await getCurrentFile()

      const added = []
      const updated = []
      for (const [dj, code] of Object.entries(entries)) {
        const cleanDj = dj.replace(/\D/g, '')
        const cleanCode = code.toUpperCase()
        if (content[cleanDj]) {
          updated.push(cleanDj)
        } else {
          added.push(cleanDj)
        }
        content[cleanDj] = cleanCode
      }

      const parts = []
      if (added.length) parts.push(`Add ${added.length} DJ mapping${added.length > 1 ? 's' : ''}`)
      if (updated.length) parts.push(`Update ${updated.length} DJ mapping${updated.length > 1 ? 's' : ''}`)
      const message = parts.join(', ') || 'Update DJ mappings'

      await commitFile(content, sha, message)

      return res.json({
        success: true,
        added: added.length,
        updated: updated.length,
        total: Object.keys(content).length,
      })
    }

    if (req.method === 'DELETE') {
      const { djNumbers } = req.body // { djNumbers: ["12345678", ...] }
      if (!Array.isArray(djNumbers) || djNumbers.length === 0) {
        return res.status(400).json({ error: 'Body must include { djNumbers: ["12345678", ...] }' })
      }

      const { content, sha } = await getCurrentFile()

      const removed = []
      for (const dj of djNumbers) {
        const cleanDj = dj.replace(/\D/g, '')
        if (content[cleanDj]) {
          delete content[cleanDj]
          removed.push(cleanDj)
        }
      }

      if (removed.length === 0) {
        return res.json({ success: true, removed: 0, message: 'No matching entries found' })
      }

      await commitFile(content, sha, `Remove ${removed.length} DJ mapping${removed.length > 1 ? 's' : ''}`)

      return res.json({ success: true, removed: removed.length, total: Object.keys(content).length })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('DJ mapping API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
