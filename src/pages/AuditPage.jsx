import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { loadDocumentMap, patternMatches } from '../data/documentMap'
import { loadDJMapping } from '../data/djLookup'
import { addDocumentMappings, removeDocumentMappings, uploadStaticDoc } from '../lib/adminApi'

const DOC_BASE_URL = import.meta.env.VITE_DOC_BASE_URL || '/docs'
const TYPE_OPTIONS = ['TDS', 'Test Certificate', 'Stripping', 'Installation']
const DOC_TYPE_MAP = { TDS: 'tds', 'Test Certificate': 'test-certificates', Stripping: 'stripping', Installation: 'installation' }
const HIDDEN_PATTERN = '1111111111111'
const REVIEWED_KEY = 'audit-reviewed-docs'

function getReviewedDocs() {
  try { return JSON.parse(localStorage.getItem(REVIEWED_KEY) || '{}') } catch { return {} }
}

function setDocReviewed(path, reviewed) {
  const data = getReviewedDocs()
  if (reviewed) data[path] = Date.now()
  else delete data[path]
  localStorage.setItem(REVIEWED_KEY, JSON.stringify(data))
}

function isAlphanumeric(ch) {
  const c = ch.charCodeAt(0)
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57)
}

function mismatchCount(code, pattern) {
  if (code.length !== 13 || pattern.length !== 13) return 99
  const c = code.toUpperCase(), p = pattern.toUpperCase()
  let mm = 0
  for (let i = 0; i < 13; i++) { if (isAlphanumeric(p[i]) && p[i] !== c[i]) mm++ }
  return mm
}

function PatternHighlight({ pattern }) {
  return (
    <span className="font-mono text-[13px] tracking-wide">
      {[...pattern].map((ch, i) => (
        <span key={i} className={isAlphanumeric(ch) ? 'text-gray-800 font-semibold' : 'text-amber-500 font-bold'}>{ch}</span>
      ))}
    </span>
  )
}

function CodeVsPattern({ code, pattern }) {
  if (code.length !== 13 || pattern.length !== 13) return <span className="font-mono text-[12px]">{code}</span>
  const c = code.toUpperCase(), p = pattern.toUpperCase()
  return (
    <span className="font-mono text-[12px]">
      {[...c].map((ch, i) => {
        if (!isAlphanumeric(p[i])) return <span key={i} className="text-gray-400">{code[i]}</span>
        if (p[i] === c[i]) return <span key={i} className="text-emerald-600 font-semibold">{code[i]}</span>
        return <span key={i} className="text-red-600 font-bold bg-red-50">{code[i]}</span>
      })}
    </span>
  )
}

