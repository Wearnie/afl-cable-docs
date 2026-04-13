// Azure Blob Storage: Final Test Certificate Upload
// POST /api/upload-cert — upload a PDF, extracts Job Number & Item Code,
// stores the PDF in blob storage, updates the cert index and DJ mapping.

import { requireDispatch } from './lib/auth.js'
import { readJSON, writeJSON, uploadBlob } from './lib/blob-storage.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdf = require('pdf-parse/lib/pdf-parse.js')

const CERTS_JSON_PATH = 'data/final-test-certs.json'
const DJ_MAPPING_PATH = 'data/dj-mapping.json'

async function extractFromPdf(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64')
  const data = await pdf(buffer, { max: 1 })
  const text = data.text

  const jobMatch = text.match(/Job\s*Number\s*:\s*(\d{8})/i)
  if (!jobMatch) {
    throw new Error('Could not find "Job Number" on page 1 of the PDF. Expected format: "Job Number: 12345678"')
  }

  const itemMatch = text.match(/Item\s*Code\s*:\s*([A-Z0-9][-A-Z0-9]*)/i)
  if (!itemMatch) {
    throw new Error('Could not find "Item Code" on page 1 of the PDF. Expected format: "Item Code: TVBQ55AA024AQ"')
  }

  const rawCode = itemMatch[1].toUpperCase()
  if (rawCode.length > 25) {
    throw new Error(`Item Code "${rawCode}" is too long (${rawCode.length} chars). Expected a product code like "TVBQ55AA024AQ"`)
  }
  const productCode = rawCode.replace(/(?:-(?:FP|ESS|SH2|ANT|TMC))+$/i, '')
  const baseCode = productCode.replace(/(?:-(?:SYDT|TMR|AG|SIE|FLH|EM))+$/i, '')
  if (baseCode.length !== 13) {
    throw new Error(`Product code "${productCode}" does not resolve to a valid 13-character AFL code (got ${baseCode.length} chars)`)
  }

  return { djNumber: jobMatch[1], productCode }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try { requireDispatch(req) } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }

  try {
    const { fileName, fileBase64 } = req.body

    if (!fileBase64) {
      return res.status(400).json({ error: 'Required: fileBase64' })
    }

    // base64 encoding inflates ~33%, so 14MB base64 ≈ 10MB file
    if (fileBase64.length > 14 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB)' })
    }

    // 1. Extract DJ number and product code from the PDF
    const { djNumber, productCode } = await extractFromPdf(fileBase64)

    const pdfBlobPath = `docs/final-test-certs/${djNumber}.pdf`
    const certName = fileName || `${djNumber}.pdf`

    // 2. Upload the PDF to blob storage
    const pdfBuffer = Buffer.from(fileBase64, 'base64')
    await uploadBlob(pdfBlobPath, pdfBuffer)

    // 3. Update the certs JSON index
    const certsIndex = await readJSON(CERTS_JSON_PATH, {})
    certsIndex[djNumber] = {
      url: `/docs/final-test-certs/${djNumber}.pdf`,
      name: certName,
      productCode,
      uploadedAt: new Date().toISOString(),
    }
    await writeJSON(CERTS_JSON_PATH, certsIndex)

    // 4. Update DJ → Product Code mapping
    const djMapping = await readJSON(DJ_MAPPING_PATH, {})
    const isNew = !djMapping[djNumber]
    djMapping[djNumber] = productCode
    await writeJSON(DJ_MAPPING_PATH, djMapping)

    return res.json({
      success: true,
      djNumber,
      productCode,
      url: `/docs/final-test-certs/${djNumber}.pdf`,
      mappingCreated: isNew,
      message: `Certificate uploaded for DJ ${djNumber} → ${productCode}.`,
    })
  } catch (err) {
    console.error('Upload cert error:', err)
    return res.status(500).json({ error: err.message })
  }
}
