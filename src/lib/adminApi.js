// Auth API client — two-tier: dispatch (QR + certs) and admin (full access)
// Uses sessionStorage (clears when browser closes)

const KEY_STORAGE = 'afl_auth_key'
const ROLE_STORAGE = 'afl_auth_role'

export function hasAuthKey() {
  return !!sessionStorage.getItem(KEY_STORAGE)
}

export function getAuthRole() {
  return sessionStorage.getItem(ROLE_STORAGE) || null
}

export function setAuth(key, role) {
  sessionStorage.setItem(KEY_STORAGE, key)
  sessionStorage.setItem(ROLE_STORAGE, role)
}

export function clearAuth() {
  sessionStorage.removeItem(KEY_STORAGE)
  sessionStorage.removeItem(ROLE_STORAGE)
}

function getAuthKey() {
  return sessionStorage.getItem(KEY_STORAGE) || ''
}

// Backwards-compatible aliases (used by existing code)
export const hasAdminKey = hasAuthKey
export function setAdminKey(key) { setAuth(key, 'admin') }
export const clearAdminKey = clearAuth

/**
 * Verify a key against the server. Returns { valid, role } or { valid: false }.
 */
export async function verifyKey(keyOverride) {
  const key = keyOverride || getAuthKey()
  if (!key) return { valid: false }
  try {
    const res = await fetch('/api/verify-admin', {
      headers: { 'x-admin-key': key },
    })
    if (!res.ok) return { valid: false }
    const data = await res.json()
    return { valid: true, role: data.role || 'admin' }
  } catch {
    return { valid: false }
  }
}

// Backwards-compatible alias
export async function verifyAdminKey(keyOverride) {
  const { valid } = await verifyKey(keyOverride)
  return valid
}

async function apiCall(path, options = {}) {
  const isWrite = options.method && options.method !== 'GET'
  const url = isWrite ? path : `${path}${path.includes('?') ? '&' : '?'}_t=${Date.now()}`
  const authKey = getAuthKey()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authKey ? { 'x-admin-key': authKey } : {}),
      ...options.headers,
    },
  })

  let data
  try {
    data = await res.json()
  } catch {
    if (res.status === 413) throw new Error('File too large — try a smaller PDF (max ~10MB)')
    if (res.status === 504 || res.status === 502) throw new Error('Upload timed out — the file may be too large. Try a smaller PDF.')
    throw new Error(`Server error (${res.status}) — the request may have timed out. Try again or use a smaller file.`)
  }

  if (res.status === 401) {
    clearAuth()
    throw new Error('Session expired — please refresh and sign in again')
  }

  if (res.status === 403) {
    throw new Error('Admin access required for this action')
  }

  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`)
  }

  return data
}

// DJ Mapping API

export async function fetchDJMapping() {
  return apiCall('/api/dj-mapping')
}

export async function lookupDJ(djNumber) {
  return apiCall(`/api/dj-mapping?dj=${encodeURIComponent(djNumber)}`)
}

export async function removeDJMappings(djNumbers) {
  return apiCall('/api/dj-mapping', {
    method: 'DELETE',
    body: JSON.stringify({ djNumbers }),
  })
}

// Static Document Upload API (TDS, Stripping, etc.)

export async function uploadStaticDoc(docType, file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  return apiCall('/api/upload-doc', {
    method: 'POST',
    body: JSON.stringify({
      docType,
      fileName: file.name,
      fileBase64: base64,
    }),
  })
}

// Document Map API

export async function fetchDocumentMap() {
  return apiCall('/api/document-map')
}

export async function addDocumentMappings(entries) {
  return apiCall('/api/document-map', {
    method: 'POST',
    body: JSON.stringify({ entries }),
  })
}

export async function removeDocumentMappings(patterns, type) {
  const body = type
    ? { entries: patterns.map(p => ({ pattern: p, type })) }
    : { patterns }
  return apiCall('/api/document-map', {
    method: 'DELETE',
    body: JSON.stringify(body),
  })
}

export async function editDocumentMappings(remove, add) {
  return apiCall('/api/document-map', {
    method: 'PUT',
    body: JSON.stringify({ remove, add }),
  })
}

// DJ Override API

export async function saveDJOverrides(djNumber, exclude, include) {
  return apiCall('/api/dj-overrides', {
    method: 'POST',
    body: JSON.stringify({ djNumber, exclude, include }),
  })
}

// Final Test Certificate API

export async function uploadFinalTestCert(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  return apiCall('/api/upload-cert', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileBase64: base64,
    }),
  })
}
