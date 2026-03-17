import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { loadDJMapping, lookupProductCode } from '../data/djLookup'
import { findDocuments, getDocumentMap, loadDocumentMap, docTypeInfo } from '../data/documentMap'
import { loadFinalTestCerts, findFinalTestCert } from '../data/finalTestCerts'
import { loadDJOverrides, getDJOverrides, applyOverrides, reloadDJOverrides } from '../data/djOverrides'
import QRGenerator from '../components/QRGenerator'

export default function GeneratePage() {
  const [djInput, setDjInput] = useState('')
  const [mappingLoaded, setMappingLoaded] = useState(false)
  const [toast, setToast] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addTypeFilter, setAddTypeFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const djNumber = djInput.replace(/\D/g, '')

  useEffect(() => {
    Promise.all([loadDJMapping(), loadDocumentMap(), loadFinalTestCerts(), loadDJOverrides()])
      .then(() => setMappingLoaded(true))
  }, [])

  const productCode = mappingLoaded ? lookupProductCode(djNumber) : null
  const isValid = djNumber.length === 8

  // Base documents from pattern matching
  const baseDocuments = useMemo(() => (productCode ? findDocuments(productCode) : []), [productCode])

  // Documents after per-DJ overrides applied
  const documents = useMemo(
    () => (productCode ? applyOverrides(djNumber, baseDocuments) : []),
    [productCode, djNumber, baseDocuments, refreshKey]
  )

  const finalTestCert = useMemo(() => findFinalTestCert(djNumber) || findFinalTestCert('DJ' + djNumber), [djNumber])

  // Current overrides for this DJ
  const currentOverrides = useMemo(() => getDJOverrides(djNumber) || { exclude: [], include: [] }, [djNumber, refreshKey])

  // Available docs to add (not already showing)
  const availableDocs = useMemo(() => {
    if (!productCode || !showAddDoc) return []
    const map = getDocumentMap()
    const showingPaths = new Set(documents.map(d => d.path))
    const seen = new Set()
    const result = []
    for (const entry of map) {
      if (seen.has(entry.path)) continue
      seen.add(entry.path)
      if (showingPaths.has(entry.path)) continue
      result.push(entry)
    }
    return result.filter(d => {
      if (addTypeFilter && d.type !== addTypeFilter) return false
      if (addSearch.trim()) {
        const q = addSearch.trim().toLowerCase()
        return d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
      }
      return true
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [productCode, showAddDoc, documents, addSearch, addTypeFilter])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'

  const showToast = useCallback((msg, type) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Save overrides to API
  const saveOverrides = async (exclude, include) => {
    setSaving(true)
    try {
      const res = await fetch('/api/dj-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ djNumber, exclude, include }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API error')
      await reloadDJOverrides()
      setRefreshKey(k => k + 1)
      return data
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveDoc = async (doc) => {
    if (!confirm(`Remove "${doc.name}" for DJ ${djNumber}?\n\nThis only affects this DJ number — other orders keep this document.`)) return
    try {
      const newExclude = [...currentOverrides.exclude]
      if (!newExclude.includes(doc.path)) newExclude.push(doc.path)
      // Also remove from includes if it was manually added
      const newInclude = currentOverrides.include.filter(i => i.path !== doc.path)
      await saveOverrides(newExclude, newInclude)
      showToast(`Removed "${doc.name}" for DJ ${djNumber}`, 'success')
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  const handleAddDoc = async (doc) => {
    try {
      // If it was previously excluded, just un-exclude it
      const wasExcluded = currentOverrides.exclude.includes(doc.path)
      const newExclude = currentOverrides.exclude.filter(p => p !== doc.path)

      let newInclude = [...currentOverrides.include]
      // If it's not in the base documents (pattern-matched), add it to includes
      if (!wasExcluded && !baseDocuments.some(d => d.path === doc.path)) {
        newInclude.push({ type: doc.type, name: doc.name, path: doc.path })
      }

      await saveOverrides(newExclude, newInclude)
      showToast(`Added "${doc.name}" for DJ ${djNumber}`, 'success')
      setShowAddDoc(false)
      setAddSearch('')
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  const handleRestoreDoc = async (path) => {
    try {
      const newExclude = currentOverrides.exclude.filter(p => p !== path)
      await saveOverrides(newExclude, currentOverrides.include)
      showToast('Document restored', 'success')
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
  }

  // Find names of excluded docs for display
  const excludedDocs = useMemo(() => {
    if (!currentOverrides.exclude.length) return []
    const map = getDocumentMap()
    return currentOverrides.exclude.map(path => {
      const entry = map.find(e => e.path === path)
      return { path, name: entry?.name || path, type: entry?.type || 'Unknown' }
    })
  }, [currentOverrides.exclude, refreshKey])

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 160px, #F0F4F8 160px)' }}>
      {toast && (
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl font-semibold text-white shadow-lg z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <header className="px-6 pt-5 pb-14 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-lg font-bold text-white font-heading">QR Code Generator</h1>
              <p className="text-blue-300 text-sm">Generate QR labels for cable drums</p>
            </div>
          </div>
          <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">Home</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-6 pb-8 space-y-4 no-print">
        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-2 font-heading">DJ Number</label>
              <input
                type="text" value={djInput} onChange={(e) => setDjInput(e.target.value)}
                placeholder="e.g. 03429835" maxLength={8}
                className="w-full px-4 py-3 border border-afl-border rounded-xl font-mono text-lg tracking-[0.15em] focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent transition-shadow"
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-medium ${djNumber.length === 8 ? 'text-emerald-600' : 'text-afl-muted'}`}>
                  {djNumber.length}/8 digits
                </span>
                {djNumber.length > 0 && djNumber.length !== 8 && (
                  <span className="text-xs text-amber-500 font-medium">{8 - djNumber.length} more needed</span>
                )}
              </div>
            </div>

            {isValid && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-afl-light border border-afl-border">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">Product Code</span>
                {productCode ? (
                  <span className="font-mono text-sm font-semibold text-afl-navy tracking-[0.15em]">{productCode}</span>
                ) : (
                  <span className="text-sm text-amber-600 font-medium">Not found in lookup — QR will still generate</span>
                )}
              </div>
            )}
          </div>
        </div>

        {isValid && (
          <>
            <QRGenerator djNumber={djNumber} productCode={productCode} baseUrl={baseUrl} />

            <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">
                  Documents that will appear ({documents.length + (djNumber ? 1 : 0)})
                </h3>
                {productCode && (
                  <button
                    onClick={() => setShowAddDoc(!showAddDoc)}
                    disabled={saving}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-colors ${
                      showAddDoc ? 'bg-gray-200 text-gray-600' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {showAddDoc ? 'Cancel' : '+ Add Document'}
                  </button>
                )}
              </div>

              {documents.length > 0 || djNumber ? (
                <div className="space-y-2">
                  {documents.map((doc, i) => {
                    const info = docTypeInfo[doc.type] || docTypeInfo.Other
                    return (
                      <div key={`${doc.path}-${i}`} className="flex items-center gap-3 group">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-afl-navy shrink-0" style={{ minWidth: '110px' }}>
                          {info.label}
                        </span>
                        <span className="text-afl-text truncate text-[13px] flex-1">{doc.name}</span>
                        {productCode && (
                          <button
                            onClick={() => handleRemoveDoc(doc)}
                            disabled={saving}
                            className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700 transition-all shrink-0"
                            title={`Remove for DJ ${djNumber} only`}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {djNumber && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-afl-navy shrink-0" style={{ minWidth: '110px' }}>
                        Final Test Cert
                      </span>
                      <span className="text-afl-text truncate text-[13px] flex-1">
                        {finalTestCert ? finalTestCert.name : `${djNumber} — pending upload`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-afl-muted text-sm">
                  {productCode
                    ? 'No documents match this product code. The QR will still work.'
                    : 'DJ number not in lookup table. Documents will show once mapping is added.'}
                </p>
              )}

              {/* Excluded docs (with restore option) */}
              {excludedDocs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2 font-heading">
                    Removed for this DJ
                  </p>
                  {excludedDocs.map(doc => (
                    <div key={doc.path} className="flex items-center gap-3 py-1 text-gray-400">
                      <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ minWidth: '110px' }}>
                        {(docTypeInfo[doc.type] || docTypeInfo.Other).label}
                      </span>
                      <span className="truncate text-[13px] flex-1 line-through">{doc.name}</span>
                      <button
                        onClick={() => handleRestoreDoc(doc.path)}
                        disabled={saving}
                        className="px-2 py-1 rounded text-xs font-bold text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add document panel */}
              {showAddDoc && productCode && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text" value={addSearch} onChange={e => setAddSearch(e.target.value)}
                      placeholder="Search documents..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <select value={addTypeFilter} onChange={e => setAddTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                      <option value="">All Types</option>
                      <option value="TDS">TDS</option>
                      <option value="Stripping">Stripping</option>
                      <option value="Installation">Installation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {availableDocs.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">No matching documents found</p>
                    ) : (
                      availableDocs.map((doc, i) => {
                        const info = docTypeInfo[doc.type] || docTypeInfo.Other
                        return (
                          <div key={`add-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0 w-12">{info.abbr}</span>
                            <span className="text-[13px] text-gray-800 truncate flex-1" title={doc.name}>{doc.name}</span>
                            <button
                              onClick={() => handleAddDoc(doc)}
                              disabled={saving}
                              className="px-3 py-1 rounded-lg text-[11px] font-heading font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 transition-colors shrink-0"
                            >
                              Add
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    This adds the document for <span className="font-mono font-semibold">DJ {djNumber}</span> only
                  </p>
                </div>
              )}
            </div>

            <div className="text-center">
              <Link
                to={`/dj/${djNumber}`}
                className="inline-block px-5 py-2 bg-afl-cyan text-white rounded-lg text-sm font-semibold uppercase tracking-wider hover:brightness-110 transition font-heading"
              >
                Preview customer page →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
