// Final Test Certificate lookup
// Cache-busted fetch so newly uploaded certs appear without waiting for redeploy.

let cache = null

export async function loadFinalTestCerts() {
  if (cache) return cache
  const res = await fetch(`/api/final-test-certs?_t=${Date.now()}`)
  cache = await res.json()
  return cache
}

/**
 * Look up a final test certificate by DJ number.
 * Returns { url } or null if not yet uploaded.
 */
export function findFinalTestCert(djNumber) {
  if (!cache || !djNumber) return null
  const key = djNumber.replace(/\D/g, '') // strip non-digits
  return cache[key] || null
}

/**
 * Get all final test certs as an array (for listing).
 * Returns [{ djNumber, url }, ...]
 */
export function getAllFinalTestCerts() {
  if (!cache) return []
  return Object.entries(cache).map(([dj, data]) => ({ djNumber: dj, ...data }))
}
