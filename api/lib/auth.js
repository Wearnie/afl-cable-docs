// Shared authentication helper for API endpoints
// Two-tier auth: DISPATCH_KEY (upload certs, print QR) and ADMIN_KEY (full access)
// Both checked via x-admin-key header

/**
 * Returns the role for the given key: 'admin', 'dispatch', or null.
 */
export function getRole(req) {
  const key = req.headers['x-admin-key']
  if (!key) return null
  const adminKey = process.env.ADMIN_KEY
  const dispatchKey = process.env.DISPATCH_KEY
  if (adminKey && key === adminKey) return 'admin'
  if (dispatchKey && key === dispatchKey) return 'dispatch'
  return null
}

/**
 * Require at least dispatch-level access.
 * Accepts either DISPATCH_KEY or ADMIN_KEY.
 */
export function requireDispatch(req) {
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production'
  if (!process.env.ADMIN_KEY && !process.env.DISPATCH_KEY) {
    if (isProduction) {
      const e = new Error('Server misconfiguration: no auth keys set')
      e.status = 500
      throw e
    }
    return
  }
  const role = getRole(req)
  if (!role) {
    const e = new Error('Unauthorized')
    e.status = 401
    throw e
  }
}

/**
 * Require admin-level access. Only ADMIN_KEY accepted.
 */
export function requireAdmin(req) {
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production'
  if (!process.env.ADMIN_KEY) {
    if (isProduction) {
      const e = new Error('Server misconfiguration: ADMIN_KEY not set')
      e.status = 500
      throw e
    }
    return
  }
  const role = getRole(req)
  if (role !== 'admin') {
    const e = new Error(role === 'dispatch' ? 'Admin access required' : 'Unauthorized')
    e.status = role === 'dispatch' ? 403 : 401
    throw e
  }
}
