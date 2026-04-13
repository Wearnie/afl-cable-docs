// POST /api/auth/login — authenticate with email + password, return JWT
import bcrypt from 'bcryptjs'
import { readJSON } from '../lib/blob-storage.js'
import { signToken, signRestrictedToken } from '../lib/auth.js'

const USERS_PATH = 'data/users.json'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  const normalised = email.toLowerCase().trim()

  try {
    const { data: users } = await readJSON(USERS_PATH, {})
    const user = users[normalised]

    if (!user) {
      // Constant-time delay to prevent user enumeration
      await bcrypt.hash('dummy', 12)
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Force password change on first login
    if (user.mustChangePassword) {
      const tempToken = signRestrictedToken(
        { email: normalised, role: user.role, name: user.name },
        'password-change'
      )
      return res.json({
        mustChangePassword: true,
        tempToken,
        user: { email: normalised, name: user.name, role: user.role },
      })
    }

    const token = signToken({ email: normalised, role: user.role, name: user.name })
    return res.json({
      token,
      user: { email: normalised, name: user.name, role: user.role },
    })
  } catch (err) {
    console.error('Login error:', err)
    const msg = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production' ? 'Internal server error' : err.message
    return res.status(500).json({ error: msg })
  }
}
