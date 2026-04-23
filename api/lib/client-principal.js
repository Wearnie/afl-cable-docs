// Helpers for reading the Azure Static Web Apps client principal header.
// Used when AUTH_MODE=entra — see docs/SSO-MIGRATION.md.

function splitEnvList(value) {
  return String(value || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Decode the x-ms-client-principal header injected by Azure Static Web Apps.
 * Returns the parsed principal object, or null if missing/malformed.
 *
 * Principal shape (SWA docs):
 *   {
 *     identityProvider: 'aad',
 *     userId: <stable OID>,
 *     userDetails: <email or username>,
 *     userRoles: ['authenticated', 'admin', ...],
 *     claims: [{ typ, val }, ...]
 *   }
 */
export function getClientPrincipal(req) {
  const header = req.headers?.['x-ms-client-principal']
  if (!header) return null
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Resolve an internal role ('admin' | 'dispatch' | null) from a client principal.
 *
 * Priority:
 *   1. Env-var whitelist (AUTH_ADMIN_EMAILS, AUTH_DISPATCH_EMAILS) — for bootstrap
 *      before AAD app roles are configured.
 *   2. AAD app roles from principal.userRoles.
 *   3. null — user has no role, must be locked out.
 */
export function resolveRole(principal) {
  if (!principal) return null
  const email = String(principal.userDetails || '').toLowerCase()
  const adminEmails = splitEnvList(process.env.AUTH_ADMIN_EMAILS)
  const dispatchEmails = splitEnvList(process.env.AUTH_DISPATCH_EMAILS)

  if (email && adminEmails.includes(email)) return 'admin'
  if (email && dispatchEmails.includes(email)) return 'dispatch'

  const roles = Array.isArray(principal.userRoles) ? principal.userRoles : []
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('dispatch')) return 'dispatch'

  return null
}

/**
 * Map a client principal + resolved role to the internal req.user shape
 * used by the rest of the API ({ email, role, name }).
 */
export function principalToUser(principal, role) {
  const email = String(principal.userDetails || '').toLowerCase()
  const nameClaim = Array.isArray(principal.claims)
    ? principal.claims.find(c => c?.typ === 'name' || c?.typ === 'preferred_username')
    : null
  const name = nameClaim?.val || principal.userDetails || email
  return { email, role, name }
}
