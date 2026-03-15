// Admin API client
// Handles authentication and API calls to Vercel serverless functions

const ADMIN_KEY_STORAGE = 'afl-admin-key'

export function getAdminKey() {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE) || ''
}

export function setAdminKey(key) {
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key)
}

export function clearAdminKey() {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE)
}

export function hasAdminKey() {
  return !!getAdminKey()
}

async function apiCall(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': getAdminKey(),
      ...options.headers,
    },
  })

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
