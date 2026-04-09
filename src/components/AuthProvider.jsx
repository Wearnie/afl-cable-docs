import { createContext, useContext, useState, useEffect } from 'react'
import { hasAuthKey, getAuthRole, setAuth, clearAuth, verifyKey } from '../lib/adminApi'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }) {
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
        if (valid) {
          setRole(r)
          setState('authenticated')
        } else {
          clearAuth()
          setState('login')
        }
      })
      .catch(() => {
        // Network error — allow through (dev mode)
        setRole(getAuthRole() || 'admin')
        setState('authenticated')
      })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!key.trim()) { setError('Enter your access key'); return }
    setVerifying(true)
    setError('')
    try {
      const { valid, role: r } = await verifyKey(key.trim())
      if (valid) {
        setAuth(key.trim(), r)
        setRole(r)
        setState('authenticated')
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

  const signOut = () => {
    clearAuth()
    setRole(null)
    setKey('')
    setState('login')
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

  if (state === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-sm">
          <div className="logo-dark-bg inline-block mb-6">
            <img src="/afl-logo.png" alt="AFL" className="h-8 w-auto" />
          </div>

          <h2 className="text-xl font-bold text-afl-text font-heading mb-1">
            Sign In
          </h2>
          <p className="text-afl-muted text-sm mb-6">
            Enter your access key to continue.
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
        </form>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ role, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
