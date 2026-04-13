// Azure Blob Storage: Per-DJ document overrides
// GET    /api/dj-overrides              → returns all overrides
// POST   /api/dj-overrides              → set overrides for a DJ
// DELETE /api/dj-overrides?dj=12345678  → remove all overrides for a DJ

import { requireAdmin } from './lib/auth.js'
import { readJSON, writeJSON } from './lib/blob-storage.js'

const BLOB_PATH = 'data/dj-doc-overrides.json'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const { data } = await readJSON(BLOB_PATH, {})
      return res.json(data)
    }

    try { requireAdmin(req) } catch (err) {
      return res.status(err.status || 500).json({ error: err.message })
    }

    if (req.method === 'POST') {
      const { djNumber, exclude, include } = req.body
      if (!djNumber || !/^\d{8}$/.test(djNumber)) {
        return res.status(400).json({ error: 'Required: djNumber (8 digits)' })
      }

      const { data } = await readJSON(BLOB_PATH, {})

      data[djNumber] = {
        exclude: Array.isArray(exclude) ? exclude : [],
        include: Array.isArray(include) ? include : [],
      }

      if (data[djNumber].exclude.length === 0 && data[djNumber].include.length === 0) {
        delete data[djNumber]
      }

      await writeJSON(BLOB_PATH, data)

      return res.json({
        success: true,
        djNumber,
        overrides: data[djNumber] || null,
        message: `Overrides saved for DJ ${djNumber}.`,
      })
    }

    if (req.method === 'DELETE') {
      const djNumber = req.query.dj
      if (!djNumber) return res.status(400).json({ error: 'Required: ?dj=12345678' })

      const { data } = await readJSON(BLOB_PATH, {})
      if (!data[djNumber]) {
        return res.json({ success: true, message: 'No overrides to remove' })
      }

      delete data[djNumber]
      await writeJSON(BLOB_PATH, data)

      return res.json({ success: true, message: `Overrides removed for DJ ${djNumber}` })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('DJ overrides API error:', err)
    const msg = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production' ? 'Internal server error' : err.message
    return res.status(500).json({ error: msg })
  }
}
