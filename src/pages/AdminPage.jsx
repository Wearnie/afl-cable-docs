import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { addDJMappings, removeDJMappings, syncFromExcel, clearAdminKey } from '../lib/adminApi'
import { loadDJMapping } from '../data/djLookup'
import { findDocuments, decodeProductCode } from '../data/documentMap'
import AdminGate from '../components/AdminGate'

function AdminPageInner() {
  const [mapping, setMapping] = useState(null)
  const [loading, setLoading] = useState(true)

  // Add single entry
  const [djInput, setDjInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [adding, setAdding] = useState(false)

  // Sync from Excel
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncError, setSyncError] = useState('')

  // Bulk paste
  const [bulkInput, setBulkInput] = useState('')
  const [bulkError, setBulkError] = useState('')
  const [bulkSuccess, setBulkSuccess] = useState('')
  const [bulkAdding, setBulkAdding] = useState(false)

  // Search
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadDJMapping().then(data => {
      setMapping(data)
      setLoading(false)
    })
  }, [])

  const djNumber = djInput.replace(/\D/g, '')
  const productCode = codeInput.toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Preview what documents the product code maps to
  const preview = useMemo(() => {
    if (productCode.length !== 13) return null
    const docs = findDocuments(productCode)
    const decoded = decodeProductCode(productCode)
    return { docs, decoded }
  }, [productCode])

  const handleAddSingle = async (e) => {
    e.preventDefault()
    if (djNumber.length !== 8 || productCode.length !== 13) return

    setAdding(true)
    setAddError('')
    setAddSuccess('')

    try {
      const data = await addDJMappings({ [djNumber]: productCode })
      setAddSuccess(`DJ ${djNumber} → ${productCode}. Total: ${data.total} mappings. Site redeploys in ~60s.`)
      setDjInput('')
      setCodeInput('')
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleBulkAdd = async (e) => {
    e.preventDefault()
    const lines = bulkInput.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) return

    const entries = {}
    const errors = []

    for (const line of lines) {
      // Accept: DJ,Code  or  DJ\tCode  or  DJ Code  or  DJ → Code
      const parts = line.split(/[,\t→\s]+/).map(s => s.trim()).filter(Boolean)
      if (parts.length < 2) {
        errors.push(`"${line}" — expected DJ number and product code`)
        continue
      }
      const dj = parts[0].replace(/\D/g, '')
      const code = parts[1].toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (dj.length !== 8) {
        errors.push(`"${parts[0]}" — DJ must be 8 digits`)
        continue
      }
      if (code.length !== 13) {
        errors.push(`"${parts[1]}" — product code must be 13 characters`)
        continue
      }
      entries[dj] = code
    }

    if (errors.length > 0) {
      setBulkError(errors.join('\n'))
      if (Object.keys(entries).length === 0) return
    }

    setBulkAdding(true)
    setBulkSuccess('')

    try {
      const data = await addDJMappings(entries)
      setBulkSuccess(`Added ${data.added}, updated ${data.updated}. Total: ${data.total} mappings.`)
      setBulkInput('')
      setBulkError('')
    } catch (err) {
      setBulkError(err.message)
    } finally {
      setBulkAdding(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    setSyncError('')

    try {
      const data = await syncFromExcel()
      setSyncResult(data)
      // Reload mapping if changes were committed
      if (data.commit?.committed) {
        const fresh = await loadDJMapping()
        setMapping(fresh)
      }
    } catch (err) {
      setSyncError(err.message)
    } finally {
      setSyncing(false)
    }
  }

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
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 200px, #F0F4F8 200px)' }}>
      <header className="px-6 pt-5 pb-14">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
              <div className="border-l border-white/20 pl-4">
                <h1 className="text-lg font-bold text-white font-heading">DJ Mapping Admin</h1>
                <p className="text-blue-300 text-sm">Add, edit and remove DJ → Product Code pairings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">Home</Link>
              <button onClick={() => { clearAdminKey(); location.reload() }} className="text-blue-400/60 hover:text-white text-xs transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-8 pb-12 space-y-4">
        {/* Sync from Excel */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-1">
                Sync from SharePoint
              </h2>
              <p className="text-afl-muted text-xs">
                Pull DJ→Product Code mappings from the Print Message workbook. Also runs automatically at 6am daily.
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-5 py-2.5 bg-afl-blue text-white rounded-xl text-sm font-bold font-heading hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {syncError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {syncError}
            </div>
          )}

          {syncResult && (
            <div className={`mt-3 rounded-xl px-4 py-3 text-sm border ${
              syncResult.commit?.committed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <p className="font-semibold">{syncResult.message}</p>
              <p className="text-xs mt-1 opacity-80">
                {syncResult.entries} entries read from Excel
                {syncResult.commit?.committed && (
                  <> — {syncResult.commit.added} added, {syncResult.commit.updated} updated, {syncResult.commit.removed} removed</>
                )}
              </p>
              {syncResult.parseErrors?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer">Parse warnings ({syncResult.parseErrors.length})</summary>
                  <pre className="text-[11px] mt-1 whitespace-pre-wrap">{syncResult.parseErrors.join('\n')}</pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Add single */}
        <form onSubmit={handleAddSingle} className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-4">
            Add Single Mapping
          </h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-1.5 font-heading">DJ Number</label>
              <input
                type="text"
                value={djInput}
                onChange={e => { setDjInput(e.target.value); setAddError(''); setAddSuccess('') }}
                placeholder="03429835"
                maxLength={8}
                className="w-full px-3 py-2.5 border border-afl-border rounded-xl font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
              />
            </div>
            <div className="text-afl-muted text-lg px-1 pb-2">→</div>
            <div className="flex-[2]">
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-1.5 font-heading">Product Code</label>
              <input
                type="text"
                value={codeInput}
                onChange={e => { setCodeInput(e.target.value); setAddError(''); setAddSuccess('') }}
                placeholder="LMD61DPA072BE"
                maxLength={13}
                className="w-full px-3 py-2.5 border border-afl-border rounded-xl font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={djNumber.length !== 8 || productCode.length !== 13 || adding}
              className="px-5 py-2.5 bg-afl-cyan text-white rounded-xl text-sm font-bold font-heading hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {adding ? 'Saving...' : 'Add'}
            </button>
          </div>

          {/* Live preview of document matches */}
          {preview && (
            <div className="mt-3 bg-afl-light rounded-xl p-3 border border-afl-border">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-1.5">
                Document preview for {productCode}
              </p>
              {preview.docs.length > 0 ? (
                <div className="space-y-1">
                  {preview.docs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className="text-emerald-600 font-bold shrink-0">{doc.type}</span>
                      <span className="text-afl-text truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-amber-600 text-[12px]">No documents match this product code yet.</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {preview.decoded.map((d, i) => (
                  <span key={i} className="text-[10px] bg-white border border-afl-border rounded px-1.5 py-0.5 text-afl-text">
                    {d.label}: {d.description}
                  </span>
                ))}
              </div>
            </div>
          )}

          {addError && <p className="text-red-600 text-xs mt-2">{addError}</p>}
          {addSuccess && <p className="text-emerald-600 text-xs mt-2">{addSuccess}</p>}
        </form>

        {/* Bulk paste */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-3">
            Bulk Import
          </h2>
          <p className="text-afl-muted text-xs mb-3">
            Paste rows from Excel. One per line: <code className="bg-gray-100 px-1 rounded">DJ_NUMBER, PRODUCT_CODE</code>
          </p>
          <form onSubmit={handleBulkAdd}>
            <textarea
              value={bulkInput}
              onChange={e => { setBulkInput(e.target.value); setBulkError(''); setBulkSuccess('') }}
              placeholder={"03429835, LMD61DPA072BE\n12345678, SMM41DLB048BK"}
              rows={5}
              className="w-full px-3 py-2.5 border border-afl-border rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent resize-y"
            />
            {bulkError && <pre className="text-red-600 text-xs mt-2 whitespace-pre-wrap">{bulkError}</pre>}
            {bulkSuccess && <p className="text-emerald-600 text-xs mt-2">{bulkSuccess}</p>}
            <button
              type="submit"
              disabled={!bulkInput.trim() || bulkAdding}
              className="mt-3 px-5 py-2.5 bg-afl-navy text-white rounded-xl text-sm font-bold font-heading hover:bg-afl-navy/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkAdding ? 'Importing...' : 'Import All'}
            </button>
          </form>
        </div>

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
                            {['TDS', 'Stripping', 'Test Certificate'].map(type => {
                              const has = docs.some(d => d.type === type)
                              return (
                                <span
                                  key={type}
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    has ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-400'
                                  }`}
                                >
                                  {type === 'Test Certificate' ? 'CERT' : type === 'Stripping' ? 'STRIP' : type}
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

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminPageInner />
    </AdminGate>
  )
}
