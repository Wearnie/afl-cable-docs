import { createContext, useContext, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { hasAuthToken, getAuthUser, setAuthSession, clearAuth, login as apiLogin, verifySession, changePassword as apiChangePassword, fetchAppConfig } from '../lib/adminApi'
import { fetchClientPrincipal, signInWithEntra, signOutEntra } from '../lib/entraAuth'

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

async function fetchEntraUser() {
  const principal = await fetchClientPrincipal()
  if (!principal) return null
  // Resolve role server-side via /api/auth/me — authoritative, env-var-aware.
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function AuthProvider({ children }) {
  const location = useLocation()
  const [state, setState] = useState('checking') // checking | login | entra-signin | entra-no-role | authenticated | change-password
  const [authMode, setAuthMode] = useState('password')
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
    let cancelled = false

    const bootstrap = async () => {
      let mode = 'password'
      try {
        const cfg = await fetchAppConfig()
        if (cfg?.authMode === 'entra') mode = 'entra'
      } catch {
        // /api/config unreachable — fall through to password mode, which is
        // the safe default. Entra mode would fail anyway without the API.
      }
      if (cancelled) return
      setAuthMode(mode)

      if (mode === 'entra') {
        const u = await fetchEntraUser()
        if (cancelled) return
        if (u) {
          setUser(u)
          setState('authenticated')
        } else {
          // Distinguish "not signed in" from "signed in but no role".
          const principal = await fetchClientPrincipal()
          if (cancelled) return
          setState(principal ? 'entra-no-role' : 'entra-signin')
          if (principal) setUser({ email: principal.userDetails, name: principal.userDetails, role: null })
        }
        return
      }

      // Password mode (existing behaviour)
      if (!hasAuthToken()) {
        setState('login')
        return
      }
      try {
        const u = await verifySession()
        if (cancelled) return
        if (u) {
          setUser(u)
          setState('authenticated')
        } else {
          clearAuth()
          setState('login')
        }
      } catch {
        if (cancelled) return
        const stored = getAuthUser()
        setUser(stored || { email: 'dev@local', name: 'Dev User', role: 'admin' })
        setState('authenticated')
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter your email and password'); return }
    setVerifying(true)
    setError('')
    try {
      const data = await apiLogin(email.trim(), password)
      if (data.mustChangePassword) {
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
    if (authMode === 'entra') {
      signOutEntra('/')
      return
    }
    clearAuth()
    setUser(null)
    setEmail('')
    setPassword('')
    setState('login')
  }

  // Public routes (QR code pages) skip auth entirely
  if (isPublicRoute(location.pathname)) {
    return (
      <AuthContext.Provider value={{ user: null, role: null, authMode, signOut: () => {} }}>
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

  if (state === 'entra-signin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-sm text-center">
          <div className="flex justify-center mb-8">
            <div className="logo-dark-bg">
              <img src="/afl-logo.png" alt="AFL" className="h-16 w-auto" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-afl-text font-heading mb-1">Sign In</h2>
          <p className="text-afl-muted text-sm mb-6">Use your AFL Microsoft account.</p>
          <button
            type="button"
            onClick={() => signInWithEntra(location.pathname || '/')}
            className="w-full afl-btn afl-btn-primary justify-center !rounded-xl !py-3"
          >
            Sign in with Microsoft
          </button>
        </div>
      </div>
    )
  }

  if (state === 'entra-no-role') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-afl-text font-heading mb-2">Access Pending</h2>
          <p className="text-afl-muted text-sm mb-4">
            You&apos;re signed in as <span className="font-semibold">{user?.email}</span>, but no role has been assigned to your account yet. Contact an administrator to request <strong>dispatch</strong> or <strong>admin</strong> access.
          </p>
          <button
            type="button"
            onClick={() => signOutEntra('/')}
            className="afl-btn afl-btn-secondary text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (state === 'change-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <div className="logo-dark-bg">
              <img src="/afl-logo.png" alt="AFL" className="h-16 w-auto" />
            </div>
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
          <div className="flex justify-center mb-8">
            <div className="logo-dark-bg">
              <img src="/afl-logo.png" alt="AFL" className="h-16 w-auto" />
            </div>
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
    <AuthContext.Provider value={{ user, role: user?.role, authMode, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
