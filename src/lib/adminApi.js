// Admin API client
// Handles API calls to Vercel serverless functions

async function apiCall(path, options = {}) {
  // Cache-bust GET requests to avoid stale browser/CDN responses
  const url = (options.method && options.method !== 'GET') ? path : `${path}${path.includes('?') ? '&' : '?'}_t=${Date.now()}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
// Files over 3MB are uploaded directly to GitHub to avoid Vercel's 4.5MB body limit

const DIRECT_UPLOAD_THRESHOLD = 3 * 1024 * 1024 // 3MB

async function getGitHubConfig() {
  // Fetch GitHub config from a lightweight endpoint
  const res = await fetch(`/api/upload-doc?config=1&_t=${Date.now()}`)
  const data = await res.json()
  return data
}

async function uploadToGitHubDirect(filePath, base64Content, commitMessage) {
  const config = await getGitHubConfig()
  if (!config.token || !config.repo || !config.branch) {
    throw new Error('Direct upload not available — GitHub config missing from server')
  }

  // Check if file exists to get SHA
  let existingSha = null
  try {
    const checkRes = await fetch(`https://api.github.com/repos/${config.repo}/contents/${filePath}?ref=${config.branch}`, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/vnd.github.v3+json' },
    })
    if (checkRes.ok) {
      const existing = await checkRes.json()
      existingSha = existing.sha
    }
  } catch { /* file doesn't exist */ }

  const body = { message: commitMessage, content: base64Content, branch: config.branch }
  if (existingSha) body.sha = existingSha

  const res = await fetch(`https://api.github.com/repos/${config.repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub upload failed: ${err}`)
  }
  return res.json()
}

export async function uploadStaticDoc(docType, file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  // Small files go through Vercel API as before
  if (file.size <= DIRECT_UPLOAD_THRESHOLD) {
    return apiCall('/api/upload-doc', {
      method: 'POST',
      body: JSON.stringify({
        docType,
        fileName: file.name,
        fileBase64: base64,
      }),
    })
  }

  // Large files upload directly to GitHub
  const VALID_DOC_TYPES = { tds: 'tds', stripping: 'stripping', 'test-certificates': 'test-certificates', installation: 'installation', other: 'other' }
  const folder = VALID_DOC_TYPES[docType] || 'other'
  const filePath = `public/docs/${folder}/${file.name}`

  await uploadToGitHubDirect(filePath, base64, `Upload ${docType}: ${file.name}`)

  return {
    success: true,
    path: `/docs/${folder}/${file.name}`,
    replaced: false,
    message: `${file.name} uploaded directly to GitHub. Site will redeploy in ~60 seconds.`,
  }
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
