// Vercel Serverless Function: Sync DJ Mapping from SharePoint Excel
// Reads "Jobpack Database" sheet from the Print Message workbook via Microsoft Graph API
// Column A = DJ Number, Column B = Product Code
//
// POST /api/sync-mapping  — triggered by admin button or Vercel Cron
//
// Required env vars:
//   MICROSOFT_TENANT_ID   — Azure AD tenant
//   MICROSOFT_CLIENT_ID   — App registration client ID
//   MICROSOFT_CLIENT_SECRET — App registration secret
//   SHAREPOINT_SITE_ID    — SharePoint site ID (or hostname)
//   EXCEL_FILE_PATH       — Path to the Excel file in the document library
//   GITHUB_TOKEN          — For committing the updated JSON

const GITHUB_REPO = process.env.GITHUB_REPO || 'Wearnie/afl-cable-docs'
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main'
const FILE_PATH = 'public/data/dj-mapping.json'
const SHEET_NAME = process.env.EXCEL_SHEET_NAME || 'Jobpack Database'

// --- Microsoft Graph Auth ---

async function getGraphToken() {
  const tenantId = process.env.MICROSOFT_TENANT_ID
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft credentials not configured (MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET)')
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token request failed: ${body}`)
  }

  const data = await res.json()
  return data.access_token
}

// --- Read Excel via Graph API ---

async function readExcelSheet(token) {
  const siteId = process.env.SHAREPOINT_SITE_ID
  const filePath = process.env.EXCEL_FILE_PATH

  if (!siteId || !filePath) {
    throw new Error('SharePoint config not set (SHAREPOINT_SITE_ID, EXCEL_FILE_PATH)')
  }

  // URL-encode the file path for Graph API
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/workbook/worksheets/${encodeURIComponent(SHEET_NAME)}/usedRange`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Graph API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  return data.values || []
}

// --- Parse Excel rows into DJ mapping ---

function parseRows(rows) {
  const mapping = {}
  const errors = []
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const rawDj = String(row[0] || '').trim()
    const rawCode = String(row[1] || '').trim()

    // Skip header rows or empty rows
    if (!rawDj || !rawCode) { skipped++; continue }
    if (rawDj.toLowerCase() === 'dj' || rawDj.toLowerCase().includes('number')) { skipped++; continue }

    const dj = rawDj.replace(/\D/g, '')
    const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (dj.length !== 8) {
      // Might be a header or label row — skip silently if row < 5, otherwise log
      if (i > 4) errors.push(`Row ${i + 1}: DJ "${rawDj}" is not 8 digits`)
      else skipped++
      continue
    }

    if (code.length !== 13) {
      if (i > 4) errors.push(`Row ${i + 1}: Code "${rawCode}" is not 13 characters`)
      else skipped++
      continue
    }

    mapping[dj] = code
  }

  return { mapping, errors, skipped }
}

// --- GitHub commit ---

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

async function commitMapping(mapping) {
  // Get current file SHA
  const current = await githubRequest(`contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`)
  const currentContent = JSON.parse(Buffer.from(current.content, 'base64').toString('utf-8'))
  const currentCount = Object.keys(currentContent).length
  const newCount = Object.keys(mapping).length

  // Only commit if there are actual changes
  const changed = newCount !== currentCount ||
    Object.entries(mapping).some(([dj, code]) => currentContent[dj] !== code)

  if (!changed) {
    return { committed: false, reason: 'No changes detected' }
  }

  await githubRequest(`contents/${FILE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Sync DJ mapping from Excel (${newCount} entries, was ${currentCount})`,
      content: Buffer.from(JSON.stringify(mapping, null, 2)).toString('base64'),
      sha: current.sha,
      branch: GITHUB_BRANCH,
    }),
  })

  return {
    committed: true,
    previous: currentCount,
    current: newCount,
    added: Object.keys(mapping).filter(dj => !currentContent[dj]).length,
    removed: Object.keys(currentContent).filter(dj => !mapping[dj]).length,
    updated: Object.keys(mapping).filter(dj => currentContent[dj] && currentContent[dj] !== mapping[dj]).length,
  }
}

// --- Handler ---

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  // Allow either CRON_SECRET (Vercel cron) or ADMIN_KEY (manual trigger)
  const cronSecret = req.headers['authorization']?.replace('Bearer ', '')
  const adminKey = req.headers['x-admin-key']
  const isAuthorizedCron = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET
  const isAuthorizedAdmin = process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY
  if (!isAuthorizedCron && !isAuthorizedAdmin) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 1. Get Microsoft Graph token
    const token = await getGraphToken()

    // 2. Read Excel sheet
    const rows = await readExcelSheet(token)

    if (rows.length === 0) {
      return res.json({ success: false, error: 'No data found in sheet' })
    }

    // 3. Parse into mapping
    const { mapping, errors, skipped } = parseRows(rows)
    const entryCount = Object.keys(mapping).length

    if (entryCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid DJ→Product Code pairs found',
        parseErrors: errors.slice(0, 20),
        rowsRead: rows.length,
        skipped,
      })
    }

    // 4. Commit to GitHub
    const commitResult = await commitMapping(mapping)

    return res.json({
      success: true,
      entries: entryCount,
      rowsRead: rows.length,
      skipped,
      parseErrors: errors.slice(0, 10),
      commit: commitResult,
      message: commitResult.committed
        ? `Synced ${entryCount} mappings. Site will redeploy in ~60 seconds.`
        : `${entryCount} mappings read. ${commitResult.reason}.`,
    })
  } catch (err) {
    console.error('Sync mapping error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Vercel Cron config — runs daily at 6am AEST (8pm UTC previous day)
export const config = {
  maxDuration: 30,
}
