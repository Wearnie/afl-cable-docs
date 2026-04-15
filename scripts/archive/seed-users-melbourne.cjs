// One-time seed script: create initial admin accounts in Azure Blob Storage
// Usage: AZURE_STORAGE_CONNECTION_STRING="..." node seed-users.cjs
//
// All accounts are created with mustChangePassword: true
// Users will be prompted to set their own password on first login

const { BlobServiceClient } = require('./api/node_modules/@azure/storage-blob')
const bcrypt = require('./api/node_modules/bcryptjs')

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || 'afl-cable-docs'
const BLOB_PATH = 'data/users.json'
const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING

if (!connStr) {
  console.error('Set AZURE_STORAGE_CONNECTION_STRING env var')
  process.exit(1)
}

// Initial admin accounts — update placeholder emails before running
const SEED_USERS = [
  { email: 'tom.wearne@aflglobal.com', name: 'Tom Wearne', role: 'admin' },
  { email: 'Mithra.BaluBavitha@aflglobal.com', name: 'Mithra BaluBavitha', role: 'admin' },
  { email: 'Jim.Boukouvalas@aflglobal.com',   name: 'Jim Boukouvalas',    role: 'admin' },
]

// Default temporary password — each user must change on first login
const TEMP_PASSWORD = 'afl-change-me'

async function main() {
  console.log('Seeding initial admin accounts...\n')

  const blobService = BlobServiceClient.fromConnectionString(connStr)
  const container = blobService.getContainerClient(CONTAINER_NAME)

  // Check if users.json already exists
  const blob = container.getBlockBlobClient(BLOB_PATH)
  let existingUsers = {}
  try {
    const response = await blob.download(0)
    const chunks = []
    for await (const chunk of response.readableStreamBody) {
      chunks.push(chunk)
    }
    existingUsers = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
    console.log(`Found existing users.json with ${Object.keys(existingUsers).length} user(s)`)
  } catch (err) {
    if (err.statusCode === 404) {
      console.log('No existing users.json — creating fresh')
    } else {
      throw err
    }
  }

  const hash = await bcrypt.hash(TEMP_PASSWORD, 12)

  for (const u of SEED_USERS) {
    const key = u.email.toLowerCase()
    if (existingUsers[key]) {
      console.log(`  - ${key} (already exists, skipping)`)
      continue
    }
    existingUsers[key] = {
      name: u.name,
      role: u.role,
      passwordHash: hash,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      createdBy: 'seed-script',
    }
    console.log(`  + ${key} (${u.role})`)
  }

  const content = JSON.stringify(existingUsers, null, 2)
  await blob.upload(content, content.length, {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  })

  console.log(`\nDone. ${SEED_USERS.length} account(s) seeded.`)
  console.log(`Temporary password: ${TEMP_PASSWORD}`)
  console.log('All users must change their password on first login.')
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
