// Shared authentication helper for API endpoints
// Checks x-admin-key header against ADMIN_KEY env var

export function requireAdmin(req) {
  const adminKey = process.env.ADMIN_KEY
  if (!adminKey) {
    // If ADMIN_KEY not set, allow all requests (dev mode)
    return
  }
  if (req.headers['x-admin-key'] !== adminKey) {
    const e = new Error('Unauthorized')
    e.status = 401
    throw e
  }
}
