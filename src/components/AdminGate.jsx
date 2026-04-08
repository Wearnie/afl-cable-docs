import { useState, useEffect } from 'react'
import { hasAuthKey, getAuthRole, setAuth, clearAuth, verifyKey } from '../lib/adminApi'

/**
 * RoleGate — protects routes by required role level.
 * Props:
 *   minRole: 'dispatch' | 'admin' (default: 'admin')
 *   children: content to render when authenticated
 *
 * Dispatch key → can access dispatch routes only
 * Admin key → can access everything
 */
export default function AdminGate({ children, minRole = 'admin' }) {
  const [state, setState] = useState('checking') // checking | login | authenticated
  const [role, setRole] = useState(null)
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!hasAuthKey()) {
      setState('login')
      return
    }
    verifyKey()
      .then(({ valid, role: r }) => {
        if (valid && meetsMinRole(r, minRole)) {
          setRole(r)
          setState('authenticated')
        } else if (valid) {
          // Valid key but insufficient role
          setRole(r)
          setState('login')
          setError(`This section requires ${minRole} access. You are signed in as ${r}.`)
        } else {
          clearAuth()
          setState('login')
        }
      })
      .catch(() => setState('authenticated')) // Network error — allow through (dev mode)
  }, [minRole])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!key.trim()) { setError('Enter your access key'); return }
    setVerifying(true)
    setError('')
    try {
      const { valid, role: r } = await verifyKey(key.trim())
      if (valid && meetsMinRole(r, minRole)) {
        setAuth(key.trim(), r)
        setRole(r)
        setState('authenticated')
      } else if (valid) {
        setError(`This section requires ${minRole} access. Your key has ${r} access.`)
      } else {
        setError('Invalid access key')
      }
    } catch {
      // Network error / no endpoint — allow through (dev mode)
      setAuth(key.trim(), 'admin')
      setRole('admin')
      setState('authenticated')
    } finally {
      setVerifying(false)
    }
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

  if (state === 'authenticated') return children

  const isDispatchRoute = minRole === 'dispatch'

  return (
    <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-sm">
        <div className="logo-dark-bg inline-block mb-6">
          <img src="/afl-logo.png" alt="AFL" className="h-8 w-auto" />
        </div>

        <h2 className="text-xl font-bold text-afl-text font-heading mb-1">
          {isDispatchRoute ? 'Dispatch Access' : 'Admin Access'}
        </h2>
        <p className="text-afl-muted text-sm mb-6">
          {isDispatchRoute
            ? 'Enter your dispatch or admin key to continue.'
            : 'Enter the admin key to continue.'}
        </p>

        <input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setError('') }}
          placeholder="Access key"
          className="w-full px-4 py-3 border border-afl-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
          autoFocus
        />

        {error && <p className="text-red-600 text-xs mt-2 font-medium">{error}</p>}

        <button
          type="submit"
          disabled={verifying}
          className="w-full mt-4 afl-btn afl-btn-primary justify-center !rounded-xl !py-3"
        >
          {verifying ? 'Checking...' : 'Sign In'}
        </button>

        {role && (
          <p className="text-xs text-afl-muted text-center mt-3">
            Currently signed in as <span className="font-semibold">{role}</span>
          </p>
        )}
      </form>
    </div>
  )
}

function meetsMinRole(userRole, requiredRole) {
  if (requiredRole === 'dispatch') return userRole === 'dispatch' || userRole === 'admin'
  if (requiredRole === 'admin') return userRole === 'admin'
  return false
}
