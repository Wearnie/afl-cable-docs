// GET /api/auth/me — verify JWT token, return user info
import { verifyToken } from '../lib/auth.js'

const isDev = () => process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development'
              || process.env.NODE_ENV === 'development'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.JWT_SECRET) {
    if (!isDev()) {
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
