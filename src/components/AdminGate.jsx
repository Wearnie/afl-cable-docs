import { useState } from 'react'
import { hasAdminKey, setAdminKey } from '../lib/adminApi'

export default function AdminGate({ children }) {
  const [authenticated, setAuthenticated] = useState(hasAdminKey())
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!key.trim()) {
      setError('Enter the admin key')
      return
    }
    setAdminKey(key.trim())
    setAuthenticated(true)
  }

  if (authenticated) return children

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

        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

        <button
          type="submit"
          className="w-full mt-4 px-4 py-3 bg-afl-navy text-white rounded-xl text-sm font-semibold font-heading hover:bg-afl-navy/90 transition-colors"
        >
          Continue
        </button>
      </form>
    </div>
  )
}
