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
      const content = await readJSON(BLOB_PATH, {})
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

      for (const [dj, code] of Object.entries(entries)) {
        const cleanDj = dj.replace(/\D/g, '')
        if (cleanDj.length !== 8) {
          return res.status(400).json({ error: `DJ number "${dj}" must be 8 digits` })
        }
        if (typeof code !== 'string' || code.length !== 13) {
          return res.status(400).json({ error: `Product code "${code}" for DJ ${dj} must be exactly 13 characters` })
        }
      }

      const content = await readJSON(BLOB_PATH, {})

      const added = []
      const updated = []
      for (const [dj, code] of Object.entries(entries)) {
        const cleanDj = dj.replace(/\D/g, '')
        const cleanCode = code.toUpperCase()
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

      const content = await readJSON(BLOB_PATH, {})

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
    return res.status(500).json({ error: err.message })
  }
}
