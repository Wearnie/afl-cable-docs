// Azure Blob Storage: Delete a document (PDF)
// DELETE /api/delete-doc

import { requireAdmin } from './lib/auth.js'
import { readJSON, writeJSON, deleteBlob, appendAuditLog } from './lib/blob-storage.js'

const DOC_MAP_PATH = 'data/document-map.json'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try { requireAdmin(req) } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }

  try {
    const { path: docPath, removePatterns = true } = req.body

    if (!docPath || typeof docPath !== 'string') {
      return res.status(400).json({ error: 'Required: path (e.g. "/tds/Some Cable.pdf")' })
    }

    const cleanPath = docPath.startsWith('/') ? docPath.slice(1) : docPath
    if (cleanPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' })
    }
    const blobPath = `docs/${cleanPath}`

    const deleted = await deleteBlob(blobPath)
    if (!deleted) {
      return res.status(404).json({ error: `File not found: ${docPath}` })
    }

    let removedPatterns = 0
    if (removePatterns) {
      try {
        const { data: entries } = await readJSON(DOC_MAP_PATH, [])
        const normalizedPath = docPath.startsWith('/') ? docPath : `/${docPath}`
        const filtered = entries.filter(e => e.path !== normalizedPath)
        removedPatterns = entries.length - filtered.length

        if (removedPatterns > 0) {
          await writeJSON(DOC_MAP_PATH, filtered)
        }
      } catch (err) {
        console.error('Warning: could not clean up document-map:', err.message)
      }
    }

    await appendAuditLog({ user: req.user?.email, action: 'delete-doc', target: docPath, removedPatterns })

    return res.json({
      success: true,
      deleted: docPath,
      removedPatterns,
      message: `Document deleted${removedPatterns > 0 ? ` and ${removedPatterns} pattern mapping(s) removed` : ''}.`,
    })
  } catch (err) {
    console.error('Delete doc error:', err)
    const msg = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production' ? 'Internal server error' : err.message
    return res.status(500).json({ error: msg })
  }
}
