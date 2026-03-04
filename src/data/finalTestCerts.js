// Final Test Certificate lookup
// Checks local store (localStorage) first, then falls back to static entries.
// When you move to Supabase/Azure, swap getLocalCert for an API call.

import { getLocalCert } from '../lib/localCertStore'

const staticCerts = {
  // Example entry for demo
  'DJ3429835': { name: 'Final Test Certificate — DJ3429835', url: '/examples/ftc-DJ3429835.html' },
}

/**
 * Look up a final test certificate by DJ number.
 * Returns { name, url } or null if not yet uploaded.
 */
export function findFinalTestCert(djNumber) {
  if (!djNumber) return null
  const key = djNumber.toUpperCase().trim()

  // Check local uploads first (Rod's uploads from this browser)
  const local = getLocalCert(key)
  if (local) return local

  // Fall back to static entries
  return staticCerts[key] || null
}
