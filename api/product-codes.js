// Azure Blob Storage: Product Codes list
// GET /api/product-codes → returns the product codes array

import { readJSON } from './lib/blob-storage.js'

const BLOB_PATH = 'data/product-codes.json'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const content = await readJSON(BLOB_PATH, [])
    return res.json(content)
  } catch (err) {
    console.error('Product codes API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
