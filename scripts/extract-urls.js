#!/usr/bin/env node
/**
 * Extract unique PDF URLs from documentMap.js
 * Outputs a download checklist + category mapping for local PDF hosting
 *
 * Usage: node scripts/extract-urls.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const src = readFileSync(join(__dirname, '../src/data/documentMap.js'), 'utf-8')

// Extract all url values from the documentMap array
const urlRegex = /url:\s*'([^']+)'/g
const typeRegex = /type:\s*'([^']+)'/g
const nameRegex = /name:\s*'([^']+)'/g

// Parse entries line-by-line from the array portion
const entries = []
const lineRegex = /\{\s*pattern:\s*'([^']+)',\s*type:\s*'([^']+)',\s*name:\s*'([^']+)',\s*url:\s*'([^']+)'\s*\}/g
let match
while ((match = lineRegex.exec(src)) !== null) {
  entries.push({
    pattern: match[1],
    type: match[2],
    name: match[3],
    url: match[4],
  })
}

// Category → folder mapping
const categoryFolder = {
  Stripping: 'stripping',
  Installation: 'installation',
  TDS: 'tds',
  'Test Certificate': 'test-certificates',
}

// Deduplicate by URL
const seen = new Map() // url → { type, name, filename, folder }
for (const entry of entries) {
  if (seen.has(entry.url)) continue

  const folder = categoryFolder[entry.type] || 'other'

  // Extract filename from URL (last segment, URL-decoded)
  const urlPath = entry.url.split('/').pop()
  const filename = decodeURIComponent(urlPath).replace(/[®©]/g, '')

  seen.set(entry.url, {
    type: entry.type,
    name: entry.name,
    filename,
    folder,
    sharepointUrl: entry.url,
  })
}

// Print summary
console.log('=' .repeat(80))
console.log('AFL Document Map — Unique PDF Extraction')
console.log('=' .repeat(80))
console.log(`\nTotal entries in documentMap: ${entries.length}`)
console.log(`Unique PDFs: ${seen.size}\n`)

// Group by category
const byCategory = {}
for (const [url, info] of seen) {
  if (!byCategory[info.type]) byCategory[info.type] = []
  byCategory[info.type].push(info)
}

// Print download checklist
console.log('=' .repeat(80))
console.log('DOWNLOAD CHECKLIST')
console.log('Copy each PDF from SharePoint into the matching local folder')
console.log('=' .repeat(80))

for (const [category, docs] of Object.entries(byCategory)) {
  const folder = categoryFolder[category] || 'other'
  console.log(`\n--- ${category} → public/docs/${folder}/ (${docs.length} files) ---\n`)

  for (const doc of docs) {
    console.log(`  [ ] ${doc.filename}`)
    console.log(`      SharePoint: ${decodeURIComponent(doc.sharepointUrl)}`)
    console.log(`      Local:      public/docs/${doc.folder}/${doc.filename}`)
    console.log()
  }
}

// Print the mapping for documentMap.js conversion
console.log('\n' + '=' .repeat(80))
console.log('URL MAPPING (SharePoint → Local)')
console.log('=' .repeat(80))

for (const [url, info] of seen) {
  console.log(`${info.folder}/${info.filename}`)
}

// Also output a JSON mapping file for programmatic use
const mapping = {}
for (const [url, info] of seen) {
  mapping[url] = `${info.folder}/${info.filename}`
}

const mappingJson = JSON.stringify(mapping, null, 2)
const mappingPath = join(__dirname, 'url-mapping.json')
import('fs').then(fs => {
  fs.writeFileSync(mappingPath, mappingJson)
  console.log(`\nMapping JSON written to: scripts/url-mapping.json`)
})
