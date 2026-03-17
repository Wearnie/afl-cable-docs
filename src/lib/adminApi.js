// Admin API client
// Handles API calls to Vercel serverless functions

const ADMIN_KEY_STORAGE = 'afl-admin-key'

export function hasAdminKey() {
  return !!localStorage.getItem(ADMIN_KEY_STORAGE)
}

export function setAdminKey(key) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key)
}

export function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE)
}

async function apiCall(path, options = {}) {
  // Cache-bust GET requests to avoid stale browser/CDN responses
  const url = (options.method && options.method !== 'GET') ? path : `${path}${path.includes('?') ? '&' : '?'}_t=${Date.now()}`
  const adminKey = getAdminKey()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(adminKey ? { 'x-admin-key': adminKey } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    localStorage.removeItem(ADMIN_KEY_STORAGE)
    throw new Error('Admin key is invalid or expired. Please refresh and re-enter.')
  }

  const data = await res.json()

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

export async function removeDocumentMappings(patterns) {
  return apiCall('/api/document-map', {
    method: 'DELETE',
    body: JSON.stringify({ patterns }),
  })
}

export async function editDocumentMappings(remove, add) {
  return apiCall('/api/document-map', {
    method: 'PUT',
    body: JSON.stringify({ remove, add }),
  })
}

// Final Test Certificate API
// The server extracts DJ number and product code from the PDF automatically

// DJ Override API

export async function saveDJOverrides(djNumber, exclude, include) {
  return apiCall('/api/dj-overrides', {
    method: 'POST',
    body: JSON.stringify({ djNumber, exclude, include }),
  })
}

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
