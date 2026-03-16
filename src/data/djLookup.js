// DJ Number → Product Code lookup
// Fetches from the API (reads live GitHub data) so newly uploaded
// certs and DJ mappings are available immediately without waiting
// for a Vercel redeploy.

let cache = null

export async function loadDJMapping() {
  if (cache) return cache
  const res = await fetch(`/api/dj-mapping?_t=${Date.now()}`)
  cache = await res.json()
  return cache
}

export function lookupProductCode(djNumber) {
  if (!cache || !djNumber) return null
  const key = djNumber.replace(/\D/g, '') // strip non-digits
  return cache[key] || null
}
