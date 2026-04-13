import { createContext, useContext, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { hasAuthToken, getAuthUser, setAuthSession, clearAuth, login as apiLogin, verifySession, changePassword as apiChangePassword } from '../lib/adminApi'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// Routes accessible without login (QR code scans)
const PUBLIC_PREFIXES = ['/dj/']

function isPublicRoute(pathname) {
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true
  // /:productCode — any single-segment path that isn't a known app route
  const appRoutes = ['/', '/generate', '/upload', '/review', '/admin', '/audit', '/coverage', '/review-matches', '/users']
  if (!appRoutes.includes(pathname) && /^\/[^/]+$/.test(pathname)) return true
  return false
}

export default function AuthProvider({ children }) {
  const location = useLocation()
  const [state, setState] = useState('checking') // checking | login | authenticated | change-password
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Change password state
  const [tempToken, setTempToken] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!hasAuthToken()) {
      setState('login')
      return
    }
    verifySession()
      .then((u) => {
        if (u) {
          setUser(u)
          setState('authenticated')
        } else {
          clearAuth()
          setState('login')
        }
      })
      .catch(() => {
        // Network error — allow through (dev mode)
        const stored = getAuthUser()
        setUser(stored || { email: 'dev@local', name: 'Dev User', role: 'admin' })
        setState('authenticated')
      })
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter your email and password'); return }
    setVerifying(true)
    setError('')
    try {
      const data = await apiLogin(email.trim(), password)
      if (data.mustChangePassword) {
        // Store temp token and show password change form
        setTempToken(data.tempToken)
        setUser(data.user)
        sessionStorage.setItem('afl_auth_token', data.tempToken)
        setState('change-password')
      } else {
        setAuthSession(data.token, data.user)
        setUser(data.user)
        setState('authenticated')
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setVerifying(false)
      setPassword('')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setVerifying(true)
    setError('')
    try {
      const data = await apiChangePassword(newPassword)
      setAuthSession(data.token, data.user)
      setUser(data.user)
      setTempToken(null)
      setNewPassword('')
      setConfirmPassword('')
      setState('authenticated')
    } catch (err) {
      setError(err.message || 'Password change failed')
    } finally {
      setVerifying(false)
    }
  }

  const signOut = () => {
    clearAuth()
    setUser(null)
    setEmail('')
    setPassword('')
    setState('login')
  }

  // Public routes (QR code pages) skip auth entirely
  if (isPublicRoute(location.pathname)) {
    return (
      <AuthContext.Provider value={{ user: null, role: null, signOut: () => {} }}>
        {children}
      </AuthContext.Provider>
    )
  }

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-afl-cyan border-t-transparent rounded-full animate-spin" />
          <p className="text-afl-muted font-heading">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (state === 'change-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-sm">
          <div className="logo-dark-bg inline-block mb-6">
            <img src="/afl-logo.png" alt="AFL" className="h-8 w-auto" />
          </div>

          <h2 className="text-xl font-bold text-afl-text font-heading mb-1">
            Change Password
          </h2>
          <p className="text-afl-muted text-sm mb-6">
            You must set a new password before continuing.
          </p>

          <input
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setError('') }}
            placeholder="New password (min 8 characters)"
            className="w-full px-4 py-3 border border-afl-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent mb-3"
            autoFocus
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
            placeholder="Confirm new password"
            className="w-full px-4 py-3 border border-afl-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
          />

          {error && <p className="text-red-600 text-xs mt-2 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="w-full mt-4 afl-btn afl-btn-primary justify-center !rounded-xl !py-3"
          >
            {verifying ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    )
  }

  if (state === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-sm">
          <div className="logo-dark-bg inline-block mb-6">
            <img src="/afl-logo.png" alt="AFL" className="h-8 w-auto" />
          </div>

          <h2 className="text-xl font-bold text-afl-text font-heading mb-1">
            Sign In
          </h2>
          <p className="text-afl-muted text-sm mb-6">
            Enter your email and password to continue.
          </p>

          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            placeholder="Email address"
            className="w-full px-4 py-3 border border-afl-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent mb-3"
            autoFocus
          />

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder="Password"
            className="w-full px-4 py-3 border border-afl-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
          />

          {error && <p className="text-red-600 text-xs mt-2 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="w-full mt-4 afl-btn afl-btn-primary justify-center !rounded-xl !py-3"
          >
            {verifying ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, role: user?.role, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
