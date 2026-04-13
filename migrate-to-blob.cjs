// One-time migration script: upload existing data + PDFs to Azure Blob Storage
// Usage: AZURE_STORAGE_CONNECTION_STRING="..." node migrate-to-blob.cjs

const { BlobServiceClient } = require('./api/node_modules/@azure/storage-blob')
const fs = require('fs')
const path = require('path')

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || 'afl-cable-docs'
const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING

if (!connStr) {
  console.error('Set AZURE_STORAGE_CONNECTION_STRING env var')
  process.exit(1)
}

const blobService = BlobServiceClient.fromConnectionString(connStr)
const container = blobService.getContainerClient(CONTAINER_NAME)

async function uploadFile(localPath, blobPath, contentType) {
  const blob = container.getBlockBlobClient(blobPath)
  const content = fs.readFileSync(localPath)
  await blob.upload(content, content.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
  console.log(`  ✓ ${blobPath} (${(content.length / 1024).toFixed(1)} KB)`)
}

async function uploadDir(localDir, blobPrefix, contentType) {
  if (!fs.existsSync(localDir)) {
    console.log(`  Skipping ${localDir} (doesn't exist)`)
    return 0
  }
  const files = fs.readdirSync(localDir)
  let count = 0
  for (const file of files) {
    const fullPath = path.join(localDir, file)
    if (fs.statSync(fullPath).isFile()) {
      await uploadFile(fullPath, `${blobPrefix}/${file}`, contentType)
      count++
    }
  }
  return count
}

async function main() {
  console.log(`Migrating to blob container: ${CONTAINER_NAME}\n`)

  // 1. Upload JSON data files
  console.log('=== JSON Data ===')
  const dataDir = path.join(__dirname, 'public', 'data')
  const jsonFiles = ['document-map.json', 'dj-mapping.json', 'dj-doc-overrides.json', 'final-test-certs.json', 'product-codes.json']
  for (const file of jsonFiles) {
    const localPath = path.join(dataDir, file)
    if (fs.existsSync(localPath)) {
      await uploadFile(localPath, `data/${file}`, 'application/json')
    } else {
      console.log(`  - ${file} (not found, skipping)`)
    }
  }

  // 2. Upload PDFs by doc type
  console.log('\n=== PDF Documents ===')
  const docsDir = path.join(__dirname, 'public', 'docs')
  const docTypes = ['tds', 'stripping', 'installation', 'storage-handling', 'test-certificates', 'final-test-certs', 'osp', 'other']
  let totalPdfs = 0
  for (const type of docTypes) {
    const dir = path.join(docsDir, type)
    console.log(`\n${type}:`)
    const count = await uploadDir(dir, `docs/${type}`, 'application/pdf')
    totalPdfs += count
  }

  console.log(`\n=== Done ===`)
  console.log(`Uploaded ${jsonFiles.length} JSON files and ${totalPdfs} PDFs`)
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
