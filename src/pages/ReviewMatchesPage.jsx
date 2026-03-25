import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { loadDocumentMap, patternMatches, stripSuffix } from '../data/documentMap'
import { loadDJMapping } from '../data/djLookup'
import { editDocumentMappings } from '../lib/adminApi'

const DOC_BASE_URL = import.meta.env.VITE_DOC_BASE_URL || '/docs'
const REVIEW_KEY = 'match-review-state'

const familyDecode = { L: 'Loose Tube', N: 'Non-Metallic Armour', R: 'FRP Flat Rod Armour', U: 'Microcore', T: 'Premise', S: 'ADSS', B: 'B-Family', K: 'K-Family' }
const jacketColour = { BE: 'Blue', GY: 'Grey', WE: 'White', RD: 'Red', BK: 'Black', YW: 'Yellow', OE: 'Orange', GN: 'Green', BN: 'Brown', VT: 'Violet', PK: 'Pink', AQ: 'Aqua' }

function isAlphanumeric(ch) {
  const c = ch.charCodeAt(0)
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57)
}

function tightnessScore(pattern) {
  let fixed = 0
  for (const ch of pattern) { if (isAlphanumeric(ch)) fixed++ }
  return Math.round((fixed / pattern.length) * 100)
}

function decodeBasic(code) {
  const base = stripSuffix(code.toUpperCase().trim())
  const family = familyDecode[base[0]] || base[0]
  let fibres = '', colour = ''
  if (base.length >= 13) {
    const fc = parseInt(base.slice(8, 11), 10)
    if (!isNaN(fc)) fibres = fc + 'F'
    colour = jacketColour[base.slice(11, 13)] || base.slice(11, 13)
  }
  return { family, fibres, colour }
}

function getReviewState() {
  try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || '{}') } catch { return {} }
}

function setReviewState(docPath, code, verdict) {
  const state = getReviewState()
  if (!state[docPath]) state[docPath] = {}
  state[docPath][code] = verdict
  localStorage.setItem(REVIEW_KEY, JSON.stringify(state))
}

