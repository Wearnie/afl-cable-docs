// Vercel Serverless Function: Per-DJ document overrides
// GET    /api/dj-overrides              → returns all overrides
// POST   /api/dj-overrides              → set overrides for a DJ { djNumber, exclude: [paths], include: [{type,name,path}] }
// DELETE /api/dj-overrides?dj=12345678  → remove all overrides for a DJ

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const FILE_PATH = 'public/data/dj-doc-overrides.json'

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

async function readOverrides() {
  try {
    const file = await githubRequest(`contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`)
    const content = Buffer.from(file.content, 'base64').toString('utf-8')
    return { data: JSON.parse(content), sha: file.sha }
  } catch (err) {
    if (err.message.includes('404')) {
      return { data: {}, sha: null }
    }
    throw err
  }
}

async function writeOverrides(data, sha, message) {
  const content = Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64')
  const body = { message, content, branch: GITHUB_BRANCH }
  if (sha) body.sha = sha
  await githubRequest(`contents/${FILE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const { data } = await readOverrides()
      return res.json(data)
    }

    if (req.method === 'POST') {
      const { djNumber, exclude, include } = req.body
      if (!djNumber || !/^\d{8}$/.test(djNumber)) {
        return res.status(400).json({ error: 'Required: djNumber (8 digits)' })
      }

      const { data, sha } = await readOverrides()

      data[djNumber] = {
        exclude: Array.isArray(exclude) ? exclude : [],
        include: Array.isArray(include) ? include : [],
      }

      // Clean up empty overrides
      if (data[djNumber].exclude.length === 0 && data[djNumber].include.length === 0) {
        delete data[djNumber]
      }

      await writeOverrides(data, sha, `Update doc overrides for DJ ${djNumber}`)

      return res.json({
        success: true,
        djNumber,
        overrides: data[djNumber] || null,
        message: `Overrides saved for DJ ${djNumber}. Site will redeploy in ~60 seconds.`,
      })
    }

    if (req.method === 'DELETE') {
      const djNumber = req.query.dj
      if (!djNumber) return res.status(400).json({ error: 'Required: ?dj=12345678' })

      const { data, sha } = await readOverrides()
      if (!data[djNumber]) {
        return res.json({ success: true, message: 'No overrides to remove' })
      }

      delete data[djNumber]
      await writeOverrides(data, sha, `Remove doc overrides for DJ ${djNumber}`)

      return res.json({ success: true, message: `Overrides removed for DJ ${djNumber}` })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('DJ overrides API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
