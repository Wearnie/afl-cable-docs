// /api/auth/users — user management (admin only)
// GET: list all users, POST: create, PUT: update, DELETE: remove
import bcrypt from 'bcryptjs'
import { readJSON, writeJSON } from '../lib/blob-storage.js'
import { requireAdmin } from '../lib/auth.js'

const USERS_PATH = 'data/users.json'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    requireAdmin(req)
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message })
  }

  try {
    const users = await readJSON(USERS_PATH, {})

    // GET — list all users (strip password hashes)
    if (req.method === 'GET') {
      const list = Object.entries(users).map(([email, u]) => ({
        email,
        name: u.name,
        role: u.role,
        mustChangePassword: u.mustChangePassword || false,
        createdAt: u.createdAt,
        createdBy: u.createdBy,
      }))
      return res.json(list)
    }

    // POST — create user
    if (req.method === 'POST') {
      const { email, name, role, password } = req.body || {}
      if (!email || !name || !role || !password) {
        return res.status(400).json({ error: 'Required: email, name, role, password' })
      }
      const normalised = email.toLowerCase().trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) {
        return res.status(400).json({ error: 'Invalid email address' })
      }
      if (!['admin', 'dispatch'].includes(role)) {
        return res.status(400).json({ error: 'Role must be admin or dispatch' })
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' })
      }
      if (users[normalised]) {
        return res.status(409).json({ error: 'User already exists' })
      }

      users[normalised] = {
        name,
        role,
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        createdBy: req.user?.email || 'system',
      }
      await writeJSON(USERS_PATH, users)
      return res.json({ ok: true, email: normalised })
    }

    // PUT — update role or reset password
    if (req.method === 'PUT') {
      const { email, role, resetPassword } = req.body || {}
      if (!email) return res.status(400).json({ error: 'Email required' })
      const normalised = email.toLowerCase().trim()
      if (!users[normalised]) return res.status(404).json({ error: 'User not found' })

      if (role) {
        if (!['admin', 'dispatch'].includes(role)) {
          return res.status(400).json({ error: 'Role must be admin or dispatch' })
        }
        users[normalised].role = role
      }
      if (resetPassword) {
        if (resetPassword.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters' })
        }
        users[normalised].passwordHash = await bcrypt.hash(resetPassword, 12)
        users[normalised].mustChangePassword = true
      }
      await writeJSON(USERS_PATH, users)
      return res.json({ ok: true })
    }

    // DELETE — remove user
    if (req.method === 'DELETE') {
      const { email } = req.body || {}
      if (!email) return res.status(400).json({ error: 'Email required' })
      const normalised = email.toLowerCase().trim()
      if (!users[normalised]) return res.status(404).json({ error: 'User not found' })
      if (normalised === req.user?.email) {
        return res.status(400).json({ error: 'Cannot delete your own account' })
      }
      delete users[normalised]
      await writeJSON(USERS_PATH, users)
      return res.json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Users API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
