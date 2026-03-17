// Vercel Serverless Function: Upload a static document (TDS, Stripping, etc.)
// POST /api/upload-doc
//
// Accepts JSON body:
//   - docType: "tds" | "stripping" | "test-certificates" | "installation"
//   - fileName: original filename (e.g. "288F Stranded LT Cable.pdf")
//   - fileBase64: base64-encoded PDF content

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'

const VALID_DOC_TYPES = {
  tds: 'tds',
  stripping: 'stripping',
  'test-certificates': 'test-certificates',
  installation: 'installation',
  other: 'other',
}

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Admin key required for uploads
  const adminKey = req.headers['x-admin-key']
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { docType, fileName, fileBase64 } = req.body

    if (!docType || !fileName || !fileBase64) {
      return res.status(400).json({ error: 'Required: docType, fileName, fileBase64' })
    }

    const folder = VALID_DOC_TYPES[docType]
    if (!folder) {
      return res.status(400).json({ error: `Invalid docType. Must be one of: ${Object.keys(VALID_DOC_TYPES).join(', ')}` })
    }

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files accepted' })
    }

    if (fileBase64.length > 14 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB)' })
    }

    const filePath = `public/docs/${folder}/${fileName}`

    // Check if file already exists
    let existingSha = null
    try {
      const existing = await githubRequest(`contents/${filePath}?ref=${GITHUB_BRANCH}`)
      existingSha = existing.sha
    } catch (e) {
      // File doesn't exist — fine
    }

    const body = {
      message: `Upload ${docType}: ${fileName}`,
      content: fileBase64,
      branch: GITHUB_BRANCH,
    }
    if (existingSha) body.sha = existingSha

    await githubRequest(`contents/${filePath}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })

    return res.json({
      success: true,
      path: `/docs/${folder}/${fileName}`,
      replaced: !!existingSha,
      message: `${fileName} uploaded to ${docType}. Site will redeploy in ~60 seconds.`,
    })
  } catch (err) {
    console.error('Upload doc error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}
