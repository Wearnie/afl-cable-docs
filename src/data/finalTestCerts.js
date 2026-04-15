// Final Test Certificate lookup
// Cache-busted fetch so newly uploaded certs appear without waiting for redeploy.

// Must match the DOC_BASE_URL used in documentMap.js so cert PDFs resolve to the
// same blob/static host. In prod VITE_DOC_BASE_URL points at Azure Blob; locally
// the default "/docs" is served from public/docs by Vite.
const DOC_BASE_URL = import.meta.env.VITE_DOC_BASE_URL || '/docs'

let cache = null

export async function loadFinalTestCerts() {
  if (cache) return cache
  const res = await fetch(`/api/final-test-certs?_t=${Date.now()}`)
  const raw = await res.json()

  // Stored URLs are "/docs/final-test-certs/<dj>.pdf". Rewrite the leading
  // "/docs" to DOC_BASE_URL so prod points at Azure Blob and local stays relative.
  const rewritten = {}
  for (const [dj, entry] of Object.entries(raw || {})) {
    if (entry && typeof entry.url === 'string') {
      rewritten[dj] = { ...entry, url: entry.url.replace(/^\/docs/, DOC_BASE_URL) }
    } else {
      rewritten[dj] = entry
    }
  }
  cache = rewritten
  return cache
}

// Clear the cache so the next loadFinalTestCerts() re-fetches.
export function invalidateFinalTestCertsCache() {
  cache = null
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
