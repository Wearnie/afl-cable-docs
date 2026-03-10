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

export async function addDJMappings(entries) {
  return apiCall('/api/dj-mapping', {
    method: 'POST',
    body: JSON.stringify({ entries }),
  })
}

export async function removeDJMappings(djNumbers) {
  return apiCall('/api/dj-mapping', {
    method: 'DELETE',
    body: JSON.stringify({ djNumbers }),
  })
}

// Final Test Certificate API

export async function uploadFinalTestCert(djNumber, file) {
  // Convert file to base64
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Remove the data:...;base64, prefix
      const result = reader.result.split(',')[1]
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  return apiCall('/api/upload-cert', {
    method: 'POST',
    body: JSON.stringify({
      djNumber,
      fileName: file.name,
      fileBase64: base64,
    }),
  })
}
