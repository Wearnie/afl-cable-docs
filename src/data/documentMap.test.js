import { describe, it, expect } from 'vitest'
import { patternMatches, findDocuments, decodeProductCode } from './documentMap.js'

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

  it('rejects code longer than 13 chars', () => {
    expect(patternMatches('LMDC1DPA144BEX', 'LMDC**PA144BE')).toBe(false)
  })

  it('rejects pattern shorter than 13 chars', () => {
    expect(patternMatches('LMDC1DPA144BE', 'LMDC**PA')).toBe(false)
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
  it('LMDC1DPA144BE returns exactly 4 documents', () => {
    const docs = findDocuments('LMDC1DPA144BE')
    expect(docs).toHaveLength(4)
  })

  it('SMM41DLB048BK returns exactly 5 documents (incl. 2x Installation)', () => {
    const docs = findDocuments('SMM41DLB048BK')
    expect(docs).toHaveLength(5)
  })

  it('returns correct document types in order (TDS first)', () => {
    const docs = findDocuments('LMDC1DPA144BE')
    const types = docs.map(d => d.type)
    expect(types).toEqual(['TDS', 'Stripping', 'Test Certificate', 'Installation'])
  })

  it('invalid code (wrong length) returns empty array', () => {
    expect(findDocuments('SHORT')).toEqual([])
  })

  it('valid 13-char code with no matches returns empty array', () => {
    // Z at position 1 doesn't match any family pattern
    expect(findDocuments('ZZZZZZZZZZZBE')).toEqual([])
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
