// Auth API client — JWT-based with email/password login
// Uses sessionStorage (clears when browser closes)

const TOKEN_KEY = 'afl_auth_token'
const USER_KEY = 'afl_auth_user'

// --- Session helpers ---

export function hasAuthToken() {
  return !!sessionStorage.getItem(TOKEN_KEY)
}

export function getAuthUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function getAuthRole() {
  return getAuthUser()?.role || null
}

export function setAuthSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

// --- Auth API ---

export async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
  return data // { token, user } or { mustChangePassword, tempToken, user }
}

export async function changePassword(newPassword, currentPassword) {
  const token = getToken()
  const res = await fetch('/api/auth/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-auth-token': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ newPassword, currentPassword }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Password change failed')
  return data // { token, user }
}

export async function verifySession() {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'x-auth-token': `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json() // { email, name, role }
  } catch {
    return null
  }
}

// --- Generic API call with JWT ---

async function apiCall(path, options = {}) {
  const isWrite = options.method && options.method !== 'GET'
  const url = isWrite ? path : `${path}${path.includes('?') ? '&' : '?'}_t=${Date.now()}`
  const token = getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-auth-token': `Bearer ${token}` } : {}),
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

// --- User Management API (admin only) ---

export async function listUsers() {
  return apiCall('/api/auth/users')
}

export async function createUser(email, name, role, password) {
  return apiCall('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify({ email, name, role, password }),
  })
}

export async function updateUser(email, updates) {
  return apiCall('/api/auth/users', {
    method: 'PUT',
    body: JSON.stringify({ email, ...updates }),
  })
}

export async function deleteUser(email) {
  return apiCall('/api/auth/users', {
    method: 'DELETE',
    body: JSON.stringify({ email }),
  })
}

// --- DJ Mapping API ---

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

// --- Static Document Upload API (TDS, Stripping, etc.) ---

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

// --- Document Map API ---

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

// --- Delete Document API ---

export async function deleteDocument(path) {
  return apiCall('/api/delete-doc', {
    method: 'DELETE',
    body: JSON.stringify({ path }),
  })
}

// --- DJ Override API ---

export async function saveDJOverrides(djNumber, exclude, include) {
  return apiCall('/api/dj-overrides', {
    method: 'POST',
    body: JSON.stringify({ djNumber, exclude, include }),
  })
}

// --- Final Test Certificate API ---

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
