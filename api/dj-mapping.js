// Azure Blob Storage: DJ Mapping CRUD
// GET  /api/dj-mapping         → returns full mapping
// GET  /api/dj-mapping?dj=123  → returns single entry
// POST /api/dj-mapping         → add/update entries
// DELETE /api/dj-mapping       → remove entries

import { requireAdmin } from './lib/auth.js'
import { readJSON, writeJSON } from './lib/blob-storage.js'

const BLOB_PATH = 'data/dj-mapping.json'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const { data: content } = await readJSON(BLOB_PATH, {})
      const { dj } = req.query || {}

      if (dj) {
        const key = dj.replace(/\D/g, '')
        const productCode = content[key] || null
        return res.json({ djNumber: key, productCode })
      }
      return res.json(content)
    }

    try { requireAdmin(req) } catch (err) {
      return res.status(err.status || 500).json({ error: err.message })
    }

    if (req.method === 'POST') {
      const { entries } = req.body
      if (!entries || typeof entries !== 'object') {
        return res.status(400).json({ error: 'Body must include { entries: { djNumber: productCode, ... } }' })
      }

      // Match api/upload-cert.js: allow customer-suffixed codes (e.g. -AG, -SYDT)
      // so long as the base code is 13 characters. Safe suffixes are stripped;
      // customer suffixes are retained in storage so findDocuments can do
      // suffix-aware TDS matching downstream.
      const SAFE_SUFFIX_RE = /(?:-(?:FP|ESS|SH2|ANT|TMC))+$/i
      const CUSTOMER_SUFFIX_RE = /(?:-(?:SYDT|TMR|AG|SIE|FLH|EM))+$/i

      const normalised = []
      for (const [dj, code] of Object.entries(entries)) {
        const cleanDj = dj.replace(/\D/g, '')
        if (cleanDj.length !== 8) {
          return res.status(400).json({ error: `DJ number "${dj}" must be 8 digits` })
        }
        if (typeof code !== 'string') {
          return res.status(400).json({ error: `Product code for DJ ${dj} must be a string` })
        }
        const upper = code.toUpperCase().trim()
        const withoutSafe = upper.replace(SAFE_SUFFIX_RE, '')
        const base = withoutSafe.replace(CUSTOMER_SUFFIX_RE, '')
        if (base.length !== 13) {
          return res.status(400).json({ error: `Product code "${code}" for DJ ${dj} does not resolve to a valid 13-character AFL code (base is ${base.length} chars)` })
        }
        normalised.push({ cleanDj, cleanCode: withoutSafe })
      }

      const { data: content } = await readJSON(BLOB_PATH, {})

      const added = []
      const updated = []
      for (const { cleanDj, cleanCode } of normalised) {
        if (content[cleanDj]) updated.push(cleanDj)
        else added.push(cleanDj)
        content[cleanDj] = cleanCode
      }

      await writeJSON(BLOB_PATH, content)

      return res.json({
        success: true,
        added: added.length,
        updated: updated.length,
        total: Object.keys(content).length,
      })
    }

    if (req.method === 'DELETE') {
      const { djNumbers } = req.body
      if (!Array.isArray(djNumbers) || djNumbers.length === 0) {
        return res.status(400).json({ error: 'Body must include { djNumbers: ["12345678", ...] }' })
      }

      const { data: content } = await readJSON(BLOB_PATH, {})

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

      await writeJSON(BLOB_PATH, content)

      return res.json({ success: true, removed: removed.length, total: Object.keys(content).length })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('DJ mapping API error:', err)
    const msg = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production' ? 'Internal server error' : err.message
    return res.status(500).json({ error: msg })
  }
}
