import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthProvider'
import { listUsers, createUser, updateUser, deleteUser } from '../lib/adminApi'

function UserRow({ u, currentEmail, onUpdate, onDelete, readOnly = false }) {
  const [editing, setEditing] = useState(false)
  const [role, setRole] = useState(u.role)
  const [resetting, setResetting] = useState(false)
  const [resetPw, setResetPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isSelf = u.email === currentEmail

  const handleRoleChange = async (newRole) => {
    setBusy(true)
    setError('')
    try {
      await onUpdate(u.email, { role: newRole })
      setRole(newRole)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    if (resetPw.length < 8) { setError('Min 8 characters'); return }
    setBusy(true)
    setError('')
    try {
      await onUpdate(u.email, { resetPassword: resetPw })
      setResetting(false)
      setResetPw('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-afl-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-afl-text truncate">{u.name}</p>
            {u.mustChangePassword && (
              <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Temp password</span>
            )}
          </div>
          <p className="text-sm text-afl-muted truncate">{u.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <div className="flex items-center gap-1">
              {['admin', 'dispatch'].map(r => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  disabled={busy}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    r === role
                      ? 'bg-afl-cyan text-white'
                      : 'bg-gray-100 text-afl-muted hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
              <button onClick={() => setEditing(false)} className="text-xs text-afl-muted ml-1">Cancel</button>
            </div>
          ) : (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
              role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
            }`}>
              {role}
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

      {resetting && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={resetPw}
            onChange={e => { setResetPw(e.target.value); setError('') }}
            placeholder="New temporary password (min 8 chars)"
            className="flex-1 px-3 py-2 text-sm border border-afl-border rounded-lg focus:outline-none focus:ring-2 focus:ring-afl-cyan"
          />
          <button onClick={handleReset} disabled={busy} className="afl-btn afl-btn-primary text-xs !py-2">
            {busy ? 'Saving...' : 'Reset'}
          </button>
          <button onClick={() => { setResetting(false); setResetPw('') }} className="text-xs text-afl-muted">Cancel</button>
        </div>
      )}

      {!isSelf && !resetting && !readOnly && (
        <div className="mt-3 flex items-center gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs text-afl-cyan hover:underline">
              Change role
            </button>
          )}
          <button onClick={() => setResetting(true)} className="text-xs text-afl-cyan hover:underline">
            Reset password
          </button>
          <button onClick={() => onDelete(u.email)} className="text-xs text-red-500 hover:underline ml-auto">
            Remove
          </button>
        </div>
      )}
      {isSelf && (
        <p className="text-xs text-afl-muted mt-2">This is your account</p>
      )}
    </div>
  )
}

export default function UsersPage() {
  const { user, authMode } = useAuth()
  const entraMode = authMode === 'entra'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('dispatch')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = async () => {
    try {
      const data = await listUsers()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newEmail || !newName || !newPassword) { setCreateError('All fields required'); return }
    if (newPassword.length < 8) { setCreateError('Password must be at least 8 characters'); return }
    setCreating(true)
    setCreateError('')
    try {
      await createUser(newEmail, newName, newRole, newPassword)
      setShowCreate(false)
      setNewEmail('')
      setNewName('')
      setNewRole('dispatch')
      setNewPassword('')
      load()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (email, updates) => {
    await updateUser(email, updates)
    load()
  }

  const handleDelete = async (email) => {
    if (confirmDelete !== email) {
      setConfirmDelete(email)
      return
    }
    await deleteUser(email)
    setConfirmDelete(null)
    load()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-afl-cyan border-t-transparent rounded-full animate-spin" />
          <p className="text-afl-muted font-heading">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-afl-light">
      <header className="afl-header-bg px-6 pt-6 pb-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <a href="/" className="text-white/60 text-sm hover:text-white/80 transition-colors">&larr; Home</a>
            <h1 className="text-white text-2xl font-bold font-heading mt-1">User Management</h1>
          </div>
          {!entraMode && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="afl-btn bg-white/10 text-white hover:bg-white/20 border-white/20 text-sm"
            >
              + Add User
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 -mt-10 pb-16">
        {entraMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-bold text-blue-900 font-heading mb-1">Users are managed in Microsoft Entra</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              This deployment uses single sign-on. To add or remove users, change roles, or reset passwords, go to the Microsoft Entra admin centre:{' '}
              <a href="https://entra.microsoft.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">entra.microsoft.com</a>. Roles are assigned by adding users to the <code className="font-mono text-xs bg-white/70 px-1 py-0.5 rounded">dispatch</code> or <code className="font-mono text-xs bg-white/70 px-1 py-0.5 rounded">admin</code> app role on the AFL Cable Docs app registration.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              The list below shows any legacy password-based users still in the data file. It is not updated by Entra sign-ins and is shown for reference only.
            </p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4">
            {error}
          </div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-afl-border p-6 mb-4 shadow-sm">
            <h3 className="font-bold text-afl-text font-heading mb-4">Create Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Full name"
                className="px-3 py-2.5 text-sm border border-afl-border rounded-lg focus:outline-none focus:ring-2 focus:ring-afl-cyan"
              />
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Email address"
                className="px-3 py-2.5 text-sm border border-afl-border rounded-lg focus:outline-none focus:ring-2 focus:ring-afl-cyan"
              />
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Temporary password (min 8 chars)"
                className="px-3 py-2.5 text-sm border border-afl-border rounded-lg focus:outline-none focus:ring-2 focus:ring-afl-cyan"
              />
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="px-3 py-2.5 text-sm border border-afl-border rounded-lg focus:outline-none focus:ring-2 focus:ring-afl-cyan bg-white"
              >
                <option value="dispatch">Dispatch</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {createError && <p className="text-red-600 text-xs mb-3">{createError}</p>}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={creating} className="afl-btn afl-btn-primary text-sm">
                {creating ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-afl-muted hover:text-afl-text">
                Cancel
              </button>
            </div>
            <p className="text-xs text-afl-muted mt-3">
              User will be required to change their password on first login.
            </p>
          </form>
        )}

        {confirmDelete && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <p className="text-sm text-red-700">
              Delete <span className="font-semibold">{confirmDelete}</span>? This cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDelete(confirmDelete)} className="text-sm font-semibold text-red-700 hover:underline">
                Confirm Delete
              </button>
              <button onClick={() => setConfirmDelete(null)} className="text-sm text-afl-muted">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {users.map(u => (
            <UserRow
              key={u.email}
              u={u}
              currentEmail={user?.email}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              readOnly={entraMode}
            />
          ))}
          {users.length === 0 && (
            <div className="text-center py-12 text-afl-muted text-sm">
              No user accounts yet. Click "Add User" to create one.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
