import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { loadFinalTestCerts, getAllFinalTestCerts, invalidateFinalTestCertsCache } from '../data/finalTestCerts'
import { uploadFinalTestCert } from '../lib/adminApi'
import { invalidateDJMappingCache, loadDJMapping } from '../data/djLookup'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

function UploadPageInner() {
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([]) // [{ name, size, file, status, result?, error? }]
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    loadFinalTestCerts().then(() => {
      setCerts(getAllFinalTestCerts())
      setLoading(false)
    })
  }, [])

  // Shared file validation — used by both the file input and the drop zone
  const toItems = (files) => Array.from(files).map((f) => {
    if (f.type !== 'application/pdf') {
      return { name: f.name, size: f.size, file: f, status: 'error', error: 'Not a PDF' }
    }
    if (f.size > MAX_FILE_BYTES) {
      return { name: f.name, size: f.size, file: f, status: 'error', error: 'Too large (max 10MB)' }
    }
    return { name: f.name, size: f.size, file: f, status: 'queued' }
  })

  const handleFileChange = (e) => {
    setItems(toItems(e.target.files || []))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploading) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only clear when leaving the drop zone itself, not its children
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (uploading) return
    const dropped = e.dataTransfer?.files
    if (dropped?.length) setItems(toItems(dropped))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (items.length === 0) return

    setUploading(true)

    // Upload sequentially — the API uses etag optimistic concurrency on the
    // shared dj-mapping.json; parallel writes would cause retries.
    const working = [...items]
    for (let i = 0; i < working.length; i++) {
      if (working[i].status === 'error') continue

      working[i] = { ...working[i], status: 'uploading' }
      setItems([...working])

      try {
        const data = await uploadFinalTestCert(working[i].file)
        working[i] = { ...working[i], status: 'success', result: data }
      } catch (err) {
        working[i] = { ...working[i], status: 'error', error: err.message }
      }
      setItems([...working])
    }

    // Refresh the certs list and DJ mapping cache once at the end
    invalidateDJMappingCache()
    invalidateFinalTestCertsCache()
    await Promise.all([loadFinalTestCerts(), loadDJMapping()])
    setCerts(getAllFinalTestCerts())

    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
  }

  const handleClear = () => {
    setItems([])
    if (fileRef.current) fileRef.current.value = ''
  }

  const successCount = items.filter(i => i.status === 'success').length
  const errorCount = items.filter(i => i.status === 'error').length
  const pendingCount = items.filter(i => i.status === 'queued' || i.status === 'uploading').length
  const allFinished = items.length > 0 && pendingCount === 0

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #004282 0%, #004282 160px, #F7F8FA 160px)' }}>
      <header className="px-6 pt-5 pb-14 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="logo-dark-bg"><img src="/afl-logo.png" alt="AFL" className="h-9 w-auto" /></div>
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-lg font-bold text-white font-heading">Final Test Certificates</h1>
              <p className="text-blue-300 text-sm">Upload one or many — DJ number and product code are read from each PDF</p>
            </div>
          </div>
          <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-6 pb-8 space-y-4">
        {/* Upload form */}
        <form onSubmit={handleUpload} className="bg-white rounded-2xl shadow-sm border border-afl-border p-5 space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">
            Upload Final Test Certificates
          </h2>
          <p className="text-afl-muted text-xs">
            Drop one or many Optical Test Report PDFs. Job Number and Item Code are extracted automatically from each document.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-2 font-heading">
              PDF Files
            </label>
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-2xl border-2 border-dashed transition-all duration-150 cursor-pointer select-none ${
                uploading
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : isDragging
                    ? 'border-afl-cyan bg-afl-cyan/5 scale-[1.01]'
                    : 'border-afl-border bg-afl-light/40 hover:border-afl-cyan/60 hover:bg-afl-cyan/5'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${isDragging ? 'text-afl-cyan' : 'text-afl-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5V3.75m0 0L5.25 7.5M9 3.75l3.75 3.75M4.5 21h12.75A2.25 2.25 0 0019.5 18.75V12" />
              </svg>
              <div className="text-center">
                <p className={`text-sm font-semibold font-heading ${isDragging ? 'text-afl-cyan' : 'text-afl-text'}`}>
                  {isDragging ? 'Drop to queue' : 'Drag and drop PDFs here'}
                </p>
                <p className="text-xs text-afl-muted mt-1">
                  or click to browse · one or many at a time · 10MB each
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Select PDF files"
              />
            </div>
            {items.length > 0 && (
              <p className="text-xs text-afl-muted mt-2">
                {items.length} file{items.length === 1 ? '' : 's'} selected
              </p>
            )}
          </div>

          {items.length > 0 && (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                    item.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
                    item.status === 'error' ? 'bg-red-50 border-red-200' :
                    item.status === 'uploading' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={
                      item.status === 'success' ? { background: '#10b981', color: '#fff' } :
                      item.status === 'error' ? { background: '#ef4444', color: '#fff' } :
                      item.status === 'uploading' ? { background: '#3b82f6', color: '#fff' } :
                      { background: '#e5e7eb', color: '#6b7280' }
                    }
                  >
                    {item.status === 'success' ? '✓' :
                     item.status === 'error' ? '!' :
                     item.status === 'uploading' ? '…' :
                     '•'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-afl-text">{item.name}</div>
                    {item.status === 'success' && item.result && (
                      <div className="text-xs font-mono text-emerald-700">
                        DJ {item.result.djNumber} → {item.result.productCode}
                      </div>
                    )}
                    {item.status === 'error' && (
                      <div className="text-xs text-red-700">{item.error}</div>
                    )}
                    {item.status === 'uploading' && (
                      <div className="text-xs text-blue-700">Uploading…</div>
                    )}
                    {item.status === 'queued' && (
                      <div className="text-xs text-gray-500">
                        Queued · {(item.size / 1024).toFixed(0)} KB
                      </div>
                    )}
                  </div>
                  {item.status === 'success' && item.result && (
                    <Link
                      to={`/dj/${item.result.djNumber}`}
                      className="text-[10px] font-bold uppercase tracking-wider text-afl-cyan hover:underline shrink-0"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {allFinished && (
            <div className={`rounded-xl px-4 py-3 text-sm ${
              errorCount === 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
              successCount === 0 ? 'bg-red-50 border border-red-200 text-red-800' :
              'bg-amber-50 border border-amber-200 text-amber-800'
            }`}>
              {successCount} uploaded · {errorCount} failed
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={items.length === 0 || uploading || pendingCount === 0}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold font-heading hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? `Uploading ${items.length - pendingCount + 1} of ${items.length}…` :
               pendingCount === 0 && items.length > 0 ? 'All done' :
               `Upload ${pendingCount || items.length} ${(pendingCount || items.length) === 1 ? 'Certificate' : 'Certificates'}`}
            </button>
            {items.length > 0 && !uploading && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-3 border border-afl-border text-afl-text rounded-xl text-sm font-semibold font-heading hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Existing certificates */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-3 font-heading">
            Published Certificates {!loading && `(${certs.length})`}
          </h3>
          {loading ? (
            <p className="text-sm text-afl-muted">Loading...</p>
          ) : certs.length === 0 ? (
            <p className="text-sm text-afl-muted">No final test certificates uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {certs.map((cert) => (
                <div key={cert.djNumber} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-600">
                      <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm font-bold text-afl-navy">{cert.djNumber}</span>
                  </div>
                  <Link
                    to={`/dj/${cert.djNumber}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-afl-cyan hover:underline shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default UploadPageInner
