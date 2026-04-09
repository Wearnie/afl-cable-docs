// Azure Blob Storage: Sync DJ Mapping from SharePoint Excel
// POST /api/sync-mapping — triggered by admin button
//
// Reads "Jobpack Database" sheet from the Print Message workbook via Microsoft Graph API
// Column A = DJ Number, Column B = Product Code

import { requireAdmin } from './lib/auth.js'
import { readJSON, writeJSON } from './lib/blob-storage.js'

const BLOB_PATH = 'data/dj-mapping.json'
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

    if (!rawDj || !rawCode) { skipped++; continue }
    if (rawDj.toLowerCase() === 'dj' || rawDj.toLowerCase().includes('number')) { skipped++; continue }

    const dj = rawDj.replace(/\D/g, '')
    const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (dj.length !== 8) {
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

// --- Handler ---

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try { requireAdmin(req) } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }

  try {
    const token = await getGraphToken()
    const rows = await readExcelSheet(token)

    if (rows.length === 0) {
      return res.json({ success: false, error: 'No data found in sheet' })
    }

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

    // Check for changes against current data
    const currentContent = await readJSON(BLOB_PATH, {})
    const currentCount = Object.keys(currentContent).length
    const newCount = Object.keys(mapping).length

    const changed = newCount !== currentCount ||
      Object.entries(mapping).some(([dj, code]) => currentContent[dj] !== code)

    let commitResult
    if (!changed) {
      commitResult = { committed: false, reason: 'No changes detected' }
    } else {
      await writeJSON(BLOB_PATH, mapping)
      commitResult = {
        committed: true,
        previous: currentCount,
        current: newCount,
        added: Object.keys(mapping).filter(dj => !currentContent[dj]).length,
        removed: Object.keys(currentContent).filter(dj => !mapping[dj]).length,
        updated: Object.keys(mapping).filter(dj => currentContent[dj] && currentContent[dj] !== mapping[dj]).length,
      }
    }

    return res.json({
      success: true,
      entries: entryCount,
      rowsRead: rows.length,
      skipped,
      parseErrors: errors.slice(0, 10),
      commit: commitResult,
      message: commitResult.committed
        ? `Synced ${entryCount} mappings.`
        : `${entryCount} mappings read. ${commitResult.reason}.`,
    })
  } catch (err) {
    console.error('Sync mapping error:', err)
    return res.status(500).json({ error: err.message })
  }
}
