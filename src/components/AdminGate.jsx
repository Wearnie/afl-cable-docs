import { useState, useEffect } from 'react'
import { hasAdminKey, setAdminKey, clearAdminKey, verifyAdminKey } from '../lib/adminApi'

export default function AdminGate({ children }) {
  const [state, setState] = useState('checking') // checking | login | authenticated
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  // On mount: check if saved key is still valid
  useEffect(() => {
    if (!hasAdminKey()) {
      setState('login')
      return
    }
    verifyAdminKey()
      .then(valid => {
        setState(valid ? 'authenticated' : 'login')
        if (!valid) clearAdminKey()
      })
      .catch(() => {
        // Network error or no ADMIN_KEY set — allow through (dev mode)
        setState('authenticated')
      })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!key.trim()) { setError('Enter the admin key'); return }
    setVerifying(true)
    setError('')
    try {
      const valid = await verifyAdminKey(key.trim())
      if (valid) {
        setAdminKey(key.trim())
        setState('authenticated')
      } else {
        setError('Invalid admin key')
      }
    } catch {
      // If verify endpoint doesn't exist or network error, allow through
      setAdminKey(key.trim())
      setState('authenticated')
    } finally {
      setVerifying(false)
    }
  }

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light">
        <p className="text-afl-muted font-heading">Verifying access...</p>
      </div>
    )
  }

  if (state === 'authenticated') return children

  return (
    <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-sm">
        <h2 className="text-xl font-bold text-afl-text font-heading mb-1">Admin Access</h2>
        <p className="text-afl-muted text-sm mb-6">Enter the admin key to continue.</p>

        <input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setError('') }}
          placeholder="Admin key"
          className="w-full px-4 py-3 border border-afl-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
          autoFocus
        />

        {error && <p className="text-red-600 text-xs mt-2 font-medium">{error}</p>}

        <button
          type="submit"
          disabled={verifying}
          className="w-full mt-4 px-4 py-3 bg-afl-navy text-white rounded-xl text-sm font-semibold font-heading hover:bg-afl-navy/90 disabled:bg-gray-300 transition-colors"
        >
          {verifying ? 'Checking...' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
