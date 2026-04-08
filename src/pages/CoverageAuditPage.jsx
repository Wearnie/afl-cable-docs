import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { loadDocumentMap, findDocuments, invalidateDocumentMapCache, stripSuffix, getCustomerSuffix, docTypeInfo } from '../data/documentMap'
import { editDocumentMappings, addDocumentMappings } from '../lib/adminApi'
import Toast from '../components/Toast'

const DOC_BASE_URL = import.meta.env.VITE_DOC_BASE_URL || '/docs'
const DOC_TYPES = ['Stripping', 'TDS', 'Installation', 'Storage & Handling']

function padExclude(val) {
  const v = val.toUpperCase().replace(/[^A-Z0-9*]/g, '')
  if (!v) return ''
  return v.length >= 13 ? v.slice(0, 13) : v + '*'.repeat(13 - v.length)
}

// Status badge colors
const statusConfig = {
  complete: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  none: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
}

// Doc type badge config
const typeStyle = {
  Stripping: 'bg-violet-50 text-violet-700 border-violet-200',
  TDS: 'bg-sky-50 text-sky-700 border-sky-200',
  Installation: 'bg-teal-50 text-teal-700 border-teal-200',
  'Storage & Handling': 'bg-slate-50 text-slate-600 border-slate-200',
}

// ============================================================================
// Expanded row — matched doc with actions
// ============================================================================

