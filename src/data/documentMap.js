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
 * Match a 13-character product code against a 13-character pattern.
 * Non-alphanumeric characters in the pattern are wildcards (match anything).
 * Comparison is case-insensitive.
 */
export function patternMatches(code, pattern) {
  if (code.length !== 13 || pattern.length !== 13) return false

  for (let i = 0; i < 13; i++) {
    const pc = pattern[i]
    if (!isAlphanumeric(pc)) continue // wildcard
    if (pc.toUpperCase() !== code[i].toUpperCase()) return false
  }
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
  const code = productCode.toUpperCase().trim()
  if (code.length !== 13) return []

  const map = getDocumentMap()

  const found = {
    TDS: null,
    Stripping: null,
  }
  const installationDocs = []
  const otherDocs = []

  for (const entry of map) {
    if (!patternMatches(code, entry.pattern)) continue
    if (entry.type === 'Test Certificate') continue // hidden for now

    if (entry.type === 'Installation') {
      installationDocs.push({ ...entry })
    } else if (found[entry.type] === undefined) {
      otherDocs.push({ ...entry })
    } else if (found[entry.type] === null) {
      found[entry.type] = { ...entry }
    }
    // skip duplicates of already-found primary types
  }

  const results = []
  if (found.Stripping) results.push(found.Stripping)
  if (found.TDS) results.push(found.TDS)
  results.push(...installationDocs)
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
  const code = productCode.toUpperCase().trim()
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

export const docTypeInfo = {
  TDS: { label: 'Technical Data Sheet', color: '#003366', abbr: 'TDS' },
  Stripping: { label: 'Stripping Instructions', color: '#003366', abbr: 'STRIP' },
  'Test Certificate': { label: 'Test Certificate', color: '#003366', abbr: 'CERT' },
  'Final Test Certificate': { label: 'Test Certificate', color: '#003366', abbr: 'FTC' },
  Installation: { label: 'Installation Guide', color: '#003366', abbr: 'INST' },
  Other: { label: 'Other Document', color: '#003366', abbr: 'DOC' },
}
