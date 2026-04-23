import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchAppConfig, saveAppConfig } from '../lib/adminApi'
import { invalidateAppConfigCache, BUILT_IN_DOC_TYPES } from '../data/documentMap'

const SUFFIX_RE = /^[A-Z0-9]{1,10}$/
const TYPE_ID_RE = /^[a-z][a-z0-9-]{2,30}$/
const ABBR_RE = /^[A-Z0-9&]{1,5}$/

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

export default function AdminConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [flash, setFlash] = useState(null)

  const [safe, setSafe] = useState([])
  const [customer, setCustomer] = useState([])
  const [customTypes, setCustomTypes] = useState([])
  const [original, setOriginal] = useState(null)

  useEffect(() => {
    fetchAppConfig()
      .then(cfg => {
        setSafe(cfg.safeSuffixes || [])
        setCustomer(cfg.customerSuffixes || [])
        setCustomTypes(cfg.customDocTypes || [])
        setOriginal(JSON.stringify({
          safeSuffixes: cfg.safeSuffixes || [],
          customerSuffixes: cfg.customerSuffixes || [],
          customDocTypes: cfg.customDocTypes || [],
        }))
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const currentState = JSON.stringify({
    safeSuffixes: safe,
    customerSuffixes: customer,
    customDocTypes: customTypes,
  })
  const dirty = original !== null && original !== currentState

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setFlash(null)
    try {
      const payload = { safeSuffixes: safe, customerSuffixes: customer, customDocTypes: customTypes }
      const { config } = await saveAppConfig(payload)
      invalidateAppConfigCache(config)
      setSafe(config.safeSuffixes)
      setCustomer(config.customerSuffixes)
      setCustomTypes(config.customDocTypes)
      setOriginal(JSON.stringify(config))
      setFlash('Saved. Customer-facing pages will pick up changes on next load.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    if (!original) return
    const cfg = JSON.parse(original)
    setSafe(cfg.safeSuffixes)
    setCustomer(cfg.customerSuffixes)
    setCustomTypes(cfg.customDocTypes)
    setError(null)
    setFlash(null)
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #004282 0%, #004282 200px, #F7F8FA 200px)' }}>
      <header className="px-6 pt-5 pb-14">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="logo-dark-bg"><img src="/afl-logo.png" alt="AFL" className="h-9 w-auto" /></div>
              <div className="border-l border-white/20 pl-4">
                <h1 className="text-lg font-bold text-white font-heading">App Configuration</h1>
                <p className="text-blue-300 text-sm">Suffixes and document type categories</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">Home</Link>
              <Link to="/admin" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-8 pb-12 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}
        {flash && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-sm text-green-800">
            {flash}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-6 text-afl-muted text-sm">
            Loading configuration...
          </div>
        ) : (
          <>
            <SuffixSection
              title="Safe suffixes"
              list={safe}
              onChange={setSafe}
              otherList={customer}
              otherLabel="customer suffixes"
              helpText={
                <>
                  <p className="mb-2"><strong>What this does:</strong> A safe suffix is a tag at the end of a product code that means <em>&ldquo;same cable, same documents&rdquo;</em>. Examples: <code>-FP</code>, <code>-ESS</code>.</p>
                  <p className="mb-2">When the app sees <code>LMB1DF24COBK-FP</code>, it looks up documents as if the code were <code>LMB1DF24COBK</code>. The <code>-FP</code> is ignored.</p>
                  <p className="mb-0"><strong>When to add one:</strong> A new manufacturing variant or tag is introduced that doesn&apos;t change which docs apply. If the new variant should have its own TDS, add it to <strong>Customer suffixes</strong> instead.</p>
                </>
              }
            />

            <SuffixSection
              title="Customer suffixes"
              list={customer}
              onChange={setCustomer}
              otherList={safe}
              otherLabel="safe suffixes"
              helpText={
                <>
                  <p className="mb-2"><strong>What this does:</strong> A customer suffix identifies a customer-specific cable. Example: <code>-SYDT</code> (Sydney Trains).</p>
                  <p className="mb-2">Customer suffixes change how docs are matched:</p>
                  <ul className="list-disc list-inside mb-2 space-y-1">
                    <li><strong>TDS</strong> — the app looks for a TDS pattern that explicitly covers the suffix. If none exists, no TDS is shown (rather than falling back to the standard one, which doesn&apos;t apply).</li>
                    <li><strong>Stripping &amp; Installation</strong> — unchanged, same as the base cable.</li>
                  </ul>
                  <p className="mb-0"><strong>Before you add one:</strong> upload the customer-specific TDS to the doc-map with a pattern that includes the suffix (e.g. <code>LMB1D*****BK-NEWCUST</code>). Adding the suffix first will show no TDS until the matching pattern is added.</p>
                </>
              }
            />

            <CustomTypesSection types={customTypes} onChange={setCustomTypes} />

            <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="px-4 py-2 rounded-lg bg-afl-navy text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-afl-cyan transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={!dirty || saving}
                className="px-4 py-2 rounded-lg border border-afl-border text-sm font-semibold disabled:opacity-40 hover:bg-afl-light transition-colors"
              >
                Discard
              </button>
              {!dirty && <span className="text-afl-muted text-xs ml-auto">No unsaved changes.</span>}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function SuffixSection({ title, list, onChange, otherList, otherLabel, helpText }) {
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState(null)

  const add = () => {
    const val = input.toUpperCase().trim()
    if (!val) return
    if (!SUFFIX_RE.test(val)) { setInputError('1-10 letters or digits only (no dashes).'); return }
    if (list.includes(val)) { setInputError(`"${val}" is already in this list.`); return }
    if (otherList.includes(val)) { setInputError(`"${val}" is in the ${otherLabel} list. Remove it there first.`); return }
    onChange([...list, val])
    setInput('')
    setInputError(null)
  }

  const remove = (val) => {
    if (!confirm(`Remove "-${val}"?\n\nProduct codes ending with -${val} will no longer be matched as ${title.toLowerCase()}.`)) return
    onChange(list.filter(s => s !== val))
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-afl-border overflow-hidden">
      <div className="p-5 border-b border-afl-border">
        <h2 className="text-[14px] font-bold text-afl-text font-heading mb-2">{title}</h2>
        <div className="text-[13px] text-afl-muted leading-relaxed">{helpText}</div>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {list.length === 0 && <span className="text-afl-muted text-xs italic">No {title.toLowerCase()} configured.</span>}
          {list.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-2 rounded-lg bg-afl-light border border-afl-border px-3 py-1.5 font-mono text-xs font-semibold"
            >
              -{val}
              <button
                type="button"
                onClick={() => remove(val)}
                className="text-afl-muted hover:text-red-600 transition-colors"
                aria-label={`Remove ${val}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-afl-muted text-xs font-mono">-</span>
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setInputError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder="NEW"
            className="flex-1 max-w-[200px] px-3 py-2 border border-afl-border rounded-lg font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
          />
          <button
            type="button"
            onClick={add}
            className="px-3 py-2 rounded-lg bg-afl-navy text-white text-xs font-bold hover:bg-afl-cyan transition-colors"
          >
            Add
          </button>
        </div>
        {inputError && <p className="text-red-600 text-xs mt-2">{inputError}</p>}
      </div>
    </div>
  )
}

function CustomTypesSection({ types, onChange }) {
  const [editing, setEditing] = useState(null) // null | 'new' | typeId
  const [draft, setDraft] = useState({ id: '', label: '', abbr: '', color: '#004282' })
  const [draftError, setDraftError] = useState(null)
  const [idManuallyEdited, setIdManuallyEdited] = useState(false)

  const openNew = () => {
    setEditing('new')
    setDraft({ id: '', label: '', abbr: '', color: '#004282' })
    setDraftError(null)
    setIdManuallyEdited(false)
  }

  const openEdit = (t) => {
    setEditing(t.id)
    setDraft({ id: t.id, label: t.label, abbr: t.abbr, color: t.color || '#004282' })
    setDraftError(null)
    setIdManuallyEdited(true)
  }

  const close = () => {
    setEditing(null)
    setDraftError(null)
  }

  const save = () => {
    const id = draft.id.trim()
    const label = draft.label.trim()
    const abbr = draft.abbr.toUpperCase().trim()

    if (!label) { setDraftError('Label is required.'); return }
    if (!TYPE_ID_RE.test(id)) { setDraftError('ID must be 3-31 chars: lowercase letters, digits, hyphens; must start with a letter.'); return }
    if (BUILT_IN_DOC_TYPES[id]) { setDraftError(`"${id}" is reserved as a built-in type.`); return }
    if (!ABBR_RE.test(abbr)) { setDraftError('Abbr must be 1-5 uppercase letters, digits, or &.'); return }
    const duplicate = types.some(t => t.id === id && editing !== t.id)
    if (duplicate) { setDraftError(`A type with ID "${id}" already exists.`); return }

    const next = editing === 'new'
      ? [...types, { id, label, abbr, color: draft.color }]
      : types.map(t => t.id === editing ? { id, label, abbr, color: draft.color } : t)
    onChange(next)
    close()
  }

  const remove = (t) => {
    if (!confirm(`Delete custom type "${t.label}"?\n\nIf any doc-map patterns still use this type, the save will be rejected.`)) return
    onChange(types.filter(x => x.id !== t.id))
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-afl-border overflow-hidden">
      <div className="p-5 border-b border-afl-border">
        <h2 className="text-[14px] font-bold text-afl-text font-heading mb-2">Custom document types</h2>
        <div className="text-[13px] text-afl-muted leading-relaxed">
          <p className="mb-2"><strong>What this does:</strong> every document in the doc-map has a type (TDS, Stripping, Installation, etc.). Built-in types have special handling. Custom types are simpler — any doc with a custom type appears as its own card on the customer page, using the label and colour you set here.</p>
          <p className="mb-2"><strong>Use a custom type</strong> for a new category that doesn&apos;t fit an existing one — e.g. <em>Optical Characteristics</em>, <em>Environmental Test Data</em>.</p>
          <p className="mb-0"><strong>Before deleting:</strong> remove or reassign any doc-map patterns using the type, otherwise the save will be blocked.</p>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-2">Built-in (read-only)</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BUILT_IN_DOC_TYPES).map(([id, info]) => (
              <span key={id} className="inline-flex items-center gap-2 rounded-lg bg-afl-light border border-afl-border px-3 py-1.5 text-xs">
                <span className="font-mono font-bold text-afl-navy">{info.abbr}</span>
                <span className="text-afl-muted">{info.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-2">Custom</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {types.length === 0 && <span className="text-afl-muted text-xs italic">No custom types yet.</span>}
            {types.map(t => (
              <span key={t.id} className="inline-flex items-center gap-2 rounded-lg border border-afl-border px-3 py-1.5 text-xs" style={{ backgroundColor: `${t.color}10` }}>
                <span className="font-mono font-bold" style={{ color: t.color }}>{t.abbr}</span>
                <span className="text-afl-text">{t.label}</span>
                <button type="button" onClick={() => openEdit(t)} className="text-afl-muted hover:text-afl-cyan transition-colors" aria-label={`Edit ${t.label}`}>edit</button>
                <button type="button" onClick={() => remove(t)} className="text-afl-muted hover:text-red-600 transition-colors" aria-label={`Remove ${t.label}`}>×</button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={openNew}
            className="px-3 py-2 rounded-lg border border-afl-border text-xs font-semibold hover:bg-afl-light transition-colors"
          >
            + Add custom type
          </button>
        </div>

        {editing && (
          <div className="mt-5 border-t border-afl-border pt-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading mb-3">
              {editing === 'new' ? 'New custom type' : `Edit "${editing}"`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-afl-muted">Label</span>
                <input
                  type="text"
                  value={draft.label}
                  onChange={e => {
                    const label = e.target.value
                    setDraft(d => ({
                      ...d,
                      label,
                      id: editing === 'new' && !idManuallyEdited ? slugify(label) : d.id,
                    }))
                  }}
                  placeholder="e.g. Optical Characteristics"
                  className="w-full mt-1 px-3 py-2 border border-afl-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-afl-muted">ID (slug)</span>
                <input
                  type="text"
                  value={draft.id}
                  onChange={e => { setDraft(d => ({ ...d, id: e.target.value })); setIdManuallyEdited(true) }}
                  disabled={editing !== 'new'}
                  placeholder="optical-characteristics"
                  className="w-full mt-1 px-3 py-2 border border-afl-border rounded-lg font-mono text-sm disabled:bg-afl-light disabled:text-afl-muted focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-afl-muted">Abbr (1-5 chars)</span>
                <input
                  type="text"
                  value={draft.abbr}
                  onChange={e => setDraft(d => ({ ...d, abbr: e.target.value.toUpperCase() }))}
                  placeholder="OPT"
                  className="w-full mt-1 px-3 py-2 border border-afl-border rounded-lg font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-afl-muted">Colour</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                    className="w-10 h-10 rounded border border-afl-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft.color}
                    onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-afl-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent"
                  />
                </div>
              </label>
            </div>
            {draftError && <p className="text-red-600 text-xs mt-2">{draftError}</p>}
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={save} className="px-3 py-2 rounded-lg bg-afl-navy text-white text-xs font-bold hover:bg-afl-cyan transition-colors">
                {editing === 'new' ? 'Add type' : 'Update type'}
              </button>
              <button type="button" onClick={close} className="px-3 py-2 rounded-lg border border-afl-border text-xs font-semibold hover:bg-afl-light transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
