// AFL Product Code Document Map
// Loads pattern→document mappings from /data/document-map.json at runtime
// Patterns use wildcards: any non-alphanumeric character matches any position

// Base URL for document hosting.
// Set VITE_DOC_BASE_URL in Vercel env vars to point at Azure Blob, S3, etc.
// Default: relative /docs/ path (served from public/docs/ by Vite)
const DOC_BASE_URL = import.meta.env.VITE_DOC_BASE_URL || '/docs'

// ============================================================================
// DOCUMENT MAP — runtime-loaded from JSON
// ============================================================================

let _documentMapCache = null

/**
 * Load the document map from the JSON file.
 * Call this once at app startup (e.g. in App.jsx).
 * Subsequent calls return the cached data.
 */
export async function loadDocumentMap() {
  if (_documentMapCache) return _documentMapCache

  const res = await fetch(`/api/document-map?_t=${Date.now()}`)
  const { entries } = await res.json()

  // Convert relative paths to full URLs with DOC_BASE_URL
  _documentMapCache = entries.map(e => ({
    ...e,
    url: `${DOC_BASE_URL}${e.path}`,
  }))

  return _documentMapCache
}

/**
 * Get the cached document map synchronously.
 * Returns empty array if loadDocumentMap() hasn't been called yet.
 */
export function getDocumentMap() {
  return _documentMapCache || []
}

// Test helper: inject a document map without fetching
export function _setDocumentMapCache(entries) {
  _documentMapCache = entries
}

/**
 * Clear the cached document map so the next loadDocumentMap() call re-fetches.
 * Also accepts an optional new value to set directly (for optimistic updates).
 */
export function invalidateDocumentMapCache(newEntries) {
  if (newEntries) {
    _documentMapCache = newEntries
  } else {
    _documentMapCache = null
  }
}

// ============================================================================
// PATTERN MATCHING
// ============================================================================

// Defaults for admin-editable config. Used as a fallback if /api/config fails,
// so pattern matching keeps working even if the config blob is missing.
export const DEFAULT_SAFE_SUFFIXES = ['FP', 'ESS', 'SH2', 'ANT', 'TMC']
export const DEFAULT_CUSTOMER_SUFFIXES = ['SYDT', 'TMR', 'AG', 'SIE', 'FLH', 'EM']

let _safeSuffixes = [...DEFAULT_SAFE_SUFFIXES]
let _customerSuffixes = [...DEFAULT_CUSTOMER_SUFFIXES]

