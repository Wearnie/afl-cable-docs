// Vercel Serverless Function: Final Test Certificate Upload
// POST /api/upload-cert — upload a PDF, extracts Job Number & Item Code from the cert,
// commits the PDF to GitHub, updates the cert index and DJ→Product Code mapping.
//
// The PDF is parsed (page 1 only) to find:
//   Job Number: XXXXXXXX   → DJ number (8 digits)
//   Item Code: XXXXXXXXXXXXX → Product code (13 chars)
//
// Stores the PDF at public/docs/final-test-certs/{djNumber}.pdf

import { requireAdmin } from './lib/auth.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdf = require('pdf-parse/lib/pdf-parse.js')

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const CERTS_JSON_PATH = 'public/data/final-test-certs.json'
const DJ_MAPPING_PATH = 'public/data/dj-mapping.json'

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

async function updateJsonFile(filePath, updateFn, message, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { content, sha } = await getFileFromGithub(filePath)
      const updated = updateFn(content)
      await commitFileToGithub(
        filePath,
        Buffer.from(JSON.stringify(updated, null, 2)).toString('base64'),
        sha,
        message
      )
      return
    } catch (err) {
      if (attempt < retries && err.message.includes('409')) continue
      throw err
    }
  }
}

/**
 * Extract Job Number and Item Code from page 1 of a Final Test Certificate PDF.
 * Template fields:
 *   "Job Number: 51042448"
 *   "Item Code: TVBQ55AA024AQ"
 */
async function extractFromPdf(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64')

  // Only parse page 1
  const data = await pdf(buffer, {
    max: 1, // first page only
  })

  const text = data.text

  // Extract Job Number (8 digits after "Job Number:")
  const jobMatch = text.match(/Job\s*Number\s*:\s*(\d{8})/i)
  if (!jobMatch) {
    throw new Error('Could not find "Job Number" on page 1 of the PDF. Expected format: "Job Number: 12345678"')
  }

  // Extract Item Code (alphanumeric chars, possibly with hyphen suffix like -FP, -SYDT)
  const itemMatch = text.match(/Item\s*Code\s*:\s*([A-Z0-9][-A-Z0-9]*)/i)
  if (!itemMatch) {
    throw new Error('Could not find "Item Code" on page 1 of the PDF. Expected format: "Item Code: TVBQ55AA024AQ"')
  }

  // Only strip safe suffixes (packaging variants) — keep customer suffixes like -SYDT, -TMR, -AG
  // so the DJ mapping preserves the customer-specific code
  const rawCode = itemMatch[1].toUpperCase()
  if (rawCode.length > 25) {
    throw new Error(`Item Code "${rawCode}" is too long (${rawCode.length} chars). Expected a product code like "TVBQ55AA024AQ"`)
  }
  const productCode = rawCode.replace(/(?:-(?:FP|ESS|SH2|ANT|TMC))+$/i, '')
  const baseCode = productCode.replace(/(?:-(?:SYDT|TMR|AG|SIE|FLH|EM))+$/i, '')
  if (baseCode.length !== 13) {
    throw new Error(`Product code "${productCode}" does not resolve to a valid 13-character AFL code (got ${baseCode.length} chars)`)
  }

  return {
    djNumber: jobMatch[1],
    productCode,
  }
}

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'https://afl-cable-docs.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try { requireAdmin(req) } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }

  try {
    const { fileName, fileBase64 } = req.body

    if (!fileBase64) {
      return res.status(400).json({ error: 'Required: fileBase64' })
    }

    // Check file size (base64 is ~4/3 of original, so 14MB base64 ≈ 10MB file)
    if (fileBase64.length > 14 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB)' })
    }

    // 1. Extract DJ number and product code from the PDF
    const { djNumber, productCode } = await extractFromPdf(fileBase64)

    const pdfPath = `public/docs/final-test-certs/${djNumber}.pdf`
    const certName = fileName || `${djNumber}.pdf`

    // 2. Upload the PDF to the repo
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
      `Upload final test cert for DJ ${djNumber} (${productCode})`
    )

    // 3. Update the certs JSON index (with retry on SHA conflict)
    await updateJsonFile(CERTS_JSON_PATH, (certsIndex) => {
      certsIndex[djNumber] = {
        url: `/docs/final-test-certs/${djNumber}.pdf`,
        name: certName,
        productCode,
        uploadedAt: new Date().toISOString(),
      }
      return certsIndex
    }, `Register final test cert for DJ ${djNumber}`)

    // 4. Update DJ → Product Code mapping (with retry on SHA conflict)
    let isNew = false
    await updateJsonFile(DJ_MAPPING_PATH, (djMapping) => {
      isNew = !djMapping[djNumber]
      djMapping[djNumber] = productCode
      return djMapping
    }, `${isNew ? 'Add' : 'Update'} DJ mapping ${djNumber} → ${productCode} (from cert upload)`)

    return res.json({
      success: true,
      djNumber,
      productCode,
      url: `/docs/final-test-certs/${djNumber}.pdf`,
      mappingCreated: isNew,
      message: `Certificate uploaded for DJ ${djNumber} → ${productCode}. Site will redeploy in ~60 seconds.`,
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
  maxDuration: 60,
}
