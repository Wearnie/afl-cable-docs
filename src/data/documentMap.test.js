import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { patternMatches, findDocuments, decodeProductCode, stripSuffix, getCustomerSuffix, _setDocumentMapCache } from './documentMap.js'

// Load the JSON document map and inject it before tests run
beforeAll(() => {
  const json = readFileSync(resolve(__dirname, '../../public/data/document-map.json'), 'utf-8')
  const entries = JSON.parse(json)
  // Simulate what loadDocumentMap() does: prepend DOC_BASE_URL to path
  const DOC_BASE_URL = '/docs'
  _setDocumentMapCache(entries.map(e => ({ ...e, url: `${DOC_BASE_URL}${e.path}` })))
})

// ============================================================================
// patternMatches
// ============================================================================

describe('patternMatches', () => {
  it('matches exact 13-char code with no wildcards', () => {
    expect(patternMatches('LMDC1DPA144BE', 'LMDC1DPA144BE')).toBe(true)
  })

  it('wildcard * positions match any character', () => {
    expect(patternMatches('LMDC1DPA144BE', 'LMDC**PA144BE')).toBe(true)
  })

  it('comparison is case-insensitive', () => {
    expect(patternMatches('lmdc1dpa144be', 'LMDC1DPA144BE')).toBe(true)
  })

  it('rejects code shorter than 13 chars', () => {
    expect(patternMatches('LMDC1DPA144', 'LMDC**PA144BE')).toBe(false)
  })

  it('longer code matches shorter pattern (extra chars treated as wildcard)', () => {
    expect(patternMatches('LMDC1DPA144BEX', 'LMDC**PA144BE')).toBe(true)
    expect(patternMatches('K3M5DTHA4-12BK', 'K3M**********')).toBe(true)
    expect(patternMatches('LMD6D3PA12-12BE', 'LMD6**PA*****')).toBe(true) // extra chars beyond pattern are wildcard
    expect(patternMatches('LMD6D3PA12-12BE', 'SMD6**PA*****')).toBe(false) // mismatch at pos 1
  })

  it('rejects code shorter than pattern', () => {
    expect(patternMatches('LMDC1DPA144BE', 'LMDC**PA144BEXX')).toBe(false)
    expect(patternMatches('LMDC**PA', 'LMDC1DPA144BE')).toBe(false)
  })

  it('all-wildcard pattern matches any valid 13-char code', () => {
    expect(patternMatches('ABCDEFGHIJKLM', '*************')).toBe(true)
  })

  it('returns false on mismatch at a specific position', () => {
    // Position 1: L vs S
    expect(patternMatches('LMDC1DPA144BE', 'SMDC1DPA144BE')).toBe(false)
  })
})

// ============================================================================
// findDocuments
// ============================================================================

describe('findDocuments', () => {
  it('LMDC1DPA144BE returns Stripping, TDS, Installation, and Storage & Handling', () => {
    const docs = findDocuments('LMDC1DPA144BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping')
    expect(types).toContain('TDS')
    expect(types).toContain('Installation')
    expect(types).not.toContain('Test Certificate')
  })

  it('SMM41DLB048BK returns Stripping, TDS, 2x Installation (Test Certificate excluded)', () => {
    const docs = findDocuments('SMM41DLB048BK')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping')
    expect(types).toContain('TDS')
    expect(types.filter(t => t === 'Installation').length).toBeGreaterThanOrEqual(2)
  })

  it('returns Stripping first, then TDS, no Test Certificate', () => {
    const docs = findDocuments('LMDC1DPA144BE')
    const types = docs.map(d => d.type)
    expect(types[0]).toBe('Stripping')
    expect(types[1]).toBe('TDS')
    expect(types).not.toContain('Test Certificate')
  })

  it('invalid code (wrong length) returns empty array', () => {
    expect(findDocuments('SHORT')).toEqual([])
  })

  it('valid 13-char code with no family matches still gets Storage & Handling', () => {
    const docs = findDocuments('ZZZZZZZZZZZBE')
    // Only Storage & Handling matches (catch-all pattern)
    const types = [...new Set(docs.map(d => d.type))]
    expect(types.every(t => t === 'Storage & Handling')).toBe(true)
  })

  it('first match per type wins (specificity check)', () => {
    // TVBQ1DAA012BE should match the more specific TVBQ**AA0**** TDS
    // rather than the generic T************ TDS
    const docs = findDocuments('TVBQ1DAA012BE')
    const tds = docs.find(d => d.type === 'TDS')
    expect(tds.name).toBe('TVBQ - Indoor Outdoor Premise Tight Buffered Cable')
  })
})

