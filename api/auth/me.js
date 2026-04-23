// GET /api/auth/me — return the current user (email, name, role).
// Branches on AUTH_MODE: 'entra' reads the SWA client principal header;
// 'password' (default) verifies the JWT from x-auth-token.
import { verifyToken } from '../lib/auth.js'
import { getClientPrincipal, resolveRole, principalToUser } from '../lib/client-principal.js'

const isDev = () => process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development'
              || process.env.NODE_ENV === 'development'
const isEntraMode = () => process.env.AUTH_MODE === 'entra'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (isEntraMode()) {
    const principal = getClientPrincipal(req)
    if (!principal) return res.status(401).json({ error: 'Not signed in' })
    const role = resolveRole(principal)
    if (!role) return res.status(403).json({ error: 'No role assigned — contact your administrator' })
    return res.json(principalToUser(principal, role))
  }

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
