import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { loadDocumentMap, findDocuments, invalidateDocumentMapCache, stripSuffix, getCustomerSuffix, docTypeInfo, patternMatches } from '../data/documentMap'
import { editDocumentMappings, addDocumentMappings } from '../lib/adminApi'

const DOC_BASE_URL = import.meta.env.VITE_DOC_BASE_URL || '/docs'
const DOC_TYPES = ['Stripping', 'TDS', 'Installation', 'Storage & Handling']

// ============================================================================
// Helper components
// ============================================================================

function Toast({ message, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl font-semibold text-white shadow-lg z-50 ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

function padExclude(val) {
  const v = val.toUpperCase().replace(/[^A-Z0-9*]/g, '')
  if (!v) return ''
  return v.length >= 13 ? v.slice(0, 13) : v + '*'.repeat(13 - v.length)
}

// ============================================================================
// Expanded row detail — shows matched docs with actions
// ============================================================================

function ExpandedDetail({ row, documentMap, onRefresh, onToast }) {
  return (
    <tr>
      <td colSpan={7} className="bg-gray-50 px-4 py-4 border-b border-gray-200">
        <div className="space-y-2">
          {DOC_TYPES.map(type => {
            const docs = type === 'Installation' || type === 'Storage & Handling'
              ? row.docs[type] || []
              : row.docs[type] ? [row.docs[type]] : []

            if (docs.length > 0) {
              return docs.map((doc, i) => (
                <MatchedDocRow
                  key={`${type}-${i}`}
                  doc={doc}
                  type={type}
                  productCode={row.code}
                  documentMap={documentMap}
                  onRefresh={onRefresh}
                  onToast={onToast}
                />
              ))
            }

            return (
              <MissingDocRow
                key={type}
                type={type}
                productCode={row.code}
                documentMap={documentMap}
                onRefresh={onRefresh}
                onToast={onToast}
              />
            )
          })}

          <div className="flex gap-3 pt-2 border-t border-gray-200 mt-3">
            <Link
              to={`/${row.code}`}
              target="_blank"
              className="text-xs text-afl-blue hover:underline font-medium"
            >
              Preview as customer &rarr;
            </Link>
            <Link
              to="/audit"
              className="text-xs text-afl-muted hover:underline font-medium"
            >
              Open Pattern Audit &rarr;
            </Link>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ============================================================================
// Matched doc row — shows doc info + "Add Exclude" action
// ============================================================================

function MatchedDocRow({ doc, type, productCode, documentMap, onRefresh, onToast }) {
  const [showExclude, setShowExclude] = useState(false)
  const [excludeVal, setExcludeVal] = useState('')
  const [saving, setSaving] = useState(false)

  // Find which pattern entry matched this doc
  const matchedEntry = useMemo(() => {
    return documentMap.find(e =>
      e.type === type && e.path === doc.path && e.pattern === doc.pattern
    ) || documentMap.find(e =>
      e.type === type && e.path === doc.path
    )
  }, [documentMap, type, doc.path, doc.pattern])

  const handleAddExclude = async () => {
    if (!matchedEntry || !excludeVal.trim()) return
    const padded = padExclude(excludeVal)
    if (!padded) return

    setSaving(true)
    try {
      const existingExclude = matchedEntry.exclude
      const merged = existingExclude
        ? [...(Array.isArray(existingExclude) ? existingExclude : [existingExclude]), padded]
        : padded

      const updated = { pattern: matchedEntry.pattern, type, name: matchedEntry.name || doc.name, path: matchedEntry.path || doc.path }
      if (merged) updated.exclude = merged

      await editDocumentMappings(
        [{ pattern: matchedEntry.pattern, type }],
        [updated]
      )
      onToast(`Exclude added to ${matchedEntry.pattern}`, 'success')
      setShowExclude(false)
      setExcludeVal('')
      onRefresh()
    } catch (err) {
      onToast('Error: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 bg-white rounded-lg border border-gray-200 px-3 py-2.5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
          type === 'TDS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
          type === 'Stripping' ? 'bg-purple-50 text-purple-700 border-purple-200' :
          type === 'Installation' ? 'bg-teal-50 text-teal-700 border-teal-200' :
          'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
          {docTypeInfo[type]?.abbr || type}
        </span>
        <span className="text-sm text-gray-800 font-medium truncate flex-1">{doc.name}</span>
        {matchedEntry && (
          <span className="text-[11px] text-gray-400 font-mono">{matchedEntry.pattern}</span>
        )}
        <a
          href={doc.url || `${DOC_BASE_URL}${doc.path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-afl-navy text-white hover:bg-afl-navy/90 transition-colors shrink-0"
        >
          Open PDF
        </a>
        <button
          onClick={() => setShowExclude(!showExclude)}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shrink-0"
        >
          {showExclude ? 'Cancel' : 'Add Exclude'}
        </button>
      </div>

      {showExclude && (
        <div className="flex items-center gap-2 pl-6 pt-1">
          <span className="text-xs text-gray-500">Exclude pattern:</span>
          <input
            type="text"
            value={excludeVal}
            onChange={e => setExcludeVal(e.target.value.toUpperCase())}
            placeholder={productCode.slice(0, 5)}
            className="font-mono text-[12px] tracking-wider px-2 py-1 border border-amber-300 bg-amber-50 rounded-lg w-40 uppercase focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          />
          <span className="text-[10px] text-gray-400 font-mono">
            {excludeVal ? padExclude(excludeVal) : ''}
          </span>
          <button
            onClick={handleAddExclude}
            disabled={saving || !excludeVal.trim()}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Missing doc row — with quick-add mapping
// ============================================================================

function MissingDocRow({ type, productCode, documentMap, onRefresh, onToast }) {
  const [showAdd, setShowAdd] = useState(false)
  const [pattern, setPattern] = useState(productCode)
  const [saving, setSaving] = useState(false)

  // Find existing documents of this type to offer as options
  const existingDocs = useMemo(() => {
    const seen = new Set()
    return documentMap
      .filter(e => e.type === type && !seen.has(e.path) && seen.add(e.path))
      .map(e => ({ name: e.name, path: e.path }))
  }, [documentMap, type])

  const [selectedDoc, setSelectedDoc] = useState('')

  const handleAdd = async () => {
    if (!pattern.trim() || !selectedDoc) return
    const doc = existingDocs.find(d => d.path === selectedDoc)
    if (!doc) return

    const padded = pattern.length < 13
      ? pattern.toUpperCase() + '*'.repeat(13 - pattern.length)
      : pattern.toUpperCase().slice(0, 13)

    setSaving(true)
    try {
      await addDocumentMappings([{
        pattern: padded,
        type,
        name: doc.name,
        path: doc.path,
      }])
      onToast(`Mapping added: ${padded} → ${doc.name}`, 'success')
      setShowAdd(false)
      setPattern(productCode)
      setSelectedDoc('')
      onRefresh()
    } catch (err) {
      onToast('Error: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 bg-red-50/50 rounded-lg border border-red-200/60 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200`}>
          {docTypeInfo[type]?.abbr || type}
        </span>
        <span className="text-sm text-red-400 italic flex-1">No {type} document matched</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shrink-0"
        >
          {showAdd ? 'Cancel' : '+ Add Mapping'}
        </button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2 pl-6 pt-1 flex-wrap">
          <span className="text-xs text-gray-500">Pattern:</span>
          <input
            type="text"
            value={pattern}
            onChange={e => setPattern(e.target.value.toUpperCase())}
            className="font-mono text-[12px] tracking-wider px-2 py-1 border border-gray-300 rounded-lg w-44 uppercase focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
          <span className="text-xs text-gray-500">Document:</span>
          <select
            value={selectedDoc}
            onChange={e => setSelectedDoc(e.target.value)}
            className="text-[12px] px-2 py-1 border border-gray-300 rounded-lg max-w-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          >
            <option value="">Select existing {type}...</option>
            {existingDocs.map(d => (
              <option key={d.path} value={d.path}>{d.name}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={saving || !pattern.trim() || !selectedDoc}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main page
// ============================================================================

export default function CoverageAuditPage() {
  const [productCodes, setProductCodes] = useState(null)
  const [documentMap, setDocumentMap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [missingType, setMissingType] = useState('')

  // UI
  const [expandedCode, setExpandedCode] = useState(null)

  // Load data
  useEffect(() => {
    Promise.all([
      fetch(`/data/product-codes.json?_t=${Date.now()}`).then(r => r.json()),
      loadDocumentMap(),
    ]).then(([codes, map]) => {
      setProductCodes(codes)
      setDocumentMap(map)
      setLoading(false)
    })
  }, [])

  // Refresh after edits
  const refreshData = useCallback(async () => {
    invalidateDocumentMapCache()
    const map = await loadDocumentMap()
    setDocumentMap(map)
  }, [])

  const handleToast = useCallback((msg, type) => setToast({ msg, type }), [])

  // Compute coverage for all codes
  const coverageData = useMemo(() => {
    if (!productCodes || !documentMap) return []

    return productCodes.map(code => {
      const docs = findDocuments(code)
      const byType = {
        Stripping: docs.find(d => d.type === 'Stripping') || null,
        TDS: docs.find(d => d.type === 'TDS') || null,
        Installation: docs.filter(d => d.type === 'Installation'),
        'Storage & Handling': docs.filter(d => d.type === 'Storage & Handling'),
      }

      const has = {
        Stripping: !!byType.Stripping,
        TDS: !!byType.TDS,
        Installation: byType.Installation.length > 0,
        'Storage & Handling': byType['Storage & Handling'].length > 0,
      }
      const matchedCount = Object.values(has).filter(Boolean).length

      const base = stripSuffix(code.toUpperCase())
      const familyCode = base.startsWith('K3M') ? 'K3M' : base[0] || '?'

      return {
        code,
        familyCode,
        docs: byType,
        has,
        matchedCount,
        status: matchedCount === 4 ? 'complete' : matchedCount > 0 ? 'partial' : 'none',
      }
    })
  }, [productCodes, documentMap])

  // Extract family options
  const familyOptions = useMemo(() => {
    const families = new Set(coverageData.map(r => r.familyCode))
    return [...families].sort()
  }, [coverageData])

  // Stats
  const stats = useMemo(() => {
    const total = coverageData.length
    const complete = coverageData.filter(r => r.status === 'complete').length
    const partial = coverageData.filter(r => r.status === 'partial').length
    const none = coverageData.filter(r => r.status === 'none').length
    return { total, complete, partial, none }
  }, [coverageData])

  // Filtered data
  const filtered = useMemo(() => {
    return coverageData.filter(row => {
      if (search && !row.code.toUpperCase().includes(search.toUpperCase())) return false
      if (familyFilter && row.familyCode !== familyFilter) return false
      if (statusFilter && row.status !== statusFilter) return false
      if (missingType && row.has[missingType]) return false
      return true
    })
  }, [coverageData, search, familyFilter, statusFilter, missingType])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 200px, #F0F4F8 200px)' }}>
        <div className="text-white font-heading font-bold text-lg">Loading coverage data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 200px, #F0F4F8 200px)' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Header */}
      <header className="px-6 pt-5 pb-16">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src="/afl-logo.svg" alt="AFL" className="h-10 w-auto" />
            </Link>
            <div>
              <h1 className="text-white text-xl font-bold font-heading">Coverage Audit</h1>
              <p className="text-blue-300 text-xs">Document coverage for every product code</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/audit" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">Pattern Audit</Link>
            <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-8 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-afl-border px-4 py-3 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-afl-muted font-heading">Total Codes</div>
            <div className="text-2xl font-bold text-afl-text font-heading mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 px-4 py-3 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 font-heading">Full Coverage</div>
            <div className="text-2xl font-bold text-emerald-700 font-heading mt-0.5">{stats.complete}</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 px-4 py-3 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 font-heading">Partial</div>
            <div className="text-2xl font-bold text-amber-700 font-heading mt-0.5">{stats.partial}</div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 px-4 py-3 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 font-heading">No Docs</div>
            <div className="text-2xl font-bold text-red-700 font-heading mt-0.5">{stats.none}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-afl-border shadow-sm px-4 py-3 mb-5 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search codes..."
            className="px-3 py-1.5 border border-afl-border rounded-lg text-sm w-48 focus:ring-2 focus:ring-afl-cyan focus:border-transparent outline-none font-mono"
          />
          <select
            value={familyFilter}
            onChange={e => setFamilyFilter(e.target.value)}
            className="px-3 py-1.5 border border-afl-border rounded-lg text-sm focus:ring-2 focus:ring-afl-cyan focus:border-transparent outline-none"
          >
            <option value="">All Families</option>
            {familyOptions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-afl-border rounded-lg text-sm focus:ring-2 focus:ring-afl-cyan focus:border-transparent outline-none"
          >
            <option value="">All Statuses</option>
            <option value="complete">Complete</option>
            <option value="partial">Partial</option>
            <option value="none">No Docs</option>
          </select>
          <select
            value={missingType}
            onChange={e => setMissingType(e.target.value)}
            className="px-3 py-1.5 border border-afl-border rounded-lg text-sm focus:ring-2 focus:ring-afl-cyan focus:border-transparent outline-none"
          >
            <option value="">All Types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>Missing {t}</option>)}
          </select>
          {(search || familyFilter || statusFilter || missingType) && (
            <button
              onClick={() => { setSearch(''); setFamilyFilter(''); setStatusFilter(''); setMissingType('') }}
              className="text-xs text-afl-muted hover:text-red-600 font-medium transition-colors"
            >
              Clear filters
            </button>
          )}
          <span className="text-xs text-afl-muted ml-auto">{filtered.length} of {stats.total} codes</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-afl-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-afl-muted font-heading">Product Code</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-afl-muted font-heading w-14">Fam</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-purple-500 font-heading w-16">Strip</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-blue-500 font-heading w-16">TDS</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-teal-500 font-heading w-16">Install</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-heading w-16">S&H</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-afl-muted font-heading w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const isExpanded = expandedCode === row.code
                  return (
                    <CoverageRow
                      key={row.code}
                      row={row}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedCode(isExpanded ? null : row.code)}
                      documentMap={documentMap}
                      onRefresh={refreshData}
                      onToast={handleToast}
                    />
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-afl-muted text-sm">No codes match your filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// Single table row
// ============================================================================

function CoverageRow({ row, isExpanded, onToggle, documentMap, onRefresh, onToast }) {
  const statusColors = {
    complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    none: 'bg-red-50 text-red-700 border-red-200',
  }

  const docCell = (has, doc, type) => {
    if (!has) {
      return <td className="text-center px-3 py-2"><span className="text-red-300">—</span></td>
    }
    const d = Array.isArray(doc) ? doc[0] : doc
    const url = d?.url || (d?.path ? `${DOC_BASE_URL}${d.path}` : null)
    return (
      <td className="text-center px-3 py-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title={d?.name || type}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </a>
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </td>
    )
  }

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-gray-100 transition-colors ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
        onClick={onToggle}
      >
        <td className="px-4 py-2">
          <span className="font-mono text-[13px] tracking-wide text-gray-800 font-medium">{row.code}</span>
        </td>
        <td className="text-center px-3 py-2">
          <span className="text-[11px] font-mono text-afl-muted">{row.familyCode}</span>
        </td>
        {docCell(row.has.Stripping, row.docs.Stripping, 'Stripping')}
        {docCell(row.has.TDS, row.docs.TDS, 'TDS')}
        {docCell(row.has.Installation, row.docs.Installation, 'Installation')}
        {docCell(row.has['Storage & Handling'], row.docs['Storage & Handling'], 'Storage & Handling')}
        <td className="text-center px-3 py-2">
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${statusColors[row.status]}`}>
            {row.matchedCount}/4
          </span>
        </td>
      </tr>
      {isExpanded && (
        <ExpandedDetail
          row={row}
          documentMap={documentMap}
          onRefresh={onRefresh}
          onToast={onToast}
        />
      )}
    </>
  )
}
