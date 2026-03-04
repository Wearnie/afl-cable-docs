import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { saveCert, getAllCerts, deleteCert } from '../lib/localCertStore'
import { loadDJMapping, lookupProductCode } from '../data/djLookup'

export default function UploadPage() {
  const [djInput, setDjInput] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', message }
  const [uploads, setUploads] = useState(() => getAllCerts())
  const [mappingLoaded, setMappingLoaded] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadDJMapping().then(() => setMappingLoaded(true))
  }, [])

  const djNumber = djInput.replace(/\D/g, '')
  const productCode = mappingLoaded ? lookupProductCode(djNumber) : null
  const isReady = djNumber.length >= 4 && file

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f)
      setStatus(null)
    } else {
      setStatus({ type: 'error', message: 'Please upload a PDF file.' })
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isReady) return

    try {
      await saveCert({ djNumber, productCode: productCode || '', file })
      setStatus({ type: 'success', message: `Uploaded certificate for ${djNumber}` })
      setUploads(getAllCerts())
      // Reset form
      setDjInput('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setStatus({ type: 'error', message: 'Upload failed. File may be too large for local storage.' })
    }
  }

  const handleDelete = (dj) => {
    deleteCert(dj)
    setUploads(getAllCerts())
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 160px, #F0F4F8 160px)' }}>
      <header className="px-6 pt-5 pb-14 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-lg font-bold text-white font-heading">Upload Certificate</h1>
              <p className="text-blue-300 text-sm">Upload Final Test Certificates</p>
            </div>
          </div>
          <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-6 pb-8 space-y-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-afl-border p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-2 font-heading">
              DJ Number
            </label>
            <input
              type="text"
              value={djInput}
              onChange={(e) => setDjInput(e.target.value)}
              placeholder="e.g. 03429835"
              maxLength={8}
              className="w-full px-4 py-3 border border-afl-border rounded-xl font-mono text-lg tracking-[0.15em] focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent transition-shadow"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs font-medium ${djNumber.length >= 4 ? 'text-emerald-600' : 'text-afl-muted'}`}>
                {djNumber.length} digits
              </span>
            </div>
          </div>

          {/* Auto-resolved product code */}
          {djNumber.length >= 4 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-afl-light border border-afl-border">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">Product Code</span>
              {productCode ? (
                <span className="font-mono text-sm font-semibold text-afl-navy tracking-[0.15em]">{productCode}</span>
              ) : (
                <span className="text-xs text-afl-muted">Not in lookup table</span>
              )}
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150
              ${dragOver
                ? 'border-afl-cyan bg-afl-cyan/5'
                : file
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-afl-border hover:border-afl-cyan/50 hover:bg-gray-50'
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => handleFile(e.target.files[0])}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-semibold text-afl-text">{file.name}</p>
                  <p className="text-xs text-afl-muted">{(file.size / 1024).toFixed(0)} KB — click to change</p>
                </div>
              </div>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-afl-muted/40 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold text-afl-text">Drop PDF here or click to browse</p>
                <p className="text-xs text-afl-muted mt-1">Final Test Certificate PDF only</p>
              </>
            )}
          </div>

          {/* Status message */}
          {status && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
              status.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={!isReady}
            className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition font-heading
              ${isReady
                ? 'bg-afl-cyan text-white hover:brightness-110 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            Upload Certificate
          </button>
        </form>

        {/* Recent uploads */}
        {uploads.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-3 font-heading">
              Uploaded Certificates ({uploads.length})
            </h3>
            <div className="space-y-2">
              {uploads.map((cert) => (
                <div key={cert.djNumber} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-600">
                      <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-afl-navy">{cert.djNumber}</span>
                      {cert.productCode && <span className="font-mono text-xs text-afl-muted">{cert.productCode}</span>}
                    </div>
                    <p className="text-[11px] text-afl-muted truncate">{cert.fileName}</p>
                  </div>
                  <Link
                    to={`/dj/${cert.djNumber}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-afl-cyan hover:underline shrink-0"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(cert.djNumber)}
                    className="text-afl-muted/40 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
