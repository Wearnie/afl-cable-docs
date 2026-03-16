// Per-DJ document overrides
// Loads /data/dj-doc-overrides.json and provides helpers to apply overrides

let _cache = null

export async function loadDJOverrides() {
  if (_cache) return _cache
  try {
    const res = await fetch(`/api/dj-overrides?_t=${Date.now()}`)
    _cache = await res.json()
  } catch {
    _cache = {}
  }
  return _cache
}

export function getDJOverrides(djNumber) {
  if (!_cache || !djNumber) return null
  return _cache[djNumber] || null
}

/**
 * Apply per-DJ overrides to a document list.
 * - Removes docs whose path is in the exclude list
 * - Adds docs from the include list
 */
export function applyOverrides(djNumber, documents) {
  const overrides = getDJOverrides(djNumber)
  if (!overrides) return documents

  const DOC_BASE_URL = import.meta.env.VITE_DOC_BASE_URL || '/docs'

  let result = documents
  if (overrides.exclude && overrides.exclude.length > 0) {
    const excludeSet = new Set(overrides.exclude)
    result = result.filter(d => !excludeSet.has(d.path))
  }
  if (overrides.include && overrides.include.length > 0) {
    for (const inc of overrides.include) {
      result.push({ ...inc, url: `${DOC_BASE_URL}${inc.path}` })
    }
  }
  return result
}

// Force reload from server
export async function reloadDJOverrides() {
  _cache = null
  return loadDJOverrides()
}
