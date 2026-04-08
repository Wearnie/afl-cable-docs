// Verify auth key and return role (admin or dispatch)
// GET /api/verify-admin with x-admin-key header
// Returns { valid: true, role: 'admin'|'dispatch' } or 401

import { getRole } from './lib/auth.js'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production'

  // Dev mode: no keys configured — allow through as admin
  if (!process.env.ADMIN_KEY && !process.env.DISPATCH_KEY) {
    if (isProduction) {
      return res.status(500).json({ valid: false, error: 'Server misconfiguration' })
    }
    return res.json({ valid: true, role: 'admin' })
  }

  const role = getRole(req)
  if (!role) {
    return res.status(401).json({ valid: false, error: 'Invalid key' })
  }
  return res.json({ valid: true, role })
}
