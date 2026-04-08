import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { removeDJMappings, uploadStaticDoc, addDocumentMappings } from '../lib/adminApi'
import { loadDJMapping } from '../data/djLookup'
import { findDocuments, decodeProductCode } from '../data/documentMap'
function AdminPageInner() {
  const [mapping, setMapping] = useState(null)
  const [loading, setLoading] = useState(true)

  // Search
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadDJMapping().then(data => {
      setMapping(data)
      setLoading(false)
    })
  }, [])

  // Filtered entries for the table
  const entries = useMemo(() => {
    if (!mapping) return []
    let items = Object.entries(mapping).map(([dj, code]) => ({ dj, code }))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(e => e.dj.includes(q) || e.code.toLowerCase().includes(q))
    }
    return items.sort((a, b) => a.dj.localeCompare(b.dj))
  }, [mapping, search])

  const handleDelete = async (dj) => {
    if (!confirm(`Remove DJ ${dj}?`)) return
    try {
      await removeDJMappings([dj])
      setMapping(prev => {
        const next = { ...prev }
        delete next[dj]
        return next
      })
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #004282 0%, #004282 200px, #F7F8FA 200px)' }}>
      <header className="px-6 pt-5 pb-14">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
              <div className="border-l border-white/20 pl-4">
                <h1 className="text-lg font-bold text-white font-heading">Admin</h1>
                <p className="text-blue-300 text-sm">Upload documents and manage mappings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">Home</Link>
              <Link to="/upload" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">Upload Certs</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-8 pb-12 space-y-4">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-800">
          <strong>DJ → Product Code mappings</strong> are created automatically when a Final Test Certificate is uploaded.
          {' '}<Link to="/upload" className="text-afl-cyan font-semibold hover:underline">Go to Upload Certs</Link> to add new mappings.
        </div>

        {/* Upload document */}
        <DocUploadCard />

        {/* Current mappings */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border overflow-hidden">
          <div className="p-4 border-b border-afl-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">
                Current Mappings {mapping && `(${Object.keys(mapping).length})`}
              </h2>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search DJ number or product code..."
              className="w-full px-3 py-2 border border-afl-border rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
            />
          </div>

          {loading ? (
            <p className="text-afl-muted text-sm p-4">Loading...</p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-afl-border">
                    <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">DJ Number</th>
                    <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">Product Code</th>
                    <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">Docs</th>
                    <th className="px-4 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-afl-border">
                  {entries.slice(0, 200).map(({ dj, code }) => {
                    const docs = findDocuments(code)
                    return (
                      <tr key={dj} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2">
                          <Link to={`/dj/${dj}`} className="font-mono text-[13px] text-afl-blue hover:underline">{dj}</Link>
                        </td>
                        <td className="px-4 py-2 font-mono text-[13px] text-afl-text tracking-wide">{code}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            {['TDS', 'Stripping'].map(type => {
                              const has = docs.some(d => d.type === type)
                              return (
                                <span
                                  key={type}
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    has ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-400'
                                  }`}
                                >
                                  {type === 'Stripping' ? 'STRIP' : type}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleDelete(dj)}
                            className="text-red-400 hover:text-red-600 text-xs transition-colors"
                            title="Remove"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {entries.length > 200 && (
                <p className="text-center text-afl-muted text-xs py-3">
                  Showing 200 of {entries.length}. Use search to filter.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

const DOC_TYPE_OPTIONS = [
  { value: 'tds', label: 'Technical Data Sheet (TDS)' },
  { value: 'stripping', label: 'Stripping Instructions' },
  { value: 'test-certificates', label: 'Test Certificate' },
  { value: 'installation', label: 'Installation Guide' },
]

// Map folder names to document-map type values
const FOLDER_TO_TYPE = {
  tds: 'TDS',
  stripping: 'Stripping',
  'test-certificates': 'Test Certificate',
  installation: 'Installation',
}

function DocUploadCard() {
  const [docType, setDocType] = useState('tds')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  // Pattern mapping after upload
  const [patternInput, setPatternInput] = useState('')
  const [mappingName, setMappingName] = useState('')
  const [savingMapping, setSavingMapping] = useState(false)
  const [mappingResult, setMappingResult] = useState(null)
  const [mappingError, setMappingError] = useState('')

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError('')
    setResult(null)
    setMappingResult(null)
    setMappingError('')

    try {
      const data = await uploadStaticDoc(docType, file)
      setResult(data)
      // Pre-fill mapping name from file name (strip .pdf)
      const nameWithoutExt = file.name.replace(/\.pdf$/i, '')
      setMappingName(nameWithoutExt)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleAddMapping = async () => {
    const patterns = patternInput.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)
    if (patterns.length === 0 || !mappingName.trim()) return

    // Validate patterns
    for (const p of patterns) {
      if (p.length !== 13) {
        setMappingError(`Pattern "${p}" must be exactly 13 characters`)
        return
      }
    }

    setSavingMapping(true)
    setMappingError('')
    setMappingResult(null)

    try {
      const docTypeName = FOLDER_TO_TYPE[docType] || 'TDS'
      const entries = patterns.map(pattern => ({
        pattern,
        type: docTypeName,
        name: mappingName.trim(),
        path: result.path, // path returned from upload
      }))

      const data = await addDocumentMappings(entries)
      setMappingResult(data)
      setPatternInput('')
    } catch (err) {
      setMappingError(err.message)
    } finally {
      setSavingMapping(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-4">
        Upload Document
      </h2>
      <p className="text-afl-muted text-xs mb-4">
        Upload a PDF, then add product code patterns so the document is matched to the right cables.
      </p>

      {/* Step 1: Upload */}
      <form onSubmit={handleUpload}>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-1.5 font-heading">Type</label>
            <select
              value={docType}
              onChange={e => { setDocType(e.target.value); setResult(null); setMappingResult(null) }}
              className="px-3 py-2.5 border border-afl-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
            >
              {DOC_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-1.5 font-heading">PDF File</label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={e => { setFile(e.target.files[0] || null); setError(''); setResult(null); setMappingResult(null) }}
              className="w-full text-sm text-afl-text file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-afl-navy/8 file:text-afl-navy hover:file:bg-afl-navy/15 file:cursor-pointer file:font-heading"
            />
          </div>
          <button
            type="submit"
            disabled={!file || uploading}
            className="px-5 py-2.5 bg-afl-cyan text-white rounded-xl text-sm font-bold font-heading hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>

      {error && <p className="text-red-600 text-xs mt-3">{error}</p>}
      {result && (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          {result.message} {result.replaced && '(replaced existing file)'}
        </div>
      )}

      {/* Step 2: Add pattern mapping (only shown after successful upload) */}
      {result && (
        <div className="mt-4 bg-afl-light border border-afl-border rounded-xl p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-navy font-heading mb-3">
            Step 2: Link to Product Codes
          </h3>
          <p className="text-afl-muted text-xs mb-3">
            Enter one or more 13-character product code patterns. Use <code className="bg-white px-1 rounded">*</code> for wildcard positions.
            Example: <code className="bg-white px-1 rounded">LMD6**PA***BE</code>
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-1.5 font-heading">Document Name</label>
              <input
                type="text"
                value={mappingName}
                onChange={e => setMappingName(e.target.value)}
                className="w-full px-3 py-2 border border-afl-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-1.5 font-heading">
                Patterns (one per line, or comma-separated)
              </label>
              <textarea
                value={patternInput}
                onChange={e => { setPatternInput(e.target.value); setMappingError('') }}
                placeholder={"LMD6**PA***BE\nLMD6**PB***BE"}
                rows={3}
                className="w-full px-3 py-2 border border-afl-border rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent resize-y"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddMapping}
                disabled={!patternInput.trim() || !mappingName.trim() || savingMapping}
                className="px-5 py-2.5 bg-afl-navy text-white rounded-xl text-sm font-bold font-heading hover:bg-afl-navy/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingMapping ? 'Saving...' : 'Save Mapping'}
              </button>
              <span className="text-afl-muted text-xs">
                File path: <code className="bg-white px-1 rounded text-[11px]">{result.path}</code>
              </span>
            </div>
          </div>

          {mappingError && <p className="text-red-600 text-xs mt-2">{mappingError}</p>}
          {mappingResult && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700">
              {mappingResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminPageInner
