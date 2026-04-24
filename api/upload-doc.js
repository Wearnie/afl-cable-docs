// Azure Blob Storage: Upload a static document (TDS, Stripping, etc.)
// POST /api/upload-doc

import { requireAdmin } from './lib/auth.js'
import { uploadBlob, blobExists, appendAuditLog } from './lib/blob-storage.js'

// Built-in folder slugs plus any admin-configured custom type slug.
// Admin UI enforces the same shape (TYPE_ID_RE in AdminConfigPage).
const BUILTIN_DOC_TYPES = new Set(['tds', 'stripping', 'installation', 'storage-handling', 'other'])
const CUSTOM_TYPE_RE = /^[a-z][a-z0-9-]{2,30}$/

function isValidDocType(docType) {
  return BUILTIN_DOC_TYPES.has(docType) || CUSTOM_TYPE_RE.test(docType)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try { requireAdmin(req) } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }

  try {
    const { docType, fileName, fileBase64 } = req.body

    if (!docType || !fileName || !fileBase64) {
      return res.status(400).json({ error: 'Required: docType, fileName, fileBase64' })
    }

    if (!isValidDocType(docType)) {
      return res.status(400).json({ error: 'Invalid docType — must be a built-in slug or a valid custom-type id' })
    }
    const folder = docType

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files accepted' })
    }

    // base64 encoding inflates ~33%, so 14MB base64 ≈ 10MB file
    if (fileBase64.length > 14 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB)' })
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '')
    if (!safeName || safeName.startsWith('.')) {
      return res.status(400).json({ error: 'Invalid file name' })
    }

    const blobPath = `docs/${folder}/${safeName}`
    const existed = await blobExists(blobPath)
    const pdfBuffer = Buffer.from(fileBase64, 'base64')
    await uploadBlob(blobPath, pdfBuffer)

    await appendAuditLog({ user: req.user?.email, action: 'upload-doc', target: `${folder}/${safeName}`, docType })

    return res.json({
      success: true,
      path: `/docs/${folder}/${fileName}`,
      replaced: existed,
      message: `${fileName} uploaded to ${docType}.`,
    })
  } catch (err) {
    console.error('Upload doc error:', err)
    const msg = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production' ? 'Internal server error' : err.message
    return res.status(500).json({ error: msg })
  }
}
