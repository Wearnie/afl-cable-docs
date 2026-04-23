// Client-side helpers for Azure Static Web Apps native Entra ID auth.
// Used when /api/config reports authMode === 'entra'.
// See docs/SSO-MIGRATION.md.

/**
 * Fetch the SWA client principal. Returns null when not signed in.
 * SWA responds with { clientPrincipal: null } for anonymous requests.
 */
export async function fetchClientPrincipal() {
  try {
    const res = await fetch('/.auth/me', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data?.clientPrincipal || null
  } catch {
    return null
  }
}

export function signInWithEntra(postLoginRedirectUri = '/') {
  const redirect = encodeURIComponent(postLoginRedirectUri)
  window.location.href = `/.auth/login/aad?post_login_redirect_uri=${redirect}`
}

export function signOutEntra(postLogoutRedirectUri = '/') {
  const redirect = encodeURIComponent(postLogoutRedirectUri)
  window.location.href = `/.auth/logout?post_logout_redirect_uri=${redirect}`
}
