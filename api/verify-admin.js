// DEPRECATED — replaced by /api/auth/me
// Kept for backwards compatibility during transition
import { verifyToken } from './lib/auth.js'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!process.env.JWT_SECRET) {
    const isProduction = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production'
    if (isProduction) return res.status(500).json({ valid: false, error: 'Server misconfiguration' })
    return res.json({ valid: true, role: 'admin' })
  }

  const user = verifyToken(req)
  if (!user) return res.status(401).json({ valid: false, error: 'Invalid token' })
  return res.json({ valid: true, role: user.role })
}