function MatchedDocRow({ doc, type, productCode, documentMap, onRefresh, onToast }) {
  const [showExclude, setShowExclude] = useState(false)
  const [excludeVal, setExcludeVal] = useState('')
  const [saving, setSaving] = useState(false)

  const matchedEntry = useMemo(() => {
    return documentMap.find(e => e.type === type && e.path === doc.path && e.pattern === doc.pattern)
      || documentMap.find(e => e.type === type && e.path === doc.path)
  }, [documentMap, type, doc.path, doc.pattern])

  const handleAddExclude = async () => {
    if (!matchedEntry || !excludeVal.trim()) return
    const padded = padExclude(excludeVal)
    if (!padded) return
    setSaving(true)
    try {
      const existing = matchedEntry.exclude
      const merged = existing
        ? [...(Array.isArray(existing) ? existing : [existing]), padded]
        : padded
      const updated = { pattern: matchedEntry.pattern, type, name: matchedEntry.name || doc.name, path: matchedEntry.path || doc.path }
      if (merged) updated.exclude = merged
      await editDocumentMappings([{ pattern: matchedEntry.pattern, type }], [updated])
      onToast(`Exclude added to ${matchedEntry.pattern}`, 'success')
      setShowExclude(false)
      setExcludeVal('')
      onRefresh()
    } catch (err) {
      onToast('Error: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-afl-border px-4 py-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${typeStyle[type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          {docTypeInfo[type]?.abbr || type}
        </span>
        <span className="text-sm text-afl-text font-medium truncate flex-1">{doc.name}</span>
        {matchedEntry && (
          <span className="text-[11px] text-afl-muted font-mono hidden sm:inline">{matchedEntry.pattern}</span>
        )}
        <a href={doc.url || `${DOC_BASE_URL}${doc.path}`} target="_blank" rel="noopener noreferrer"
          className="afl-btn afl-btn-primary !py-1.5 !px-4 !text-xs">
          Open PDF
        </a>
        <button onClick={() => setShowExclude(!showExclude)}
          className="afl-btn afl-btn-outline !py-1.5 !px-4 !text-xs !text-amber-700 !border-amber-200 hover:!border-amber-400 hover:!bg-amber-50">
          {showExclude ? 'Cancel' : 'Add Exclude'}
        </button>
      </div>
      {showExclude && (
        <div className="flex items-center gap-2 pl-8 flex-wrap">
          <span className="text-xs text-afl-muted">Exclude:</span>
          <input type="text" value={excludeVal} onChange={e => setExcludeVal(e.target.value.toUpperCase())}
            placeholder={productCode.slice(0, 5)}
            className="font-mono text-[12px] tracking-wider px-3 py-1.5 border border-amber-300 bg-amber-50 rounded-xl w-40 uppercase focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none" />
          <span className="text-[10px] text-afl-muted font-mono">{excludeVal ? padExclude(excludeVal) : ''}</span>
          <button onClick={handleAddExclude} disabled={saving || !excludeVal.trim()}
            className="afl-btn afl-btn-primary !py-1 !px-4 !text-xs !bg-amber-500 hover:!bg-amber-600 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Expanded row — missing doc with quick-add
// ============================================================================

function MissingDocRow({ type, productCode, documentMap, onRefresh, onToast }) {
  const [showAdd, setShowAdd] = useState(false)
  const [pattern, setPattern] = useState(productCode)
  const [saving, setSaving] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState('')

  const existingDocs = useMemo(() => {
    const seen = new Set()
    return documentMap
      .filter(e => e.type === type && !seen.has(e.path) && seen.add(e.path))
      .map(e => ({ name: e.name, path: e.path }))
  }, [documentMap, type])

  const handleAdd = async () => {
    if (!pattern.trim() || !selectedDoc) return
    const doc = existingDocs.find(d => d.path === selectedDoc)
    if (!doc) return
    const padded = pattern.length < 13
      ? pattern.toUpperCase() + '*'.repeat(13 - pattern.length)
      : pattern.toUpperCase().slice(0, 13)
    setSaving(true)
    try {
      await addDocumentMappings([{ pattern: padded, type, name: doc.name, path: doc.path }])
      onToast(`Mapping added: ${padded} → ${doc.name}`, 'success')
      setShowAdd(false)
      setPattern(productCode)
      setSelectedDoc('')
      onRefresh()
    } catch (err) {
      onToast('Error: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-red-50/40 rounded-xl border border-red-200/50 px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-red-50 text-red-400 border-red-200">
          {docTypeInfo[type]?.abbr || type}
        </span>
        <span className="text-sm text-red-400 italic flex-1">No {type} document matched</span>
        <button onClick={() => setShowAdd(!showAdd)}
          className="afl-btn afl-btn-outline !py-1.5 !px-4 !text-xs !text-emerald-700 !border-emerald-200 hover:!border-emerald-400 hover:!bg-emerald-50">
          {showAdd ? 'Cancel' : '+ Add Mapping'}
        </button>
      </div>
      {showAdd && (
        <div className="flex items-center gap-2 pl-8 flex-wrap">
          <span className="text-xs text-afl-muted">Pattern:</span>
          <input type="text" value={pattern} onChange={e => setPattern(e.target.value.toUpperCase())}
            className="font-mono text-[12px] tracking-wider px-3 py-1.5 border border-afl-border rounded-xl w-44 uppercase focus:ring-2 focus:ring-afl-cyan focus:border-transparent outline-none" />
          <span className="text-xs text-afl-muted">Doc:</span>
          <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}
            className="text-[12px] px-3 py-1.5 border border-afl-border rounded-xl max-w-xs focus:ring-2 focus:ring-afl-cyan focus:border-transparent outline-none">
            <option value="">Select existing {type}...</option>
            {existingDocs.map(d => <option key={d.path} value={d.path}>{d.name}</option>)}
          </select>
          <button onClick={handleAdd} disabled={saving || !pattern.trim() || !selectedDoc}
            className="afl-btn afl-btn-primary !py-1 !px-4 !text-xs disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Expanded detail panel
// ============================================================================

function ExpandedDetail({ row, documentMap, onRefresh, onToast }) {
  return (
    <tr>
      <td colSpan={7} className="bg-afl-light/60 px-5 py-4 border-b border-afl-border">
        <div className="space-y-2.5 max-w-4xl">
          {DOC_TYPES.map(type => {
            const docs = type === 'Installation' || type === 'Storage & Handling'
              ? row.docs[type] || []
              : row.docs[type] ? [row.docs[type]] : []
            if (docs.length > 0) {
              return docs.map((doc, i) => (
                <MatchedDocRow key={`${type}-${i}`} doc={doc} type={type} productCode={row.code}
                  documentMap={documentMap} onRefresh={onRefresh} onToast={onToast} />
              ))
            }
            return <MissingDocRow key={type} type={type} productCode={row.code}
              documentMap={documentMap} onRefresh={onRefresh} onToast={onToast} />
          })}
          <div className="flex gap-4 pt-2 border-t border-afl-border/50 mt-3">
            <Link to={`/${row.code}`} target="_blank"
              className="text-xs text-afl-blue hover:text-afl-cyan font-semibold transition-colors">
              Preview as customer &rarr;
            </Link>
            <Link to="/audit"
              className="text-xs text-afl-muted hover:text-afl-text font-semibold transition-colors">
              Open Pattern Audit &rarr;
            </Link>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ============================================================================
// Table row
// ============================================================================

function CoverageRow({ row, isExpanded, onToggle, documentMap, onRefresh, onToast }) {
  const sc = statusConfig[row.status]

  const docCell = (has, doc, type) => {
    if (!has) {
      return <td className="text-center px-3 py-2.5"><span className="text-red-300/60 text-xs">--</span></td>
    }
    const d = Array.isArray(doc) ? doc[0] : doc
    const url = d?.url || (d?.path ? `${DOC_BASE_URL}${d.path}` : null)
    return (
      <td className="text-center px-3 py-2.5">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            title={d?.name || type}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700 hover:scale-110 transition-all duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </a>
        ) : (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500">
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
      <tr className={`cursor-pointer border-b border-afl-border/50 transition-all duration-150 ${isExpanded ? 'bg-afl-light' : 'hover:bg-afl-light/50'}`}
        onClick={onToggle}>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] transition-transform duration-200 text-afl-muted ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
            <span className="font-mono text-[13px] tracking-wide text-afl-text font-semibold">{row.code}</span>
          </div>
        </td>
        <td className="text-center px-3 py-2.5">
          <span className="text-[11px] font-mono text-afl-muted font-medium">{row.familyCode}</span>
        </td>
        {docCell(row.has.Stripping, row.docs.Stripping, 'Stripping')}
        {docCell(row.has.TDS, row.docs.TDS, 'TDS')}
        {docCell(row.has.Installation, row.docs.Installation, 'Installation')}
        {docCell(row.has['Storage & Handling'], row.docs['Storage & Handling'], 'Storage & Handling')}
        <td className="text-center px-3 py-2.5">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${sc.bg} ${sc.text} ${sc.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {row.matchedCount}/4
          </span>
        </td>
      </tr>
      {isExpanded && (
        <ExpandedDetail row={row} documentMap={documentMap} onRefresh={onRefresh} onToast={onToast} />
      )}
    </>
  )
}

// ============================================================================
// Main page
// ============================================================================

export default function CoverageAuditPage() {
  const [productCodes, setProductCodes] = useState(null)
  const [documentMap, setDocumentMap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [missingType, setMissingType] = useState('')
  const [expandedCode, setExpandedCode] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`/data/product-codes.json?_t=${Date.now()}`).then(r => r.json()),
      loadDocumentMap(),
    ]).then(([codes, map]) => {
      setProductCodes(codes)
      setDocumentMap(map)
      setLoading(false)
    }).catch(() => { setError(true); setLoading(false) })
  }, [])

  const refreshData = useCallback(async () => {
    invalidateDocumentMapCache()
    const map = await loadDocumentMap()
    setDocumentMap(map)
  }, [])

  const handleToast = useCallback((msg, type) => setToast({ msg, type }), [])

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
      return { code, familyCode, docs: byType, has, matchedCount, status: matchedCount === 4 ? 'complete' : matchedCount > 0 ? 'partial' : 'none' }
    })
  }, [productCodes, documentMap])

  const familyOptions = useMemo(() => [...new Set(coverageData.map(r => r.familyCode))].sort(), [coverageData])

  const stats = useMemo(() => {
    const total = coverageData.length
    const complete = coverageData.filter(r => r.status === 'complete').length
    const partial = coverageData.filter(r => r.status === 'partial').length
    const none = coverageData.filter(r => r.status === 'none').length
    return { total, complete, partial, none }
  }, [coverageData])

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
      <div className="min-h-screen flex items-center justify-center bg-afl-light">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-afl-cyan border-t-transparent rounded-full animate-spin" />
          <span className="text-afl-muted font-heading font-semibold">Loading coverage data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light">
        <div className="text-center">
          <p className="text-red-600 font-heading font-semibold mb-2">Failed to load data</p>
          <button onClick={() => window.location.reload()} className="text-sm text-afl-blue hover:underline">Refresh page</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-afl-light">
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* Header */}
      <header className="afl-header-bg px-6 pt-6 pb-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link to="/" className="logo-dark-bg"><img src="/afl-logo.png" alt="AFL" className="h-8 w-auto" /></Link>
            <div>
              <h1 className="text-white text-xl font-bold font-heading tracking-tight">Coverage Audit</h1>
              <p className="text-white/50 text-xs font-medium">Document coverage for every product code</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/audit" className="text-white/50 hover:text-white text-sm font-semibold transition-colors">Pattern Audit</Link>
            <Link to="/" className="text-white/50 hover:text-white text-sm font-semibold transition-colors">Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-10 pb-16">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Codes', value: stats.total, border: 'border-afl-border', text: 'text-afl-text', labelColor: 'text-afl-muted' },
            { label: 'Full Coverage', value: stats.complete, border: 'border-emerald-200', text: 'text-emerald-700', labelColor: 'text-emerald-600' },
            { label: 'Partial', value: stats.partial, border: 'border-amber-200', text: 'text-amber-700', labelColor: 'text-amber-600' },
            { label: 'No Docs', value: stats.none, border: 'border-red-200', text: 'text-red-600', labelColor: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className={`card-enter bg-white rounded-2xl border ${s.border} px-5 py-4 shadow-sm`}>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${s.labelColor} font-heading`}>{s.label}</div>
              <div className={`text-2xl font-bold ${s.text} font-heading mt-1`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-afl-border shadow-sm px-5 py-3.5 mb-5 flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-afl-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search codes..."
              className="pl-9 pr-3 py-2 border border-afl-border rounded-xl text-sm w-52 focus:ring-2 focus:ring-afl-cyan/40 focus:border-afl-cyan outline-none font-mono transition-colors" />
          </div>
          <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}
            className="px-3 py-2 border border-afl-border rounded-xl text-sm focus:ring-2 focus:ring-afl-cyan/40 focus:border-afl-cyan outline-none transition-colors">
            <option value="">All Families</option>
            {familyOptions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-afl-border rounded-xl text-sm focus:ring-2 focus:ring-afl-cyan/40 focus:border-afl-cyan outline-none transition-colors">
            <option value="">All Statuses</option>
            <option value="complete">Complete</option>
            <option value="partial">Partial</option>
            <option value="none">No Docs</option>
          </select>
          <select value={missingType} onChange={e => setMissingType(e.target.value)}
            className="px-3 py-2 border border-afl-border rounded-xl text-sm focus:ring-2 focus:ring-afl-cyan/40 focus:border-afl-cyan outline-none transition-colors">
            <option value="">All Types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>Missing {t}</option>)}
          </select>
          {(search || familyFilter || statusFilter || missingType) && (
            <button onClick={() => { setSearch(''); setFamilyFilter(''); setStatusFilter(''); setMissingType('') }}
              className="text-xs text-afl-muted hover:text-red-500 font-semibold transition-colors">
              Clear filters
            </button>
          )}
          <span className="text-xs text-afl-muted ml-auto font-medium">{filtered.length} of {stats.total}</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-afl-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-afl-border bg-afl-light/50">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-afl-muted font-heading">Product Code</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-afl-muted font-heading w-14">Fam</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider font-heading w-16" style={{ color: '#7c3aed' }}>Strip</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider font-heading w-16" style={{ color: '#0284c7' }}>TDS</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider font-heading w-16" style={{ color: '#0d9488' }}>Install</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-heading w-16">S&H</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-afl-muted font-heading w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <CoverageRow key={row.code} row={row}
                    isExpanded={expandedCode === row.code}
                    onToggle={() => setExpandedCode(expandedCode === row.code ? null : row.code)}
                    documentMap={documentMap} onRefresh={refreshData} onToast={handleToast} />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-afl-muted text-sm">No codes match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
