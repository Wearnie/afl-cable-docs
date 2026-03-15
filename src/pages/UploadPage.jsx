import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { loadFinalTestCerts, getAllFinalTestCerts } from '../data/finalTestCerts'
import { uploadFinalTestCert } from '../lib/adminApi'
import AdminGate from '../components/AdminGate'

function UploadPageInner() {
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    loadFinalTestCerts().then(() => {
      setCerts(getAllFinalTestCerts())
      setLoading(false)
    })
  }, [])

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f && f.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      setFile(null)
      return
    }
    if (f && f.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)')
      setFile(null)
      return
    }
    setFile(f)
    setError('')
    setResult(null)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError('')
    setResult(null)

    try {
      const data = await uploadFinalTestCert(file)
      setResult(data)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      // Refresh the cert list
      await loadFinalTestCerts()
      setCerts(getAllFinalTestCerts())
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 160px, #F0F4F8 160px)' }}>
      <header className="px-6 pt-5 pb-14 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-lg font-bold text-white font-heading">Final Test Certificates</h1>
              <p className="text-blue-300 text-sm">Upload certificates — DJ number and product code are read automatically</p>
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
            Upload a Final Test Certificate
          </h2>
          <p className="text-afl-muted text-xs">
            Upload the Optical Test Report PDF. The Job Number and Item Code are extracted automatically from the document.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-2 font-heading">
              PDF File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full text-sm text-afl-text file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-afl-navy/8 file:text-afl-navy hover:file:bg-afl-navy/15 file:cursor-pointer file:font-heading"
            />
            {file && (
              <p className="text-xs text-afl-muted mt-1">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 space-y-1">
              <p>{result.message}</p>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span>DJ: <strong>{result.djNumber}</strong></span>
                <span>Product Code: <strong>{result.productCode}</strong></span>
              </div>
              <Link to={`/dj/${result.djNumber}`} className="block mt-1 text-afl-cyan font-semibold hover:underline">
                View DJ {result.djNumber} page
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold font-heading hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading & reading PDF...' : 'Upload Certificate'}
          </button>
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

export default function UploadPage() {
  return (
    <AdminGate>
      <UploadPageInner />
    </AdminGate>
  )
}
