// Admin-editable app config: suffix lists + custom document types.
// GET  /api/config          → public, returns current config
// PUT  /api/config          → admin, replaces config

import { requireAdmin } from './lib/auth.js'
import { readJSON, writeJSON, appendAuditLog } from './lib/blob-storage.js'

const BLOB_PATH = 'data/config.json'

const DEFAULT_CONFIG = {
  safeSuffixes: ['FP', 'ESS', 'SH2', 'ANT', 'TMC'],
  customerSuffixes: ['SYDT', 'TMR', 'AG', 'SIE', 'FLH', 'EM'],
  customDocTypes: [],
}

const RESERVED_TYPE_IDS = new Set([
  'TDS', 'Stripping', 'Test Certificate', 'Final Test Certificate',
  'Installation', 'Storage & Handling', 'Other',
])

const SUFFIX_RE = /^[A-Z0-9]{1,10}$/
const TYPE_ID_RE = /^[a-z][a-z0-9-]{2,30}$/
const ABBR_RE = /^[A-Z0-9&]{1,5}$/
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/

function validateConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return 'Config must be an object'

  const safe = cfg.safeSuffixes
  const cust = cfg.customerSuffixes
  if (!Array.isArray(safe)) return 'safeSuffixes must be an array'
  if (!Array.isArray(cust)) return 'customerSuffixes must be an array'

  const safeUp = safe.map(s => String(s).toUpperCase().trim())
  const custUp = cust.map(s => String(s).toUpperCase().trim())

  for (const s of safeUp) {
    if (!SUFFIX_RE.test(s)) return `Invalid safe suffix: "${s}" (must be 1-10 alphanumeric chars)`
  }
  for (const s of custUp) {
    if (!SUFFIX_RE.test(s)) return `Invalid customer suffix: "${s}" (must be 1-10 alphanumeric chars)`
  }
  if (new Set(safeUp).size !== safeUp.length) return 'Duplicate safe suffix'
  if (new Set(custUp).size !== custUp.length) return 'Duplicate customer suffix'
  const overlap = safeUp.filter(s => custUp.includes(s))
  if (overlap.length) return `Suffix "${overlap[0]}" cannot be both safe and customer — pick one`

  const types = cfg.customDocTypes
  if (types != null && !Array.isArray(types)) return 'customDocTypes must be an array'
  if (Array.isArray(types)) {
    const ids = new Set()
    for (const t of types) {
      if (!t || typeof t !== 'object') return 'Each custom doc type must be an object'
      if (typeof t.id !== 'string' || !TYPE_ID_RE.test(t.id)) {
        return `Invalid doc type id: "${t.id}" (lowercase letters, digits, hyphens; 3-31 chars; must start with a letter)`
      }
      if (RESERVED_TYPE_IDS.has(t.id)) return `Doc type id "${t.id}" is reserved`
      if (ids.has(t.id)) return `Duplicate doc type id: "${t.id}"`
      ids.add(t.id)
      if (typeof t.label !== 'string' || !t.label.trim() || t.label.length > 50) {
        return `Invalid label for "${t.id}" (required, max 50 chars)`
      }
      if (typeof t.abbr !== 'string' || !ABBR_RE.test(t.abbr)) {
        return `Invalid abbr for "${t.id}" (1-5 uppercase letters, digits, or &)`
      }
      if (t.color != null && !COLOR_RE.test(t.color)) {
        return `Invalid color for "${t.id}" (must be hex like #004282)`
      }
    }
  }

  return null
}

function cleanConfig(cfg) {
  return {
    safeSuffixes: cfg.safeSuffixes.map(s => String(s).toUpperCase().trim()),
    customerSuffixes: cfg.customerSuffixes.map(s => String(s).toUpperCase().trim()),
    customDocTypes: Array.isArray(cfg.customDocTypes)
      ? cfg.customDocTypes.map(t => ({
          id: t.id,
          label: t.label.trim(),
          abbr: t.abbr.toUpperCase(),
          color: t.color || '#004282',
        }))
      : [],
  }
}

async function docMapUsesType(typeId) {
  const { data: entries } = await readJSON('data/document-map.json', [])
  return entries.filter(e => e.type === typeId).map(e => ({ pattern: e.pattern, name: e.name }))
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    if (req.method === 'GET') {
      const { data } = await readJSON(BLOB_PATH, DEFAULT_CONFIG)
      return res.json({
        safeSuffixes: data.safeSuffixes || DEFAULT_CONFIG.safeSuffixes,
        customerSuffixes: data.customerSuffixes || DEFAULT_CONFIG.customerSuffixes,
        customDocTypes: data.customDocTypes || [],
        authMode: process.env.AUTH_MODE === 'entra' ? 'entra' : 'password',
      })
    }

    try { requireAdmin(req) } catch (err) {
      return res.status(err.status || 500).json({ error: err.message })
    }

    if (req.method === 'PUT') {
      const body = req.body || {}
      const err = validateConfig(body)
      if (err) return res.status(400).json({ error: err })

      const cleaned = cleanConfig(body)

      // Block deletion of a custom doc type that's still in use by doc-map entries
      const { data: existing } = await readJSON(BLOB_PATH, DEFAULT_CONFIG)
      const existingTypes = new Set((existing.customDocTypes || []).map(t => t.id))
      const keptTypes = new Set(cleaned.customDocTypes.map(t => t.id))
      const removedTypes = [...existingTypes].filter(id => !keptTypes.has(id))
      for (const id of removedTypes) {
        const users = await docMapUsesType(id)
        if (users.length) {
          return res.status(409).json({
            error: `Cannot delete doc type "${id}" — ${users.length} doc-map pattern(s) still use it. Reassign or delete those patterns first.`,
            blockedBy: users.slice(0, 10),
          })
        }
      }

      await writeJSON(BLOB_PATH, cleaned)
      appendAuditLog({ actor: req.user?.email || 'unknown', action: 'config.update', config: cleaned })

      return res.json({ success: true, config: cleaned, message: 'Configuration saved.' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Config API error:', err)
    const msg = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production' ? 'Internal server error' : err.message
    return res.status(500).json({ error: msg })
  }
}
