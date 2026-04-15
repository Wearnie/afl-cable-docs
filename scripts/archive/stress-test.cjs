#!/usr/bin/env node
// Stress Test: Run all product codes from Excel against the document map
// Usage: node stress-test.cjs

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ============================================================================
// Pattern matching (reimplemented from documentMap.js for CJS compatibility)
// ============================================================================

function isAlphanumeric(ch) {
  const code = ch.charCodeAt(0)
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57)
}

function patternMatches(code, pattern) {
  if (code.length !== pattern.length) return false
  for (let i = 0; i < pattern.length; i++) {
    const pc = pattern[i]
    if (!isAlphanumeric(pc)) continue
    if (pc.toUpperCase() !== code[i].toUpperCase()) return false
  }
  return true
}

function findDocuments(code, documentMap) {
  code = code.toUpperCase().trim()
  if (code.length < 1) return { stripping: null, tds: null, installation: [], other: [], testCerts: [] }

  const found = { TDS: null, Stripping: null }
  const installation = []
  const other = []
  const testCerts = []

  for (const entry of documentMap) {
    if (!patternMatches(code, entry.pattern)) continue

    if (entry.exclude) {
      const excludes = Array.isArray(entry.exclude) ? entry.exclude : [entry.exclude]
      if (excludes.some(ex => patternMatches(code, ex))) continue
    }

    if (entry.type === 'Test Certificate') {
      testCerts.push(entry)
      continue
    }

    if (entry.type === 'Installation') {
      installation.push(entry)
    } else if (found[entry.type] === undefined) {
      other.push(entry)
    } else if (found[entry.type] === null) {
      found[entry.type] = entry
    }
  }

  return { stripping: found.Stripping, tds: found.TDS, installation, other, testCerts }
}

// ============================================================================
// Read Excel via xlsx-cli
// ============================================================================

function readExcel(filePath) {
  const raw = execSync(`npx --yes xlsx-cli "${filePath}"`, { encoding: 'utf-8' })
  const lines = raw.split('\n').filter(l => l.trim())
  const codes = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    const code = (parts[1] || '').trim()
    if (code) codes.push(code)
  }
  return codes
}

// ============================================================================
// Main
// ============================================================================

const EXCEL_PATH = '/Users/tomwearne/Downloads/unique_product_codes.xlsx'
const DOC_MAP_PATH = path.join(__dirname, 'public', 'data', 'document-map.json')

console.log('Reading Excel...')
const codes = readExcel(EXCEL_PATH)
console.log(`Found ${codes.length} product codes\n`)

console.log('Loading document map...')
const documentMap = JSON.parse(fs.readFileSync(DOC_MAP_PATH, 'utf-8'))
console.log(`Loaded ${documentMap.length} pattern entries\n`)

const results = []
const summary = { full: 0, partial: 0, noMatch: 0, wrongLength: 0, nonStandard: 0 }

for (const rawCode of codes) {
  const code = rawCode.toUpperCase().trim()
  const len = code.length
  const family = code.slice(0, Math.min(3, code.length))

  const docs = findDocuments(code, documentMap)

  const hasStripping = !!docs.stripping
  const hasTDS = !!docs.tds
  const hasInstall = docs.installation.length > 0

  // Try stripping suffix to find base code match
  let baseCode = null
  let baseDocs = null
  if (!hasStripping && !hasTDS && !hasInstall && code.includes('-')) {
    baseCode = code.replace(/-.*$/, '')
    if (baseCode.length >= 10) {
      baseDocs = findDocuments(baseCode, documentMap)
    }
  }

  let status
  if (hasStripping && hasTDS && hasInstall) {
    status = 'FULL'
    summary.full++
  } else if (hasStripping || hasTDS || hasInstall) {
    status = 'PARTIAL'
    summary.partial++
  } else if (len !== 13 && !documentMap.some(e => e.pattern.length === len)) {
    if (code.includes('-') || len < 10 || /^\d/.test(code)) {
      status = 'NON-STANDARD'
      summary.nonStandard++
    } else {
      status = 'WRONG LENGTH'
      summary.wrongLength++
    }
  } else {
    status = 'NO MATCH'
    summary.noMatch++
  }

  results.push({
    code: rawCode,
    length: len,
    family,
    stripping: docs.stripping?.name || '',
    tds: docs.tds?.name || '',
    installation: docs.installation.map(d => d.name).join(' | ') || '',
    testCert: docs.testCerts.length > 0 ? `${docs.testCerts.length} hidden` : '',
    other: docs.other.map(d => `[${d.type}] ${d.name}`).join(' | ') || '',
    status,
    baseCode: baseCode || '',
    baseMatch: baseDocs ? [
      baseDocs.stripping ? 'Strip' : null,
      baseDocs.tds ? 'TDS' : null,
      baseDocs.installation.length ? 'Install' : null,
    ].filter(Boolean).join('+') || 'no match' : '',
  })
}

