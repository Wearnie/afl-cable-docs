import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { loadDJMapping } from '../data/djLookup'
import { findDocuments, documentMap, decodeProductCode, docTypeInfo, patternMatches } from '../data/documentMap'

const DOC_TYPES = ['TDS', 'Stripping', 'Test Certificate', 'Installation']
const PRIMARY_TYPES = ['TDS', 'Stripping', 'Test Certificate']

// Doc types that don't apply to certain families
const NOT_APPLICABLE = {
  T: ['Stripping'],
}

function isApplicable(productCode, docType) {
  const family = productCode[0]?.toUpperCase()
  return !(NOT_APPLICABLE[family] || []).includes(docType)
}

// Extract unique candidate documents per type
function getCandidatesByType() {
  const candidates = {}
  for (const type of DOC_TYPES) {
    const seen = new Set()
    candidates[type] = []
    for (const entry of documentMap) {
      if (entry.type === type && !seen.has(entry.url)) {
        seen.add(entry.url)
        candidates[type].push({ name: entry.name, url: entry.url, pattern: entry.pattern })
      }
    }
  }
  return candidates
}

const FAMILY_NAMES = {
  L: 'Loose Tube', N: 'NMA', R: 'FRP Armour', U: 'Microcore',
  T: 'Premise', S: 'ADSS', B: 'Buried', K: 'K3M',
}

function getFamilyName(code) {
  return FAMILY_NAMES[code[0]?.toUpperCase()] || code[0]
}

// Score how relevant a candidate doc is for a given product code
function scoreCandidate(productCode, candidate) {
  const code = productCode.toUpperCase()
  const pat = candidate.pattern
  const name = candidate.name.toLowerCase()
  let score = 0

  // Prefix match (first 1-3 chars)
  if (pat.length === 13) {
    for (let i = 0; i < 3; i++) {
      const pc = pat[i]
      if (pc !== '*' && /[A-Z0-9]/i.test(pc)) {
        if (pc.toUpperCase() === code[i]?.toUpperCase()) score += 10
        else score -= 5
      }
    }
  }

  // Fibre count match
  const codeFibres = parseInt(code.slice(8, 11), 10)
  if (!isNaN(codeFibres)) {
    const fibreStr = String(codeFibres)
    if (name.includes(fibreStr + 'f') || name.includes(fibreStr + ' fibre')) score += 15
  }

  // Family name match in doc name
  const family = getFamilyName(code).toLowerCase()
  if (name.includes(family)) score += 8
  if (name.includes('loose tube') && 'LNRB'.includes(code[0])) score += 5
  if (name.includes('adss') && code[0] === 'S') score += 5
  if (name.includes('premise') && code[0] === 'T') score += 5
  if (name.includes('microcore') && code[0] === 'U') score += 5
  if (name.includes('nma') && code[0] === 'N') score += 5
  if (name.includes('armour') && code[0] === 'R') score += 5

  // Construction keywords
  if (name.includes('stranded') && code[3] !== '1') score += 3
  if (name.includes('axial') && code[3] === '1') score += 3
  if (name.includes('sacrificial') && code[2] === 'H') score += 5
  if (name.includes('lszh') && (code[7] === 'M' || code[2] === 'B')) score += 5
  if (name.includes('high strength') && 'JK'.includes(code[2])) score += 5

  return score
}