function Toast({ message, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-xl font-semibold text-white shadow-lg z-50 animate-fade-in ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

// Editable pattern row
function PatternRow({ pattern: initialPattern, type, name, path, isNew, onSaved, onToast }) {
  const [pattern, setPattern] = useState(initialPattern)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const original = useRef(initialPattern)

  const handleSave = async () => {
    const val = pattern.toUpperCase().trim()
    if (val.length !== 13) { setStatus('Must be 13 chars'); return }
    if (!isNew && val === original.current) { setStatus('No change'); return }
    setSaving(true); setStatus('Saving...')
    try {
      if (!isNew && original.current && original.current !== HIDDEN_PATTERN) {
        await removeDocumentMappings([original.current])
      }
      await addDocumentMappings([{ pattern: val, type, name, path }])
      original.current = val
      setPattern(val)
      setStatus('Saved!')
      onToast(`Pattern ${isNew ? 'added' : 'updated'}: ${val}`, 'success')
      if (isNew && onSaved) onSaved(val)
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(err.message)
      onToast('Error: ' + err.message, 'error')
    } finally { setSaving(false) }
  }

  const handleHide = async () => {
    if (original.current === HIDDEN_PATTERN) return
    if (!confirm(`Hide this pattern?\n\nOriginal: ${original.current}\nIt will be set to ${HIDDEN_PATTERN} so it never matches.`)) return
    setPattern(HIDDEN_PATTERN)
    setTimeout(() => handleSave(), 0)
  }

  // For new rows, only show Add button
  if (isNew) {
    return (
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={pattern}
          onChange={e => setPattern(e.target.value.toUpperCase())}
          maxLength={13}
          placeholder="New pattern..."
          className="font-mono text-[13px] tracking-wider px-3 py-1.5 border border-gray-300 rounded-lg w-44 uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button onClick={handleSave} disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-heading font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors">
          + Add
        </button>
        {status && <span className="text-xs text-gray-500">{status}</span>}
      </div>
    )
  }

  const isHidden = pattern === HIDDEN_PATTERN

  return (
    <div className="flex items-center gap-2 mb-2">
      <input
        type="text"
        value={pattern}
        onChange={e => setPattern(e.target.value.toUpperCase())}
        maxLength={13}
        className={`font-mono text-[13px] tracking-wider px-3 py-1.5 border rounded-lg w-44 uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
          isHidden ? 'border-gray-300 bg-gray-100 text-gray-400 line-through' : 'border-gray-300'
        }`}
      />
      <button onClick={handleSave} disabled={saving}
        className="px-3 py-1.5 rounded-lg text-xs font-heading font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
        Save
      </button>
      <button onClick={handleHide} disabled={saving || isHidden}
        className="px-3 py-1.5 rounded-lg text-xs font-heading font-bold bg-gray-100 text-gray-600 border border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 disabled:opacity-50 transition-colors">
        Hide
      </button>
      {status && <span className={`text-xs ${status === 'Saved!' ? 'text-emerald-600' : 'text-gray-500'}`}>{status}</span>}
    </div>
  )
}

// Single document card
function DocumentCard({ doc, allProductCodes, djEntries, defaultOpen, onReviewChange }) {
  const [open, setOpen] = useState(defaultOpen || false)
  const [toast, setToast] = useState(null)
  const [extraPatterns, setExtraPatterns] = useState([])
  const [reviewed, setReviewed] = useState(() => !!getReviewedDocs()[doc.path])

  const toggleReviewed = (e) => {
    e.stopPropagation()
    const next = !reviewed
    setReviewed(next)
    setDocReviewed(doc.path, next)
    if (onReviewChange) onReviewChange()
  }

  const { matched, nearMisses } = useMemo(() => {
    const matched = []
    const nearMisses = []
    for (const code of allProductCodes) {
      let isMatch = false
      let bestMM = 99, bestPat = ''
      for (const p of doc.patterns) {
        if (patternMatches(code, p)) isMatch = true
        const mm = mismatchCount(code, p)
        if (mm < bestMM) { bestMM = mm; bestPat = p }
      }
      const djs = djEntries.filter(([, c]) => c === code).map(([dj]) => dj)
      if (isMatch) matched.push({ code, djNumbers: djs })
      else if (bestMM <= 2 && bestMM > 0) nearMisses.push({ code, mismatches: bestMM, closestPattern: bestPat, djNumbers: djs })
    }
    nearMisses.sort((a, b) => a.mismatches - b.mismatches)
    return { matched, nearMisses }
  }, [doc.patterns, allProductCodes, djEntries])

  const statusClass = matched.length === 0 ? 'bg-red-50 text-red-700 border-red-200' :
    nearMisses.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
  const statusLabel = matched.length === 0 ? 'NO MATCHES' :
    nearMisses.length > 0 ? `${matched.length} matched, ${nearMisses.length} near-miss` : `${matched.length} matched`

  return (
    <div className={`rounded-xl border mb-3 overflow-hidden transition-colors ${reviewed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-gray-200'}`}>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors" onClick={() => setOpen(!open)}>
        <button
          onClick={toggleReviewed}
          title={reviewed ? 'Mark as not reviewed' : 'Mark as reviewed'}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
            reviewed
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-gray-300 hover:border-emerald-400 text-transparent hover:text-emerald-300'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''}`}>&#9654;</span>
        <span className={`font-semibold text-sm flex-1 truncate ${reviewed ? 'text-emerald-800' : ''}`}>{doc.name}</span>
        <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 border ${statusClass}`}>{statusLabel}</span>
        <span className="text-[11px] font-bold rounded-full px-2.5 py-0.5 border border-gray-200 bg-gray-50 text-gray-500">{doc.patterns.length} pattern{doc.patterns.length > 1 ? 's' : ''}</span>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <a href={`${DOC_BASE_URL}${doc.path}`} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm mt-2 inline-block">{decodeURIComponent(doc.path)}</a>

          <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 mt-4 mb-2">Patterns</h4>
          {doc.patterns.map((p, i) => (
            <PatternRow key={`${p}-${i}`} pattern={p} type={doc.type} name={doc.name} path={doc.path}
              onToast={(msg, type) => setToast({ msg, type })} />
          ))}
          {extraPatterns.map((p, i) => (
            <PatternRow key={`extra-${i}`} pattern={p} type={doc.type} name={doc.name} path={doc.path}
              onToast={(msg, type) => setToast({ msg, type })} />
          ))}
          <PatternRow key={`new-${extraPatterns.length}`} pattern="" type={doc.type} name={doc.name} path={doc.path} isNew
            onSaved={(val) => setExtraPatterns(prev => [...prev, val])}
            onToast={(msg, type) => setToast({ msg, type })} />

          {matched.length > 0 && (
            <>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 mt-4 mb-2">Matched Product Codes ({matched.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Code</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">DJ Numbers</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Pattern Match</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {matched.map(m => {
                      const matchPat = doc.patterns.find(p => patternMatches(m.code, p)) || doc.patterns[0]
                      return (
                        <tr key={m.code} className="hover:bg-gray-50/60">
                          <td className="px-3 py-1.5 font-mono text-[12px] font-semibold">{m.code}</td>
                          <td className="px-3 py-1.5 text-[12px] text-gray-500">{m.djNumbers.join(', ')}</td>
                          <td className="px-3 py-1.5"><CodeVsPattern code={m.code} pattern={matchPat} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {nearMisses.length > 0 && (
            <>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600 mt-4 mb-2">Near-Miss Product Codes ({nearMisses.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 bg-amber-50/50">
                    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Code</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Diff</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Closest Pattern</th>
                    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Visual</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {nearMisses.map(nm => (
                      <tr key={nm.code} className="hover:bg-gray-50/60">
                        <td className="px-3 py-1.5 font-mono text-[12px] font-semibold">{nm.code}</td>
                        <td className="px-3 py-1.5 text-[12px] text-amber-600 font-bold">{nm.mismatches}</td>
                        <td className="px-3 py-1.5"><PatternHighlight pattern={nm.closestPattern} /></td>
                        <td className="px-3 py-1.5"><CodeVsPattern code={nm.code} pattern={nm.closestPattern} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Upload section
function UploadSection({ onToast }) {
  const [docType, setDocType] = useState('test-certificates')
  const [docName, setDocName] = useState('')
  const [file, setFile] = useState(null)
  const [patterns, setPatterns] = useState([''])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState([])

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    setFile(f)
    if (f && !docName) setDocName(f.name.replace(/\.pdf$/i, ''))
  }

  const addPatternField = () => setPatterns(prev => [...prev, ''])
  const updatePattern = (i, val) => setPatterns(prev => prev.map((p, j) => j === i ? val.toUpperCase() : p))
  const removePatternField = (i) => setPatterns(prev => prev.filter((_, j) => j !== i))

  const handleUpload = async () => {
    const validPatterns = patterns.filter(p => p.trim())
    if (!file) { onToast('Select a PDF file', 'error'); return }
    if (!docName.trim()) { onToast('Enter a document name', 'error'); return }
    if (validPatterns.length === 0) { onToast('Add at least one pattern', 'error'); return }
    for (const p of validPatterns) {
      if (p.length !== 13) { onToast(`Pattern "${p}" must be 13 characters`, 'error'); return }
    }

    setUploading(true)
    const steps = [
      { text: 'Uploading PDF to GitHub...', status: 'active' },
      { text: 'Creating pattern mappings...', status: '' },
    ]
    setProgress([...steps])

    try {
      const uploadResult = await uploadStaticDoc(docType, file)
      const docMapPath = uploadResult.path.replace(/^\/docs/, '')

      steps[0] = { text: `PDF uploaded: ${file.name}`, status: 'done' }
      steps[1] = { text: `Creating ${validPatterns.length} pattern(s)...`, status: 'active' }
      setProgress([...steps])

      const mapType = Object.entries(DOC_TYPE_MAP).find(([, v]) => v === docType)?.[0] || docType
      await addDocumentMappings(validPatterns.map(p => ({ pattern: p, type: mapType, name: docName.trim(), path: docMapPath })))

      steps[1] = { text: `${validPatterns.length} pattern(s) created`, status: 'done' }
      setProgress([...steps])
      onToast('Document uploaded and mapped!', 'success')

      // Reset
      setFile(null); setDocName(''); setPatterns([''])
    } catch (err) {
      setProgress([{ text: 'Error: ' + err.message, status: 'error' }])
      onToast('Error: ' + err.message, 'error')
    } finally { setUploading(false) }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-5 mb-6">
      <h3 className="text-sm font-bold font-heading text-gray-800 mb-3">Upload New Document</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">Document Type</label>
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="tds">TDS</option>
            <option value="test-certificates">Test Certificate</option>
            <option value="stripping">Stripping Instructions</option>
            <option value="installation">Installation Guide</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">Document Name</label>
          <input type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. LMD6xxPA (SZ7) Test Certificate"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">PDF File</label>
        <input type="file" accept=".pdf" onChange={handleFileChange} className="text-sm" />
        {file && <p className="text-xs text-emerald-600 font-semibold mt-1">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">Patterns (13 chars, * = wildcard)</label>
        {patterns.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input type="text" value={p} onChange={e => updatePattern(i, e.target.value)} maxLength={13} placeholder="e.g. LMD6**PA*****"
              className="font-mono text-[13px] tracking-wider px-3 py-1.5 border border-gray-300 rounded-lg w-44 uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
            {patterns.length > 1 && (
              <button onClick={() => removePatternField(i)} className="text-xs text-gray-400 hover:text-red-600">X</button>
            )}
          </div>
        ))}
        <button onClick={addPatternField}
          className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-100 transition-colors">
          + Add another pattern
        </button>
      </div>

      <button onClick={handleUpload} disabled={uploading}
        className="px-6 py-2.5 rounded-xl text-sm font-heading font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
        Upload &amp; Create Mapping
      </button>

      {progress.length > 0 && (
        <div className="mt-3">
          {progress.map((s, i) => (
            <p key={i} className={`text-sm ${s.status === 'done' ? 'text-emerald-600' : s.status === 'error' ? 'text-red-600' : s.status === 'active' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              {s.status === 'done' ? '✓ ' : s.status === 'error' ? '✗ ' : s.status === 'active' ? '▸ ' : '  '}{s.text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AuditPage() {
  const [documentMap, setDocumentMap] = useState(null)
  const [djMapping, setDjMapping] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [reviewFilter, setReviewFilter] = useState('') // '' | 'pending' | 'reviewed'
  const [toast, setToast] = useState(null)
  const [reviewCount, setReviewCount] = useState(0)

  const recountReviewed = useCallback(() => {
    setReviewCount(Object.keys(getReviewedDocs()).length)
  }, [])

  useEffect(() => {
    Promise.all([loadDocumentMap(), loadDJMapping()]).then(([docMap, djMap]) => {
      setDocumentMap(docMap)
      setDjMapping(djMap)
      setLoading(false)
      recountReviewed()
    })
  }, [])

  // Derived data
  const { docGroups, allProductCodes, djEntries, stats } = useMemo(() => {
    if (!documentMap || !djMapping) return { docGroups: {}, allProductCodes: [], djEntries: [], stats: {} }

    const allCodes = [...new Set(Object.values(djMapping))]
    const entries = Object.entries(djMapping)

    // Group by path
    const groups = {}
    for (const entry of documentMap) {
      const key = entry.path
      if (!groups[key]) {
        groups[key] = { name: entry.name, type: entry.type, path: entry.path, patterns: [] }
      }
      groups[key].patterns.push(entry.pattern)
    }

    const matchedCodes = new Set()
    for (const code of allCodes) {
      for (const entry of documentMap) {
        if (patternMatches(code, entry.pattern)) { matchedCodes.add(code); break }
      }
    }

    return {
      docGroups: groups,
      allProductCodes: allCodes,
      djEntries: entries,
      stats: {
        uniquePDFs: Object.keys(groups).length,
        totalPatterns: documentMap.length,
        totalDJs: entries.length,
        uniqueCodes: allCodes.length,
        coveredCodes: matchedCodes.size,
        coverage: ((matchedCodes.size / allCodes.length) * 100).toFixed(1),
        orphaned: allCodes.length - matchedCodes.size,
      },
    }
  }, [documentMap, djMapping])

  // Group by type
  const byType = useMemo(() => {
    const grouped = {}
    for (const t of TYPE_OPTIONS) grouped[t] = []
    for (const doc of Object.values(docGroups)) {
      if (!grouped[doc.type]) grouped[doc.type] = []
      grouped[doc.type].push(doc)
    }
    for (const t of TYPE_OPTIONS) grouped[t]?.sort((a, b) => a.name.localeCompare(b.name))
    return grouped
  }, [docGroups])

  // Filter
  const filtered = useMemo(() => {
    const query = search.trim().toUpperCase()
    let resolvedCode = null
    if (query && /^\d+$/.test(query) && djMapping?.[query]) {
      resolvedCode = djMapping[query].toUpperCase()
    }
    const reviewedDocs = getReviewedDocs()

    const result = {}
    for (const type of TYPE_OPTIONS) {
      if (typeFilter && typeFilter !== type) continue
      result[type] = (byType[type] || []).filter(doc => {
        // Review filter
        if (reviewFilter === 'reviewed' && !reviewedDocs[doc.path]) return false
        if (reviewFilter === 'pending' && reviewedDocs[doc.path]) return false
        if (!query) return true
        const searchTarget = resolvedCode || query
        // Check matched codes
        for (const code of allProductCodes) {
          if (!code.toUpperCase().includes(searchTarget)) continue
          for (const p of doc.patterns) {
            if (patternMatches(code, p)) return true
          }
        }
        // Check DJ numbers
        for (const [dj, code] of djEntries) {
          if (!dj.includes(query)) continue
          for (const p of doc.patterns) {
            if (patternMatches(code, p)) return true
          }
        }
        // Check patterns and name
        if (doc.patterns.some(p => p.toUpperCase().includes(query))) return true
        if (doc.name.toUpperCase().includes(query)) return true
        return false
      })
    }
    return result
  }, [search, typeFilter, reviewFilter, reviewCount, byType, allProductCodes, djEntries, djMapping])

  const totalVisible = useMemo(() =>
    TYPE_OPTIONS.reduce((s, t) => s + (filtered[t]?.length || 0), 0),
    [filtered])

  const handleToast = useCallback((msg, type) => setToast({ msg, type }), [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading document map and DJ mappings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 200px, #F0F4F8 200px)' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <header className="px-6 pt-5 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <Link to="/" className="text-blue-200 hover:text-white text-sm transition-colors">← Home</Link>
          </div>
          <h1 className="text-white text-2xl font-bold font-heading">Pattern Audit</h1>
          <p className="text-blue-300 mt-1 text-[14px]">
            Review and edit all pattern-to-document assignments
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-8 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-8 gap-3 mb-5">
          <StatCard label="Unique PDFs" value={stats.uniquePDFs} color="bg-blue-800" />
          <StatCard label="Patterns" value={stats.totalPatterns} color="bg-blue-700" />
          <StatCard label="DJ Numbers" value={stats.totalDJs} color="bg-blue-700" />
          <StatCard label="Product Codes" value={stats.uniqueCodes} color="bg-blue-700" />
          <StatCard label="Coverage" value={`${stats.coverage}%`} color={parseFloat(stats.coverage) >= 80 ? 'bg-emerald-600' : 'bg-amber-600'} />
          <StatCard label="Codes Matched" value={stats.coveredCodes} color="bg-emerald-600" />
          <StatCard label="Orphaned" value={stats.orphaned} color={stats.orphaned === 0 ? 'bg-emerald-600' : 'bg-red-600'} />
          <StatCard label="Reviewed" value={`${reviewCount}/${stats.uniquePDFs}`} color={reviewCount === stats.uniquePDFs ? 'bg-emerald-600' : 'bg-amber-600'} />
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">Search by Product Code, DJ Number, or Name</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. LMD61DPA012BE or 40834600"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">Document Type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">All Types</option>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">Review Status</label>
              <select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
            <button onClick={() => { setSearch(''); setTypeFilter(''); setReviewFilter('') }}
              className="px-4 py-2.5 rounded-xl text-sm font-heading font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              Clear
            </button>
          </div>
          {(search || typeFilter) && (
            <p className="text-xs text-gray-500 mt-2">
              Showing {totalVisible} of {Object.keys(docGroups).length} documents
              {search && /^\d+$/.test(search.trim()) && djMapping?.[search.trim()] && (
                <span className="ml-1">(DJ {search.trim()} = <span className="font-mono font-semibold">{djMapping[search.trim()]}</span>)</span>
              )}
            </p>
          )}
        </div>

        {/* Upload */}
        <UploadSection onToast={handleToast} />

        {/* Document sections */}
        {TYPE_OPTIONS.map(type => {
          const docs = filtered[type] || []
          if (typeFilter && typeFilter !== type) return null
          if (search && docs.length === 0) return null
          const allDocs = byType[type] || []
          return (
            <div key={type}>
              <h2 className="text-lg font-bold font-heading text-gray-800 mt-6 mb-3 pb-2 border-b-2 border-gray-200">
                {type} <span className="text-gray-400 font-normal text-sm">({docs.length} of {allDocs.length} PDFs, {allDocs.reduce((s, d) => s + d.patterns.length, 0)} patterns)</span>
              </h2>
              {docs.map(doc => (
                <DocumentCard key={doc.path} doc={doc} allProductCodes={allProductCodes} djEntries={djEntries} onReviewChange={recountReviewed} />
              ))}
            </div>
          )
        })}
      </main>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className={`${color} rounded-xl px-4 py-3 text-white`}>
      <p className="text-[11px] font-heading uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xl font-bold font-heading">{value}</p>
    </div>
  )
}