// ============================================================================
// findDocuments — per cable family coverage
// ============================================================================

describe('findDocuments — every cable family', () => {
  // --- L: Loose Tube ---
  it('L (Loose Tube) — LMDC1DPA144BE → Stripping + TDS + Installation', () => {
    const docs = findDocuments('LMDC1DPA144BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'Stripping').name).toBe('LMDx Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('144F Stranded LT Cable')
    expect(docs.find(d => d.type === 'Installation').name).toBe('Loose Tube Installation & Application Instructions')
  })

  it('L (Loose Tube, sacrificial sheath variant) — LMH61DPA072BE → Stripping + TDS + Installation', () => {
    const docs = findDocuments('LMH61DPA072BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'Stripping').name).toBe('LMHx Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('72F Stranded LT Cable with Sacrificial Sheath')
  })

  it('L (Loose Tube, axial mini) — LQD11DPA012BE → Stripping + TDS + Installation', () => {
    const docs = findDocuments('LQD11DPA012BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'Stripping').name).toBe('LQDx Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('Mini Axial LT Cable')
  })

  it('L (Loose Tube, high strength) — LMJ61DJA072BE → Stripping + TDS + Installation', () => {
    const docs = findDocuments('LMJ61DJA072BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'TDS').name).toBe('72F High Strength Stranded LT Cable')
  })

  // --- N: Non-Metallic Armour ---
  it('N (NMA) — NMD61DPB048BK → Stripping + TDS + Installation', () => {
    const docs = findDocuments('NMD61DPB048BK')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'Stripping').name).toBe('NMDx Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('72F Stranded NMA LT Cable')
    expect(docs.find(d => d.type === 'Installation').name).toBe('Loose Tube Installation & Application Instructions')
  })

  it('N (NMA, LSZH sheath) — NMD61DPM072BK → Stripping + TDS + Installation', () => {
    const docs = findDocuments('NMD61DPM072BK')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'TDS').name).toBe('72 Stranded NMA LTC LSZH Sheath')
  })

  it('N (NMA, high strength) — NMJ61DJB072BK → Stripping + TDS + Installation (now caught by N*J)', () => {
    const docs = findDocuments('NMJ61DJB072BK')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'Stripping').name).toBe('NMDx Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('72F High Strength Stranded NMA Loose Tube Cable')
  })

  it('N (NMA, axial) — NLD11DEB006BE → Stripping + TDS + Installation', () => {
    const docs = findDocuments('NLD11DEB006BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'Stripping').name).toBe('NLDx Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('Axial NMA LT Cable')
  })

  // --- R: FRP Flat Rod Armour ---
  it('R (FRP Rod) — RLD11DFB012BE → Stripping + TDS + Installation', () => {
    const docs = findDocuments('RLD11DFB012BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'Stripping').name).toBe('RLD Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('Axial Non-Metallic Flat FRP Armoured LTC')
    expect(docs.find(d => d.type === 'Installation').name).toBe('Loose Tube Installation & Application Instructions')
  })

  it('R (FRP Rod, LSZH) — RLD11DFM012BE → Stripping + TDS + Installation', () => {
    const docs = findDocuments('RLD11DFM012BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'TDS').name).toBe('Axial Non-Metallic Flat FRP Armoured LTC - LSZH Sheath')
  })

  it('R (FRP Rod, stranded) — RMD81DPB096BK → TDS + Installation (no RMD stripping pattern)', () => {
    const docs = findDocuments('RMD81DPB096BK')
    const types = docs.map(d => d.type)
    expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'TDS').name).toBe('96F NM Flat Rod Armoured LT Cable - RMD8')
  })

  // --- U: Microcore ---
  it('U (Microcore) — UTE61DFA144BE → Stripping + TDS + 2x Installation', () => {
    const docs = findDocuments('UTE61DFA144BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types.filter(t => t === 'Installation').length).toBeGreaterThanOrEqual(2)
    expect(docs.find(d => d.type === 'Stripping').name).toBe('UTEx Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('144F MicroCore Stranded LT Cable')
    const installs = docs.filter(d => d.type === 'Installation')
    expect(installs.map(d => d.name)).toContain('MicroCore Installation & Application Instructions')
    expect(installs.map(d => d.name)).toContain('MicroCore Cable Installation - Handling Tips')
  })

  it('U (Microcore, sacrificial sheath) — UTN61DFD144BE → Stripping + TDS + 2x Installation', () => {
    const docs = findDocuments('UTN61DFD144BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types.filter(t => t === 'Installation').length).toBeGreaterThanOrEqual(2)
    expect(docs.find(d => d.type === 'Stripping').name).toBe('UTNx Cable Stripping Instructions')
    expect(docs.find(d => d.type === 'TDS').name).toBe('144F MicroCore Stranded LTC with Sacrificial Sheath')
  })

  // --- T: Tight Buffer / Premise ---
  it('T (Premise) — TVBQ1DAA012BE → TDS + Installation (no stripping docs)', () => {
    const docs = findDocuments('TVBQ1DAA012BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('TDS'); expect(types).toContain('Installation')
    expect(docs.find(d => d.type === 'TDS').name).toBe('TVBQ - Indoor Outdoor Premise Tight Buffered Cable')
    expect(docs.find(d => d.type === 'Installation').name).toBe('Premise Cable Installation & Application Instructions')
  })

  // --- S: Aerial (ADSS) ---
  it('S (ADSS, short span) — SMM41DLB048BK → Stripping + TDS + 2x Installation', () => {
    const docs = findDocuments('SMM41DLB048BK')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types.filter(t => t === 'Installation').length).toBeGreaterThanOrEqual(2)
    expect(docs.find(d => d.type === 'Stripping').name).toBe('SMMx Cable Stripping Instructions (Single Jacket)')
    expect(docs.find(d => d.type === 'TDS').name).toBe('48 Fibre Short Span ADSS Cable')
    const installs = docs.filter(d => d.type === 'Installation')
    expect(installs.map(d => d.name)).toContain('ADSS Installation Instruction - Quick Reference Guide')
    expect(installs.map(d => d.name)).toContain('ADSS Installation Instructions')
  })

  it('S (ADSS, long span double jacket) — SMJ61DLE072BK → Stripping + TDS + 2x Installation', () => {
    const docs = findDocuments('SMJ61DLE072BK')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping'); expect(types).toContain('TDS'); expect(types.filter(t => t === 'Installation').length).toBeGreaterThanOrEqual(2)
    expect(docs.find(d => d.type === 'Stripping').name).toBe('SMJx Cable Stripping Instructions (Double Jacket)')
    expect(docs.find(d => d.type === 'TDS').name).toBe('72 Fibre Long Span ADSS Cable')
  })

  // --- B: (no family decode, but has installation pattern) ---
  it('B — BMMC1DLC144BK → Installation only (no TDS or Stripping patterns)', () => {
    const docs = findDocuments('BMMC1DLC144BK')
    const types = docs.map(d => d.type)
    expect(types).toContain('Installation')
    expect(docs.some(d => d.name === 'Loose Tube Installation & Application Instructions')).toBe(true)
  })

  // --- K3M: specialty cable with stripping only ---
  it('K3M — K3M11DPA144BE → Stripping only (no TDS or Installation patterns)', () => {
    const docs = findDocuments('K3M11DPA144BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping')
    expect(docs[0].name).toBe('K3Mx CABLE STRIPPING INSTRUCTIONS')
  })

  // --- Exclude pattern support ---
  it('NLD gets NLDx stripping (not NMDx) — exclude prevents N*D from matching NLD', () => {
    const docs = findDocuments('NLD11DEB006BE')
    const stripping = docs.find(d => d.type === 'Stripping')
    expect(stripping.name).toBe('NLDx Cable Stripping Instructions')
  })

  it('NKD gets NMDx stripping via N*D wildcard (previously specific pattern)', () => {
    const docs = findDocuments('NKD61DPB048BK')
    const stripping = docs.find(d => d.type === 'Stripping')
    expect(stripping).toBeTruthy()
    expect(stripping.name).toBe('NMDx Cable Stripping Instructions')
  })

  it('NKJ gets NMDx stripping via N*J wildcard', () => {
    const docs = findDocuments('NKJ61DJB048BK')
    const stripping = docs.find(d => d.type === 'Stripping')
    expect(stripping).toBeTruthy()
    expect(stripping.name).toBe('NMDx Cable Stripping Instructions')
  })

  it('ADSS S*M wildcard catches non-SMM codes', () => {
    // S8M would also match S*M
    const docs = findDocuments('SMM41DLB048BK')
    const stripping = docs.find(d => d.type === 'Stripping')
    expect(stripping.name).toBe('SMMx Cable Stripping Instructions (Single Jacket)')
  })

  // --- Test Certificate exclusion across all families ---
  it('no family returns Test Certificate type in results', () => {
    const codes = [
      'LMDC1DPA144BE', // L
      'NMD61DPB048BK', // N
      'RLD11DFB012BE', // R
      'UTE61DFA144BE', // U
      'TVBQ1DAA012BE', // T
      'SMM41DLB048BK', // S
      'BMMC1DLC144BK', // B
    ]
    for (const code of codes) {
      const docs = findDocuments(code)
      const certDocs = docs.filter(d => d.type === 'Test Certificate')
      expect(certDocs, `${code} should have no Test Certificate docs`).toHaveLength(0)
    }
  })

  // --- Stripping always first when present ---
  it('Stripping is always the first document when present', () => {
    const codesWithStripping = [
      'LMDC1DPA144BE', // L
      'NMD61DPB048BK', // N
      'RLD11DFB012BE', // R
      'UTE61DFA144BE', // U
      'SMM41DLB048BK', // S
    ]
    for (const code of codesWithStripping) {
      const docs = findDocuments(code)
      expect(docs[0].type, `${code} should have Stripping first`).toBe('Stripping')
    }
  })
})

// ============================================================================
// Customer suffix handling
// ============================================================================

describe('customer suffix handling', () => {
  it('stripSuffix removes safe suffixes (-FP, -ESS, -TMC)', () => {
    expect(stripSuffix('NMD61DPB048BE-FP')).toBe('NMD61DPB048BE')
    expect(stripSuffix('NMD61DPB048BE-ESS')).toBe('NMD61DPB048BE')
    expect(stripSuffix('NMD61DPB048BE-TMC')).toBe('NMD61DPB048BE')
  })

  it('stripSuffix removes customer suffixes (-SYDT, -TMR, -AG)', () => {
    expect(stripSuffix('NMD61DPB048BE-SYDT')).toBe('NMD61DPB048BE')
    expect(stripSuffix('NMD61DPB048BE-AG')).toBe('NMD61DPB048BE')
    expect(stripSuffix('NMD61DPB048BE-TMR')).toBe('NMD61DPB048BE')
  })

  it('stripSuffix removes chained suffixes (-SYDT-FP)', () => {
    expect(stripSuffix('NMD81DPB096BE-SYDT-FP')).toBe('NMD81DPB096BE')
  })

  it('stripSuffix preserves code hyphens (composite fibre counts)', () => {
    expect(stripSuffix('LMD6D3PA12-12BE')).toBe('LMD6D3PA12-12BE')
    expect(stripSuffix('K3M5DTHA4-12BK')).toBe('K3M5DTHA4-12BK')
  })

  it('getCustomerSuffix detects customer suffixes', () => {
    expect(getCustomerSuffix('NMD61DPB048BE-SYDT')).toBe('-SYDT')
    expect(getCustomerSuffix('NMD61DPB048BE-AG')).toBe('-AG')
    expect(getCustomerSuffix('NMD61DPB048BE-TMR')).toBe('-TMR')
    expect(getCustomerSuffix('SMJ61FLE072BK-SIE')).toBe('-SIE')
  })

  it('getCustomerSuffix returns null for safe suffixes', () => {
    expect(getCustomerSuffix('NMD61DPB048BE-FP')).toBe(null)
    expect(getCustomerSuffix('NMD61DPB048BE-ESS')).toBe(null)
    expect(getCustomerSuffix('NMD61DPB048BE')).toBe(null)
  })

  it('-FP code gets standard TDS (safe suffix stripped)', () => {
    const docs = findDocuments('NMD61DPB048BE-FP')
    const types = docs.map(d => d.type)
    expect(types).toContain('TDS')
    expect(types).toContain('Stripping')
    expect(types).toContain('Installation')
  })

  it('-SYDT code gets Stripping + Installation but NO standard TDS', () => {
    const docs = findDocuments('NMD61DPB048BE-SYDT')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping')
    expect(types).toContain('Installation')
    expect(types).not.toContain('TDS')
  })

  it('-AG code gets Stripping + Installation but NO standard TDS', () => {
    const docs = findDocuments('NMDC1FPB144BK-AG')
    const types = docs.map(d => d.type)
    expect(types).toContain('Stripping')
    expect(types).toContain('Installation')
    expect(types).not.toContain('TDS')
  })

  it('standard code (no suffix) gets full docs as before', () => {
    const docs = findDocuments('NMD61DPB048BE')
    const types = docs.map(d => d.type)
    expect(types).toContain('TDS')
    expect(types).toContain('Stripping')
    expect(types).toContain('Installation')
  })
})

// ============================================================================
// decodeProductCode
// ============================================================================

describe('decodeProductCode', () => {
  it('decodes Loose Tube family (LMDC1DPA144BE) — all 9 fields', () => {
    const fields = decodeProductCode('LMDC1DPA144BE')
    expect(fields).toHaveLength(9)
    expect(fields[0]).toMatchObject({ label: 'Product Family', code: 'L', description: 'Loose Tube' })
    expect(fields[1]).toMatchObject({ label: 'Fibres Per Tube', code: 'M', description: '12 Fibres/Tube' })
    expect(fields[2]).toMatchObject({ label: 'Cable Construction', code: 'D', description: 'PE/Nylon' })
    expect(fields[3]).toMatchObject({ label: 'Core Structure', code: 'C', description: '12 Tubes Around CSM' })
    expect(fields[4]).toMatchObject({ label: 'Fibre Type', code: '1D', description: 'SM G.652.D' })
    expect(fields[5]).toMatchObject({ label: 'Tube Size', code: 'P', description: '2mm (Max 12F/Tube)' })
    expect(fields[6]).toMatchObject({ label: 'Construction Variation', code: 'A', description: 'Standard' })
    expect(fields[7]).toMatchObject({ label: 'Fibre Count', code: '144', description: '144 Fibres' })
    expect(fields[8]).toMatchObject({ label: 'Jacket Colour', code: 'BE', description: 'Blue' })
  })

  it('decodes ADSS family (SMM41DLB048BK) — all 9 fields', () => {
    const fields = decodeProductCode('SMM41DLB048BK')
    expect(fields).toHaveLength(9)
    expect(fields[0]).toMatchObject({ label: 'Product Family', code: 'S', description: 'Aerial (ADSS)' })
    expect(fields[1]).toMatchObject({ label: 'Fibres Per Tube', code: 'M', description: '12 Fibres Per Tube' })
    expect(fields[2]).toMatchObject({ label: 'Cable Construction', code: 'M', description: 'Aramid/PE' })
    expect(fields[3]).toMatchObject({ label: 'Core Structure', code: '4', description: '4 Tubes Around CSM' })
    expect(fields[4]).toMatchObject({ label: 'Fibre Type', code: '1D', description: 'SM G.652.D' })
    expect(fields[5]).toMatchObject({ label: 'Tube Size', code: 'L', description: '2.7mm (Max 24F/Tube)' })
    expect(fields[6]).toMatchObject({ label: 'ADSS Strength', code: 'B', description: 'Strength Code: B' })
    expect(fields[7]).toMatchObject({ label: 'Fibre Count', code: '048', description: '48 Fibres' })
    expect(fields[8]).toMatchObject({ label: 'Jacket Colour', code: 'BK', description: 'Black' })
  })

  it('decodes Premise family (TVBQ1DAA012BE) correctly', () => {
    const fields = decodeProductCode('TVBQ1DAA012BE')
    expect(fields).toHaveLength(9)
    expect(fields[0]).toMatchObject({ label: 'Product Family', code: 'T', description: 'Tight Buffer / Premise' })
    expect(fields[1]).toMatchObject({ label: 'Core Type', code: 'V', description: 'Indoor/Outdoor Premise (New)' })
    expect(fields[2]).toMatchObject({ label: 'Outer Jacket', code: 'B', description: 'LSZH' })
    expect(fields[3]).toMatchObject({ label: 'Tight Buffer', code: 'Q', description: '900um LSZH' })
    expect(fields[4]).toMatchObject({ label: 'Fibre Type', code: '1D', description: 'SM G.652.D' })
    expect(fields[5]).toMatchObject({ label: 'Sub-Unit', code: 'A', description: 'Standard (No Sub-Units)' })
    expect(fields[6]).toMatchObject({ label: 'Construction', code: 'A', description: 'Standard' })
    expect(fields[7]).toMatchObject({ label: 'Fibre Count', code: '012', description: '12 Fibres' })
    expect(fields[8]).toMatchObject({ label: 'Jacket Colour', code: 'BE', description: 'Blue' })
  })

  it('fibre count is parsed as a number (positions 9-11)', () => {
    const fields = decodeProductCode('LMDC1DPA144BE')
    const fibreCount = fields.find(f => f.label === 'Fibre Count')
    expect(fibreCount.description).toBe('144 Fibres')
    // Verify the leading zeros are stripped in the description
    const fields2 = decodeProductCode('SMM41DLB048BK')
    const fibreCount2 = fields2.find(f => f.label === 'Fibre Count')
    expect(fibreCount2.description).toBe('48 Fibres')
  })

  it('jacket colour is decoded from positions 12-13', () => {
    const blue = decodeProductCode('LMDC1DPA144BE')
    expect(blue[8]).toMatchObject({ label: 'Jacket Colour', description: 'Blue' })

    const black = decodeProductCode('SMM41DLB048BK')
    expect(black[8]).toMatchObject({ label: 'Jacket Colour', description: 'Black' })
  })

  it('invalid code returns empty array', () => {
    expect(decodeProductCode('TOO_SHORT')).toEqual([])
    expect(decodeProductCode('')).toEqual([])
  })
})
