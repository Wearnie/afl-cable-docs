// Shared authentication helper for API endpoints
// Validates either:
//   - x-admin-key header matching ADMIN_KEY env var (admin UI)
//   - Authorization: Bearer <CRON_SECRET> header (Vercel cron jobs)

export function requireAdmin(req) {
  // Accept Vercel cron auth
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers['authorization'] === `Bearer ${cronSecret}`) return

  // Require admin key
  const adminKey = process.env.ADMIN_KEY
  if (!adminKey) {
    const e = new Error('ADMIN_KEY not configured')
    e.status = 500
    throw e
  }

  if (req.headers['x-admin-key'] !== adminKey) {
    const e = new Error('Unauthorized')
    e.status = 401
    throw e
  }
}
