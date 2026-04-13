// GET /api/auth/me — verify JWT token, return user info
import { verifyToken } from '../lib/auth.js'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Dev mode: no JWT_SECRET — allow through as admin
  if (!process.env.JWT_SECRET) {
    const isProduction = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production'
    if (isProduction) {
      return res.status(500).json({ error: 'Server misconfiguration' })
    }
    return res.json({ email: 'dev@local', name: 'Dev User', role: 'admin' })
  }

  const user = verifyToken(req)
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  return res.json(user)
}
