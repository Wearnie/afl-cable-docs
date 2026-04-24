#!/usr/bin/env node
// One-off: purge the retired "Test Certificate" type from production blob.
// Removes data/document-map.json entries with type === "Test Certificate"
// and deletes all blobs under docs/test-certificates/.
//
// Safe to run multiple times; idempotent.
//
// Usage:
//   AZURE_STORAGE_CONNECTION_STRING="..." node scripts/purge-test-certificates.cjs [--dry-run]

const { BlobServiceClient } = require('../api/node_modules/@azure/storage-blob')

const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING
if (!connStr) {
  console.error('ERROR: AZURE_STORAGE_CONNECTION_STRING not set')
  process.exit(1)
}

const container = process.env.AZURE_STORAGE_CONTAINER || 'afl-cable-docs'
const dryRun = process.argv.includes('--dry-run')
const DOC_MAP_BLOB = 'data/document-map.json'
const FOLDER_PREFIX = 'docs/test-certificates/'

async function main() {
  const service = BlobServiceClient.fromConnectionString(connStr)
  const containerClient = service.getContainerClient(container)

  // 1. Purge document-map.json entries
  const mapBlob = containerClient.getBlockBlobClient(DOC_MAP_BLOB)
  const download = await mapBlob.download(0)
  const text = await streamToString(download.readableStreamBody)
  const entries = JSON.parse(text)
  const filtered = entries.filter(e => e.type !== 'Test Certificate')
  const removedEntries = entries.length - filtered.length
  console.log(`document-map.json: ${entries.length} entries → ${filtered.length} (removing ${removedEntries})`)

  if (!dryRun && removedEntries > 0) {
    const out = JSON.stringify(filtered, null, 2) + '\n'
    await mapBlob.upload(out, out.length, {
      blobHTTPHeaders: { blobContentType: 'application/json' },
    })
    console.log('  ✓ document-map.json updated')
  }

  // 2. Delete all blobs under docs/test-certificates/
  const toDelete = []
  for await (const blob of containerClient.listBlobsFlat({ prefix: FOLDER_PREFIX })) {
    toDelete.push(blob.name)
  }
  console.log(`${FOLDER_PREFIX}: ${toDelete.length} blobs to delete`)

  if (!dryRun) {
    for (const name of toDelete) {
      await containerClient.getBlockBlobClient(name).delete()
      console.log(`  ✓ ${name}`)
    }
  } else {
    toDelete.slice(0, 10).forEach(n => console.log(`  (would delete) ${n}`))
    if (toDelete.length > 10) console.log(`  ... and ${toDelete.length - 10} more`)
  }

  console.log(dryRun ? '\nDry run complete — no changes made.' : '\nPurge complete.')
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', c => chunks.push(typeof c === 'string' ? Buffer.from(c) : c))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    stream.on('error', reject)
  })
}

main().catch(err => { console.error(err); process.exit(1) })
