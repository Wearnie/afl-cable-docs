// Lightweight endpoint to verify admin key
// GET /api/verify-admin with x-admin-key header
// Returns { valid: true } or 401

import { requireAdmin } from './lib/auth.js'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    requireAdmin(req)
    return res.json({ valid: true })
  } catch (err) {
    return res.status(err.status || 401).json({ valid: false, error: err.message })
  }
}