// ============================================================================
// Console Report
// ============================================================================

console.log('='.repeat(80))
console.log('STRESS TEST RESULTS')
console.log('='.repeat(80))
console.log()
console.log(`Total codes:     ${codes.length}`)
console.log(`Full coverage:   ${summary.full} (Stripping + TDS + Installation)`)
console.log(`Partial:         ${summary.partial} (some docs but not all)`)
console.log(`No match:        ${summary.noMatch} (matchable length but no patterns hit)`)
console.log(`Wrong length:    ${summary.wrongLength} (non-standard length, no patterns exist)`)
console.log(`Non-standard:    ${summary.nonStandard} (non-AFL format)`)
console.log()

// Group by status
const groups = {}
for (const r of results) {
  if (!groups[r.status]) groups[r.status] = []
  groups[r.status].push(r)
}

for (const status of ['NO MATCH', 'PARTIAL', 'WRONG LENGTH', 'NON-STANDARD']) {
  const group = groups[status]
  if (!group || group.length === 0) continue

  console.log('-'.repeat(80))
  console.log(`${status} (${group.length})`)
  console.log('-'.repeat(80))

  for (const r of group) {
    const parts = [`  ${r.code.padEnd(28)} [${String(r.length).padStart(2)} chars]`]
    if (r.stripping) parts.push(`Strip: YES`)
    else parts.push(`Strip: ---`)
    if (r.tds) parts.push(`TDS: YES`)
    else parts.push(`TDS: ---`)
    if (r.installation) parts.push(`Inst: YES`)
    else parts.push(`Inst: ---`)
    if (r.baseCode) parts.push(`Base(${r.baseCode}) → ${r.baseMatch}`)
    console.log(parts.join('  '))
  }
  console.log()
}

// Full coverage by family
console.log('-'.repeat(80))
console.log(`FULL COVERAGE (${summary.full}) — by family prefix`)
console.log('-'.repeat(80))
const fullByFamily = {}
for (const r of (groups['FULL'] || [])) {
  const fam = r.code[0]
  fullByFamily[fam] = (fullByFamily[fam] || 0) + 1
}
for (const [fam, count] of Object.entries(fullByFamily).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${fam}: ${count} codes`)
}
console.log()

// ============================================================================
// CSV Export
// ============================================================================

const csvPath = path.join(__dirname, 'stress-test-results.csv')
const csvHeader = 'Code,Length,Family,Status,Stripping,TDS,Installation,Test Cert (hidden),Other,Base Code,Base Match'
const csvRows = results.map(r =>
  [r.code, r.length, r.family, r.status, r.stripping, r.tds, r.installation, r.testCert, r.other, r.baseCode, r.baseMatch]
    .map(v => `"${String(v).replace(/"/g, '""')}"`)
    .join(',')
)
fs.writeFileSync(csvPath, csvHeader + '\n' + csvRows.join('\n') + '\n')
console.log(`CSV exported: ${csvPath}`)
console.log('Done.')
