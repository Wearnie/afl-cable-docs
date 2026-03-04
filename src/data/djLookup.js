// DJ Number → Product Code lookup
// Fetches /data/dj-mapping.json on first call and caches in memory.
// In production, Power Automate overwrites dj-mapping.json → Vercel redeploys.

let cache = null

export async function loadDJMapping() {
  if (cache) return cache
  const res = await fetch('/data/dj-mapping.json')
  cache = await res.json()
  return cache
}

export function lookupProductCode(djNumber) {
  if (!cache || !djNumber) return null
  const key = djNumber.replace(/\D/g, '') // strip non-digits
  return cache[key] || null
}
