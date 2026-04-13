import { useAuth } from './AuthProvider'

/**
 * RoleGate — protects routes by required role level.
 * Props:
 *   minRole: 'dispatch' | 'admin' (default: 'admin')
 *   children: content to render when authenticated
 *
 * Dispatch → can access dispatch routes only
 * Admin → can access everything
 */
export default function AdminGate({ children, minRole = 'admin' }) {
  const { role } = useAuth()

  if (!meetsMinRole(role, minRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 w-full max-w-sm text-center">
          <h2 className="text-xl font-bold text-afl-text font-heading mb-2">
            Access Restricted
          </h2>
          <p className="text-afl-muted text-sm">
            This section requires {minRole} access.
            {role && <> You are signed in as <span className="font-semibold">{role}</span>.</>}
          </p>
        </div>
      </div>
    )
  }

  return children
}

function meetsMinRole(userRole, requiredRole) {
  if (requiredRole === 'dispatch') return userRole === 'dispatch' || userRole === 'admin'
  if (requiredRole === 'admin') return userRole === 'admin'
  return false
}