function escapeSuffixAtom(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSuffixRegex(list) {
  if (!list || list.length === 0) return /(?!)/ // matches nothing
  const alts = list.map(escapeSuffixAtom).join('|')
  return new RegExp(`(?:-(?:${alts}))+$`, 'i')
}

/**
 * Strip ALL known suffixes from a product code (for decode, cert upload, etc.)
 */
export function stripSuffix(code) {
  return code.replace(buildSuffixRegex(_safeSuffixes), '').replace(buildSuffixRegex(_customerSuffixes), '')
}

/**
 * Check if a code has a customer-specific suffix.
 * Strips safe suffixes first so double-suffix codes like -SYDT-FP are handled.
 * Returns the suffix (e.g. "-SYDT") or null.
 */
export function getCustomerSuffix(code) {
  const withoutSafe = code.replace(buildSuffixRegex(_safeSuffixes), '')
  const match = withoutSafe.match(buildSuffixRegex(_customerSuffixes))
  return match ? match[0] : null
}

/**
 * Check if a character is alphanumeric (A-Z, a-z, 0-9).
 * Non-alphanumeric characters in patterns act as wildcards.
 */
function isAlphanumeric(ch) {
  const code = ch.charCodeAt(0)
  return (code >= 65 && code <= 90) ||  // A-Z
         (code >= 97 && code <= 122) ||  // a-z
         (code >= 48 && code <= 57)      // 0-9
}

/**
 * Match a product code against a pattern.
 * Non-alphanumeric characters in the pattern are wildcards (match anything).
 * If the code is longer than the pattern, extra characters are treated as wildcards.
 * If the code is shorter than the pattern, no match.
 * Comparison is case-insensitive.
 */
export function patternMatches(code, pattern) {
  if (code.length < pattern.length) return false

  for (let i = 0; i < pattern.length; i++) {
    const pc = pattern[i]
    if (!isAlphanumeric(pc)) continue // wildcard
    if (pc.toUpperCase() !== code[i].toUpperCase()) return false
  }
  // Extra chars beyond pattern length are accepted (wildcard)
  return true
}

/**
 * Find all matching documents for a product code.
 * Returns first match per type for primary types (TDS, Stripping),
 * plus ALL Installation matches and any additional matches as "Other".
 * Note: Standard Test Certificates (pattern-matched) are excluded from results.
 * Final Test Certificates are added separately in DJDocumentPage.
 */
export function findDocuments(productCode) {
  const raw = productCode.toUpperCase().trim()
  const baseCode = stripSuffix(raw)
  const customerSuffix = getCustomerSuffix(raw)
  // Code with only safe suffixes stripped (keeps customer suffix for TDS matching)
  const codeForTDS = customerSuffix ? raw.replace(buildSuffixRegex(_safeSuffixes), '') : baseCode

  if (baseCode.length < 1) return []

  const map = getDocumentMap()
  const customTypeSet = new Set(_customDocTypes.map(t => t.id))

  const found = {
    TDS: null,
    Stripping: null,
  }
  const installationDocs = []
  const customTypeDocs = []
  const otherDocs = []

  for (const entry of map) {
    if (entry.type === 'Test Certificate') continue // hidden for now

    // For customer suffix codes: TDS only matches if the pattern explicitly
    // covers the suffix (i.e. pattern length >= full code length).
    // Standard TDS patterns (13 chars) won't match the longer suffixed code.
    // Stripping & Installation always use the base code.
    let matchCode
    if (entry.type === 'TDS' && customerSuffix) {
      matchCode = codeForTDS
      // Require the pattern to be long enough to cover the suffix
      if (entry.pattern.length < matchCode.length) continue
    } else {
      matchCode = entry.type === 'TDS' ? codeForTDS : baseCode
    }

    if (!patternMatches(matchCode, entry.pattern)) continue
    if (entry.exclude) {
      const excludes = Array.isArray(entry.exclude) ? entry.exclude : [entry.exclude]
      if (excludes.some(ex => patternMatches(matchCode, ex))) continue
    }

    if (entry.type === 'Installation' || entry.type === 'Storage & Handling') {
      installationDocs.push({ ...entry })
    } else if (customTypeSet.has(entry.type)) {
      customTypeDocs.push({ ...entry })
    } else if (found[entry.type] === undefined) {
      otherDocs.push({ ...entry })
    } else if (found[entry.type] === null) {
      found[entry.type] = { ...entry }
    }
    // skip duplicates of already-found primary types
  }

  // For customer suffix codes with no customer-specific TDS: show nothing
  // (don't fall back to standard TDS — it doesn't apply)
  if (customerSuffix && found.TDS === null) {
    // TDS stays null — intentional gap
  }

  const results = []
  if (found.Stripping) results.push(found.Stripping)
  if (found.TDS) results.push(found.TDS)
  results.push(...installationDocs)
  results.push(...customTypeDocs)
  results.push(...otherDocs)

  return results
}

// ============================================================================
// PRODUCT CODE DECODE TABLES
// ============================================================================

const familyDecode = {
  L: 'Loose Tube',
  N: 'Non-Metallic Armour',
  R: 'FRP Flat Rod Armour',
  U: 'Microcore',
  T: 'Tight Buffer / Premise',
  S: 'Aerial (ADSS)',
}

const looseTubeFibresPerTube = {
  K: '6 Fibres/Tube',
  P: '8 Fibres/Tube',
  M: '12 Fibres/Tube',
  T: '24 Fibres/Tube',
  Q: 'Axial Tube (Std Strength)',
  L: 'Axial Tube (Light Strength)',
}

const premiseCoreType = {
  V: 'Indoor/Outdoor Premise (New)',
  W: 'Indoor/Outdoor Premise',
}

const adssFibresPerTube = {
  K: '6 Fibres Per Tube',
  M: '12 Fibres Per Tube',
  T: '24 Fibres Per Tube',
}

const looseTubeConstruction = {
  B: 'LSZH',
  C: 'PE',
  D: 'PE/Nylon',
  E: 'Nylon',
  F: 'Nylon/PE',
  H: 'PE/Nylon/Sacrificial Jacket',
  J: 'PE/Nylon (HS1)',
  K: 'PE/Nylon/PE (HS1)',
  N: 'Nylon/Thin PE (Microcore)',
}

const premiseOuterJacket = {
  A: 'PVC',
  B: 'LSZH',
}

const adssConstruction = {
  M: 'Aramid/PE',
  J: 'PE/Aramid/PE',
  N: 'Aramid/TR-PE',
  T: 'PE/Aramid/TR-PE',
  K: 'PE/FRP/PE',
  8: 'NY/Aramid/PE',
  9: 'NY/Aramid/TR-PE',
}

const looseTubeCoreStructure = {
  1: '1 Axial Tube (No CSM)',
  6: '6 Tubes Around CSM',
  8: '8 Tubes Around CSM',
  A: '10 Tubes Around CSM',
  C: '12 Tubes Around CSM',
  I: '18 Tubes Around CSM (Dual Layer)',
  O: '24 Tubes Around CSM (Dual Layer)',
  Q: '26 Tubes Around CSM (Dual Layer)',
}

const premiseTightBuffer = {
  Q: '900um LSZH',
  P: '900um PVC',
}

const adssCoreStructure = {
  4: '4 Tubes Around CSM',
  5: '5 Tubes Around CSM',
  6: '6 Tubes Around CSM',
  8: '8 Tubes Around CSM',
  C: '12 Tubes Around CSM',
}

const fibreType = {
  '1D': 'SM G.652.D',
  '1E': 'SM Premium Low Loss G.652.D',
  '1F': 'SM Bend Insensitive G.657.A1',
  '53': 'OM3',
  '55': 'OM4',
  '62': 'OM1',
  'D6': 'SM G.652.D + OM1',
  'D3': 'SM G.652.D + OM3',
  'D5': 'SM G.652.D + OM4',
}

const looseTubeTubeSize = {
  P: '2mm (Max 12F/Tube)',
  F: '2.3mm (Max 24F/Tube)',
  L: '2.7mm (Max 24F/Tube)',
  E: '3.2mm (Max 24F/Tube)',
  J: '3.2mm HS1 (Max 12F/Tube)',
}

const premiseSubUnit = {
  A: 'Standard (No Sub-Units)',
}

const adssTubeSize = {
  P: '2mm (Max 12F/Tube)',
  L: '2.7mm (Max 24F/Tube)',
}

const looseTubeVariation = {
  A: 'Standard',
  B: 'Nylon Only / PE Coloured Sacrificial',
  M: 'LSZH Outer Jacket',
  F: 'Additional Outer Nylon Jacket',
  D: 'Additional Thin PE Outer Jacket (Microcore)',
  L: 'MDPE',
}

const jacketColour = {
  BE: 'Blue',
  GY: 'Grey',
  WE: 'White',
  RD: 'Red',
  BK: 'Black',
  YW: 'Yellow',
  OE: 'Orange',
  GN: 'Green',
  BN: 'Brown',
  VT: 'Violet',
  PK: 'Pink',
  AQ: 'Aqua',
  EV: 'Erica Violet',
}

/**
 * Decode a 13-character AFL product code into human-readable fields.
 * Returns an array of { label, positions, code, description } objects.
 */
export function decodeProductCode(productCode) {
  const code = stripSuffix(productCode.toUpperCase().trim())
  if (code.length !== 13) return []

  const family = code[0]
  const result = []

  const lookup = (table, key) => table[key] || `${key} (Unknown)`

  // Position 1: Product Family
  result.push({
    label: 'Product Family',
    positions: '1',
    code: code[0],
    description: lookup(familyDecode, code[0]),
  })

  if (family === 'T') {
    // Premise decode
    result.push({ label: 'Core Type', positions: '2', code: code[1], description: lookup(premiseCoreType, code[1]) })
    result.push({ label: 'Outer Jacket', positions: '3', code: code[2], description: lookup(premiseOuterJacket, code[2]) })
    result.push({ label: 'Tight Buffer', positions: '4', code: code[3], description: lookup(premiseTightBuffer, code[3]) })
    result.push({ label: 'Fibre Type', positions: '5-6', code: code.slice(4, 6), description: lookup(fibreType, code.slice(4, 6)) })
    result.push({ label: 'Sub-Unit', positions: '7', code: code[6], description: lookup(premiseSubUnit, code[6]) })
    result.push({ label: 'Construction', positions: '8', code: code[7], description: 'Standard' })
  } else if (family === 'S') {
    // ADSS decode
    result.push({ label: 'Fibres Per Tube', positions: '2', code: code[1], description: lookup(adssFibresPerTube, code[1]) })
    result.push({ label: 'Cable Construction', positions: '3', code: code[2], description: lookup(adssConstruction, code[2]) })
    result.push({ label: 'Core Structure', positions: '4', code: code[3], description: lookup(adssCoreStructure, code[3]) })
    result.push({ label: 'Fibre Type', positions: '5-6', code: code.slice(4, 6), description: lookup(fibreType, code.slice(4, 6)) })
    result.push({ label: 'Tube Size', positions: '7', code: code[6], description: lookup(adssTubeSize, code[6]) })
    result.push({ label: 'ADSS Strength', positions: '8', code: code[7], description: `Strength Code: ${code[7]}` })
  } else {
    // Loose Tube (L, N, R, U)
    result.push({ label: 'Fibres Per Tube', positions: '2', code: code[1], description: lookup(looseTubeFibresPerTube, code[1]) })
    result.push({ label: 'Cable Construction', positions: '3', code: code[2], description: lookup(looseTubeConstruction, code[2]) })
    result.push({ label: 'Core Structure', positions: '4', code: code[3], description: lookup(looseTubeCoreStructure, code[3]) })
    result.push({ label: 'Fibre Type', positions: '5-6', code: code.slice(4, 6), description: lookup(fibreType, code.slice(4, 6)) })
    result.push({ label: 'Tube Size', positions: '7', code: code[6], description: lookup(looseTubeTubeSize, code[6]) })
    result.push({ label: 'Construction Variation', positions: '8', code: code[7], description: lookup(looseTubeVariation, code[7]) })
  }

  // Positions 9-11: Fibre Count (shared)
  const fibreCount = parseInt(code.slice(8, 11), 10)
  result.push({
    label: 'Fibre Count',
    positions: '9-11',
    code: code.slice(8, 11),
    description: `${fibreCount} Fibres`,
  })

  // Positions 12-13: Jacket Colour (shared)
  result.push({
    label: 'Jacket Colour',
    positions: '12-13',
    code: code.slice(11, 13),
    description: lookup(jacketColour, code.slice(11, 13)),
  })

  return result
}

// ============================================================================
// DOCUMENT TYPE METADATA (icons, colors)
// ============================================================================

// Built-in types have special handling in findDocuments() and cannot be
// removed via the admin UI. Custom types (added by admins) get merged in
// at runtime by setAppConfig().
export const BUILT_IN_DOC_TYPES = {
  TDS: { label: 'Technical Data Sheet', color: '#004282', abbr: 'TDS', builtIn: true },
  Stripping: { label: 'Stripping Instructions', color: '#004282', abbr: 'STRIP', builtIn: true },
  'Test Certificate': { label: 'Test Certificate', color: '#004282', abbr: 'CERT', builtIn: true },
  'Final Test Certificate': { label: 'Test Certificate', color: '#004282', abbr: 'FTC', builtIn: true },
  Installation: { label: 'Installation Guide', color: '#004282', abbr: 'INST', builtIn: true },
  'Storage & Handling': { label: 'Storage & Handling', color: '#004282', abbr: 'S&H', builtIn: true },
  Other: { label: 'Other Document', color: '#004282', abbr: 'DOC', builtIn: true },
}

// Mutable registry — consumers import this reference and read from it.
// setAppConfig() mutates in place so new keys appear without a reload.
export const docTypeInfo = { ...BUILT_IN_DOC_TYPES }

let _customDocTypes = []

/**
 * List of custom (admin-added) doc type IDs, in display order.
 * Used by findDocuments to group custom-type matches together, after built-ins.
 */
export function getCustomDocTypeIds() {
  return _customDocTypes.map(t => t.id)
}

/**
 * Inject config from /api/config (or local fallback). Mutates module-level
 * state so existing consumers of stripSuffix / docTypeInfo pick up changes
 * without re-importing.
 */
export function setAppConfig({ safeSuffixes, customerSuffixes, customDocTypes } = {}) {
  if (Array.isArray(safeSuffixes)) {
    _safeSuffixes = safeSuffixes.map(s => String(s).toUpperCase())
  }
  if (Array.isArray(customerSuffixes)) {
    _customerSuffixes = customerSuffixes.map(s => String(s).toUpperCase())
  }
  if (Array.isArray(customDocTypes)) {
    // Remove any stale custom types from the shared registry before adding new ones
    for (const prev of _customDocTypes) {
      if (!BUILT_IN_DOC_TYPES[prev.id]) delete docTypeInfo[prev.id]
    }
    _customDocTypes = customDocTypes
    for (const t of customDocTypes) {
      if (BUILT_IN_DOC_TYPES[t.id]) continue // built-ins win
      docTypeInfo[t.id] = {
        label: t.label,
        color: t.color || '#004282',
        abbr: t.abbr || t.id.slice(0, 4).toUpperCase(),
        builtIn: false,
      }
    }
  }
}

let _configCache = null

/**
 * Load admin-editable config (suffix lists + custom doc types) from the API.
 * Safe to call multiple times; results are cached.
 * On failure, falls back to defaults (already loaded at module init).
 */
export async function loadAppConfig() {
  if (_configCache) return _configCache
  try {
    const res = await fetch(`/api/config?_t=${Date.now()}`)
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`)
    const data = await res.json()
    setAppConfig(data)
    _configCache = data
    return data
  } catch (err) {
    console.warn('[documentMap] loadAppConfig failed, using defaults:', err.message)
    const fallback = {
      safeSuffixes: DEFAULT_SAFE_SUFFIXES,
      customerSuffixes: DEFAULT_CUSTOMER_SUFFIXES,
      customDocTypes: [],
    }
    _configCache = fallback
    return fallback
  }
}

export function invalidateAppConfigCache(newConfig) {
  if (newConfig) {
    setAppConfig(newConfig)
    _configCache = newConfig
  } else {
    _configCache = null
  }
}
