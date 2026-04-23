// Two-tier auth: dispatch (upload certs, print QR) and admin (full access).
// Two modes, switched by AUTH_MODE env var:
//   - 'password' (default) — JWT in x-auth-token: Bearer header, bcrypt-hashed
//     passwords stored in data/users.json. Current production model.
//   - 'entra' — Azure SWA native Entra ID. Identity is delivered by the
//     platform via the x-ms-client-principal header; no JWT, no passwords.
//     See docs/SSO-MIGRATION.md.

import jwt from 'jsonwebtoken'
import { getClientPrincipal, resolveRole, principalToUser } from './client-principal.js'

const JWT_SECRET = () => process.env.JWT_SECRET
const isDev = () => process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development'
                 || process.env.NODE_ENV === 'development'
const isEntraMode = () => process.env.AUTH_MODE === 'entra'

function entraRequire(req, minRole) {
  const principal = getClientPrincipal(req)
  if (!principal) {
    const e = new Error('Unauthorized')
    e.status = 401
    throw e
  }
  const role = resolveRole(principal)
  if (!role) {
    const e = new Error('No role assigned — contact your administrator')
    e.status = 403
    throw e
  }
  if (minRole === 'admin' && role !== 'admin') {
    const e = new Error('Admin access required')
    e.status = 403
    throw e
  }
  req.user = principalToUser(principal, role)
}

/**
 * Decode and verify the JWT from the x-auth-token header.
 * Returns { email, role, name } or null if invalid/missing.
 * Rejects tokens with a `purpose` claim (restricted tokens).
 */
export function verifyToken(req) {
  const header = req.headers['x-auth-token'] || req.headers['authorization'] || req.headers['Authorization'] || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  try {
    const payload = jwt.verify(match[1], JWT_SECRET())
    if (payload.purpose) return null // restricted token — not valid for general API
    return { email: payload.email, role: payload.role, name: payload.name }
  } catch {
    return null
  }
}

/**
 * Verify a token that may be purpose-restricted (for password change flow).
 * Accepts both regular tokens and purpose: 'password-change' tokens.
 */
export function verifyPasswordToken(req) {
  const header = req.headers['x-auth-token'] || req.headers['authorization'] || req.headers['Authorization'] || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  try {
    const payload = jwt.verify(match[1], JWT_SECRET())
    if (payload.purpose && payload.purpose !== 'password-change') return null
    return { email: payload.email, role: payload.role, name: payload.name }
  } catch {
    return null
  }
}

/**
 * Sign a JWT for the given user. Returns the token string.
 */
export function signToken(user, expiresIn = '8h') {
  return jwt.sign(
    { email: user.email, role: user.role, name: user.name },
    JWT_SECRET(),
    { expiresIn }
  )
}

/**
 * Sign a purpose-restricted JWT (e.g. for password change).
 */
export function signRestrictedToken(user, purpose, expiresIn = '15m') {
  return jwt.sign(
    { email: user.email, role: user.role, name: user.name, purpose },
    JWT_SECRET(),
    { expiresIn }
  )
}

/**
 * Require at least dispatch-level access.
 * Accepts either dispatch or admin role.
 */
export function requireDispatch(req) {
  if (isEntraMode()) return entraRequire(req, 'dispatch')
  if (!JWT_SECRET()) {
    if (!isDev()) {
      const e = new Error('Server misconfiguration: JWT_SECRET not set')
      e.status = 500
      throw e
    }
    return
  }
  const user = verifyToken(req)
  if (!user) {
    const e = new Error('Unauthorized')
    e.status = 401
    throw e
  }
  req.user = user
}

/**
 * Require admin-level access. Only admin role accepted.
 */
export function requireAdmin(req) {
  if (isEntraMode()) return entraRequire(req, 'admin')
  if (!JWT_SECRET()) {
    if (!isDev()) {
      const e = new Error('Server misconfiguration: JWT_SECRET not set')
      e.status = 500
      throw e
    }
    return
  }
  const user = verifyToken(req)
  if (!user) {
    const e = new Error('Unauthorized')
    e.status = 401
    throw e
  }
  if (user.role !== 'admin') {
    const e = new Error('Admin access required')
    e.status = 403
    throw e
  }
  req.user = user
}
