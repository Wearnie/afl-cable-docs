// PUT /api/auth/password — change own password
import bcrypt from 'bcryptjs'
import { readJSON, writeJSON, appendAuditLog } from '../lib/blob-storage.js'
import { verifyPasswordToken, signToken } from '../lib/auth.js'

const USERS_PATH = 'data/users.json'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const user = verifyPasswordToken(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { currentPassword, newPassword } = req.body || {}
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }

  try {
    const { data: users, etag } = await readJSON(USERS_PATH, {})
    const record = users[user.email]
    if (!record) return res.status(404).json({ error: 'User not found' })

    // If not a forced change, verify current password
    if (!record.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required' })
      }
      const valid = await bcrypt.compare(currentPassword, record.passwordHash)
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' })
      }
    }

    record.passwordHash = await bcrypt.hash(newPassword, 12)
    record.mustChangePassword = false
    users[user.email] = record
    await writeJSON(USERS_PATH, users, etag)

    await appendAuditLog({ user: user.email, action: 'password-change' })

    // Return a fresh full-length token
    const token = signToken({ email: user.email, role: record.role, name: record.name })
    return res.json({ token, user: { email: user.email, name: record.name, role: record.role } })
  } catch (err) {
    console.error('Password change error:', err)
    const msg = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production' ? 'Internal server error' : err.message
    return res.status(500).json({ error: msg })
  }
}