function PatternEditor({ pattern: initialPattern, exclude: initialExclude, type, name, path, onSaved }) {
  const [pattern, setPattern] = useState(initialPattern)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const handleSave = async () => {
    const val = pattern.toUpperCase().trim()
    if (val.length < 1) { setStatus('Pattern required'); return }
    if (val === initialPattern) { setStatus('No change'); return }
    setSaving(true); setStatus('Saving...')
    try {
      const entry = { pattern: val, type, name, path }
      if (initialExclude) entry.exclude = initialExclude
      await editDocumentMappings([initialPattern], [entry])
      setStatus('Saved!')
      if (onSaved) onSaved(val)
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus('Error: ' + err.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-2 mt-2 ml-8">
      <span className="text-[11px] font-bold text-gray-400 uppercase">Pattern:</span>
      <input
        type="text" value={pattern}
        onChange={e => setPattern(e.target.value.toUpperCase())}
        className="font-mono text-[13px] tracking-wider px-3 py-1.5 border border-red-300 rounded-lg w-48 uppercase focus:ring-2 focus:ring-red-400 outline-none bg-red-50"
      />
      <span className="text-[10px] text-gray-400 font-mono">{pattern.length}</span>
      <button onClick={handleSave} disabled={saving}
        className="px-3 py-1.5 rounded-lg text-xs font-heading font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
        Save
      </button>
      {status && <span className={`text-xs ${status === 'Saved!' ? 'text-emerald-600' : 'text-gray-500'}`}>{status}</span>}
    </div>
  )
}

function CodeRow({ code, pattern, exclude, type, docName, docPath, tightness, reviewState, onReview }) {
  const decoded = decodeBasic(code)
  const base = stripSuffix(code.toUpperCase().trim())
  const verdict = reviewState?.[code]
  const [showEditor, setShowEditor] = useState(false)

  const handleCorrect = () => { onReview(code, 'correct'); setShowEditor(false) }
  const handleWrong = () => { onReview(code, 'wrong'); setShowEditor(true) }

  return (
    <div className={`border-b border-gray-100 ${verdict === 'correct' ? 'bg-emerald-50/50' : verdict === 'wrong' ? 'bg-red-50/50' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="font-mono text-[13px] font-semibold tracking-wide text-gray-800 w-56 shrink-0 truncate" title={code}>{code}</span>
        {base !== code.toUpperCase() && <span className="text-[11px] text-gray-400 font-mono shrink-0">→ {base}</span>}
        <span className="text-[11px] text-gray-500 w-20 shrink-0">{decoded.family}</span>
        <span className="text-[11px] text-gray-500 w-12 shrink-0 text-center">{decoded.fibres}</span>
        <span className="text-[11px] text-gray-500 w-14 shrink-0">{decoded.colour}</span>
        <span className={`text-[11px] font-bold w-12 shrink-0 text-center ${tightness < 30 ? 'text-red-500' : tightness < 60 ? 'text-amber-500' : 'text-emerald-600'}`}>{tightness}%</span>
        <span className="font-mono text-[11px] text-gray-400 flex-1 truncate" title={pattern}>{pattern}</span>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={handleCorrect}
            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${verdict === 'correct' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'}`}>
            ✓
          </button>
          <button onClick={handleWrong}
            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${verdict === 'wrong' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'}`}>
            ✗
          </button>
        </div>
      </div>
      {showEditor && verdict === 'wrong' && (
        <PatternEditor pattern={pattern} exclude={exclude} type={type} name={docName} path={docPath}
          onSaved={() => setShowEditor(false)} />
      )}
    </div>
  )
}

export default function ReviewMatchesPage() {
  const [documentMap, setDocumentMap] = useState(null)
  const [djMapping, setDjMapping] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState('')
  const [typeFilter, setTypeFilter] = useState('TDS')
  const [reviewStates, setReviewStates] = useState(getReviewState())

  useEffect(() => {
    Promise.all([loadDocumentMap(), loadDJMapping()]).then(([docMap, djMap]) => {
      setDocumentMap(docMap)
      setDjMapping(djMap)
      setLoading(false)
    })
  }, [])

  // Group documents by type
  const docsByType = useMemo(() => {
    if (!documentMap) return {}
    const groups = {}
    for (const entry of documentMap) {
      if (entry.type === 'Test Certificate') continue
      const key = entry.name + '||' + entry.path
      if (!groups[key]) groups[key] = { name: entry.name, type: entry.type, path: entry.path, patterns: [], excludes: {} }
      groups[key].patterns.push(entry.pattern)
      if (entry.exclude) groups[key].excludes[entry.pattern] = entry.exclude
    }
    const byType = {}
    for (const doc of Object.values(groups)) {
      if (!byType[doc.type]) byType[doc.type] = []
      byType[doc.type].push(doc)
    }
    for (const type of Object.keys(byType)) {
      byType[type].sort((a, b) => a.name.localeCompare(b.name))
    }
    return byType
  }, [documentMap])

  // All product codes from DJ mapping
  const allCodes = useMemo(() => {
    if (!djMapping) return []
    return [...new Set(Object.values(djMapping))]
  }, [djMapping])

  // Find all codes matching the selected document
  const matchedCodes = useMemo(() => {
    if (!selectedDoc || !documentMap) return []
    const [name, docPath] = selectedDoc.split('||')
    const doc = Object.values(docsByType).flat().find(d => d.name === name && d.path === docPath)
    if (!doc) return []

    const matches = []
    for (const code of allCodes) {
      const stripped = stripSuffix(code.toUpperCase().trim())
      for (const p of doc.patterns) {
        if (!patternMatches(stripped, p)) continue
        // Check excludes
        if (doc.excludes[p]) {
          const ex = Array.isArray(doc.excludes[p]) ? doc.excludes[p] : [doc.excludes[p]]
          if (ex.some(e => patternMatches(stripped, e))) continue
        }
        matches.push({ code, pattern: p, exclude: doc.excludes[p], tightness: tightnessScore(p) })
        break
      }
    }
    matches.sort((a, b) => a.tightness - b.tightness)
    return matches
  }, [selectedDoc, documentMap, allCodes, docsByType])

  const selectedDocInfo = useMemo(() => {
    if (!selectedDoc) return null
    const [name, docPath] = selectedDoc.split('||')
    return Object.values(docsByType).flat().find(d => d.name === name && d.path === docPath)
  }, [selectedDoc, docsByType])

  const handleReview = useCallback((code, verdict) => {
    if (!selectedDocInfo) return
    setReviewState(selectedDocInfo.path, code, verdict)
    setReviewStates(getReviewState())
  }, [selectedDocInfo])

  const docReviewState = selectedDocInfo ? reviewStates[selectedDocInfo.path] || {} : {}
  const reviewedCount = Object.keys(docReviewState).length
  const correctCount = Object.values(docReviewState).filter(v => v === 'correct').length
  const wrongCount = Object.values(docReviewState).filter(v => v === 'wrong').length

  // Per-doc progress for the dropdown
  const docProgress = useMemo(() => {
    const states = getReviewState()
    const progress = {}
    for (const docs of Object.values(docsByType)) {
      for (const doc of docs) {
        const key = doc.name + '||' + doc.path
        const s = states[doc.path] || {}
        const total = Object.keys(s).length
        const wrong = Object.values(s).filter(v => v === 'wrong').length
        progress[key] = { total, wrong }
      }
    }
    return progress
  }, [docsByType, reviewStates])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  const currentDocs = docsByType[typeFilter] || []

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 200px, #F0F4F8 200px)' }}>
      <header className="px-6 pt-5 pb-14">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <div className="flex gap-3">
              <Link to="/audit" className="text-blue-200 hover:text-white text-sm transition-colors">← Audit</Link>
              <Link to="/" className="text-blue-200 hover:text-white text-sm transition-colors">Home</Link>
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold font-heading">Review Matches</h1>
          <p className="text-blue-300 mt-1 text-[14px]">Verify product codes are matched to the correct documents</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 -mt-8 pb-12">
        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">Document Type</label>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setSelectedDoc('') }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="TDS">TDS</option>
                <option value="Stripping">Stripping</option>
                <option value="Installation">Installation</option>
              </select>
            </div>
            <div className="flex-1 min-w-[300px]">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500 block mb-1">Document ({currentDocs.length})</label>
              <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select a document to review...</option>
                {currentDocs.map(doc => {
                  const key = doc.name + '||' + doc.path
                  const p = docProgress[key] || {}
                  const badge = p.total > 0 ? ` [${p.total} reviewed${p.wrong ? ', ' + p.wrong + ' wrong' : ''}]` : ''
                  return <option key={key} value={key}>{doc.name}{badge}</option>
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Selected document */}
        {selectedDocInfo && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Doc header */}
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-heading text-gray-800">{selectedDocInfo.name}</h2>
                  <a href={`${DOC_BASE_URL}${selectedDocInfo.path}`} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs">{decodeURIComponent(selectedDocInfo.path)}</a>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="font-heading font-bold text-gray-500">{matchedCodes.length} codes</span>
                  {reviewedCount > 0 && (
                    <>
                      <span className="font-heading font-bold text-emerald-600">{correctCount} ✓</span>
                      {wrongCount > 0 && <span className="font-heading font-bold text-red-600">{wrongCount} ✗</span>}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {selectedDocInfo.patterns.map((p, i) => (
                  <span key={i} className="font-mono text-[12px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{p}</span>
                ))}
              </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50/50 border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span className="w-56 shrink-0">Code</span>
              <span className="w-20 shrink-0">Family</span>
              <span className="w-12 shrink-0 text-center">Fibres</span>
              <span className="w-14 shrink-0">Colour</span>
              <span className="w-12 shrink-0 text-center">Tight</span>
              <span className="flex-1">Pattern</span>
              <span className="w-20 shrink-0 text-center">Verdict</span>
            </div>

            {/* Code rows */}
            {matchedCodes.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400">
                No product codes in the DJ mapping match this document's patterns
              </div>
            ) : (
              matchedCodes.map(m => (
                <CodeRow
                  key={m.code}
                  code={m.code}
                  pattern={m.pattern}
                  exclude={m.exclude}
                  type={selectedDocInfo.type}
                  docName={selectedDocInfo.name}
                  docPath={selectedDocInfo.path}
                  tightness={m.tightness}
                  reviewState={docReviewState}
                  onReview={handleReview}
                />
              ))
            )}
          </div>
        )}

        {!selectedDoc && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-lg font-heading">Select a document above to start reviewing</p>
            <p className="text-sm mt-2">Codes are sorted by tightness — loosest matches (most likely wrong) appear first</p>
          </div>
        )}
      </main>
    </div>
  )
}
