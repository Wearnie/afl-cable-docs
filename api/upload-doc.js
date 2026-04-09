// Azure Blob Storage: Upload a static document (TDS, Stripping, etc.)
// POST /api/upload-doc

import { requireAdmin } from './lib/auth.js'
import { uploadBlob, blobExists } from './lib/blob-storage.js'

const VALID_DOC_TYPES = {
  tds: 'tds',
  stripping: 'stripping',
  'test-certificates': 'test-certificates',
  installation: 'installation',
  'storage-handling': 'storage-handling',
  other: 'other',
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

    const safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '')
    if (!safeName || safeName.startsWith('.')) {
      return res.status(400).json({ error: 'Invalid file name' })
    }

    const blobPath = `docs/${folder}/${safeName}`
    const existed = await blobExists(blobPath)
    const pdfBuffer = Buffer.from(fileBase64, 'base64')
    await uploadBlob(blobPath, pdfBuffer)

    return res.json({
      success: true,
      path: `/docs/${folder}/${fileName}`,
      replaced: existed,
      message: `${fileName} uploaded to ${docType}.`,
    })
  } catch (err) {
    console.error('Upload doc error:', err)
    return res.status(500).json({ error: err.message })
  }
}