export default function ReviewPage() {
  const [mapping, setMapping] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('gaps')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'TDS' | 'Stripping' | 'Test Certificate'
  const [search, setSearch] = useState('')
  const [expandedCode, setExpandedCode] = useState(null) // productCode being assigned
  const [expandedType, setExpandedType] = useState(null) // doc type being assigned
  const [assignments, setAssignments] = useState({}) // key: `${code}-${type}` → { name, url, pattern }

  useEffect(() => {
    loadDJMapping().then(data => {
      setMapping(data)
      setLoading(false)
    })
  }, [])

  const candidates = useMemo(() => getCandidatesByType(), [])

  // Group by product code
  const codeRows = useMemo(() => {
    if (!mapping) return []
    const groups = {}
    for (const [dj, productCode] of Object.entries(mapping)) {
      if (!groups[productCode]) groups[productCode] = []
      groups[productCode].push(dj)
    }
    return Object.entries(groups).map(([productCode, djs]) => {
      const docs = findDocuments(productCode)
      const decoded = decodeProductCode(productCode)
      const coverage = {}
      for (const type of DOC_TYPES) {
        if (!isApplicable(productCode, type)) {
          coverage[type] = 'n/a'
        } else {
          coverage[type] = docs.find(d => d.type === type) || null
        }
      }
      const missingTypes = PRIMARY_TYPES.filter(t => coverage[t] === null)
      const fibres = parseInt(productCode.slice(8, 11), 10)
      return {
        productCode,
        djs,
        djCount: djs.length,
        coverage,
        missingTypes,
        family: getFamilyName(productCode),
        decoded,
        fibres: isNaN(fibres) ? '?' : fibres,
      }
    })
  }, [mapping])

  // Stats
  const stats = useMemo(() => {
    const total = codeRows.length
    const totalDJs = codeRows.reduce((s, r) => s + r.djCount, 0)
    const fullyCovered = codeRows.filter(r => r.missingTypes.length === 0).length
    const withGaps = total - fullyCovered
    const gapDJs = codeRows.filter(r => r.missingTypes.length > 0).reduce((s, r) => s + r.djCount, 0)
    const byType = {}
    const byTypeDJs = {}
    for (const type of PRIMARY_TYPES) {
      const missing = codeRows.filter(r => r.coverage[type] === null)
      byType[type] = missing.length
      byTypeDJs[type] = missing.reduce((s, r) => s + r.djCount, 0)
    }
    return { total, totalDJs, fullyCovered, withGaps, gapDJs, byType, byTypeDJs }
  }, [codeRows])

  // Filter + search
  const filtered = useMemo(() => {
    let result = codeRows
    if (filter === 'gaps') {
      result = result.filter(r => r.missingTypes.length > 0)
    }
    if (typeFilter !== 'all') {
      result = result.filter(r => r.coverage[typeFilter] === null)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(r =>
        r.productCode.toLowerCase().includes(q) ||
        r.family.toLowerCase().includes(q) ||
        r.djs.some(dj => dj.includes(q))
      )
    }
    return result.sort((a, b) => a.productCode.localeCompare(b.productCode))
  }, [codeRows, filter, typeFilter, search])

  const toggleExpand = useCallback((code, type) => {
    if (expandedCode === code && expandedType === type) {
      setExpandedCode(null)
      setExpandedType(null)
    } else {
      setExpandedCode(code)
      setExpandedType(type)
    }
  }, [expandedCode, expandedType])

  const assign = useCallback((code, type, doc) => {
    setAssignments(prev => ({ ...prev, [`${code}-${type}`]: doc }))
    setExpandedCode(null)
    setExpandedType(null)
  }, [])

  const unassign = useCallback((code, type) => {
    setAssignments(prev => {
      const next = { ...prev }
      delete next[`${code}-${type}`]
      return next
    })
  }, [])

  const assignmentCount = Object.keys(assignments).length

  const copyAssignments = useCallback(() => {
    const lines = Object.entries(assignments).map(([key, doc]) => {
      const [code, ...typeParts] = key.split('-')
      const type = typeParts.join('-')
      return `${code}  →  ${type}  →  ${doc.name}`
    })
    navigator.clipboard.writeText(lines.join('\n'))
  }, [assignments])

  if (loading) {
    return (
      <div className="min-h-screen bg-afl-light flex items-center justify-center">
        <p className="text-afl-muted font-body">Loading DJ mappings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 200px, #F0F4F8 200px)' }}>
      <header className="px-6 pt-5 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <Link to="/" className="text-blue-200 hover:text-white text-sm font-body transition-colors">
              ← Home
            </Link>
          </div>
          <h1 className="text-white text-2xl font-bold font-heading">Coverage Review</h1>
          <p className="text-blue-300 mt-1 text-[14px]">
            {stats.total} product codes across {stats.totalDJs} DJ numbers
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-8 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatCard label="Product Codes" value={stats.total} sub={`${stats.totalDJs} DJs`} color="bg-afl-navy" />
          <StatCard label="Fully Covered" value={stats.fullyCovered} color="bg-emerald-600" />
          <StatCard label="With Gaps" value={stats.withGaps} sub={`${stats.gapDJs} DJs`} color="bg-amber-600" />
          <StatCard label="Missing TDS" value={stats.byType.TDS} sub={`${stats.byTypeDJs.TDS} DJs`} color="bg-red-600" />
          <StatCard label="Missing Cert" value={stats.byType['Test Certificate']} sub={`${stats.byTypeDJs['Test Certificate']} DJs`} color="bg-red-600" />
        </div>

        {/* Assignments bar */}
        {assignmentCount > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800 font-heading">
                  Assignments ({assignmentCount})
                </span>
                <span className="text-[12px] text-emerald-600 ml-2">Click to copy all</span>
              </div>
              <button
                onClick={copyAssignments}
                className="px-3 py-1.5 rounded-lg text-xs font-heading font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
            <div className="grid gap-1.5 max-h-48 overflow-y-auto">
              {Object.entries(assignments).map(([key, doc]) => {
                const dashIdx = key.indexOf('-')
                const code = key.slice(0, 13)
                const type = key.slice(14)
                return (
                  <div key={key} className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-[12px]">
                    <span className="font-mono text-afl-text font-semibold">{code}</span>
                    <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">{type}</span>
                    <span className="text-afl-muted truncate flex-1">→ {doc.name}</span>
                    <button onClick={() => unassign(code, type)} className="text-red-400 hover:text-red-600 shrink-0 ml-1" title="Remove">✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-4 mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mr-1">Show:</span>
            {[
              { key: 'all', label: 'All Codes' },
              { key: 'gaps', label: `Gaps Only (${stats.withGaps})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-colors ${
                  filter === f.key ? 'bg-afl-navy text-white' : 'bg-gray-100 text-afl-text hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="text-afl-border mx-1">|</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mr-1">Type:</span>
            {[
              { key: 'all', label: 'All' },
              { key: 'TDS', label: `TDS (${stats.byType.TDS})` },
              { key: 'Stripping', label: `Strip (${stats.byType.Stripping})` },
              { key: 'Test Certificate', label: `Cert (${stats.byType['Test Certificate']})` },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-colors ${
                  typeFilter === f.key ? 'bg-afl-navy text-white' : 'bg-gray-100 text-afl-text hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search product code, family, or DJ number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-afl-border rounded-xl text-sm font-mono focus:ring-2 focus:ring-afl-cyan focus:border-transparent outline-none"
          />
        </div>

        <p className="text-afl-muted text-xs font-heading mb-3">
          Showing {filtered.length} product codes
        </p>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-afl-border bg-gray-50/80">
                  <Th>Product Code</Th>
                  <Th>Family</Th>
                  <Th>Fibres</Th>
                  <Th>DJs</Th>
                  <Th>TDS</Th>
                  <Th>Strip</Th>
                  <Th>Cert</Th>
                  <Th className="hidden lg:table-cell">Install</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-afl-border">
                {filtered.map(row => (
                  <CodeRow
                    key={row.productCode}
                    row={row}
                    expandedCode={expandedCode}
                    expandedType={expandedType}
                    toggleExpand={toggleExpand}
                    candidates={candidates}
                    assignments={assignments}
                    assign={assign}
                    unassign={unassign}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-afl-muted">
                      No results match your filters.
                    </td>
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

function Th({ children, className = '' }) {
  return (
    <th className={`text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading ${className}`}>
      {children}
    </th>
  )
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className={`${color} rounded-xl px-4 py-3 text-white`}>
      <p className="text-[11px] font-heading uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-bold font-heading">{value}</p>
      {sub && <p className="text-[11px] font-heading opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

function CodeRow({ row, expandedCode, expandedType, toggleExpand, candidates, assignments, assign, unassign }) {
  const isExpanded = expandedCode === row.productCode
  return (
    <>
      <tr className={`transition-colors ${isExpanded ? 'bg-amber-50/40' : 'hover:bg-gray-50/60'}`}>
        <td className="px-4 py-2.5 font-mono text-[13px] tracking-[0.05em] text-afl-text font-semibold">
          {row.productCode}
        </td>
        <td className="px-4 py-2.5 text-afl-muted text-[13px]">{row.family}</td>
        <td className="px-4 py-2.5 text-afl-text text-[13px] font-mono">{row.fibres}F</td>
        <td className="px-4 py-2.5">
          <span className="text-[12px] text-afl-muted bg-gray-100 rounded px-1.5 py-0.5">{row.djCount}</span>
        </td>
        {PRIMARY_TYPES.map(type => (
          <td key={type} className="px-4 py-2.5">
            <CoverageCell
              doc={row.coverage[type]}
              assigned={assignments[`${row.productCode}-${type}`]}
              isExpanded={isExpanded && expandedType === type}
              onToggle={() => toggleExpand(row.productCode, type)}
              onUnassign={() => unassign(row.productCode, type)}
            />
          </td>
        ))}
        <td className="px-4 py-2.5 hidden lg:table-cell">
          <CoverageCell doc={row.coverage.Installation} />
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-amber-50/60">
          <td colSpan={8} className="px-4 py-4">
            <AssignPanel
              row={row}
              type={expandedType}
              candidates={candidates[expandedType] || []}
              assign={assign}
            />
          </td>
        </tr>
      )}
    </>
  )
}

function CoverageCell({ doc, assigned, isExpanded, onToggle, onUnassign }) {
  if (doc === 'n/a') {
    return <span className="text-[12px] text-afl-muted italic">N/A</span>
  }
  if (assigned) {
    return (
      <span className="inline-flex items-center gap-1 max-w-[180px] text-[12px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
        <span className="truncate" title={`Assigned: ${assigned.name}`}>✓ {assigned.name}</span>
        <button
          onClick={onUnassign}
          className="text-blue-400 hover:text-red-600 shrink-0 ml-0.5 font-bold"
          title="Remove assignment"
        >
          ✕
        </button>
      </span>
    )
  }
  if (doc) {
    return (
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block max-w-[160px] truncate text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-100 transition-colors"
        title={doc.name}
      >
        {doc.name}
      </a>
    )
  }
  if (!onToggle) {
    return <span className="text-[12px] text-afl-muted">—</span>
  }
  return (
    <button
      onClick={onToggle}
      className={`text-[12px] font-bold rounded-lg px-2 py-1 transition-colors ${
        isExpanded
          ? 'bg-amber-200 text-amber-900 border border-amber-300'
          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
      }`}
    >
      MISSING {isExpanded ? '▲' : '▼'}
    </button>
  )
}

function AssignPanel({ row, type, candidates, assign }) {
  // Rank candidates by relevance to this product code
  const ranked = useMemo(() => {
    return [...candidates]
      .map(c => ({ ...c, score: scoreCandidate(row.productCode, c) }))
      .sort((a, b) => b.score - a.score)
  }, [candidates, row.productCode])

  const topCandidates = ranked.slice(0, 8)
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? ranked : topCandidates

  return (
    <div>
      {/* Cable info header */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800 font-heading mb-1.5">
            Assign {docTypeInfo[type]?.label || type} for:
          </p>
          <span className="font-mono text-[15px] font-bold text-afl-text bg-white border border-afl-border rounded-lg px-3 py-1.5 inline-block">
            {row.productCode}
          </span>
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-1.5">Cable Properties</p>
          <div className="flex flex-wrap gap-1.5">
            {row.decoded.map((d, i) => (
              <span key={i} className="text-[11px] bg-white border border-afl-border rounded px-2 py-1 text-afl-text">
                <span className="text-afl-muted">{d.label}:</span> {d.description}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-1.5">DJ Numbers ({row.djCount})</p>
          <div className="flex flex-wrap gap-1 max-w-xs">
            {row.djs.slice(0, 6).map(dj => (
              <Link key={dj} to={`/dj/${dj}`} className="text-[11px] font-mono text-afl-blue hover:underline bg-white border border-afl-border rounded px-1.5 py-0.5">
                {dj}
              </Link>
            ))}
            {row.djCount > 6 && <span className="text-[11px] text-afl-muted">+{row.djCount - 6} more</span>}
          </div>
        </div>
      </div>

      {/* Candidate docs — ranked */}
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700 font-heading mb-2">
        Available {docTypeInfo[type]?.label || type} documents (ranked by relevance)
      </p>
      <div className="grid gap-1.5 max-h-80 overflow-y-auto">
        {displayed.map((c, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-[13px] transition-all ${
              i < 3 && !showAll ? 'border-amber-300 shadow-sm' : 'border-afl-border'
            }`}
          >
            {i < 3 && !showAll && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 rounded px-1.5 py-0.5 shrink-0">TOP</span>
            )}
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-afl-text hover:text-afl-blue truncate flex-1"
              title={c.name}
            >
              {c.name}
            </a>
            <span className="text-afl-muted font-mono text-[10px] shrink-0 hidden md:inline" title={c.pattern}>
              {c.pattern}
            </span>
            <button
              onClick={() => assign(row.productCode, type, c)}
              className="px-3 py-1 rounded-lg text-[11px] font-heading font-bold bg-afl-cyan text-white hover:brightness-110 transition-all shrink-0"
            >
              Assign
            </button>
          </div>
        ))}
      </div>
      {ranked.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-[12px] text-afl-blue hover:underline font-heading"
        >
          {showAll ? 'Show top matches only' : `Show all ${ranked.length} candidates`}
        </button>
      )}
      <button
        onClick={() => assign(row.productCode, type, { name: 'DOES NOT EXIST', url: '', pattern: '' })}
        className="mt-2 ml-4 text-[12px] text-afl-muted hover:text-red-600 font-heading"
      >
        Mark as "No doc exists"
      </button>
    </div>
  )
}
