// Admin API client
// Handles API calls to Vercel serverless functions

const ADMIN_KEY_STORAGE = 'afl_admin_key'

export function hasAdminKey() {
  return !!localStorage.getItem(ADMIN_KEY_STORAGE)
}

export function setAdminKey(key) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key)
}

export function clearAdminKey() {
  localStorage.removeItem(ADMIN_KEY_STORAGE)
}

function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || ''
}

// Verify admin key against server — returns true/false
export async function verifyAdminKey(keyOverride) {
  const key = keyOverride || getAdminKey()
  if (!key) return false
  try {
    const res = await fetch('/api/verify-admin', {
      headers: { 'x-admin-key': key },
    })
    return res.ok
  } catch {
    return false
  }
}

async function apiCall(path, options = {}) {
  // Cache-bust GET requests to avoid stale browser/CDN responses
  const isWrite = options.method && options.method !== 'GET'
  const url = isWrite ? path : `${path}${path.includes('?') ? '&' : '?'}_t=${Date.now()}`
  const adminKey = getAdminKey()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(adminKey ? { 'x-admin-key': adminKey } : {}),
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
    clearAdminKey()
    throw new Error('Session expired — please refresh and re-enter admin key')
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
// The server extracts DJ number and product code from the PDF automatically

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
