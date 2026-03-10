// Vercel Serverless Function: Final Test Certificate Upload
// POST /api/upload-cert — upload a PDF, commits to GitHub repo
//
// Accepts multipart/form-data with:
//   - djNumber: 8-digit DJ number
//   - file: PDF file (max 10MB)
//
// Stores the PDF at public/docs/final-test-certs/{djNumber}.pdf
// Updates public/data/final-test-certs.json with the new entry

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const CERTS_JSON_PATH = 'public/data/final-test-certs.json'

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

async function getFileFromGithub(filePath) {
  try {
    const data = await githubRequest(`contents/${filePath}?ref=${GITHUB_BRANCH}`)
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
    return { content, sha: data.sha }
  } catch (err) {
    if (err.message.includes('404')) {
      return { content: {}, sha: null }
    }
    throw err
  }
}

async function commitFileToGithub(filePath, contentBase64, sha, message) {
  const body = {
    message,
    content: contentBase64,
    branch: GITHUB_BRANCH,
  }
  if (sha) body.sha = sha
  return githubRequest(`contents/${filePath}`, { method: 'PUT', body: JSON.stringify(body) })
}

function checkAdminKey(req) {
  const key = req.headers['x-admin-key'] || ''
  const expected = process.env.ADMIN_KEY
  if (!expected) return { ok: false, error: 'ADMIN_KEY not configured on server' }
  if (key !== expected) return { ok: false, error: 'Invalid admin key' }
  return { ok: true }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Key')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = checkAdminKey(req)
  if (!auth.ok) return res.status(401).json({ error: auth.error })

  try {
    // Parse the JSON body (base64-encoded PDF)
    const { djNumber, fileName, fileBase64 } = req.body

    if (!djNumber || !fileBase64) {
      return res.status(400).json({ error: 'Required: djNumber, fileBase64' })
    }

    const cleanDj = djNumber.replace(/\D/g, '')
    if (cleanDj.length !== 8) {
      return res.status(400).json({ error: 'DJ number must be 8 digits' })
    }

    // Check file size (base64 is ~4/3 of original, so 14MB base64 ≈ 10MB file)
    if (fileBase64.length > 14 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB)' })
    }

    const pdfPath = `public/docs/final-test-certs/${cleanDj}.pdf`
    const certName = fileName || `${cleanDj}.pdf`

    // 1. Upload the PDF to the repo
    let existingSha = null
    try {
      const existing = await githubRequest(`contents/${pdfPath}?ref=${GITHUB_BRANCH}`)
      existingSha = existing.sha
    } catch (e) {
      // File doesn't exist yet — that's fine
    }

    await commitFileToGithub(
      pdfPath,
      fileBase64,
      existingSha,
      `Upload final test cert for DJ ${cleanDj}`
    )

    // 2. Update the certs JSON index
    const { content: certsIndex, sha: certsSha } = await getFileFromGithub(CERTS_JSON_PATH)

    certsIndex[cleanDj] = {
      url: `/docs/final-test-certs/${cleanDj}.pdf`,
      name: certName,
      uploadedAt: new Date().toISOString(),
    }

    await commitFileToGithub(
      CERTS_JSON_PATH,
      Buffer.from(JSON.stringify(certsIndex, null, 2)).toString('base64'),
      certsSha,
      `Register final test cert for DJ ${cleanDj}`
    )

    return res.json({
      success: true,
      djNumber: cleanDj,
      url: `/docs/final-test-certs/${cleanDj}.pdf`,
      message: `Certificate uploaded. Site will redeploy in ~60 seconds.`,
    })
  } catch (err) {
    console.error('Upload cert error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Vercel config: increase body size limit for PDF uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
}
