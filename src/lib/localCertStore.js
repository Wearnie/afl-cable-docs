// Local certificate store — uses localStorage for demo/prototype
// Swap this module for Supabase/Azure when ready for production

const STORAGE_KEY = 'afl_final_test_certs'

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveAll(certs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certs))
}

/**
 * Save a final test certificate.
 * Stores the PDF as a base64 data URL in localStorage.
 */
export async function saveCert({ djNumber, productCode, file }) {
  const dj = djNumber.toUpperCase().trim()
  const base64 = await fileToBase64(file)

  const certs = getAll()
  certs[dj] = {
    name: `Final Test Certificate — ${dj}`,
    productCode: productCode.toUpperCase().trim(),
    fileName: file.name,
    url: base64,
    uploadedAt: new Date().toISOString(),
  }
  saveAll(certs)
  return certs[dj]
}

/**
 * Look up a certificate by DJ number from local store.
 * Returns { name, url, productCode, fileName, uploadedAt } or null.
 */
export function getLocalCert(djNumber) {
  if (!djNumber) return null
  const certs = getAll()
  return certs[djNumber.toUpperCase().trim()] || null
}

/**
 * Get all stored certificates (for listing on upload page).
 */
export function getAllCerts() {
  const certs = getAll()
  return Object.entries(certs).map(([dj, data]) => ({ djNumber: dj, ...data }))
}

/**
 * Delete a certificate by DJ number.
 */
export function deleteCert(djNumber) {
  const certs = getAll()
  delete certs[djNumber.toUpperCase().trim()]
  saveAll(certs)
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
